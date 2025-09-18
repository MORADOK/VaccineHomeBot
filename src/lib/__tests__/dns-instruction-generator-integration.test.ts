/**
 * Integration tests for DNS Instruction Generator functionality
 */

import { describe, it, expect } from 'vitest';
import { dnsService } from '../dns-service';

describe('DNS Instruction Generator Integration', () => {
  describe('Provider capability detection', () => {
    it('should detect provider capabilities correctly', async () => {
      // Test the core functionality without external dependencies
      const capabilities = {
        supportsANAME: true,
        supportsALIAS: false,
        supportsCNAME: true,
        supportsA: true,
      };

      const recommendedType = dnsService.getRecommendedRecordType('example.com', capabilities);
      expect(recommendedType).toBe('ANAME');

      const subdomainType = dnsService.getRecommendedRecordType('www.example.com', capabilities);
      expect(subdomainType).toBe('CNAME');
    });

    it('should generate DNS instructions for different record types', () => {
      const domain = 'example.com';
      
      // Test ANAME instructions
      const anameInstructions = dnsService.getDNSInstructions(domain, 'ANAME');
      expect(anameInstructions.recordType).toBe('ANAME');
      expect(anameInstructions.name).toBe('@');
      expect(anameInstructions.value).toBe('line-intent-router-bot.onrender.com');
      expect(anameInstructions.instructions).toContain('Create an ANAME record');

      // Test A record instructions
      const aInstructions = dnsService.getDNSInstructions(domain, 'A');
      expect(aInstructions.recordType).toBe('A');
      expect(aInstructions.name).toBe('@');
      expect(aInstructions.value).toBe('216.24.57.1');
      expect(aInstructions.instructions).toContain('Create an A record');
    });

    it('should handle subdomain instructions correctly', () => {
      const subdomain = 'www.example.com';
      
      // Test CNAME instructions for subdomain
      const cnameInstructions = dnsService.getDNSInstructions(subdomain, 'CNAME');
      expect(cnameInstructions.recordType).toBe('CNAME');
      expect(cnameInstructions.name).toBe('www');
      expect(cnameInstructions.value).toBe('line-intent-router-bot.onrender.com');
      expect(cnameInstructions.instructions).toContain('Create a CNAME record');
    });

    it('should provide fallback recommendations when preferred types are not supported', () => {
      const limitedCapabilities = {
        supportsANAME: false,
        supportsALIAS: false,
        supportsCNAME: false,
        supportsA: true,
      };

      const rootDomainType = dnsService.getRecommendedRecordType('example.com', limitedCapabilities);
      expect(rootDomainType).toBe('A');

      const subdomainType = dnsService.getRecommendedRecordType('www.example.com', limitedCapabilities);
      expect(subdomainType).toBe('A');
    });
  });

  describe('DNS record validation', () => {
    it('should validate domain formats correctly', () => {
      expect(dnsService.validateDomain('example.com')).toBe(true);
      expect(dnsService.validateDomain('www.example.com')).toBe(true);
      expect(dnsService.validateDomain('api.staging.example.com')).toBe(true);
      expect(dnsService.validateDomain('invalid..domain')).toBe(false);
      expect(dnsService.validateDomain('')).toBe(false);
    });

    it('should parse DNS records correctly', () => {
      const validRecord = {
        type: 'A' as const,
        name: '@',
        value: '192.168.1.1',
        ttl: 300
      };

      expect(() => dnsService.parseDNSRecord(validRecord)).not.toThrow();
      
      const parsed = dnsService.parseDNSRecord(validRecord);
      expect(parsed.type).toBe('A');
      expect(parsed.name).toBe('@');
      expect(parsed.value).toBe('192.168.1.1');
      expect(parsed.ttl).toBe(300);
    });
  });

  describe('Provider-specific configurations', () => {
    it('should handle different provider capabilities', () => {
      const providers = [
        {
          name: 'Cloudflare',
          capabilities: { supportsANAME: false, supportsALIAS: true, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'GoDaddy',
          capabilities: { supportsANAME: false, supportsALIAS: false, supportsCNAME: true, supportsA: true }
        },
        {
          name: 'Route53',
          capabilities: { supportsANAME: false, supportsALIAS: true, supportsCNAME: true, supportsA: true }
        }
      ];

      providers.forEach(provider => {
        const rootDomainType = dnsService.getRecommendedRecordType('example.com', provider.capabilities);
        const subdomainType = dnsService.getRecommendedRecordType('www.example.com', provider.capabilities);

        // Should always provide valid recommendations
        expect(['ANAME', 'ALIAS', 'A']).toContain(rootDomainType);
        expect(['CNAME', 'A']).toContain(subdomainType);

        // Should prefer ALIAS/ANAME for root domains when available
        if (provider.capabilities.supportsALIAS || provider.capabilities.supportsANAME) {
          expect(['ANAME', 'ALIAS']).toContain(rootDomainType);
        }

        // Should prefer CNAME for subdomains when available
        if (provider.capabilities.supportsCNAME) {
          expect(subdomainType).toBe('CNAME');
        }
      });
    });
  });
});