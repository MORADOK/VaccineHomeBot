import { describe, it, expect } from 'vitest';
import {
  validateDomainFormat,
  detectDNSRecordType,
  verifyDomainOwnership,
  generateDNSInstructions,
  isApexDomain,
  getApexDomain,
  type DomainValidationResult,
  type DNSRecordDetectionResult
} from '../domain-validation';

describe('validateDomainFormat', () => {
  it('should validate correct domain formats', () => {
    const validDomains = [
      'example.com',
      'www.example.com',
      'subdomain.example.com',
      'vaccinehomehospital.co.th',
      'www.vaccinehomehospital.co.th',
      'api.service.example.org',
      'test-domain.com',
      'domain123.net'
    ];

    validDomains.forEach(domain => {
      const result = validateDomainFormat(domain);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should reject invalid domain formats', () => {
    const invalidDomains = [
      '',
      'invalid',
      'domain.',
      '.domain.com',
      'domain..com',
      'domain-.com',
      '-domain.com',
      'domain.c',
      'very-long-label-that-exceeds-sixty-three-characters-limit-test.com',
      'http://example.com', // should be cleaned but test raw
      'domain with spaces.com'
    ];

    invalidDomains.forEach(domain => {
      const result = validateDomainFormat(domain);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  it('should handle protocol prefixes correctly', () => {
    const result1 = validateDomainFormat('https://example.com');
    const result2 = validateDomainFormat('http://example.com');
    const result3 = validateDomainFormat('example.com');

    expect(result1.isValid).toBe(true);
    expect(result2.isValid).toBe(true);
    expect(result3.isValid).toBe(true);
  });

  it('should provide warnings for www subdomains', () => {
    const result = validateDomainFormat('www.example.com');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.[0]).toContain('www and non-www variants');
  });

  it('should warn about reserved domains', () => {
    const result = validateDomainFormat('test.example.com');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.[0]).toContain('reserved or example domain');
  });

  it('should validate domain length limits', () => {
    // Test maximum domain length (253 characters)
    const longDomain = 'a'.repeat(250) + '.com';
    const tooLongDomain = 'a'.repeat(260) + '.com';

    const result1 = validateDomainFormat(longDomain);
    const result2 = validateDomainFormat(tooLongDomain);

    expect(result2.isValid).toBe(false);
    expect(result2.errors.some(e => e.includes('too long'))).toBe(true);
  });
});

describe('detectDNSRecordType', () => {
  it('should recommend ANAME for apex domains', () => {
    const result = detectDNSRecordType('example.com', true);
    expect(result.recommendedType).toBe('ANAME');
    expect(result.supportsANAME).toBe(true);
    expect(result.reason).toContain('Apex domains');
  });

  it('should recommend CNAME for subdomains', () => {
    const result = detectDNSRecordType('www.example.com', false);
    expect(result.recommendedType).toBe('CNAME');
    expect(result.supportsANAME).toBe(false);
    expect(result.reason).toContain('CNAME');
  });

  it('should handle www subdomains correctly', () => {
    const result = detectDNSRecordType('www.vaccinehomehospital.co.th', false);
    expect(result.recommendedType).toBe('CNAME');
    expect(result.supportsANAME).toBe(false);
  });

  it('should detect complex subdomains', () => {
    const result = detectDNSRecordType('api.service.example.com', false);
    expect(result.recommendedType).toBe('CNAME');
    expect(result.supportsANAME).toBe(false);
  });
});

describe('verifyDomainOwnership', () => {
  it('should validate domain format before verification', async () => {
    const result = await verifyDomainOwnership('invalid-domain', 'target.com');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject localhost domains', async () => {
    const result = await verifyDomainOwnership('localhost', 'target.com');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('localhost'))).toBe(true);
  });

  it('should warn about test domains', async () => {
    const result = await verifyDomainOwnership('test.example.com', 'target.com');
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('test domain'))).toBe(true);
  });

  it('should handle valid domains with warnings', async () => {
    const result = await verifyDomainOwnership('example.com', 'line-intent-router-bot.onrender.com');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('server-side'))).toBe(true);
  });

  it('should handle verification errors gracefully', async () => {
    // Test with a domain that would cause format validation to fail
    const result = await verifyDomainOwnership('', 'target.com');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('generateDNSInstructions', () => {
  it('should generate ANAME instructions for apex domain', () => {
    const instructions = generateDNSInstructions(
      'example.com',
      'ANAME',
      'line-intent-router-bot.onrender.com'
    );

    expect(instructions.recordType).toBe('ANAME');
    expect(instructions.name).toBe('@');
    expect(instructions.value).toBe('line-intent-router-bot.onrender.com');
    expect(instructions.description).toContain('ANAME');
    expect(instructions.ttl).toBe(300);
  });

  it('should generate CNAME instructions for www subdomain', () => {
    const instructions = generateDNSInstructions(
      'www.example.com',
      'CNAME',
      'line-intent-router-bot.onrender.com'
    );

    expect(instructions.recordType).toBe('CNAME');
    expect(instructions.name).toBe('www');
    expect(instructions.value).toBe('line-intent-router-bot.onrender.com');
    expect(instructions.description).toContain('CNAME');
  });

  it('should generate A record instructions', () => {
    const instructions = generateDNSInstructions(
      'example.com',
      'A',
      '216.24.57.1'
    );

    expect(instructions.recordType).toBe('A');
    expect(instructions.name).toBe('@');
    expect(instructions.value).toBe('216.24.57.1');
    expect(instructions.description).toContain('A record');
  });

  it('should handle protocol prefixes in domain', () => {
    const instructions = generateDNSInstructions(
      'https://www.example.com',
      'CNAME',
      'target.com'
    );

    expect(instructions.name).toBe('www');
  });
});

describe('isApexDomain', () => {
  it('should identify apex domains correctly', () => {
    const apexDomains = [
      'example.com',
      'vaccinehomehospital.co.th',
      'domain.org',
      'site.net'
    ];

    apexDomains.forEach(domain => {
      expect(isApexDomain(domain)).toBe(true);
    });
  });

  it('should identify subdomains correctly', () => {
    const subdomains = [
      'www.example.com',
      'api.example.com',
      'subdomain.vaccinehomehospital.co.th',
      'deep.nested.subdomain.example.com'
    ];

    subdomains.forEach(domain => {
      expect(isApexDomain(domain)).toBe(false);
    });
  });

  it('should handle country code TLDs', () => {
    expect(isApexDomain('example.co.uk')).toBe(true);
    expect(isApexDomain('example.co.th')).toBe(true);
    expect(isApexDomain('www.example.co.uk')).toBe(false);
  });

  it('should handle protocol prefixes', () => {
    expect(isApexDomain('https://example.com')).toBe(true);
    expect(isApexDomain('http://www.example.com')).toBe(false);
  });
});

describe('getApexDomain', () => {
  it('should extract apex domain from subdomains', () => {
    expect(getApexDomain('www.example.com')).toBe('example.com');
    expect(getApexDomain('api.service.example.com')).toBe('example.com');
    expect(getApexDomain('deep.nested.subdomain.example.org')).toBe('example.org');
  });

  it('should return apex domain unchanged', () => {
    expect(getApexDomain('example.com')).toBe('example.com');
    expect(getApexDomain('domain.org')).toBe('domain.org');
  });

  it('should handle country code TLDs', () => {
    expect(getApexDomain('www.example.co.uk')).toBe('example.co.uk');
    expect(getApexDomain('api.vaccinehomehospital.co.th')).toBe('vaccinehomehospital.co.th');
    expect(getApexDomain('subdomain.example.co.th')).toBe('example.co.th');
  });

  it('should handle protocol prefixes', () => {
    expect(getApexDomain('https://www.example.com')).toBe('example.com');
    expect(getApexDomain('http://api.example.co.uk')).toBe('example.co.uk');
  });

  it('should handle edge cases', () => {
    expect(getApexDomain('single')).toBe('single');
    expect(getApexDomain('two.parts')).toBe('two.parts');
  });
});