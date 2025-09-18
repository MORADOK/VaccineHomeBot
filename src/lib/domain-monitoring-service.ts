import { supabase } from '@/integrations/supabase/client';
import { DomainConfig } from '@/types/domain-config';

export interface DomainHealthCheck {
  domain: string;
  isAccessible: boolean;
  responseTime?: number;
  statusCode?: number;
  sslValid: boolean;
  sslExpiresAt?: Date;
  lastChecked: Date;
  error?: string;
}

export interface DomainAlert {
  id: string;
  domain: string;
  alertType: 'accessibility' | 'ssl_expiring' | 'ssl_expired' | 'config_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
  resolved: boolean;
}

class DomainMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SSL_WARNING_DAYS = 30; // Warn 30 days before expiration

  /**
   * Start the domain monitoring service
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.CHECK_INTERVAL);

    // Perform initial check
    this.performHealthChecks();
  }

  /**
   * Stop the domain monitoring service
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform health checks on all configured domains
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const domains = await this.getConfiguredDomains();
      
      for (const domain of domains) {
        const healthCheck = await this.checkDomainHealth(domain.domain);
        await this.updateDomainHealth(domain.id, healthCheck);
        await this.processAlerts(domain, healthCheck);
      }
    } catch (error) {
      console.error('Error performing domain health checks:', error);
    }
  }

  /**
   * Check the health of a specific domain
   */
  async checkDomainHealth(domain: string): Promise<DomainHealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check domain accessibility
      const response = await this.checkDomainAccessibility(domain);
      const responseTime = Date.now() - startTime;

      // Check SSL certificate
      const sslInfo = await this.checkSSLCertificate(domain);

      return {
        domain,
        isAccessible: response.ok,
        responseTime,
        statusCode: response.status,
        sslValid: sslInfo.valid,
        sslExpiresAt: sslInfo.expiresAt,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        domain,
        isAccessible: false,
        lastChecked: new Date(),
        sslValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if domain is accessible
   */
  private async checkDomainAccessibility(domain: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Avoid CORS issues for monitoring
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check SSL certificate status
   */
  private async checkSSLCertificate(domain: string): Promise<{ valid: boolean; expiresAt?: Date }> {
    try {
      // In a real implementation, this would use a proper SSL certificate checker
      // For now, we'll simulate the check based on successful HTTPS connection
      const response = await fetch(`https://${domain}`, {
        method: 'HEAD',
        mode: 'no-cors',
      });

      // In a production environment, you would use a proper SSL certificate API
      // or server-side service to get actual certificate information
      return {
        valid: response.ok || response.type === 'opaque',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Simulate 90 days
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Get all configured domains from the database
   */
  private async getConfiguredDomains(): Promise<DomainConfig[]> {
    const { data, error } = await supabase
      .from('domain_configurations')
      .select('*')
      .eq('status', 'enabled');

    if (error) {
      throw new Error(`Failed to fetch domains: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update domain health status in the database
   */
  private async updateDomainHealth(domainId: string, healthCheck: DomainHealthCheck): Promise<void> {
    const { error } = await supabase
      .from('domain_configurations')
      .update({
        last_health_check: healthCheck.lastChecked.toISOString(),
        is_accessible: healthCheck.isAccessible,
        ssl_valid: healthCheck.sslValid,
        ssl_expires_at: healthCheck.sslExpiresAt?.toISOString(),
        response_time_ms: healthCheck.responseTime,
        last_error: healthCheck.error,
      })
      .eq('id', domainId);

    if (error) {
      console.error('Failed to update domain health:', error);
    }
  }

  /**
   * Process and create alerts based on health check results
   */
  private async processAlerts(domain: DomainConfig, healthCheck: DomainHealthCheck): Promise<void> {
    const alerts: Omit<DomainAlert, 'id' | 'createdAt'>[] = [];

    // Check accessibility
    if (!healthCheck.isAccessible) {
      alerts.push({
        domain: domain.domain,
        alertType: 'accessibility',
        severity: 'critical',
        message: `Domain ${domain.domain} is not accessible. ${healthCheck.error || 'Unknown error'}`,
        resolved: false,
      });
    }

    // Check SSL expiration
    if (healthCheck.sslExpiresAt) {
      const daysUntilExpiry = Math.floor(
        (healthCheck.sslExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) {
        alerts.push({
          domain: domain.domain,
          alertType: 'ssl_expired',
          severity: 'critical',
          message: `SSL certificate for ${domain.domain} has expired`,
          resolved: false,
        });
      } else if (daysUntilExpiry <= this.SSL_WARNING_DAYS) {
        alerts.push({
          domain: domain.domain,
          alertType: 'ssl_expiring',
          severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
          message: `SSL certificate for ${domain.domain} expires in ${daysUntilExpiry} days`,
          resolved: false,
        });
      }
    }

    // Create alerts in database
    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }

  /**
   * Create an alert in the database
   */
  private async createAlert(alert: Omit<DomainAlert, 'id' | 'createdAt'>): Promise<void> {
    // Check if similar alert already exists and is unresolved
    const { data: existingAlerts } = await supabase
      .from('domain_alerts')
      .select('id')
      .eq('domain', alert.domain)
      .eq('alert_type', alert.alertType)
      .eq('resolved', false)
      .limit(1);

    if (existingAlerts && existingAlerts.length > 0) {
      return; // Alert already exists
    }

    const { error } = await supabase
      .from('domain_alerts')
      .insert({
        domain: alert.domain,
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        resolved: alert.resolved,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Get active alerts for a domain
   */
  async getActiveAlerts(domain?: string): Promise<DomainAlert[]> {
    let query = supabase
      .from('domain_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('domain_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }
  }

  /**
   * Detect configuration drift by comparing current DNS records with expected configuration
   */
  async detectConfigurationDrift(domain: string): Promise<boolean> {
    try {
      // Get expected configuration from database
      const { data: domainConfig } = await supabase
        .from('domain_configurations')
        .select('*')
        .eq('domain', domain)
        .single();

      if (!domainConfig) {
        return false;
      }

      // In a real implementation, this would query actual DNS records
      // and compare them with the expected configuration
      // For now, we'll simulate this check
      
      return false; // No drift detected in simulation
    } catch (error) {
      console.error('Error detecting configuration drift:', error);
      return false;
    }
  }
}

export const domainMonitoringService = new DomainMonitoringService();