import { describe, it, expect, beforeEach } from 'vitest';
import { DNSConfigurationService } from '../dns-service';

describe('DNSConfigurationService Core Functionality', () => {
  let service: DNSConfigurationService;

  beforeEach(() => {
    service = new DNSConfigurationService();
  });

  describe('DNS Record Parsing and Validation', () => {
    it('should parse valid DNS records correctly', () => {
      const validRecord = {
        type: 'A' as const,
        name: 'example.com',
        value: '192.168.1.1',
        ttl: 300,
      };

      const result = service.parseDNSRecord(validRecord);
      expect(result).toEqual(validRecord);
    });

    it('should validate domain formats correctly', () => {
      // Valid domains
      expect(service.validateDomain('example.com')).toBe(true);
      expect(service.validateDomain('www.example.com')).toBe(true);
      expect(service.validateDomain('vaccinehomehospital.co.th')).toBe(true);
      expect(service.validateDomain('sub.domain.example.com')).toBe(true);

      // Invalid domains
      expect(service.validateDomain('')).toBe(false);
      expect(service.validateDomain('invalid..domain.com')).toBe(false);
      expect(service.validateDomain('.example.com')).toBe(false);
      expect(service.validateDomain('-example.com')).toBe(false);
      expect(service.validateDomain('example-.com')).toBe(false);
    });
  });

  describe('DNS Instructions Generation', () => {
    it('should generate correct ANAME instructions for root domain', () => {
      const result = service.getDNSInstructions('example.com', 'ANAME');
      
      expect(result.recordType).toBe('ANAME');
      expect(result.name).toBe('@');
      expect(result.value).toBe('line-intent-router-bot.onrender.com');
      expect(result.instructions).toContain('Create an ANAME record');
      expect(result.instructions.some(instruction => 
        instruction.includes('Set Name/Host to: @')
      )).toBe(true);
    });

    it('should generate correct CNAME instructions for www subdomain', () => {
      const result = service.getDNSInstructions('www.example.com', 'CNAME');
      
      expect(result.recordType).toBe('CNAME');
      expect(result.name).toBe('www');
      expect(result.value).toBe('line-intent-router-bot.onrender.com');
      expect(result.instructions).toContain('Create a CNAME record');
    });

    it('should generate correct A record instructions', () => {
      const result = service.getDNSInstructions('example.com', 'A');
      
      expect(result.recordType).toBe('A');
      expect(result.name).toBe('@');
      expect(result.value).toBe('216.24.57.1');
      expect(result.instructions).toContain('Create an A record');
      expect(result.instructions.some(instruction => 
        instruction.includes('216.24.57.1')
      )).toBe(true);
    });

    it('should handle www subdomain correctly for A records', () => {
      const result = service.getDNSInstructions('www.example.com', 'A');
      
      expect(result.name).toBe('www');
      expect(result.value).toBe('216.24.57.1');
    });

    it('should throw error for unsupported record types', () => {
      expect(() => {
        service.getDNSInstructions('example.com', 'MX');
      }).toThrow('Unsupported record type for domain configuration: MX');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid DNS record data', () => {
      const invalidRecord = {
        type: 'INVALID_TYPE',
        name: 'example.com',
        value: '192.168.1.1',
      };

      expect(() => service.parseDNSRecord(invalidRecord)).toThrow();
    });

    it('should handle missing required fields in DNS records', () => {
      const incompleteRecord = {
        type: 'A',
        name: '', // Empty name should fail
        value: '192.168.1.1',
      };

      expect(() => service.parseDNSRecord(incompleteRecord)).toThrow();
    });
  });

  describe('Configuration Logic', () => {
    it('should provide correct expected values for Render configuration', () => {
      // This tests the internal logic without network calls
      const instructions = service.getDNSInstructions('example.com', 'ANAME');
      expect(instructions.value).toBe('line-intent-router-bot.onrender.com');

      const aInstructions = service.getDNSInstructions('example.com', 'A');
      expect(aInstructions.value).toBe('216.24.57.1');
    });

    it('should handle both root and www subdomains appropriately', () => {
      const rootAname = service.getDNSInstructions('example.com', 'ANAME');
      const wwwCname = service.getDNSInstructions('www.example.com', 'CNAME');

      expect(rootAname.name).toBe('@');
      expect(wwwCname.name).toBe('www');
      expect(rootAname.value).toBe(wwwCname.value); // Both should point to same target
    });
  });
});