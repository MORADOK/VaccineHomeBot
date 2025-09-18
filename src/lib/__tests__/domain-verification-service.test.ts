/**
 * Integration tests for domain verification service
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { domainVerificationService, DomainVerificationService } from '../domain-verification-service';
import { dnsService } from '../dns-service';
import { supabase } from '@/integrations/supabase/client';
import { DomainConfiguration } from '@/types/domain-config';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        in: vi.fn(),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('../dns-service', () => ({
  dnsService: {
    validateRenderDNSConfiguration: vi.fn(),
    verifySSLCertificate: vi.fn(),
  },
}));

// Mock fetch for accessibility checks
global.fetch = vi.fn();

describe('DomainVerificationService', () => {
  let service: DomainVerificationService;
  let mockDomain: DomainConfiguration;

  beforeEach(() => {
    service = new DomainVerificationService();
    mockDomain = {
      id: 'test-domain-id',
      domain: 'example.com',
      status: 'pending',
      dns_record_type: 'ANAME',
      target_value: 'line-intent-router-bot.onrender.com',
      ssl_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('startVerification', () => {
    it('should initialize verification status and start verification process', async () => {
      // Mock Supabase responses
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
        })),
      }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      // Mock DNS validation success
      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: true,
        recommendations: ['DNS configuration is correct'],
      });

      // Mock SSL verification success
      (dnsService.verifySSLCertificate as Mock).mockResolvedValue({
        valid: true,
      });

      // Mock fetch for accessibility check
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
      });

      // Start verification
      const verificationPromise = service.startVerification(mockDomain.id);

      // Check status immediately after starting
      const status = service.getVerificationStatus(mockDomain.id);
      expect(status).toBeDefined();
      expect(status?.isVerifying).toBe(true);
      expect(status?.domainId).toBe(mockDomain.id);

      // Wait for verification to complete
      await verificationPromise;
    });

    it('should handle domain not found error', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        })),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
      });

      await expect(service.startVerification('non-existent-id')).rejects.toThrow('Domain configuration not found');
    });
  });

  describe('performVerification workflow', () => {
    beforeEach(() => {
      // Mock Supabase responses for domain fetch and updates
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
        })),
        in: vi.fn().mockResolvedValue({ data: [mockDomain], error: null }),
      }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });
    });

    it('should complete full verification workflow successfully', async () => {
      // Mock all verification steps to succeed
      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: true,
        recommendations: ['DNS configuration is correct'],
      });

      (dnsService.verifySSLCertificate as Mock).mockResolvedValue({
        valid: true,
      });

      (global.fetch as Mock).mockResolvedValue({
        ok: true,
      });

      // Start verification and wait for completion
      await service.startVerification(mockDomain.id);

      // Wait a bit more for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.currentStep?.step).toBe('complete');
      expect(status?.currentStep?.progress).toBe(100);
    });

    it('should handle DNS configuration failure', async () => {
      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: false,
        recommendations: ['DNS records not found', 'Add ANAME record'],
      });

      await service.startVerification(mockDomain.id);

      // Wait for verification to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.retryCount).toBeGreaterThan(0);
    });

    it('should handle SSL certificate not ready', async () => {
      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: true,
        recommendations: ['DNS configuration is correct'],
      });

      (dnsService.verifySSLCertificate as Mock).mockResolvedValue({
        valid: false,
        error: 'SSL certificate not ready',
      });

      await service.startVerification(mockDomain.id);

      // Wait for verification to process and schedule retry
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.nextCheck).toBeDefined();
    });

    it('should handle accessibility check failure', async () => {
      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: true,
        recommendations: ['DNS configuration is correct'],
      });

      (dnsService.verifySSLCertificate as Mock).mockResolvedValue({
        valid: true,
      });

      (global.fetch as Mock).mockRejectedValue(new Error('Connection refused'));

      await service.startVerification(mockDomain.id);

      // Wait for verification to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.retryCount).toBeGreaterThan(0);
    });

    it('should respect maximum retry limit', async () => {
      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: false,
        recommendations: ['DNS configuration failed'],
      });

      await service.startVerification(mockDomain.id);

      // Wait for initial failure
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.retryCount).toBeLessThanOrEqual(status?.maxRetries || 5);
      
      // For the first failure, it should schedule a retry, so still verifying
      expect(status?.nextCheck).toBeDefined();
    });
  });

  describe('stopVerification', () => {
    it('should stop ongoing verification', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
        })),
      }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      await service.startVerification(mockDomain.id);
      
      let status = service.getVerificationStatus(mockDomain.id);
      expect(status?.isVerifying).toBe(true);

      service.stopVerification(mockDomain.id);

      status = service.getVerificationStatus(mockDomain.id);
      expect(status?.isVerifying).toBe(false);
    });
  });

  describe('verifyAllPendingDomains', () => {
    it('should start verification for all pending domains', async () => {
      const pendingDomains = [
        { ...mockDomain, id: 'domain-1', status: 'pending' as const },
        { ...mockDomain, id: 'domain-2', status: 'failed' as const },
      ];

      const mockSingle = vi.fn().mockImplementation(() => {
        // Return the first domain for any single query
        return Promise.resolve({ data: pendingDomains[0], error: null });
      });

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
        in: vi.fn().mockResolvedValue({ data: pendingDomains, error: null }),
      }));
      
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      await service.verifyAllPendingDomains();

      // At least one domain should have started verification
      const status1 = service.getVerificationStatus('domain-1');
      expect(status1).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
        })),
      }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      (dnsService.validateRenderDNSConfiguration as Mock).mockRejectedValue(
        new Error('Network error')
      );

      await service.startVerification(mockDomain.id);

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.currentStep?.isError).toBe(true);
      expect(status?.isVerifying).toBe(false);
    });

    it('should handle timeout errors in accessibility check', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
        })),
      }));
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: mockDomain, error: null }),
      }));

      (supabase.from as Mock).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      (dnsService.validateRenderDNSConfiguration as Mock).mockResolvedValue({
        isValid: true,
        recommendations: ['DNS configuration is correct'],
      });

      (dnsService.verifySSLCertificate as Mock).mockResolvedValue({
        valid: true,
      });

      const abortError = new Error('Timeout');
      abortError.name = 'AbortError';
      (global.fetch as Mock).mockRejectedValue(abortError);

      await service.startVerification(mockDomain.id);

      // Wait for verification to process
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = service.getVerificationStatus(mockDomain.id);
      expect(status?.retryCount).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should clear all timers and statuses', () => {
      service.startVerification(mockDomain.id);
      
      expect(service.getVerificationStatus(mockDomain.id)).toBeDefined();
      
      service.cleanup();
      
      expect(service.getVerificationStatus(mockDomain.id)).toBeNull();
    });
  });
});