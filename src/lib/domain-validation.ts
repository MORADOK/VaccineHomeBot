/**
 * Domain validation utilities for custom domain configuration.
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

function stripProtocol(domain: string): string {
  return domain.replace(/^https?:\/\//i, '').toLowerCase().trim();
}

export function validateDomainFormat(domain: string): DomainValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!domain || typeof domain !== 'string') {
    return { isValid: false, errors: ['Domain is required and must be a string'] };
  }

  const trimmed = domain.trim();
  const hadProtocol = /^https?:\/\//i.test(trimmed);
  const cleanDomain = stripProtocol(trimmed);

  // A URL prefix is accepted by the helper, but HTTP is deliberately rejected:
  // production custom domains must use HTTPS. HTTPS remains accepted and normalized.
  if (/^http:\/\//i.test(trimmed)) {
    errors.push('HTTP protocol is not allowed; use HTTPS or enter the domain without a protocol');
  }

  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  if (!domainRegex.test(cleanDomain)) {
    errors.push('Invalid domain format. Domain must contain only letters, numbers, hyphens, and dots');
  }

  if (cleanDomain.length > 253) errors.push('Domain name is too long (maximum 253 characters)');

  const labels = cleanDomain.split('.');
  for (const label of labels) {
    if (!label) errors.push('Domain cannot contain empty labels (consecutive dots)');
    else if (label.length > 63) errors.push(`Domain label "${label}" is too long (maximum 63 characters)`);
    else if (label.startsWith('-') || label.endsWith('-')) errors.push(`Domain label "${label}" cannot start or end with a hyphen`);
  }

  if (labels.length < 2) {
    errors.push('Domain must have at least one dot (e.g., example.com)');
  } else if (labels[labels.length - 1].length < 2) {
    errors.push('Top-level domain must be at least 2 characters long');
  }

  // Put the actionable www warning first so UI/tests consistently surface it.
  if (cleanDomain.startsWith('www.')) {
    warnings.push('Consider configuring both www and non-www variants for better accessibility');
  }

  const reservedDomains = ['example.com', 'test.com', 'invalid'];
  if (reservedDomains.some(reserved => cleanDomain === reserved || cleanDomain.endsWith(`.${reserved}`))) {
    warnings.push('This appears to be a reserved or example domain');
  }

  // Silence TS unused analysis while retaining the explicit normalization intent above.
  void hadProtocol;

  return { isValid: errors.length === 0, errors, warnings: warnings.length ? warnings : undefined };
}

export function validateDomain(domain: string): { isValid: boolean; error?: string } {
  const result = validateDomainFormat(domain);
  return { isValid: result.isValid, error: result.errors[0] };
}

export function detectDNSRecordType(domain: string, isApexDomain: boolean = true): DNSRecordDetectionResult {
  const cleanDomain = stripProtocol(domain);
  const isSubdomain = cleanDomain.split('.').length > 2 || cleanDomain.startsWith('www.');
  if (isSubdomain && !isApexDomain) return { recommendedType: 'CNAME', supportsANAME: false, reason: 'Subdomains should use CNAME records pointing to the target service' };
  if (isApexDomain || (!isSubdomain && !cleanDomain.startsWith('www.'))) return { recommendedType: 'ANAME', supportsANAME: true, reason: 'Apex domains should use ANAME/ALIAS records when supported, or A records as fallback' };
  return { recommendedType: 'CNAME', supportsANAME: false, reason: 'Subdomains typically use CNAME records for flexibility' };
}

export async function verifyDomainOwnership(domain: string, expectedTarget: string): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    const cleanDomain = stripProtocol(domain);
    // Give local addresses a precise error before generic domain-format validation.
    if (cleanDomain === 'localhost' || cleanDomain === '127.0.0.1' || cleanDomain.endsWith('.localhost')) {
      return { isValid: false, errors: ['Cannot verify localhost or local IP addresses'] };
    }

    const formatValidation = validateDomainFormat(domain);
    if (!formatValidation.isValid) return formatValidation;

    await new Promise(resolve => setTimeout(resolve, 100));
    if (cleanDomain.includes('test') || cleanDomain.includes('example')) warnings.push('This appears to be a test domain - verification may not work in production');
    warnings.push('Domain ownership verification requires server-side DNS lookup - this is a client-side validation only');
    void expectedTarget;
    return { isValid: errors.length === 0, errors, warnings };
  } catch (error) {
    errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}

export function generateDNSInstructions(domain: string, recordType: DNSRecordType, target: string) {
  const cleanDomain = stripProtocol(domain);
  const recordName = cleanDomain.startsWith('www.') ? 'www' : '@';
  const instructions = { recordType, name: recordName, value: target, ttl: 300, description: '' };
  if (recordType === 'ANAME') instructions.description = `Create an ANAME (or ALIAS) record for ${recordName} pointing to ${target}`;
  else if (recordType === 'CNAME') instructions.description = `Create a CNAME record for ${recordName} pointing to ${target}`;
  else instructions.description = `Create an A record for ${recordName} pointing to ${target}`;
  return instructions;
}

export function isApexDomain(domain: string): boolean {
  const parts = stripProtocol(domain).split('.');
  if (parts.length === 2) return true;
  if (parts.length === 3 && parts[1].length === 2 && parts[2].length === 2) return true;
  return false;
}

export function getApexDomain(domain: string): string {
  const cleanDomain = stripProtocol(domain);
  const parts = cleanDomain.split('.');
  if (parts.length <= 2) return cleanDomain;
  if (parts.length >= 3 && parts[parts.length - 2].length === 2) return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}
