/**
 * Simple Domain Removal Tests
 * Basic tests to verify domain removal functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { domainService } from '../domain-service';
import { DomainConfiguration } from '@/types/domain-config';

// Simple mock for Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        }),
        order: () => ({ 
          ascending: () => Promise.resolve({ data: [], error: null })
        })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        })
      })
    })
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

describe('Domain Removal Simple Tests', () => {
  const mockDomain: DomainConfiguration = {
    id: 'test-domain-id',
    domain: 'example.com',
    subdomain: undefined,
    status: 'pending',
    dns_record_type: 'ANAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: false,
    verification_token: 'test-token',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Confirmation Token Generation', () => {
    it('should generate confirmation token with domain and ID', () => {
      const token = domainService.generateDeletionConfirmationToken(mockDomain);
      
      expect(token).toContain(mockDomain.domain);
      expect(token).toContain(mockDomain.id.slice(-8));
      expect(token).toMatch(/^delete-/);
    });

    it('should generate consistent tokens', () => {
      const token1 = domainService.generateDeletionConfirmationToken(mockDomain);
      const token2 = domainService.generateDeletionConfirmationToken(mockDomain);
      
      expect(token1).toBe(token2);
    });

    it('should generate different tokens for different domains', () => {
      const domain2 = { ...mockDomain, id: 'different-id', domain: 'different.com' };
      
      const token1 = domainService.generateDeletionConfirmationToken(mockDomain);
      const token2 = domainService.generateDeletionConfirmationToken(domain2);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('Safe Domain Removal', () => {
    it('should accept correct confirmation token', async () => {
      // Mock domain exists
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);
      vi.spyOn(domainService, 'deleteDomainConfiguration').mockResolvedValue();

      const correctToken = domainService.generateDeletionConfirmationToken(mockDomain);

      await expect(
        domainService.safeDomainRemoval(mockDomain.id, correctToken)
      ).resolves.not.toThrow();

      expect(domainService.deleteDomainConfiguration).toHaveBeenCalledWith(mockDomain.id);
    });

    it('should reject incorrect confirmation token', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);

      await expect(
        domainService.safeDomainRemoval(mockDomain.id, 'wrong-token')
      ).rejects.toThrow('Invalid confirmation token');
    });

    it('should handle non-existent domain', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(null);

      await expect(
        domainService.safeDomainRemoval('non-existent', 'any-token')
      ).rejects.toThrow('Domain configuration not found');
    });
  });

  describe('Force Delete', () => {
    it('should call deleteDomainConfiguration with force flag', async () => {
      vi.spyOn(domainService, 'deleteDomainConfiguration').mockResolvedValue();

      await domainService.forceDeleteDomainConfiguration(mockDomain.id);

      expect(domainService.deleteDomainConfiguration).toHaveBeenCalledWith(
        mockDomain.id,
        { force: true }
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate domain ID format', async () => {
      await expect(
        domainService.deleteDomainConfiguration('')
      ).rejects.toThrow('Invalid domain configuration ID');

      await expect(
        domainService.deleteDomainConfiguration(null as any)
      ).rejects.toThrow('Invalid domain configuration ID');
    });

    it('should validate domain exists before deletion', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(null);

      await expect(
        domainService.deleteDomainConfiguration('non-existent-id')
      ).rejects.toThrow('Domain configuration not found');
    });
  });

  describe('Status Validation', () => {
    it('should prevent deletion of enabled domains by default', async () => {
      const enabledDomain = { ...mockDomain, status: 'enabled' as const };
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(enabledDomain);

      await expect(
        domainService.deleteDomainConfiguration(enabledDomain.id)
      ).rejects.toThrow('Cannot delete enabled domain configuration');
    });

    it('should allow deletion of pending domains', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);
      vi.spyOn(domainService, 'getDomainConfigurations').mockResolvedValue([mockDomain]);

      await expect(
        domainService.deleteDomainConfiguration(mockDomain.id)
      ).resolves.not.toThrow();
    });
  });
});