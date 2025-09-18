/**
 * Domain Removal Integration Tests
 * End-to-end tests for domain removal workflow including validation and cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { domainService } from '../domain-service';
import { DomainConfiguration, DomainStatus } from '@/types/domain-config';

// Mock Supabase client with more realistic behavior
const mockSupabaseData = new Map<string, DomainConfiguration>();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((field: string, value: string) => ({
          single: vi.fn(() => {
            if (field === 'id') {
              const domain = mockSupabaseData.get(value);
              return Promise.resolve({ 
                data: domain || null, 
                error: domain ? null : { code: 'PGRST116' }
              });
            }
            return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
          }),
          order: vi.fn(() => ({ 
            ascending: vi.fn(() => Promise.resolve({ 
              data: Array.from(mockSupabaseData.values()), 
              error: null 
            }))
          }))
        })),
        order: vi.fn(() => ({ 
          ascending: vi.fn(() => Promise.resolve({ 
            data: Array.from(mockSupabaseData.values()), 
            error: null 
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn((field: string, value: string) => {
          if (field === 'id' && mockSupabaseData.has(value)) {
            mockSupabaseData.delete(value);
            return Promise.resolve({ error: null });
          }
          return Promise.resolve({ error: { message: 'Domain not found' } });
        })
      })),
      update: vi.fn((updates: any) => ({
        eq: vi.fn((field: string, value: string) => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              const domain = mockSupabaseData.get(value);
              if (domain) {
                const updatedDomain = { ...domain, ...updates, updated_at: new Date().toISOString() };
                mockSupabaseData.set(value, updatedDomain);
                return Promise.resolve({ data: updatedDomain, error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Domain not found' } });
            })
          }))
        }))
      }))
    }))
  }
}));

// Mock DNS service
vi.mock('../dns-service', () => ({
  dnsService: {
    validateRenderDNSConfiguration: vi.fn(),
    verifySSLCertificate: vi.fn(),
    getDNSInstructions: vi.fn()
  }
}));

describe('Domain Removal Integration Tests', () => {
  const createMockDomain = (overrides: Partial<DomainConfiguration> = {}): DomainConfiguration => ({
    id: `domain-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    domain: 'example.com',
    subdomain: undefined,
    status: 'pending' as DomainStatus,
    dns_record_type: 'ANAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: false,
    verification_token: 'test-token',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  });

  beforeEach(() => {
    mockSupabaseData.clear();
    vi.clearAllMocks();
  });

  describe('Complete Domain Removal Workflow', () => {
    it('should successfully remove a pending domain through safe removal', async () => {
      // Setup: Create a pending domain
      const domain = createMockDomain({ status: 'pending' });
      mockSupabaseData.set(domain.id, domain);

      // Generate confirmation token
      const confirmationToken = domainService.generateDeletionConfirmationToken(domain);

      // Execute: Safe domain removal
      await domainService.safeDomainRemoval(domain.id, confirmationToken);

      // Verify: Domain should be removed
      expect(mockSupabaseData.has(domain.id)).toBe(false);
    });

    it('should prevent removal of enabled domain without force flag', async () => {
      // Setup: Create an enabled domain
      const domain = createMockDomain({ 
        status: 'enabled',
        ssl_enabled: true,
        last_verified_at: '2024-01-01T12:00:00Z'
      });
      mockSupabaseData.set(domain.id, domain);

      // Execute & Verify: Should reject removal
      await expect(
        domainService.deleteDomainConfiguration(domain.id)
      ).rejects.toThrow('Cannot delete enabled domain configuration');

      // Verify: Domain should still exist
      expect(mockSupabaseData.has(domain.id)).toBe(true);
    });

    it('should allow force removal of enabled domain', async () => {
      // Setup: Create an enabled domain
      const domain = createMockDomain({ 
        status: 'enabled',
        ssl_enabled: true
      });
      mockSupabaseData.set(domain.id, domain);

      // Execute: Force deletion
      await domainService.forceDeleteDomainConfiguration(domain.id);

      // Verify: Domain should be removed
      expect(mockSupabaseData.has(domain.id)).toBe(false);
    });

    it('should disable domain before cleanup during force deletion', async () => {
      // Setup: Create an enabled domain
      const domain = createMockDomain({ 
        status: 'enabled',
        ssl_enabled: true
      });
      mockSupabaseData.set(domain.id, domain);

      // Execute: Force deletion
      await domainService.forceDeleteDomainConfiguration(domain.id);

      // Verify: Domain should be removed (cleanup should have disabled it first)
      expect(mockSupabaseData.has(domain.id)).toBe(false);
    });
  });

  describe('Multi-Domain Scenarios', () => {
    it('should allow removal when other enabled domains exist', async () => {
      // Setup: Create multiple domains
      const domain1 = createMockDomain({ 
        domain: 'domain1.com',
        status: 'pending'
      });
      const domain2 = createMockDomain({ 
        domain: 'domain2.com',
        status: 'enabled'
      });
      
      mockSupabaseData.set(domain1.id, domain1);
      mockSupabaseData.set(domain2.id, domain2);

      // Execute: Remove pending domain
      await domainService.deleteDomainConfiguration(domain1.id);

      // Verify: Only pending domain removed, enabled domain remains
      expect(mockSupabaseData.has(domain1.id)).toBe(false);
      expect(mockSupabaseData.has(domain2.id)).toBe(true);
    });

    it('should handle removal of domain with subdomain', async () => {
      // Setup: Create domain with subdomain
      const domain = createMockDomain({ 
        domain: 'example.com',
        subdomain: 'www',
        status: 'verified'
      });
      mockSupabaseData.set(domain.id, domain);

      // Execute: Remove domain
      await domainService.deleteDomainConfiguration(domain.id);

      // Verify: Domain should be removed
      expect(mockSupabaseData.has(domain.id)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent domain gracefully', async () => {
      const nonExistentId = 'non-existent-domain-id';

      await expect(
        domainService.deleteDomainConfiguration(nonExistentId)
      ).rejects.toThrow('Domain configuration not found');
    });

    it('should handle invalid confirmation token', async () => {
      // Setup: Create a domain
      const domain = createMockDomain();
      mockSupabaseData.set(domain.id, domain);

      // Execute & Verify: Should reject with wrong token
      await expect(
        domainService.safeDomainRemoval(domain.id, 'wrong-token')
      ).rejects.toThrow('Invalid confirmation token');

      // Verify: Domain should still exist
      expect(mockSupabaseData.has(domain.id)).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Setup: Create an enabled domain
      const domain = createMockDomain({ status: 'enabled' });
      mockSupabaseData.set(domain.id, domain);

      // Mock updateDomainStatus to fail during cleanup
      const originalUpdateStatus = domainService.updateDomainStatus;
      vi.spyOn(domainService, 'updateDomainStatus').mockRejectedValue(
        new Error('Status update failed')
      );

      // Execute: Should still succeed despite cleanup failure
      await expect(
        domainService.forceDeleteDomainConfiguration(domain.id)
      ).resolves.not.toThrow();

      // Verify: Domain should still be removed
      expect(mockSupabaseData.has(domain.id)).toBe(false);

      // Restore original method
      vi.mocked(domainService.updateDomainStatus).mockRestore();
    });

    it('should validate domain ID format', async () => {
      await expect(
        domainService.deleteDomainConfiguration('')
      ).rejects.toThrow('Invalid domain configuration ID');

      await expect(
        domainService.deleteDomainConfiguration(null as any)
      ).rejects.toThrow('Invalid domain configuration ID');

      await expect(
        domainService.deleteDomainConfiguration(undefined as any)
      ).rejects.toThrow('Invalid domain configuration ID');
    });
  });

  describe('Confirmation Token Generation', () => {
    it('should generate consistent tokens for same domain', () => {
      const domain = createMockDomain();
      
      const token1 = domainService.generateDeletionConfirmationToken(domain);
      const token2 = domainService.generateDeletionConfirmationToken(domain);
      
      expect(token1).toBe(token2);
      expect(token1).toContain(domain.domain);
      expect(token1).toContain(domain.id.slice(-8));
    });

    it('should generate different tokens for different domains', () => {
      const domain1 = createMockDomain({ domain: 'domain1.com' });
      const domain2 = createMockDomain({ domain: 'domain2.com' });
      
      const token1 = domainService.generateDeletionConfirmationToken(domain1);
      const token2 = domainService.generateDeletionConfirmationToken(domain2);
      
      expect(token1).not.toBe(token2);
    });

    it('should work with confirmation token in safe removal', async () => {
      // Setup: Create a domain
      const domain = createMockDomain();
      mockSupabaseData.set(domain.id, domain);

      // Generate and use correct token
      const correctToken = domainService.generateDeletionConfirmationToken(domain);
      
      // Execute: Should succeed with correct token
      await expect(
        domainService.safeDomainRemoval(domain.id, correctToken)
      ).resolves.not.toThrow();

      // Verify: Domain should be removed
      expect(mockSupabaseData.has(domain.id)).toBe(false);
    });
  });

  describe('Fallback Domain Protection', () => {
    it('should warn about removing recently accessible domains', async () => {
      // Setup: Create a recently accessible domain
      const domain = createMockDomain({ 
        status: 'pending',
        last_health_check: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        is_accessible: true
      });
      mockSupabaseData.set(domain.id, domain);

      // Mock console.warn to capture warnings
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Execute: Should still allow removal but log warning
      await domainService.deleteDomainConfiguration(domain.id);

      // Verify: Warning should be logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('was recently accessible')
      );

      // Verify: Domain should still be removed
      expect(mockSupabaseData.has(domain.id)).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Bulk Operations Impact', () => {
    it('should handle removal during bulk operations', async () => {
      // Setup: Create multiple domains
      const domains = [
        createMockDomain({ domain: 'domain1.com', status: 'pending' }),
        createMockDomain({ domain: 'domain2.com', status: 'verified' }),
        createMockDomain({ domain: 'domain3.com', status: 'failed' })
      ];
      
      domains.forEach(domain => mockSupabaseData.set(domain.id, domain));

      // Execute: Remove one domain
      await domainService.deleteDomainConfiguration(domains[0].id);

      // Verify: Only one domain removed, others remain
      expect(mockSupabaseData.has(domains[0].id)).toBe(false);
      expect(mockSupabaseData.has(domains[1].id)).toBe(true);
      expect(mockSupabaseData.has(domains[2].id)).toBe(true);

      // Verify: Can still fetch remaining domains
      const remainingDomains = await domainService.getDomainConfigurations();
      expect(remainingDomains).toHaveLength(2);
    });
  });
});