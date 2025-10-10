/**
 * Domain validation utilities for custom domain configuration
 * Handles domain format validation, DNS record type detection, and ownership verification
 */

export type DNSRecordType = 'ANAME' | 'CNAME' | 'A';

export interface DomainValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface DNSRecordDetectionResult {
  recommendedType: DNSRecordType;
  supportsANAME: boolean;
  reason: string;
}

/**
 * Validates domain format using regex patterns
 * Supports both apex domains and subdomains
 */
export function validateDomainFormat(domain: string): DomainValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!domain || typeof domain !== 'string') {
    errors.push('Domain is required and must be a string');
    return { isValid: false, errors, warnings };
  }

  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase().trim();

  // Domain format regex - supports subdomains, apex domains, and international domains
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  
  if (!domainRegex.test(cleanDomain)) {
    errors.push('Invalid domain format. Domain must contain only letters, numbers, hyphens, and dots');
  }

  // Length validation
  if (cleanDomain.length > 253) {
    errors.push('Domain name is too long (maximum 253 characters)');
  }

  // Label length validation (each part between dots)
  const labels = cleanDomain.split('.');
  for (const label of labels) {
    if (label.length === 0) {
      errors.push('Domain cannot contain empty labels (consecutive dots)');
    } else if (label.length > 63) {
      errors.push(`Domain label "${label}" is too long (maximum 63 characters)`);
    } else if (label.startsWith('-') || label.endsWith('-')) {
      errors.push(`Domain label "${label}" cannot start or end with a hyphen`);
    }
  }

  // TLD validation (must have at least one dot and valid TLD)
  if (labels.length < 2) {
    errors.push('Domain must have at least one dot (e.g., example.com)');
  } else {
    const tld = labels[labels.length - 1];
    if (tld.length < 2) {
      errors.push('Top-level domain must be at least 2 characters long');
    }
  }

  // Reserved domains check
  const reservedDomains = ['localhost', 'example.com', 'test.com', 'invalid'];
  if (reservedDomains.some(reserved => cleanDomain.includes(reserved))) {
    warnings.push('This appears to be a reserved or example domain');
  }

  // WWW subdomain warning
  if (cleanDomain.startsWith('www.')) {
    warnings.push('Consider configuring both www and non-www variants for better accessibility');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Simple validation wrapper for backward compatibility
 */
export function validateDomain(domain: string): { isValid: boolean; error?: string } {
  const result = validateDomainFormat(domain);
  return {
    isValid: result.isValid,
    error: result.errors.length > 0 ? result.errors[0] : undefined
  };
}

/**
 * Detects the appropriate DNS record type based on domain and provider capabilities
 */
export function detectDNSRecordType(domain: string, isApexDomain: boolean = true): DNSRecordDetectionResult {
  const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase().trim();
  
  // Check if it's a subdomain (has www or other prefix)
  const isSubdomain = cleanDomain.split('.').length > 2 || cleanDomain.startsWith('www.');
  
  if (isSubdomain && !isApexDomain) {
    return {
      recommendedType: 'CNAME',
      supportsANAME: false,
      reason: 'Subdomains should use CNAME records pointing to the target service'
    };
  }

  // For apex domains, prefer ANAME/ALIAS if supported, fallback to A record
  if (isApexDomain || (!isSubdomain && !cleanDomain.startsWith('www.'))) {
    return {
      recommendedType: 'ANAME',
      supportsANAME: true,
      reason: 'Apex domains should use ANAME/ALIAS records when supported, or A records as fallback'
    };
  }

  return {
    recommendedType: 'CNAME',
    supportsANAME: false,
    reason: 'Subdomains typically use CNAME records for flexibility'
  };
}

/**
 * Validates domain ownership by checking DNS records
 * This is a basic implementation - in production, you'd want more sophisticated verification
 */
export async function verifyDomainOwnership(domain: string, expectedTarget: string): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic domain format validation first
    const formatValidation = validateDomainFormat(domain);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // In a real implementation, you would:
    // 1. Query DNS records using a DNS resolver
    // 2. Check if the domain points to the expected target
    // 3. Verify SSL certificate if HTTPS is required
    // 4. Check domain accessibility

    // For now, we'll simulate the verification process
    const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase().trim();
    
    // Simulate DNS lookup delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Basic checks that can be done client-side
    if (cleanDomain.includes('localhost') || cleanDomain.includes('127.0.0.1')) {
      errors.push('Cannot verify localhost or local IP addresses');
    }

    if (cleanDomain.includes('test') || cleanDomain.includes('example')) {
      warnings.push('This appears to be a test domain - verification may not work in production');
    }

    // In production, you would make actual DNS queries here
    // For now, we'll assume verification is pending and needs server-side processing
    warnings.push('Domain ownership verification requires server-side DNS lookup - this is a client-side validation only');

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Generates DNS configuration instructions based on domain and record type
 */
export function generateDNSInstructions(domain: string, recordType: DNSRecordType, target: string) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase().trim();
  const isWWW = cleanDomain.startsWith('www.');
  const recordName = isWWW ? 'www' : '@';

  const instructions = {
    recordType,
    name: recordName,
    value: target,
    ttl: 300, // 5 minutes for faster propagation during setup
    description: ''
  };

  switch (recordType) {
    case 'ANAME':
      instructions.description = `Create an ANAME (or ALIAS) record for ${recordName} pointing to ${target}`;
      break;
    case 'CNAME':
      instructions.description = `Create a CNAME record for ${recordName} pointing to ${target}`;
      break;
    case 'A':
      instructions.description = `Create an A record for ${recordName} pointing to ${target}`;
      break;
  }

  return instructions;
}

/**
 * Checks if a domain is an apex domain (no subdomain prefix)
 */
export function isApexDomain(domain: string): boolean {
  const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase().trim();
  const parts = cleanDomain.split('.');
  
  // Apex domain typically has 2 parts (domain.tld) or 3 for country codes (domain.co.uk)
  // But we need to be careful about subdomains
  if (parts.length === 2) return true;
  if (parts.length === 3 && parts[1].length === 2 && parts[2].length === 2) return true; // country code TLD
  
  return false;
}

/**
 * Extracts the apex domain from a subdomain
 */
export function getApexDomain(domain: string): string {
  const cleanDomain = domain.replace(/^https?:\/\//, '').toLowerCase().trim();
  const parts = cleanDomain.split('.');
  
  if (parts.length <= 2) return cleanDomain;
  
  // Handle country code TLDs (e.g., co.uk, co.th)
  if (parts.length >= 3 && parts[parts.length - 2].length === 2) {
    return parts.slice(-3).join('.');
  }
  
  // Standard TLD
  return parts.slice(-2).join('.');
}
