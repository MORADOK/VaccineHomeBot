/**
 * Domain Removal Service Tests
 * Tests for safe domain removal functionality with validation and cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { domainService } from '../domain-service';
import { DomainConfiguration, DomainStatus } from '@/types/domain-config';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({ ascending: vi.fn() }))
        })),
        order: vi.fn(() => ({ ascending: vi.fn() }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
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

describe('Domain Removal Service', () => {
  const mockDomain: DomainConfiguration = {
    id: 'test-domain-id',
    domain: 'example.com',
    subdomain: undefined,
    status: 'pending' as DomainStatus,
    dns_record_type: 'ANAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: false,
    verification_token: 'test-token',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockEnabledDomain: DomainConfiguration = {
    ...mockDomain,
    id: 'enabled-domain-id',
    domain: 'enabled.com',
    status: 'enabled' as DomainStatus,
    ssl_enabled: true,
    last_verified_at: '2024-01-01T12:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteDomainConfiguration', () => {
    it('should delete a pending domain successfully', async () => {
      // Mock domain exists
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);
      vi.spyOn(domainService, 'getDomainConfigurations').mockResolvedValue([mockDomain]);
      
      // Mock successful deletion
      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await domainService.deleteDomainConfiguration('test-domain-id');

      expect(supabase.from).toHaveBeenCalledWith('domain_configurations');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'test-domain-id');
    });

    it('should prevent deletion of enabled domain without force flag', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockEnabledDomain);

      await expect(
        domainService.deleteDomainConfiguration('enabled-domain-id')
      ).rejects.toThrow('Cannot delete enabled domain configuration');
    });

    it('should allow force deletion of enabled domain', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockEnabledDomain);
      vi.spyOn(domainService, 'updateDomainStatus').mockResolvedValue(mockEnabledDomain);
      
      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await domainService.deleteDomainConfiguration('enabled-domain-id', { force: true });

      expect(supabase.from).toHaveBeenCalledWith('domain_configurations');
    });

    it('should throw error for non-existent domain', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(null);

      await expect(
        domainService.deleteDomainConfiguration('non-existent-id')
      ).rejects.toThrow('Domain configuration not found');
    });

    it('should throw error for invalid domain ID', async () => {
      await expect(
        domainService.deleteDomainConfiguration('')
      ).rejects.toThrow('Invalid domain configuration ID');

      await expect(
        domainService.deleteDomainConfiguration(null as any)
      ).rejects.toThrow('Invalid domain configuration ID');
    });
  });

  describe('validateDomainRemoval', () => {
    it('should prevent deletion of enabled domains', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockEnabledDomain);

      await expect(
        domainService.deleteDomainConfiguration('enabled-domain-id')
      ).rejects.toThrow('Cannot delete enabled domain configuration');
    });

    it('should prevent deletion of last enabled domain', async () => {
      const lastEnabledDomain = { ...mockEnabledDomain };
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(lastEnabledDomain);
      vi.spyOn(domainService, 'getDomainConfigurations').mockResolvedValue([lastEnabledDomain]);

      await expect(
        domainService.deleteDomainConfiguration('enabled-domain-id')
      ).rejects.toThrow('Cannot delete enabled domain configuration');
    });

    it('should allow deletion when other enabled domains exist', async () => {
      const otherEnabledDomain = { ...mockEnabledDomain, id: 'other-id', domain: 'other.com' };
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);
      vi.spyOn(domainService, 'getDomainConfigurations').mockResolvedValue([
        mockDomain,
        otherEnabledDomain
      ]);

      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await expect(
        domainService.deleteDomainConfiguration('test-domain-id')
      ).resolves.not.toThrow();
    });
  });

  describe('safeDomainRemoval', () => {
    it('should delete domain with correct confirmation token', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);
      vi.spyOn(domainService, 'deleteDomainConfiguration').mockResolvedValue();

      const confirmationToken = domainService.generateDeletionConfirmationToken(mockDomain);

      await domainService.safeDomainRemoval('test-domain-id', confirmationToken);

      expect(domainService.deleteDomainConfiguration).toHaveBeenCalledWith('test-domain-id');
    });

    it('should reject deletion with incorrect confirmation token', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);

      await expect(
        domainService.safeDomainRemoval('test-domain-id', 'wrong-token')
      ).rejects.toThrow('Invalid confirmation token');
    });

    it('should throw error for non-existent domain', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(null);

      await expect(
        domainService.safeDomainRemoval('non-existent-id', 'any-token')
      ).rejects.toThrow('Domain configuration not found');
    });
  });

  describe('generateDeletionConfirmationToken', () => {
    it('should generate consistent confirmation token', () => {
      const token1 = domainService.generateDeletionConfirmationToken(mockDomain);
      const token2 = domainService.generateDeletionConfirmationToken(mockDomain);

      expect(token1).toBe(token2);
      expect(token1).toContain(mockDomain.domain);
      expect(token1).toContain(mockDomain.id.slice(-8));
    });

    it('should generate different tokens for different domains', () => {
      const domain2 = { ...mockDomain, id: 'different-id', domain: 'different.com' };

      const token1 = domainService.generateDeletionConfirmationToken(mockDomain);
      const token2 = domainService.generateDeletionConfirmationToken(domain2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('forceDeleteDomainConfiguration', () => {
    it('should bypass all safety checks', async () => {
      vi.spyOn(domainService, 'deleteDomainConfiguration').mockResolvedValue();

      await domainService.forceDeleteDomainConfiguration('test-domain-id');

      expect(domainService.deleteDomainConfiguration).toHaveBeenCalledWith(
        'test-domain-id',
        { force: true }
      );
    });
  });

  describe('cleanupDomainConfiguration', () => {
    it('should disable enabled domain before cleanup', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockEnabledDomain);
      const updateStatusSpy = vi.spyOn(domainService, 'updateDomainStatus').mockResolvedValue(mockEnabledDomain);
      
      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await domainService.deleteDomainConfiguration('enabled-domain-id', { force: true });

      expect(updateStatusSpy).toHaveBeenCalledWith(
        'enabled-domain-id',
        'failed',
        'Domain disabled before removal'
      );
    });

    it('should not fail deletion if cleanup has issues', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockEnabledDomain);
      vi.spyOn(domainService, 'updateDomainStatus').mockRejectedValue(new Error('Update failed'));
      
      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      // Should not throw despite cleanup failure
      await expect(
        domainService.deleteDomainConfiguration('enabled-domain-id', { force: true })
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle Supabase deletion errors', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockResolvedValue(mockDomain);
      vi.spyOn(domainService, 'getDomainConfigurations').mockResolvedValue([mockDomain]);
      
      const { supabase } = await import('@/integrations/supabase/client');
      const mockDelete = vi.fn().mockResolvedValue({ 
        error: { message: 'Database error' } 
      });
      const mockEq = vi.fn().mockResolvedValue({ 
        error: { message: 'Database error' } 
      });
      mockDelete.mockReturnValue({ eq: mockEq });
      (supabase.from as any).mockReturnValue({ delete: mockDelete });

      await expect(
        domainService.deleteDomainConfiguration('test-domain-id')
      ).rejects.toThrow('Failed to delete domain configuration: Database error');
    });

    it('should handle unknown errors gracefully', async () => {
      vi.spyOn(domainService, 'getDomainConfiguration').mockRejectedValue('Unknown error');

      await expect(
        domainService.deleteDomainConfiguration('test-domain-id')
      ).rejects.toThrow('Unknown error occurred while deleting domain configuration');
    });
  });
});