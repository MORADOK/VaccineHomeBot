import { describe, it, expect, vi } from 'vitest';
import { dnsService } from '../dns-service';

describe('DNS Service Integration Tests', () => {
  describe('Service Integration', () => {
    it('should export a working singleton instance', () => {
      expect(dnsService).toBeDefined();
      expect(typeof dnsService.validateDomain).toBe('function');
      expect(typeof dnsService.getDNSInstructions).toBe('function');
      expect(typeof dnsService.parseDNSRecord).toBe('function');
    });

    it('should provide complete DNS configuration workflow', () => {
      const domain = 'vaccinehomehospital.co.th';
      
      // Step 1: Validate domain format
      const isValidDomain = dnsService.validateDomain(domain);
      expect(isValidDomain).toBe(true);

      // Step 2: Get DNS instructions for ANAME record
      const anameInstructions = dnsService.getDNSInstructions(domain, 'ANAME');
      expect(anameInstructions.recordType).toBe('ANAME');
      expect(anameInstructions.value).toBe('line-intent-router-bot.onrender.com');
      expect(anameInstructions.instructions.length).toBeGreaterThan(0);

      // Step 3: Get fallback A record instructions
      const aInstructions = dnsService.getDNSInstructions(domain, 'A');
      expect(aInstructions.recordType).toBe('A');
      expect(aInstructions.value).toBe('216.24.57.1');

      // Step 4: Handle www subdomain
      const wwwDomain = `www.${domain}`;
      const wwwInstructions = dnsService.getDNSInstructions(wwwDomain, 'CNAME');
      expect(wwwInstructions.recordType).toBe('CNAME');
      expect(wwwInstructions.name).toBe('www');
    });

    it('should handle different DNS record scenarios', () => {
      const testCases = [
        {
          domain: 'example.com',
          recordType: 'ANAME' as const,
          expectedName: '@',
          expectedValue: 'line-intent-router-bot.onrender.com',
        },
        {
          domain: 'www.example.com',
          recordType: 'CNAME' as const,
          expectedName: 'www',
          expectedValue: 'line-intent-router-bot.onrender.com',
        },
        {
          domain: 'example.com',
          recordType: 'A' as const,
          expectedName: '@',
          expectedValue: '216.24.57.1',
        },
        {
          domain: 'www.example.com',
          recordType: 'A' as const,
          expectedName: 'www',
          expectedValue: '216.24.57.1',
        },
      ];

      testCases.forEach(({ domain, recordType, expectedName, expectedValue }) => {
        const instructions = dnsService.getDNSInstructions(domain, recordType);
        expect(instructions.name).toBe(expectedName);
        expect(instructions.value).toBe(expectedValue);
        expect(instructions.recordType).toBe(recordType);
      });
    });

    it('should provide helpful error messages for invalid configurations', () => {
      // Test invalid domain
      expect(dnsService.validateDomain('invalid..domain')).toBe(false);
      
      // Test unsupported record type
      expect(() => {
        dnsService.getDNSInstructions('example.com', 'MX');
      }).toThrow('Unsupported record type');

      // Test invalid DNS record parsing
      expect(() => {
        dnsService.parseDNSRecord({
          type: 'INVALID',
          name: 'test',
          value: 'test',
        });
      }).toThrow();
    });
  });

  describe('Real-world DNS Configuration Examples', () => {
    it('should handle the vaccine hospital domain configuration', () => {
      const mainDomain = 'vaccinehomehospital.co.th';
      const wwwDomain = 'www.vaccinehomehospital.co.th';

      // Validate both domains
      expect(dnsService.validateDomain(mainDomain)).toBe(true);
      expect(dnsService.validateDomain(wwwDomain)).toBe(true);

      // Get configuration for main domain (ANAME preferred)
      const mainConfig = dnsService.getDNSInstructions(mainDomain, 'ANAME');
      expect(mainConfig.name).toBe('@');
      expect(mainConfig.value).toBe('line-intent-router-bot.onrender.com');
      expect(mainConfig.instructions).toContain('Create an ANAME record');

      // Get configuration for www subdomain
      const wwwConfig = dnsService.getDNSInstructions(wwwDomain, 'CNAME');
      expect(wwwConfig.name).toBe('www');
      expect(wwwConfig.value).toBe('line-intent-router-bot.onrender.com');
      expect(wwwConfig.instructions).toContain('Create a CNAME record');

      // Get fallback A record configuration
      const fallbackConfig = dnsService.getDNSInstructions(mainDomain, 'A');
      expect(fallbackConfig.name).toBe('@');
      expect(fallbackConfig.value).toBe('216.24.57.1');
      expect(fallbackConfig.instructions).toContain('Create an A record');
    });

    it('should provide comprehensive DNS setup instructions', () => {
      const domain = 'example.com';
      const instructions = dnsService.getDNSInstructions(domain, 'ANAME');

      // Verify instructions are comprehensive
      expect(instructions.instructions).toContain('Log in to your DNS provider\'s control panel');
      expect(instructions.instructions.some(instruction => 
        instruction.includes('Create an ANAME record')
      )).toBe(true);
      expect(instructions.instructions.some(instruction => 
        instruction.includes('Set Name/Host to: @')
      )).toBe(true);
      expect(instructions.instructions.some(instruction => 
        instruction.includes('line-intent-router-bot.onrender.com')
      )).toBe(true);
      expect(instructions.instructions.some(instruction => 
        instruction.includes('DNS propagation')
      )).toBe(true);
    });
  });
});