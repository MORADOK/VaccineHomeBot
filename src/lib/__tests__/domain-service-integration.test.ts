/**
 * Integration tests for domain service CRUD operations
 * These tests verify the complete flow of domain management operations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { domainService } from '../domain-service';
import { DomainFormData, DomainConfiguration } from '@/types/domain-config';

// Mock the entire Supabase client for integration testing
vi.mock('@/integrations/supabase/client', () => {
  const mockData = new Map<string, DomainConfiguration>();
  let idCounter = 1;

  const generateId = () => `test-id-${idCounter++}`;
  const generateTimestamp = () => new Date().toISOString();

  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: Array.from(mockData.values()).sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            error: null
          })),
          eq: vi.fn((field: string, value: string) => ({
            single: vi.fn(() => {
              let found = null;
              if (field === 'id') {
                found = mockData.get(value) || null;
              } else if (field === 'domain') {
                found = Array.from(mockData.values()).find(d => d.domain === value) || null;
              }
              return {
                data: found,
                error: found ? null : { code: 'PGRST116' }
              };
            })
          }))
        })),
        insert: vi.fn((data: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              // Check for duplicate domain
              const existingDomain = Array.from(mockData.values()).find(d => d.domain === data.domain);
              if (existingDomain) {
                return {
                  data: null,
                  error: { code: '23505', message: 'duplicate key value violates unique constraint' }
                };
              }

              const newDomain: DomainConfiguration = {
                id: generateId(),
                ...data,
                created_at: generateTimestamp(),
                updated_at: generateTimestamp()
              };
              mockData.set(newDomain.id, newDomain);
              return {
                data: newDomain,
                error: null
              };
            })
          }))
        })),
        update: vi.fn((updates: any) => ({
          eq: vi.fn((field: string, value: string) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => {
                const existing = mockData.get(value);
                if (!existing) {
                  return {
                    data: null,
                    error: { message: 'No rows updated' }
                  };
                }

                const updated = {
                  ...existing,
                  ...updates,
                  updated_at: generateTimestamp()
                };
                mockData.set(value, updated);
                return {
                  data: updated,
                  error: null
                };
              })
            }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            const deleted = mockData.delete(value);
            return {
              error: deleted ? null : { message: 'No rows deleted' }
            };
          })
        }))
      })),
      // Expose mock data for test setup/cleanup
      __mockData: mockData,
      __clearMockData: () => {
        mockData.clear();
        idCounter = 1;
      }
    }
  };
});

// Mock domain validation to always pass
vi.mock('../domain-validation', () => ({
  validateDomainFormat: vi.fn(() => ({
    isValid: true,
    errors: []
  })),
  detectDNSRecordType: vi.fn(() => ({
    recommendedType: 'ANAME'
  })),
  generateDNSInstructions: vi.fn(() => [])
}));

// Mock DNS service
vi.mock('../dns-service', () => ({
  dnsService: {
    validateRenderDNSConfiguration: vi.fn(() => Promise.resolve({
      isValid: true,
      recommendations: []
    })),
    verifySSLCertificate: vi.fn(() => Promise.resolve({
      valid: true
    })),
    getDNSInstructions: vi.fn(() => ({
      recordType: 'ANAME',
      name: 'example.com',
      value: 'line-intent-router-bot.onrender.com',
      instructions: []
    }))
  }
}));

describe('Domain Service Integration Tests', () => {
  beforeEach(async () => {
    // Clear mock data before each test
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase as any).__clearMockData();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete CRUD workflow', () => {
    it('should perform complete domain lifecycle operations', async () => {
      // 1. Initially no domains
      let domains = await domainService.getDomainConfigurations();
      expect(domains).toHaveLength(0);

      // 2. Add a new domain
      const formData: DomainFormData = {
        domain: 'example.com',
        subdomain: 'www',
        dns_record_type: 'ANAME'
      };

      const createdDomain = await domainService.addDomainConfiguration(formData);
      expect(createdDomain).toMatchObject({
        domain: 'example.com',
        subdomain: 'www',
        dns_record_type: 'ANAME',
        status: 'pending',
        ssl_enabled: false,
        target_value: 'line-intent-router-bot.onrender.com'
      });
      expect(createdDomain.id).toBeDefined();
      expect(createdDomain.verification_token).toMatch(/^kiro-verify-/);

      // 3. Verify domain appears in list
      domains = await domainService.getDomainConfigurations();
      expect(domains).toHaveLength(1);
      expect(domains[0].id).toBe(createdDomain.id);

      // 4. Get domain by ID
      const fetchedDomain = await domainService.getDomainConfiguration(createdDomain.id);
      expect(fetchedDomain).toEqual(createdDomain);

      // 5. Get domain by domain name
      const fetchedByDomain = await domainService.getDomainConfigurationByDomain('example.com');
      expect(fetchedByDomain).toEqual(createdDomain);

      // 6. Update domain status
      const verifiedDomain = await domainService.updateDomainStatus(createdDomain.id, 'verified');
      expect(verifiedDomain.status).toBe('verified');
      expect(verifiedDomain.last_verified_at).toBeDefined();
      expect(verifiedDomain.error_message).toBeNull();

      // 7. Update domain configuration
      const updatedDomain = await domainService.updateDomainConfiguration(createdDomain.id, {
        ssl_enabled: true,
        subdomain: 'api'
      });
      expect(updatedDomain.ssl_enabled).toBe(true);
      expect(updatedDomain.subdomain).toBe('api');

      // 8. Try to delete enabled domain (should fail)
      await domainService.updateDomainStatus(createdDomain.id, 'enabled');
      await expect(domainService.deleteDomainConfiguration(createdDomain.id))
        .rejects.toThrow('Cannot delete enabled domain configuration');

      // 9. Force delete domain
      await domainService.forceDeleteDomainConfiguration(createdDomain.id);

      // 10. Verify domain is deleted
      domains = await domainService.getDomainConfigurations();
      expect(domains).toHaveLength(0);

      const deletedDomain = await domainService.getDomainConfiguration(createdDomain.id);
      expect(deletedDomain).toBeNull();
    });

    it('should handle multiple domains correctly', async () => {
      // Add multiple domains
      const domains = [
        { domain: 'example1.com', dns_record_type: 'ANAME' as const },
        { domain: 'example2.com', dns_record_type: 'A' as const },
        { domain: 'example3.com', dns_record_type: 'CNAME' as const, subdomain: 'www' }
      ];

      const createdDomains = [];
      for (const domainData of domains) {
        const created = await domainService.addDomainConfiguration(domainData);
        createdDomains.push(created);
      }

      // Verify all domains exist
      const allDomains = await domainService.getDomainConfigurations();
      expect(allDomains).toHaveLength(3);

      // Verify each domain has correct target value
      expect(createdDomains[0].target_value).toBe('line-intent-router-bot.onrender.com'); // ANAME
      expect(createdDomains[1].target_value).toBe('216.24.57.1'); // A record
      expect(createdDomains[2].target_value).toBe('line-intent-router-bot.onrender.com'); // CNAME

      // Update different domains to different statuses
      await domainService.updateDomainStatus(createdDomains[0].id, 'verified');
      await domainService.updateDomainStatus(createdDomains[1].id, 'failed', 'DNS error');
      await domainService.updateDomainStatus(createdDomains[2].id, 'enabled');

      // Verify status updates
      const domain1 = await domainService.getDomainConfiguration(createdDomains[0].id);
      const domain2 = await domainService.getDomainConfiguration(createdDomains[1].id);
      const domain3 = await domainService.getDomainConfiguration(createdDomains[2].id);

      expect(domain1?.status).toBe('verified');
      expect(domain2?.status).toBe('failed');
      expect(domain2?.error_message).toBe('DNS error');
      expect(domain3?.status).toBe('enabled');

      // Delete non-enabled domains
      await domainService.deleteDomainConfiguration(createdDomains[0].id);
      await domainService.deleteDomainConfiguration(createdDomains[1].id);

      // Verify only enabled domain remains
      const remainingDomains = await domainService.getDomainConfigurations();
      expect(remainingDomains).toHaveLength(1);
      expect(remainingDomains[0].id).toBe(createdDomains[2].id);
    });

    it('should prevent duplicate domain creation', async () => {
      const formData: DomainFormData = {
        domain: 'duplicate.com',
        dns_record_type: 'ANAME'
      };

      // Create first domain
      await domainService.addDomainConfiguration(formData);

      // Try to create duplicate
      await expect(domainService.addDomainConfiguration(formData))
        .rejects.toThrow('Domain already exists in configuration');
    });

    it('should handle domain verification workflow', async () => {
      const formData: DomainFormData = {
        domain: 'verify-test.com',
        dns_record_type: 'ANAME'
      };

      const domain = await domainService.addDomainConfiguration(formData);
      expect(domain.status).toBe('pending');

      // Verify domain (mocked to succeed)
      const verifiedDomain = await domainService.verifyDomainConfiguration(domain.id);
      expect(verifiedDomain.status).toBe('enabled'); // Should be enabled due to mocked SSL check
    });

    it('should handle case insensitive domain operations', async () => {
      const formData: DomainFormData = {
        domain: 'CaseSensitive.COM',
        dns_record_type: 'ANAME'
      };

      const domain = await domainService.addDomainConfiguration(formData);
      expect(domain.domain).toBe('casesensitive.com');

      // Should find domain with different case
      const found = await domainService.getDomainConfigurationByDomain('CASESENSITIVE.com');
      expect(found?.id).toBe(domain.id);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent domain operations gracefully', async () => {
      const nonExistentId = 'non-existent-id';

      // Get non-existent domain
      const domain = await domainService.getDomainConfiguration(nonExistentId);
      expect(domain).toBeNull();

      // Update non-existent domain
      await expect(domainService.updateDomainConfiguration(nonExistentId, { status: 'verified' }))
        .rejects.toThrow('Domain configuration not found');

      // Delete non-existent domain
      await expect(domainService.deleteDomainConfiguration(nonExistentId))
        .rejects.toThrow('Domain configuration not found');
    });

    it('should validate input parameters', async () => {
      // Invalid domain configuration data
      await expect(domainService.addDomainConfiguration({} as DomainFormData))
        .rejects.toThrow('Domain is required');

      await expect(domainService.addDomainConfiguration({ domain: 'test.com' } as DomainFormData))
        .rejects.toThrow('DNS record type is required');

      // Invalid IDs
      await expect(domainService.getDomainConfiguration(''))
        .rejects.toThrow('Invalid domain configuration ID');

      await expect(domainService.updateDomainConfiguration('', {}))
        .rejects.toThrow('Invalid domain configuration ID');

      await expect(domainService.deleteDomainConfiguration(''))
        .rejects.toThrow('Invalid domain configuration ID');

      // Invalid domain names
      await expect(domainService.getDomainConfigurationByDomain(''))
        .rejects.toThrow('Invalid domain name');
    });
  });
});