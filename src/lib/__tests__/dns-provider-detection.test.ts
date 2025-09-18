/**
 * Tests for DNS provider capability detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dnsService } from '../dns-service';

// Mock fetch for DNS-over-HTTPS requests
global.fetch = vi.fn();

describe('DNS Provider Capability Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectDNSProviderCapabilities', () => {
    it('detects Cloudflare provider from nameservers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          Answer: [
            { data: 'ns1.cloudflare.com', TTL: 300 },
            { data: 'ns2.cloudflare.com', TTL: 300 }
          ]
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: 'cloudflare',
        supportsANAME: false,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0.9,
      });
    });

    it('detects GoDaddy provider from nameservers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          Answer: [
            { data: 'ns1.domaincontrol.com', TTL: 300 },
            { data: 'ns2.domaincontrol.com', TTL: 300 }
          ]
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: 'godaddy',
        supportsANAME: false,
        supportsALIAS: false,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0.9,
      });
    });

    it('detects AWS Route 53 provider from nameservers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          Answer: [
            { data: 'ns-123.awsdns-12.com', TTL: 300 },
            { data: 'ns-456.awsdns-34.net', TTL: 300 }
          ]
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: 'route53',
        supportsANAME: false,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0.9,
      });
    });

    it('detects Namecheap provider from nameservers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          Answer: [
            { data: 'dns1.registrar-servers.com', TTL: 300 },
            { data: 'dns2.registrar-servers.com', TTL: 300 }
          ]
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: 'namecheap',
        supportsANAME: false,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0.9,
      });
    });

    it('returns unknown provider for unrecognized nameservers', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          Answer: [
            { data: 'ns1.custom-provider.com', TTL: 300 },
            { data: 'ns2.custom-provider.com', TTL: 300 }
          ]
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: 'unknown',
        supportsANAME: true,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0.3,
      });
    });

    it('handles DNS lookup failure gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('DNS lookup failed'));

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: null,
        supportsANAME: false,
        supportsALIAS: false,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0,
      });
    });

    it('handles empty nameserver response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          Answer: []
        })
      };
      
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await dnsService.detectDNSProviderCapabilities('example.com');

      expect(result).toEqual({
        provider: null,
        supportsANAME: false,
        supportsALIAS: false,
        supportsCNAME: true,
        supportsA: true,
        confidence: 0,
      });
    });

    it('validates domain format before detection', async () => {
      await expect(
        dnsService.detectDNSProviderCapabilities('invalid..domain')
      ).rejects.toThrow('Invalid domain format: invalid..domain');
    });
  });

  describe('getRecommendedRecordType', () => {
    it('recommends ANAME for root domain when supported', () => {
      const capabilities = {
        supportsANAME: true,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
      };

      const result = dnsService.getRecommendedRecordType('example.com', capabilities);
      expect(result).toBe('ANAME');
    });

    it('recommends ALIAS for root domain when ANAME not supported', () => {
      const capabilities = {
        supportsANAME: false,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
      };

      const result = dnsService.getRecommendedRecordType('example.com', capabilities);
      expect(result).toBe('ALIAS');
    });

    it('recommends A record for root domain when ANAME/ALIAS not supported', () => {
      const capabilities = {
        supportsANAME: false,
        supportsALIAS: false,
        supportsCNAME: true,
        supportsA: true,
      };

      const result = dnsService.getRecommendedRecordType('example.com', capabilities);
      expect(result).toBe('A');
    });

    it('recommends CNAME for subdomain when supported', () => {
      const capabilities = {
        supportsANAME: true,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
      };

      const result = dnsService.getRecommendedRecordType('www.example.com', capabilities);
      expect(result).toBe('CNAME');
    });

    it('recommends A record for subdomain when CNAME not supported', () => {
      const capabilities = {
        supportsANAME: true,
        supportsALIAS: true,
        supportsCNAME: false,
        supportsA: true,
      };

      const result = dnsService.getRecommendedRecordType('www.example.com', capabilities);
      expect(result).toBe('A');
    });

    it('handles complex subdomains correctly', () => {
      const capabilities = {
        supportsANAME: true,
        supportsALIAS: true,
        supportsCNAME: true,
        supportsA: true,
      };

      const result = dnsService.getRecommendedRecordType('api.staging.example.com', capabilities);
      expect(result).toBe('CNAME');
    });
  });

  describe('Provider-specific capability mapping', () => {
    const testCases = [
      {
        provider: 'cloudflare',
        nameserver: 'ns1.cloudflare.com',
        expected: { supportsANAME: false, supportsALIAS: true }
      },
      {
        provider: 'godaddy',
        nameserver: 'ns1.domaincontrol.com',
        expected: { supportsANAME: false, supportsALIAS: false }
      },
      {
        provider: 'namecheap',
        nameserver: 'dns1.registrar-servers.com',
        expected: { supportsANAME: false, supportsALIAS: true }
      },
      {
        provider: 'route53',
        nameserver: 'ns-123.awsdns-12.com',
        expected: { supportsANAME: false, supportsALIAS: true }
      },
      {
        provider: 'digitalocean',
        nameserver: 'ns1.digitalocean.com',
        expected: { supportsANAME: false, supportsALIAS: false }
      }
    ];

    testCases.forEach(({ provider, nameserver, expected }) => {
      it(`correctly maps capabilities for ${provider}`, async () => {
        const mockResponse = {
          ok: true,
          json: () => Promise.resolve({
            Answer: [{ data: nameserver, TTL: 300 }]
          })
        };
        
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

        const result = await dnsService.detectDNSProviderCapabilities('example.com');

        expect(result.provider).toBe(provider);
        expect(result.supportsANAME).toBe(expected.supportsANAME);
        expect(result.supportsALIAS).toBe(expected.supportsALIAS);
        expect(result.supportsCNAME).toBe(true); // All providers support CNAME
        expect(result.supportsA).toBe(true); // All providers support A records
        expect(result.confidence).toBe(0.9);
      });
    });
  });
});