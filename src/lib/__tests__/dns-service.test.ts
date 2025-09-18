import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DNSConfigurationService, dnsService } from '../dns-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DNSConfigurationService', () => {
  let service: DNSConfigurationService;

  beforeEach(() => {
    service = new DNSConfigurationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseDNSRecord', () => {
    it('should parse valid DNS record', () => {
      const recordData = {
        type: 'A',
        name: 'example.com',
        value: '192.168.1.1',
        ttl: 300,
      };

      const result = service.parseDNSRecord(recordData);
      expect(result).toEqual(recordData);
    });

    it('should parse DNS record without TTL', () => {
      const recordData = {
        type: 'CNAME',
        name: 'www.example.com',
        value: 'example.com',
      };

      const result = service.parseDNSRecord(recordData);
      expect(result).toEqual(recordData);
    });

    it('should throw error for invalid record type', () => {
      const recordData = {
        type: 'INVALID',
        name: 'example.com',
        value: '192.168.1.1',
      };

      expect(() => service.parseDNSRecord(recordData)).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const recordData = {
        type: 'A',
        name: '',
        value: '192.168.1.1',
      };

      expect(() => service.parseDNSRecord(recordData)).toThrow();
    });
  });

  describe('validateDomain', () => {
    it('should validate correct domain formats', () => {
      const validDomains = [
        'example.com',
        'www.example.com',
        'sub.domain.example.com',
        'vaccinehomehospital.co.th',
        'www.vaccinehomehospital.co.th',
        'test-domain.com',
        'a.b',
      ];

      validDomains.forEach(domain => {
        expect(service.validateDomain(domain)).toBe(true);
      });
    });

    it('should reject invalid domain formats', () => {
      const invalidDomains = [
        '',
        'invalid..domain.com',
        '.example.com',
        'example.com.',
        'http://example.com',
        'example.com/path',
        '-example.com',
        'example-.com',
      ];

      invalidDomains.forEach(domain => {
        expect(service.validateDomain(domain)).toBe(false);
      });
    });
  });

  describe('checkDNSPropagation', () => {
    it('should return propagated status when DNS record matches expected value', async () => {
      const mockResponse = {
        Answer: [
          {
            data: 'line-intent-router-bot.onrender.com',
            TTL: 300,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.checkDNSPropagation(
        'example.com',
        'CNAME',
        'line-intent-router-bot.onrender.com'
      );

      expect(result.propagated).toBe(true);
      expect(result.actualValues).toContain('line-intent-router-bot.onrender.com');
      expect(result.domain).toBe('example.com');
      expect(result.recordType).toBe('CNAME');
    });

    it('should return not propagated when DNS record does not match', async () => {
      const mockResponse = {
        Answer: [
          {
            data: 'different-value.com',
            TTL: 300,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.checkDNSPropagation(
        'example.com',
        'CNAME',
        'expected-value.com'
      );

      expect(result.propagated).toBe(false);
      expect(result.actualValues).toContain('different-value.com');
      expect(result.expectedValue).toBe('expected-value.com');
    });

    it('should throw error for invalid domain', async () => {
      await expect(
        service.checkDNSPropagation('invalid..domain', 'A', '192.168.1.1')
      ).rejects.toThrow('Invalid domain format');
    });

    it('should handle DNS lookup failures with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ Answer: [] }),
        });

      const result = await service.checkDNSPropagation(
        'example.com',
        'A',
        '192.168.1.1'
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.propagated).toBe(false);
    });
  });

  describe('verifySSLCertificate', () => {
    it('should return valid SSL status when HTTPS request succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await service.verifySSLCertificate('example.com');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
        method: 'HEAD',
        mode: 'no-cors',
      });
    });

    it('should return invalid SSL status when HTTPS request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('SSL certificate error'));

      const result = await service.verifySSLCertificate('example.com');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('SSL certificate error');
    });

    it('should return error for invalid domain format', async () => {
      const result = await service.verifySSLCertificate('invalid..domain');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid domain format');
    });
  });

  describe('validateRenderDNSConfiguration', () => {
    it('should validate ANAME record configuration', async () => {
      // Mock successful ANAME lookup
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          Answer: [{ data: 'line-intent-router-bot.onrender.com', TTL: 300 }],
        }),
      });

      const result = await service.validateRenderDNSConfiguration('example.com');

      expect(result.isValid).toBe(true);
      expect(result.recordType).toBe('ANAME');
      expect(result.currentValue).toBe('line-intent-router-bot.onrender.com');
      expect(result.recommendations).toContain('ANAME record is properly configured');
    }, 10000);

    it('should validate A record configuration when ANAME fails', async () => {
      // Mock ANAME failure (3 retries), CNAME failure (3 retries), A record success (1 call)
      mockFetch
        .mockRejectedValueOnce(new Error('ANAME not supported'))
        .mockRejectedValueOnce(new Error('ANAME not supported'))
        .mockRejectedValueOnce(new Error('ANAME not supported'))
        .mockRejectedValueOnce(new Error('CNAME failed'))
        .mockRejectedValueOnce(new Error('CNAME failed'))
        .mockRejectedValueOnce(new Error('CNAME failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            Answer: [{ data: '216.24.57.1', TTL: 300 }],
          }),
        });

      const result = await service.validateRenderDNSConfiguration('example.com');

      expect(result.isValid).toBe(true);
      expect(result.recordType).toBe('A');
      expect(result.currentValue).toBe('216.24.57.1');
      expect(result.recommendations).toContain('A record is configured correctly');
    }, 10000);

    it('should provide recommendations when no valid records found', async () => {
      // Mock all lookups failing
      mockFetch
        .mockRejectedValueOnce(new Error('ANAME failed'))
        .mockRejectedValueOnce(new Error('CNAME failed'))
        .mockRejectedValueOnce(new Error('A record failed'));

      const result = await service.validateRenderDNSConfiguration('example.com');

      expect(result.isValid).toBe(false);
      expect(result.recordType).toBe(null);
      expect(result.currentValue).toBe(null);
      expect(result.recommendations).toContain('No DNS records found for this domain');
    }, 10000);

    it('should detect incorrect DNS values', async () => {
      // Mock ANAME with wrong value
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          Answer: [{ data: 'wrong-target.com', TTL: 300 }],
        }),
      });

      const result = await service.validateRenderDNSConfiguration('example.com');

      expect(result.isValid).toBe(false);
      expect(result.recordType).toBe('ANAME');
      expect(result.currentValue).toBe('wrong-target.com');
      expect(result.recommendations).toContain('DNS records exist but point to incorrect values');
    }, 10000);
  });

  describe('getDNSInstructions', () => {
    it('should provide ANAME instructions for root domain', () => {
      const result = service.getDNSInstructions('example.com', 'ANAME');

      expect(result.recordType).toBe('ANAME');
      expect(result.name).toBe('@');
      expect(result.value).toBe('line-intent-router-bot.onrender.com');
      expect(result.instructions).toContain('Create an ANAME record');
      expect(result.instructions).toContain('Set Name/Host to: @');
    });

    it('should provide CNAME instructions for www subdomain', () => {
      const result = service.getDNSInstructions('www.example.com', 'CNAME');

      expect(result.recordType).toBe('CNAME');
      expect(result.name).toBe('www');
      expect(result.value).toBe('line-intent-router-bot.onrender.com');
      expect(result.instructions).toContain('Create a CNAME record');
      expect(result.instructions).toContain('Set Name/Host to: www');
    });

    it('should provide A record instructions', () => {
      const result = service.getDNSInstructions('example.com', 'A');

      expect(result.recordType).toBe('A');
      expect(result.name).toBe('@');
      expect(result.value).toBe('216.24.57.1');
      expect(result.instructions).toContain('Create an A record');
      expect(result.instructions).toContain('Set Value/Target to: 216.24.57.1');
    });

    it('should throw error for unsupported record type', () => {
      expect(() => service.getDNSInstructions('example.com', 'MX')).toThrow(
        'Unsupported record type for domain configuration: MX'
      );
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(dnsService).toBeInstanceOf(DNSConfigurationService);
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should implement exponential backoff correctly', async () => {
      // Create a fresh service instance to avoid interference
      const freshService = new DNSConfigurationService();
      const startTime = Date.now();
      
      // Mock first two attempts to fail, third to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ Answer: [] }),
        });

      const result = await freshService.checkDNSPropagation('example.com', 'A', '192.168.1.1');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have waited at least 1000ms (first retry) + 2000ms (second retry)
      expect(duration).toBeGreaterThan(3000);
      expect(result.success).toBe(true);
    });

    it('should respect maximum retry attempts', async () => {
      // Create a fresh service instance to avoid interference
      const freshService = new DNSConfigurationService();
      
      // Mock all attempts to fail
      mockFetch
        .mockRejectedValueOnce(new Error('Always fails'))
        .mockRejectedValueOnce(new Error('Always fails'))
        .mockRejectedValueOnce(new Error('Always fails'));

      const result = await freshService.checkDNSPropagation('example.com', 'A', '192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('DNS lookup failed');
    });
  });
});