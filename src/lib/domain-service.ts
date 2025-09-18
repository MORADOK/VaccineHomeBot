/**
 * Domain management service for CRUD operations with Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { DomainConfiguration, DomainFormData, DomainStatus, DNSRecordType } from '@/types/domain-config';
import { validateDomainFormat, detectDNSRecordType, generateDNSInstructions } from './domain-validation';
import { dnsService } from './dns-service';

export class DomainManagementService {
  /**
   * Fetch all domain configurations
   */
  async getDomainConfigurations(): Promise<DomainConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('domain_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch domain configurations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching domain configurations');
    }
  }

  /**
   * Fetch a single domain configuration by ID
   */
  async getDomainConfiguration(id: string): Promise<DomainConfiguration | null> {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid domain configuration ID');
      }

      const { data, error } = await supabase
        .from('domain_configurations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch domain configuration: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching domain configuration');
    }
  }

  /**
   * Fetch domain configuration by domain name
   */
  async getDomainConfigurationByDomain(domain: string): Promise<DomainConfiguration | null> {
    try {
      if (!domain || typeof domain !== 'string') {
        throw new Error('Invalid domain name');
      }

      const { data, error } = await supabase
        .from('domain_configurations')
        .select('*')
        .eq('domain', domain.toLowerCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch domain configuration: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching domain configuration');
    }
  }

  /**
   * Add a new domain configuration
   */
  async addDomainConfiguration(formData: DomainFormData): Promise<DomainConfiguration> {
    try {
      // Input validation
      if (!formData || !formData.domain) {
        throw new Error('Domain is required');
      }

      if (!formData.dns_record_type) {
        throw new Error('DNS record type is required');
      }

      // Validate domain format
      const validation = validateDomainFormat(formData.domain);
      if (!validation.isValid) {
        throw new Error(`Invalid domain format: ${validation.errors.join(', ')}`);
      }

      // Check if domain already exists
      const existingDomain = await this.getDomainConfigurationByDomain(formData.domain);
      if (existingDomain) {
        throw new Error('Domain already exists in configuration');
      }

      // Determine target value based on DNS record type
      const targetValue = this.getTargetValue(formData.dns_record_type);

      // Generate verification token
      const verificationToken = this.generateVerificationToken();

      const domainData = {
        domain: formData.domain.toLowerCase().trim(),
        subdomain: formData.subdomain?.toLowerCase().trim() || null,
        dns_record_type: formData.dns_record_type,
        target_value: targetValue,
        status: 'pending' as DomainStatus,
        ssl_enabled: false,
        verification_token: verificationToken,
      };

      const { data, error } = await supabase
        .from('domain_configurations')
        .insert(domainData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Domain already exists in configuration');
        }
        throw new Error(`Failed to add domain configuration: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while adding domain configuration');
    }
  }

  /**
   * Update domain configuration
   */
  async updateDomainConfiguration(
    id: string,
    updates: Partial<Omit<DomainConfiguration, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<DomainConfiguration> {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid domain configuration ID');
      }

      // Check if domain exists
      const existingDomain = await this.getDomainConfiguration(id);
      if (!existingDomain) {
        throw new Error('Domain configuration not found');
      }

      // Validate domain format if domain is being updated
      if (updates.domain) {
        const validation = validateDomainFormat(updates.domain);
        if (!validation.isValid) {
          throw new Error(`Invalid domain format: ${validation.errors.join(', ')}`);
        }

        // Check if new domain name conflicts with existing domains
        const conflictingDomain = await this.getDomainConfigurationByDomain(updates.domain);
        if (conflictingDomain && conflictingDomain.id !== id) {
          throw new Error('Domain already exists in configuration');
        }
      }

      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Clean up domain and subdomain if provided
      if (updateData.domain) {
        updateData.domain = updateData.domain.toLowerCase().trim();
      }
      if (updateData.subdomain) {
        updateData.subdomain = updateData.subdomain.toLowerCase().trim();
      }

      const { data, error } = await supabase
        .from('domain_configurations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update domain configuration: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while updating domain configuration');
    }
  }

  /**
   * Update domain configuration status
   */
  async updateDomainStatus(
    id: string, 
    status: DomainStatus, 
    errorMessage?: string
  ): Promise<DomainConfiguration> {
    try {
      const updateData: any = {
        status,
      };

      if (status === 'verified' || status === 'enabled') {
        updateData.last_verified_at = new Date().toISOString();
        updateData.error_message = null;
      } else if (status === 'failed' && errorMessage) {
        updateData.error_message = errorMessage;
      }

      return await this.updateDomainConfiguration(id, updateData);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while updating domain status');
    }
  }

  /**
   * Delete domain configuration with safety checks
   */
  async deleteDomainConfiguration(id: string, options?: { force?: boolean }): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid domain configuration ID');
      }

      // Check if domain exists
      const existingDomain = await this.getDomainConfiguration(id);
      if (!existingDomain) {
        throw new Error('Domain configuration not found');
      }

      // Safety checks unless force is specified
      if (!options?.force) {
        await this.validateDomainRemoval(existingDomain);
      }

      // Perform cleanup before deletion
      await this.cleanupDomainConfiguration(existingDomain);

      const { error } = await supabase
        .from('domain_configurations')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete domain configuration: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while deleting domain configuration');
    }
  }

  /**
   * Validate if a domain can be safely removed
   */
  private async validateDomainRemoval(domain: DomainConfiguration): Promise<void> {
    // Prevent deletion of enabled domains without explicit confirmation
    if (domain.status === 'enabled') {
      throw new Error('Cannot delete enabled domain configuration. Please disable it first or use force delete.');
    }

    // Check if this is the only fallback domain
    const allDomains = await this.getDomainConfigurations();
    const enabledDomains = allDomains.filter(d => d.status === 'enabled' && d.id !== domain.id);
    
    if (enabledDomains.length === 0 && domain.status === 'enabled') {
      throw new Error('Cannot delete the last enabled domain. At least one domain must remain accessible.');
    }

    // Check if domain is actively being used (based on recent health checks)
    if (domain.last_health_check) {
      const lastCheck = new Date(domain.last_health_check);
      const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCheck < 24 && domain.is_accessible) {
        console.warn(`Domain ${domain.domain} was recently accessible. Consider disabling before deletion.`);
      }
    }
  }

  /**
   * Cleanup domain configuration before removal
   */
  private async cleanupDomainConfiguration(domain: DomainConfiguration): Promise<void> {
    try {
      // Log the cleanup action
      console.log(`Cleaning up domain configuration for ${domain.domain}`);

      // If domain is still enabled, disable it first
      if (domain.status === 'enabled') {
        await this.updateDomainStatus(domain.id, 'failed', 'Domain disabled before removal');
      }

      // Clear any cached DNS records or verification tokens
      // This is a placeholder for future DNS cleanup logic
      if (domain.verification_token) {
        console.log(`Clearing verification token for ${domain.domain}`);
      }

      // Additional cleanup steps can be added here:
      // - Clear CDN cache entries
      // - Remove SSL certificates
      // - Clean up monitoring entries
      
    } catch (error) {
      console.warn(`Cleanup warning for domain ${domain.domain}:`, error);
      // Don't fail the deletion if cleanup has issues
    }
  }

  /**
   * Force delete domain configuration (bypasses all safety checks)
   */
  async forceDeleteDomainConfiguration(id: string): Promise<void> {
    return this.deleteDomainConfiguration(id, { force: true });
  }

  /**
   * Safe domain removal with confirmation
   */
  async safeDomainRemoval(id: string, confirmationToken: string): Promise<void> {
    try {
      const domain = await this.getDomainConfiguration(id);
      if (!domain) {
        throw new Error('Domain configuration not found');
      }

      // Verify confirmation token matches domain
      const expectedToken = `delete-${domain.domain}-${domain.id.slice(-8)}`;
      if (confirmationToken !== expectedToken) {
        throw new Error('Invalid confirmation token. Please verify the domain name.');
      }

      await this.deleteDomainConfiguration(id);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during safe domain removal');
    }
  }

  /**
   * Generate confirmation token for domain deletion
   */
  generateDeletionConfirmationToken(domain: DomainConfiguration): string {
    return `delete-${domain.domain}-${domain.id.slice(-8)}`;
  }

  /**
   * Verify domain configuration
   */
  async verifyDomainConfiguration(id: string): Promise<DomainConfiguration> {
    // Get domain configuration
    const { data: domain, error: fetchError } = await supabase
      .from('domain_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !domain) {
      throw new Error('Domain configuration not found');
    }

    try {
      // Use DNS service to validate configuration
      const validation = await dnsService.validateRenderDNSConfiguration(domain.domain);
      
      let newStatus: DomainStatus;
      let errorMessage: string | undefined;

      if (validation.isValid) {
        newStatus = 'verified';
        // Check SSL certificate
        const sslCheck = await dnsService.verifySSLCertificate(domain.domain);
        if (sslCheck.valid) {
          newStatus = 'enabled';
        }
      } else {
        newStatus = 'failed';
        errorMessage = validation.recommendations.join('; ');
      }

      return await this.updateDomainStatus(id, newStatus, errorMessage);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Verification failed';
      return await this.updateDomainStatus(id, 'failed', errorMsg);
    }
  }

  /**
   * Get DNS instructions for a domain configuration
   */
  getDNSInstructions(domain: DomainConfiguration) {
    return dnsService.getDNSInstructions(domain.domain, domain.dns_record_type);
  }

  /**
   * Get target value based on DNS record type
   */
  private getTargetValue(recordType: DNSRecordType): string {
    switch (recordType) {
      case 'ANAME':
      case 'CNAME':
        return 'line-intent-router-bot.onrender.com';
      case 'A':
        return '216.24.57.1';
      default:
        throw new Error(`Unsupported DNS record type: ${recordType}`);
    }
  }

  /**
   * Generate a verification token for domain ownership
   */
  private generateVerificationToken(): string {
    return `kiro-verify-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get recommended DNS record type for a domain
   */
  getRecommendedDNSRecordType(domain: string): DNSRecordType {
    const detection = detectDNSRecordType(domain);
    return detection.recommendedType;
  }

  /**
   * Bulk update domain statuses
   */
  async bulkUpdateDomainStatus(
    updates: Array<{ id: string; status: DomainStatus; errorMessage?: string }>
  ): Promise<DomainConfiguration[]> {
    try {
      if (!updates || updates.length === 0) {
        throw new Error('No updates provided');
      }

      const results: DomainConfiguration[] = [];
      const errors: string[] = [];

      for (const update of updates) {
        try {
          const result = await this.updateDomainStatus(update.id, update.status, update.errorMessage);
          results.push(result);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to update domain ${update.id}: ${errorMsg}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Bulk update completed with errors: ${errors.join('; ')}`);
      }

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during bulk update');
    }
  }

  /**
   * Get domains by status
   */
  async getDomainsByStatus(status: DomainStatus): Promise<DomainConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('domain_configurations')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch domains by status: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while fetching domains by status');
    }
  }

  /**
   * Count domains by status
   */
  async getDomainCountByStatus(): Promise<Record<DomainStatus, number>> {
    try {
      const domains = await this.getDomainConfigurations();
      
      const counts: Record<DomainStatus, number> = {
        pending: 0,
        verified: 0,
        failed: 0,
        enabled: 0
      };

      domains.forEach(domain => {
        counts[domain.status]++;
      });

      return counts;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while counting domains by status');
    }
  }
}

// Export singleton instance
export const domainService = new DomainManagementService();