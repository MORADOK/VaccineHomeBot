import { z } from 'zod';

// DNS Record Types
export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'ANAME' | 'ALIAS' | 'TXT' | 'MX';

export interface DNSRecord {
  type: DNSRecordType;
  name: string;
  value: string;
  ttl?: number;
}

export interface DNSCheckResult {
  success: boolean;
  records: DNSRecord[];
  error?: string;
  propagated: boolean;
}

export interface SSLCertificateInfo {
  valid: boolean;
  issuer?: string;
  expiresAt?: Date;
  error?: string;
}

export interface DNSPropagationStatus {
  domain: string;
  recordType: DNSRecordType;
  expectedValue: string;
  actualValues: string[];
  propagated: boolean;
  checkedAt: Date;
}

// Validation schemas
const dnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'ANAME', 'ALIAS', 'TXT', 'MX']),
  name: z.string().min(1),
  value: z.string().min(1),
  ttl: z.number().optional(),
});

const domainSchema = z.string().regex(
  /^(?!-)(?!.*--)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.[a-zA-Z0-9-]{1,63}(?<!-))*$/,
  'Invalid domain format'
);

export class DNSConfigurationService {
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 30000; // 30 seconds

  /**
   * Parse and validate DNS record data
   */
  parseDNSRecord(recordData: unknown): DNSRecord {
    const parsed = dnsRecordSchema.parse(recordData);
    return parsed as DNSRecord;
  }

  /**
   * Validate domain format
   */
  validateDomain(domain: string): boolean {
    try {
      domainSchema.parse(domain);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check DNS propagation status for a domain and record type
   */
  async checkDNSPropagation(
    domain: string, 
    recordType: DNSRecordType, 
    expectedValue: string
  ): Promise<DNSPropagationStatus> {
    if (!this.validateDomain(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }

    const result = await this.performDNSLookupWithRetry(domain, recordType);
    
    const actualValues = result.records.map(record => record.value);
    const propagated = actualValues.includes(expectedValue);

    return {
      domain,
      recordType,
      expectedValue,
      actualValues,
      propagated,
      checkedAt: new Date(),
    };
  }

  /**
   * Perform DNS lookup with retry logic and exponential backoff
   */
  private async performDNSLookupWithRetry(
    domain: string, 
    recordType: DNSRecordType,
    attempt = 1
  ): Promise<DNSCheckResult> {
    try {
      return await this.performDNSLookup(domain, recordType);
    } catch (error) {
      if (attempt >= this.maxRetries) {
        return {
          success: false,
          records: [],
          error: error instanceof Error ? error.message : 'DNS lookup failed',
          propagated: false,
        };
      }

      const delay = Math.min(
        this.baseDelay * Math.pow(2, attempt - 1),
        this.maxDelay
      );

      await this.sleep(delay);
      return this.performDNSLookupWithRetry(domain, recordType, attempt + 1);
    }
  }

  /**
   * Perform actual DNS lookup using browser APIs or fallback methods
   */
  private async performDNSLookup(domain: string, recordType: DNSRecordType): Promise<DNSCheckResult> {
    // In a browser environment, we need to use external DNS APIs
    // This is a simplified implementation that would need to be adapted based on available services
    
    try {
      // For demonstration, using a public DNS-over-HTTPS service
      const dohUrl = `https://cloudflare-dns.com/dns-query?name=${domain}&type=${recordType}`;
      
      const response = await fetch(dohUrl, {
        headers: {
          'Accept': 'application/dns-json',
        },
      });

      if (!response.ok) {
        throw new Error(`DNS query failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const records: DNSRecord[] = (data.Answer || []).map((answer: any) => ({
        type: recordType,
        name: domain,
        value: answer.data,
        ttl: answer.TTL,
      }));

      return {
        success: true,
        records,
        propagated: records.length > 0,
      };
    } catch (error) {
      throw new Error(`DNS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify SSL certificate status for a domain
   */
  async verifySSLCertificate(domain: string): Promise<SSLCertificateInfo> {
    if (!this.validateDomain(domain)) {
      return {
        valid: false,
        error: `Invalid domain format: ${domain}`,
      };
    }

    try {
      // In a browser environment, we can check SSL by making a request
      const url = `https://${domain}`;
      
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // Avoid CORS issues for SSL check
      });

      // If we can make the request without SSL errors, certificate is valid
      return {
        valid: true,
        // Note: Browser security restrictions prevent accessing certificate details
        // In a Node.js environment, we could use the 'tls' module for more details
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'SSL verification failed',
      };
    }
  }

  /**
   * Check if DNS records are properly configured for Render hosting
   */
  async validateRenderDNSConfiguration(domain: string): Promise<{
    isValid: boolean;
    recordType: DNSRecordType | null;
    currentValue: string | null;
    expectedValues: string[];
    recommendations: string[];
  }> {
    const expectedValues = [
      'line-intent-router-bot.onrender.com', // ANAME/CNAME target
      '216.24.57.1', // A record fallback
    ];

    const recommendations: string[] = [];
    
    // Check for ANAME/ALIAS records first (preferred)
    let anameResult: DNSPropagationStatus | null = null;
    try {
      anameResult = await Promise.race([
        this.checkDNSPropagation(domain, 'ANAME', expectedValues[0]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]);
    } catch {
      // ANAME not supported or failed
    }

    // Check for CNAME records
    let cnameResult: DNSPropagationStatus | null = null;
    try {
      cnameResult = await Promise.race([
        this.checkDNSPropagation(domain, 'CNAME', expectedValues[0]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]);
    } catch {
      // CNAME failed
    }

    // Check for A records
    let aResult: DNSPropagationStatus | null = null;
    try {
      aResult = await Promise.race([
        this.checkDNSPropagation(domain, 'A', expectedValues[1]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]);
    } catch {
      // A record failed
    }

    // Determine the best configuration
    if (anameResult?.propagated) {
      return {
        isValid: true,
        recordType: 'ANAME',
        currentValue: expectedValues[0],
        expectedValues,
        recommendations: ['ANAME record is properly configured'],
      };
    }

    if (cnameResult?.propagated) {
      return {
        isValid: true,
        recordType: 'CNAME',
        currentValue: expectedValues[0],
        expectedValues,
        recommendations: ['CNAME record is properly configured'],
      };
    }

    if (aResult?.propagated) {
      return {
        isValid: true,
        recordType: 'A',
        currentValue: expectedValues[1],
        expectedValues,
        recommendations: [
          'A record is configured correctly',
          'Consider using ANAME/ALIAS record if your DNS provider supports it for better reliability',
        ],
      };
    }

    // No valid configuration found
    if (anameResult?.actualValues.length || cnameResult?.actualValues.length || aResult?.actualValues.length) {
      recommendations.push('DNS records exist but point to incorrect values');
      recommendations.push(`Expected: ${expectedValues.join(' or ')}`);
      
      const currentValue = anameResult?.actualValues[0] || cnameResult?.actualValues[0] || aResult?.actualValues[0] || null;
      
      return {
        isValid: false,
        recordType: anameResult?.actualValues.length ? 'ANAME' : 
                   cnameResult?.actualValues.length ? 'CNAME' : 'A',
        currentValue,
        expectedValues,
        recommendations,
      };
    }

    recommendations.push('No DNS records found for this domain');
    recommendations.push('Add an ANAME record pointing to line-intent-router-bot.onrender.com');
    recommendations.push('Or add an A record pointing to 216.24.57.1 if ANAME is not supported');

    return {
      isValid: false,
      recordType: null,
      currentValue: null,
      expectedValues,
      recommendations,
    };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get DNS configuration instructions for different providers
   */
  getDNSInstructions(domain: string, recordType: DNSRecordType): {
    recordType: DNSRecordType;
    name: string;
    value: string;
    instructions: string[];
  } {
    const isWwwSubdomain = domain.startsWith('www.');
    const rootDomain = isWwwSubdomain ? domain.substring(4) : domain;
    
    const instructions: string[] = [];
    let name: string;
    let value: string;

    if (recordType === 'ANAME' || recordType === 'ALIAS') {
      name = isWwwSubdomain ? 'www' : '@';
      value = 'line-intent-router-bot.onrender.com';
      instructions.push('Log in to your DNS provider\'s control panel');
      instructions.push(`Create an ${recordType} record`);
      instructions.push(`Set Name/Host to: ${name}`);
      instructions.push(`Set Value/Target to: ${value}`);
      instructions.push('Save the record and wait for DNS propagation (up to 48 hours)');
    } else if (recordType === 'CNAME') {
      name = 'www';
      value = isWwwSubdomain ? 'line-intent-router-bot.onrender.com' : rootDomain;
      instructions.push('Log in to your DNS provider\'s control panel');
      instructions.push('Create a CNAME record');
      instructions.push(`Set Name/Host to: ${name}`);
      instructions.push(`Set Value/Target to: ${value}`);
      instructions.push('Save the record and wait for DNS propagation (up to 48 hours)');
    } else if (recordType === 'A') {
      name = isWwwSubdomain ? 'www' : '@';
      value = '216.24.57.1';
      instructions.push('Log in to your DNS provider\'s control panel');
      instructions.push('Create an A record');
      instructions.push(`Set Name/Host to: ${name}`);
      instructions.push(`Set Value/Target to: ${value}`);
      instructions.push('Save the record and wait for DNS propagation (up to 48 hours)');
    } else {
      throw new Error(`Unsupported record type for domain configuration: ${recordType}`);
    }

    return {
      recordType,
      name,
      value,
      instructions,
    };
  }

  /**
   * Detect DNS provider capabilities based on domain's nameservers
   */
  async detectDNSProviderCapabilities(domain: string): Promise<{
    provider: string | null;
    supportsANAME: boolean;
    supportsALIAS: boolean;
    supportsCNAME: boolean;
    supportsA: boolean;
    confidence: number;
  }> {
    if (!this.validateDomain(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }

    try {
      // Try to get nameserver information
      const nsResult = await this.performDNSLookup(domain, 'NS' as DNSRecordType);
      
      if (!nsResult.success || nsResult.records.length === 0) {
        return {
          provider: null,
          supportsANAME: false,
          supportsALIAS: false,
          supportsCNAME: true,
          supportsA: true,
          confidence: 0,
        };
      }

      const nameservers = nsResult.records.map(record => record.value.toLowerCase());
      
      // Detect provider based on nameserver patterns
      const providerPatterns = [
        {
          name: 'cloudflare',
          patterns: ['cloudflare.com', 'ns.cloudflare.com'],
          capabilities: { supportsANAME: false, supportsALIAS: true, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'godaddy',
          patterns: ['domaincontrol.com', 'godaddy.com'],
          capabilities: { supportsANAME: false, supportsALIAS: false, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'namecheap',
          patterns: ['registrar-servers.com', 'namecheap.com'],
          capabilities: { supportsANAME: false, supportsALIAS: true, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'route53',
          patterns: ['awsdns', 'amazonaws.com'],
          capabilities: { supportsANAME: false, supportsALIAS: true, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'digitalocean',
          patterns: ['digitalocean.com', 'ns1.digitalocean.com'],
          capabilities: { supportsANAME: false, supportsALIAS: false, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'google-domains',
          patterns: ['googledomains.com', 'google.com'],
          capabilities: { supportsANAME: false, supportsALIAS: false, supportsCNAME: true, supportsA: true }
        }
      ];

      for (const provider of providerPatterns) {
        const matches = nameservers.some(ns => 
          provider.patterns.some(pattern => ns.includes(pattern))
        );
        
        if (matches) {
          return {
            provider: provider.name,
            ...provider.capabilities,
            confidence: 0.9,
          };
        }
      }

      // Default capabilities for unknown providers
      return {
        provider: 'unknown',
        supportsANAME: true, // Assume support for modern features
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0.3,
      };

    } catch (error) {
      // Fallback to conservative capabilities
      return {
        provider: null,
        supportsANAME: false,
        supportsALIAS: false,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0,
      };
    }
  }

  /**
   * Get recommended DNS record type based on domain and provider capabilities
   */
  getRecommendedRecordType(
    domain: string,
    providerCapabilities: {
      supportsANAME: boolean;
      supportsALIAS: boolean;
      supportsCNAME: boolean;
      supportsA: boolean;
    }
  ): DNSRecordType {
    const isRootDomain = !domain.includes('.') || domain.split('.').length === 2;
    const isWwwSubdomain = domain.startsWith('www.');

    if (isRootDomain) {
      // For root domains, prefer ANAME/ALIAS, fallback to A
      if (providerCapabilities.supportsANAME) {
        return 'ANAME';
      } else if (providerCapabilities.supportsALIAS) {
        return 'ALIAS';
      } else {
        return 'A';
      }
    } else {
      // For subdomains, prefer CNAME, fallback to A
      if (providerCapabilities.supportsCNAME) {
        return 'CNAME';
      } else {
        return 'A';
      }
    }
  }
}

// Export singleton instance
export const dnsService = new DNSConfigurationService();

// Export convenience functions for backward compatibility
export async function checkDNSPropagation(domain: string): Promise<{ 
  isResolved: boolean; 
  resolvedIPs?: string[];
  error?: string;
}> {
  try {
    const result = await dnsService.checkDNSPropagation(domain, 'A', '');
    return {
      isResolved: result.propagated,
      resolvedIPs: result.actualValues,
    };
  } catch (error) {
    return {
      isResolved: false,
      error: error instanceof Error ? error.message : 'DNS check failed'
    };
  }
}

export async function verifySSLCertificate(domain: string): Promise<{ 
  isValid: boolean; 
  error?: string;
}> {
  const result = await dnsService.verifySSLCertificate(domain);
  return {
    isValid: result.valid,
    error: result.error
  };
}