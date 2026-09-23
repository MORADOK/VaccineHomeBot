import { describe, it, expect } from 'vitest';
import { validateDomainFormat, detectDNSRecordType, verifyDomainOwnership, generateDNSInstructions, isApexDomain, getApexDomain } from '../domain-validation';

describe('validateDomainFormat', () => {
  it('validates correct domain formats', () => {
    ['example.com','www.example.com','subdomain.example.com','vaccinehomehospital.co.th','www.vaccinehomehospital.co.th','api.service.example.org','test-domain.com','domain123.net'].forEach(domain => {
      const result = validateDomainFormat(domain); expect(result.isValid).toBe(true); expect(result.errors).toHaveLength(0);
    });
  });
  it('rejects invalid domain formats', () => {
    ['', 'invalid','domain.','.domain.com','domain..com','domain-.com','-domain.com','domain.c','a'.repeat(64)+'.com','domain with spaces.com'].forEach(domain => {
      const result = validateDomainFormat(domain); expect(result.isValid).toBe(false); expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  it('normalizes protocol prefixes correctly', () => {
    expect(validateDomainFormat('https://example.com').isValid).toBe(true);
    expect(validateDomainFormat('http://example.com').isValid).toBe(false);
    expect(validateDomainFormat('example.com').isValid).toBe(true);
  });
  it('warns for www subdomains', () => { const r=validateDomainFormat('www.example.com'); expect(r.isValid).toBe(true); expect(r.warnings?.[0]).toContain('www and non-www variants'); });
  it('warns about reserved domains', () => { const r=validateDomainFormat('test.example.com'); expect(r.isValid).toBe(true); expect(r.warnings?.some(x=>x.includes('reserved or example domain'))).toBe(true); });
  it('validates domain length limits', () => { const r=validateDomainFormat('a'.repeat(260)+'.com'); expect(r.isValid).toBe(false); expect(r.errors.some(e=>e.includes('too long'))).toBe(true); });
});

describe('detectDNSRecordType', () => {
  it('recommends ANAME for apex',()=>{const r=detectDNSRecordType('example.com',true);expect(r.recommendedType).toBe('ANAME');expect(r.supportsANAME).toBe(true);});
  it('recommends CNAME for subdomain',()=>{const r=detectDNSRecordType('www.example.com',false);expect(r.recommendedType).toBe('CNAME');expect(r.supportsANAME).toBe(false);});
  it('handles ccTLD www',()=>expect(detectDNSRecordType('www.vaccinehomehospital.co.th',false).recommendedType).toBe('CNAME'));
  it('handles complex subdomains',()=>expect(detectDNSRecordType('api.service.example.com',false).recommendedType).toBe('CNAME'));
});

describe('verifyDomainOwnership', () => {
  it('validates format first',async()=>expect((await verifyDomainOwnership('invalid-domain','target.com')).isValid).toBe(false));
  it('rejects localhost precisely',async()=>{const r=await verifyDomainOwnership('localhost','target.com');expect(r.isValid).toBe(false);expect(r.errors.some(e=>e.includes('localhost'))).toBe(true);});
  it('warns about test domains',async()=>expect((await verifyDomainOwnership('test.example.com','target.com')).warnings?.some(w=>w.includes('test domain'))).toBe(true));
  it('handles valid domains',async()=>{const r=await verifyDomainOwnership('example.com','line-intent-router-bot.onrender.com');expect(r.isValid).toBe(true);expect(r.warnings?.some(w=>w.includes('server-side'))).toBe(true);});
  it('handles empty input',async()=>expect((await verifyDomainOwnership('','target.com')).isValid).toBe(false));
});

describe('generateDNSInstructions',()=>{
  it('ANAME apex',()=>{const r=generateDNSInstructions('example.com','ANAME','target.com');expect(r.name).toBe('@');expect(r.recordType).toBe('ANAME');});
  it('CNAME www',()=>{const r=generateDNSInstructions('www.example.com','CNAME','target.com');expect(r.name).toBe('www');expect(r.description).toContain('CNAME');});
  it('A record',()=>expect(generateDNSInstructions('example.com','A','216.24.57.1').description).toContain('A record'));
  it('protocol prefix',()=>expect(generateDNSInstructions('https://www.example.com','CNAME','target.com').name).toBe('www'));
});

describe('isApexDomain',()=>{
  it('identifies apex',()=>['example.com','vaccinehomehospital.co.th','domain.org','site.net'].forEach(x=>expect(isApexDomain(x)).toBe(true)));
  it('identifies subdomains',()=>['www.example.com','api.example.com','subdomain.vaccinehomehospital.co.th','deep.nested.subdomain.example.com'].forEach(x=>expect(isApexDomain(x)).toBe(false)));
  it('handles ccTLD',()=>{expect(isApexDomain('example.co.uk')).toBe(true);expect(isApexDomain('www.example.co.uk')).toBe(false);});
  it('handles protocol',()=>{expect(isApexDomain('https://example.com')).toBe(true);expect(isApexDomain('http://www.example.com')).toBe(false);});
});

describe('getApexDomain',()=>{
  it('extracts apex',()=>{expect(getApexDomain('www.example.com')).toBe('example.com');expect(getApexDomain('api.service.example.com')).toBe('example.com');});
  it('keeps apex',()=>expect(getApexDomain('example.com')).toBe('example.com'));
  it('handles ccTLD',()=>expect(getApexDomain('api.vaccinehomehospital.co.th')).toBe('vaccinehomehospital.co.th'));
  it('handles protocol',()=>expect(getApexDomain('https://www.example.com')).toBe('example.com'));
  it('handles edge cases',()=>expect(getApexDomain('single')).toBe('single'));
});
