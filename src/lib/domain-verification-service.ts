/**
 * Domain verification service with status tracking and automatic verification
 */

import { supabase } from '@/integrations/supabase/client';
import { DomainConfiguration, DomainStatus, DomainVerificationResult } from '@/types/domain-config';
import { dnsService } from './dns-service';

export interface VerificationProgress {
  step: 'dns_check' | 'ssl_check' | 'accessibility_check' | 'complete';
  message: string;
  progress: number; // 0-100
  isError?: boolean;
}

export interface VerificationStatus {
  domainId: string;
  isVerifying: boolean;
  currentStep: VerificationProgress | null;
  lastCheck: Date | null;
  nextCheck: Date | null;
  retryCount: number;
  maxRetries: number;
}

export class DomainVerificationService {
  private verificationStatuses = new Map<string, VerificationStatus>();
  private readonly maxRetries = 5;
  private readonly retryDelays = [5000, 10000, 30000, 60000, 300000]; // 5s, 10s, 30s, 1m, 5m
  private verificationTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Start verification workflow for a domain
   */
  async startVerification(domainId: string): Promise<void> {
    const domain = await this.getDomainConfiguration(domainId);
    if (!domain) {
      throw new Error('Domain configuration not found');
    }

    // Initialize verification status
    this.verificationStatuses.set(domainId, {
      domainId,
      isVerifying: true,
      currentStep: null,
      lastCheck: null,
      nextCheck: new Date(),
      retryCount: 0,
      maxRetries: this.maxRetries,
    });

    // Update domain status to pending
    await this.updateDomainStatus(domainId, 'pending');

    // Start verification process asynchronously
    this.performVerification(domainId).catch(error => {
      console.error('Verification failed:', error);
    });
  }

  /**
   * Stop verification workflow for a domain
   */
  stopVerification(domainId: string): void {
    const timer = this.verificationTimers.get(domainId);
    if (timer) {
      clearTimeout(timer);
      this.verificationTimers.delete(domainId);
    }

    const status = this.verificationStatuses.get(domainId);
    if (status) {
      status.isVerifying = false;
      status.currentStep = null;
    }
  }

  /**
   * Get verification status for a domain
   */
  getVerificationStatus(domainId: string): VerificationStatus | null {
    return this.verificationStatuses.get(domainId) || null;
  }

  /**
   * Perform complete verification workflow
   */
  private async performVerification(domainId: string): Promise<void> {
    const status = this.verificationStatuses.get(domainId);
    if (!status || !status.isVerifying) {
      return;
    }

    const domain = await this.getDomainConfiguration(domainId);
    if (!domain) {
      await this.handleVerificationError(domainId, 'Domain configuration not found');
      return;
    }

    try {
      status.lastCheck = new Date();

      // Step 1: DNS Configuration Check
      await this.updateVerificationStep(domainId, {
        step: 'dns_check',
        message: 'Checking DNS configuration...',
        progress: 25,
      });

      const dnsResult = await this.verifyDNSConfiguration(domain);
      if (!dnsResult.success) {
        await this.handleVerificationFailure(domainId, dnsResult.message, dnsResult.details);
        return;
      }

      // Check if verification was stopped
      if (!this.verificationStatuses.get(domainId)?.isVerifying) {
        return;
      }

      // Step 2: SSL Certificate Check
      await this.updateVerificationStep(domainId, {
        step: 'ssl_check',
        message: 'Verifying SSL certificate...',
        progress: 50,
      });

      const sslResult = await this.verifySSLCertificate(domain);
      if (!sslResult.success) {
        // SSL might not be ready yet, but DNS is configured
        await this.updateDomainStatus(domainId, 'verified', sslResult.message);
        await this.scheduleRetryVerification(domainId);
        return;
      }

      // Check if verification was stopped
      if (!this.verificationStatuses.get(domainId)?.isVerifying) {
        return;
      }

      // Step 3: Accessibility Check
      await this.updateVerificationStep(domainId, {
        step: 'accessibility_check',
        message: 'Testing domain accessibility...',
        progress: 75,
      });

      const accessibilityResult = await this.verifyDomainAccessibility(domain);
      if (!accessibilityResult.success) {
        await this.handleVerificationFailure(domainId, accessibilityResult.message, accessibilityResult.details);
        return;
      }

      // Check if verification was stopped
      if (!this.verificationStatuses.get(domainId)?.isVerifying) {
        return;
      }

      // Step 4: Complete
      await this.updateVerificationStep(domainId, {
        step: 'complete',
        message: 'Domain verification complete!',
        progress: 100,
      });

      await this.updateDomainStatus(domainId, 'enabled');
      this.stopVerification(domainId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      await this.handleVerificationError(domainId, errorMessage);
    }
  }

  /**
   * Verify DNS configuration
   */
  private async verifyDNSConfiguration(domain: DomainConfiguration): Promise<DomainVerificationResult> {
    try {
      const validation = await dnsService.validateRenderDNSConfiguration(domain.domain);
      
      if (validation.isValid) {
        return {
          success: true,
          message: 'DNS configuration is correct',
          details: validation.recommendations,
        };
      } else {
        return {
          success: false,
          message: 'DNS configuration is incorrect',
          details: validation.recommendations,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check DNS configuration',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Verify SSL certificate
   */
  private async verifySSLCertificate(domain: DomainConfiguration): Promise<DomainVerificationResult> {
    try {
      const sslInfo = await dnsService.verifySSLCertificate(domain.domain);
      
      if (sslInfo.valid) {
        return {
          success: true,
          message: 'SSL certificate is valid',
        };
      } else {
        return {
          success: false,
          message: sslInfo.error || 'SSL certificate is not valid',
          details: ['SSL certificate may still be provisioning. This can take up to 24 hours.'],
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify SSL certificate',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Verify domain accessibility
   */
  private async verifyDomainAccessibility(domain: DomainConfiguration): Promise<DomainVerificationResult> {
    try {
      const response = await fetch(`https://${domain.domain}`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      return {
        success: true,
        message: 'Domain is accessible',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Domain accessibility check timed out',
          details: ['The domain may be slow to respond or not properly configured'],
        };
      }

      return {
        success: false,
        message: 'Domain is not accessible',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Handle verification error (system error)
   */
  private async handleVerificationError(domainId: string, errorMessage: string): Promise<void> {
    await this.updateDomainStatus(domainId, 'failed', errorMessage);
    
    const status = this.verificationStatuses.get(domainId);
    if (status) {
      status.currentStep = {
        step: 'dns_check',
        message: errorMessage,
        progress: 0,
        isError: true,
      };
      status.isVerifying = false;
    }
  }

  /**
   * Handle verification failure (configuration issue)
   */
  private async handleVerificationFailure(
    domainId: string, 
    message: string, 
    details?: string[]
  ): Promise<void> {
    const status = this.verificationStatuses.get(domainId);
    if (!status) return;

    status.retryCount++;

    if (status.retryCount >= status.maxRetries) {
      await this.updateDomainStatus(domainId, 'failed', message);
      status.isVerifying = false;
      status.currentStep = {
        step: 'dns_check',
        message: `Verification failed after ${status.maxRetries} attempts: ${message}`,
        progress: 0,
        isError: true,
      };
    } else {
      await this.scheduleRetryVerification(domainId);
    }
  }

  /**
   * Schedule retry verification
   */
  private async scheduleRetryVerification(domainId: string): Promise<void> {
    const status = this.verificationStatuses.get(domainId);
    if (!status) return;

    const delayIndex = Math.min(status.retryCount, this.retryDelays.length - 1);
    const delay = this.retryDelays[delayIndex];
    
    status.nextCheck = new Date(Date.now() + delay);
    status.currentStep = {
      step: 'dns_check',
      message: `Retrying verification in ${Math.round(delay / 1000)} seconds... (Attempt ${status.retryCount + 1}/${status.maxRetries})`,
      progress: 10,
    };

    // Clear existing timer
    const existingTimer = this.verificationTimers.get(domainId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule retry
    const timer = setTimeout(() => {
      this.performVerification(domainId);
    }, delay);

    this.verificationTimers.set(domainId, timer);
  }

  /**
   * Update verification step progress
   */
  private async updateVerificationStep(domainId: string, step: VerificationProgress): Promise<void> {
    const status = this.verificationStatuses.get(domainId);
    if (status) {
      status.currentStep = step;
    }
  }

  /**
   * Get domain configuration from database
   */
  private async getDomainConfiguration(domainId: string): Promise<DomainConfiguration | null> {
    const { data, error } = await supabase
      .from('domain_configurations')
      .select('*')
      .eq('id', domainId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update domain status in database
   */
  private async updateDomainStatus(
    domainId: string, 
    status: DomainStatus, 
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'verified' || status === 'enabled') {
      updateData.last_verified_at = new Date().toISOString();
      updateData.error_message = null;
    } else if (status === 'failed' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    await supabase
      .from('domain_configurations')
      .update(updateData)
      .eq('id', domainId);
  }

  /**
   * Verify all pending domains
   */
  async verifyAllPendingDomains(): Promise<void> {
    const { data: domains } = await supabase
      .from('domain_configurations')
      .select('*')
      .in('status', ['pending', 'failed']);

    if (domains) {
      for (const domain of domains) {
        if (!this.verificationStatuses.has(domain.id)) {
          await this.startVerification(domain.id);
        }
      }
    }
  }

  /**
   * Clean up verification resources
   */
  cleanup(): void {
    // Clear all timers
    for (const timer of this.verificationTimers.values()) {
      clearTimeout(timer);
    }
    this.verificationTimers.clear();
    this.verificationStatuses.clear();
  }
}

// Export singleton instance
export const domainVerificationService = new DomainVerificationService();