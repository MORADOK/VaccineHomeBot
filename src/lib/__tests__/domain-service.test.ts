/**
 * Unit tests for domain service CRUD operations
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { domainService, DomainManagementService } from '../domain-service';
import { supabase } from '@/integrations/supabase/client';
import { DomainConfiguration, DomainFormData, DomainStatus } from '@/types/domain-config';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    }))
  }
}));

// Mock domain validation
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
    validateRenderDNSConfiguration: vi.fn(),
    verifySSLCertificate: vi.fn(),
    getDNSInstructions: vi.fn(() => ({
      recordType: 'ANAME',
      name: 'example.com',
      value: 'line-intent-router-bot.onrender.com',
      instructions: []
    }))
  }
}));

describe('DomainManagementService', () => {
  let service: DomainManagementService;
  let mockSupabaseFrom: any;

  const mockDomainConfig: DomainConfiguration = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    domain: 'example.com',
    subdomain: 'www',
    status: 'pending',
    dns_record_type: 'ANAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: false,
    verification_token: 'kiro-verify-abc123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    service = new DomainManagementService();
    mockSupabaseFrom = vi.mocked(supabase.from);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDomainConfigurations', () => {
    it('should fetch all domain configurations successfully', async () => {
      const mockData = [mockDomainConfig];
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: mockData,
            error: null
          }))
        }))
      });

      const result = await service.getDomainConfigurations();

      expect(result).toEqual(mockData);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('domain_configurations');
    });

    it('should handle fetch error', async () => {
      const mockError = { message: 'Database error' };
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: null,
            error: mockError
          }))
        }))
      });

      await expect(service.getDomainConfigurations()).rejects.toThrow('Failed to fetch domain configurations: Database error');
    });

    it('should return empty array when no data', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const result = await service.getDomainConfigurations();
      expect(result).toEqual([]);
    });
  });

  describe('getDomainConfiguration', () => {
    it('should fetch single domain configuration by ID', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockDomainConfig,
              error: null
            }))
          }))
        }))
      });

      const result = await service.getDomainConfiguration('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockDomainConfig);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('domain_configurations');
    });

    it('should return null when domain not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }))
      });

      const result = await service.getDomainConfiguration('nonexistent-id');
      expect(result).toBeNull();
    });

    it('should throw error for invalid ID', async () => {
      await expect(service.getDomainConfiguration('')).rejects.toThrow('Invalid domain configuration ID');
      await expect(service.getDomainConfiguration(null as any)).rejects.toThrow('Invalid domain configuration ID');
    });
  });

  describe('getDomainConfigurationByDomain', () => {
    it('should fetch domain configuration by domain name', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockDomainConfig,
              error: null
            }))
          }))
        }))
      });

      const result = await service.getDomainConfigurationByDomain('example.com');

      expect(result).toEqual(mockDomainConfig);
    });

    it('should handle domain name case insensitivity', async () => {
      const mockEq = vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockDomainConfig,
          error: null
        }))
      }));

      const mockSelect = vi.fn(() => ({
        eq: mockEq
      }));

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect
      });

      await service.getDomainConfigurationByDomain('EXAMPLE.COM');

      // Verify that the domain was converted to lowercase
      expect(mockEq).toHaveBeenCalledWith('domain', 'example.com');
    });

    it('should throw error for invalid domain', async () => {
      await expect(service.getDomainConfigurationByDomain('')).rejects.toThrow('Invalid domain name');
    });
  });

  describe('addDomainConfiguration', () => {
    const mockFormData: DomainFormData = {
      domain: 'example.com',
      subdomain: 'www',
      dns_record_type: 'ANAME'
    };

    it('should add domain configuration successfully', async () => {
      // Mock getDomainConfigurationByDomain to return null (domain doesn't exist)
      vi.spyOn(service, 'getDomainConfigurationByDomain').mockResolvedValue(null);

      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockDomainConfig,
              error: null
            }))
          }))
        }))
      });

      const result = await service.addDomainConfiguration(mockFormData);

      expect(result).toEqual(mockDomainConfig);
      expect(service.getDomainConfigurationByDomain).toHaveBeenCalledWith('example.com');
    });

    it('should throw error for missing domain', async () => {
      await expect(service.addDomainConfiguration({} as DomainFormData)).rejects.toThrow('Domain is required');
    });

    it('should throw error for missing DNS record type', async () => {
      await expect(service.addDomainConfiguration({
        domain: 'example.com'
      } as DomainFormData)).rejects.toThrow('DNS record type is required');
    });

    it('should throw error for existing domain', async () => {
      vi.spyOn(service, 'getDomainConfigurationByDomain').mockResolvedValue(mockDomainConfig);

      await expect(service.addDomainConfiguration(mockFormData)).rejects.toThrow('Domain already exists in configuration');
    });

    it('should handle database insertion error', async () => {
      vi.spyOn(service, 'getDomainConfigurationByDomain').mockResolvedValue(null);

      mockSupabaseFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      await expect(service.addDomainConfiguration(mockFormData)).rejects.toThrow('Failed to add domain configuration: Database error');
    });
  });

  describe('updateDomainConfiguration', () => {
    it('should update domain configuration successfully', async () => {
      vi.spyOn(service, 'getDomainConfiguration').mockResolvedValue(mockDomainConfig);
      vi.spyOn(service, 'getDomainConfigurationByDomain').mockResolvedValue(null);

      const updatedConfig = { ...mockDomainConfig, status: 'verified' as DomainStatus };
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: updatedConfig,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await service.updateDomainConfiguration('123e4567-e89b-12d3-a456-426614174000', {
        status: 'verified'
      });

      expect(result).toEqual(updatedConfig);
    });

    it('should throw error for invalid ID', async () => {
      await expect(service.updateDomainConfiguration('', {})).rejects.toThrow('Invalid domain configuration ID');
    });

    it('should throw error for non-existent domain', async () => {
      vi.spyOn(service, 'getDomainConfiguration').mockResolvedValue(null);

      await expect(service.updateDomainConfiguration('123e4567-e89b-12d3-a456-426614174000', {}))
        .rejects.toThrow('Domain configuration not found');
    });
  });

  describe('deleteDomainConfiguration', () => {
    it('should delete domain configuration successfully', async () => {
      vi.spyOn(service, 'getDomainConfiguration').mockResolvedValue(mockDomainConfig);

      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      });

      await expect(service.deleteDomainConfiguration('123e4567-e89b-12d3-a456-426614174000')).resolves.not.toThrow();
    });

    it('should throw error for invalid ID', async () => {
      await expect(service.deleteDomainConfiguration('')).rejects.toThrow('Invalid domain configuration ID');
    });

    it('should throw error for non-existent domain', async () => {
      vi.spyOn(service, 'getDomainConfiguration').mockResolvedValue(null);

      await expect(service.deleteDomainConfiguration('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow('Domain configuration not found');
    });

    it('should prevent deletion of enabled domains', async () => {
      const enabledDomain = { ...mockDomainConfig, status: 'enabled' as DomainStatus };
      vi.spyOn(service, 'getDomainConfiguration').mockResolvedValue(enabledDomain);

      await expect(service.deleteDomainConfiguration('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow('Cannot delete enabled domain configuration. Disable it first.');
    });

    it('should handle database deletion error', async () => {
      vi.spyOn(service, 'getDomainConfiguration').mockResolvedValue(mockDomainConfig);

      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: { message: 'Database error' }
          }))
        }))
      });

      await expect(service.deleteDomainConfiguration('123e4567-e89b-12d3-a456-426614174000'))
        .rejects.toThrow('Failed to delete domain configuration: Database error');
    });
  });

  describe('forceDeleteDomainConfiguration', () => {
    it('should force delete domain configuration', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            error: null
          }))
        }))
      });

      await expect(service.forceDeleteDomainConfiguration('123e4567-e89b-12d3-a456-426614174000')).resolves.not.toThrow();
    });

    it('should throw error for invalid ID', async () => {
      await expect(service.forceDeleteDomainConfiguration('')).rejects.toThrow('Invalid domain configuration ID');
    });
  });

  describe('updateDomainStatus', () => {
    it('should update domain status to verified', async () => {
      const updatedConfig = { ...mockDomainConfig, status: 'verified' as DomainStatus };
      vi.spyOn(service, 'updateDomainConfiguration').mockResolvedValue(updatedConfig);

      const result = await service.updateDomainStatus('123e4567-e89b-12d3-a456-426614174000', 'verified');

      expect(result.status).toBe('verified');
      expect(service.updateDomainConfiguration).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          status: 'verified',
          last_verified_at: expect.any(String),
          error_message: null
        })
      );
    });

    it('should update domain status to failed with error message', async () => {
      const updatedConfig = { ...mockDomainConfig, status: 'failed' as DomainStatus, error_message: 'DNS error' };
      vi.spyOn(service, 'updateDomainConfiguration').mockResolvedValue(updatedConfig);

      const result = await service.updateDomainStatus('123e4567-e89b-12d3-a456-426614174000', 'failed', 'DNS error');

      expect(result.status).toBe('failed');
      expect(service.updateDomainConfiguration).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          status: 'failed',
          error_message: 'DNS error'
        })
      );
    });
  });

  describe('getTargetValue', () => {
    it('should return correct target value for ANAME record', () => {
      const service = new DomainManagementService();
      const targetValue = (service as any).getTargetValue('ANAME');
      expect(targetValue).toBe('line-intent-router-bot.onrender.com');
    });

    it('should return correct target value for CNAME record', () => {
      const service = new DomainManagementService();
      const targetValue = (service as any).getTargetValue('CNAME');
      expect(targetValue).toBe('line-intent-router-bot.onrender.com');
    });

    it('should return correct target value for A record', () => {
      const service = new DomainManagementService();
      const targetValue = (service as any).getTargetValue('A');
      expect(targetValue).toBe('216.24.57.1');
    });

    it('should throw error for unsupported record type', () => {
      const service = new DomainManagementService();
      expect(() => (service as any).getTargetValue('INVALID')).toThrow('Unsupported DNS record type: INVALID');
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate verification token with correct prefix', () => {
      const service = new DomainManagementService();
      const token = (service as any).generateVerificationToken();
      expect(token).toMatch(/^kiro-verify-[a-z0-9]+$/);
    });
  });

  describe('bulkUpdateDomainStatus', () => {
    it('should update multiple domain statuses successfully', async () => {
      const updates = [
        { id: 'id1', status: 'verified' as DomainStatus },
        { id: 'id2', status: 'failed' as DomainStatus, errorMessage: 'DNS error' }
      ];

      const mockResults = [
        { ...mockDomainConfig, id: 'id1', status: 'verified' },
        { ...mockDomainConfig, id: 'id2', status: 'failed', error_message: 'DNS error' }
      ];

      vi.spyOn(service, 'updateDomainStatus')
        .mockResolvedValueOnce(mockResults[0] as DomainConfiguration)
        .mockResolvedValueOnce(mockResults[1] as DomainConfiguration);

      const results = await service.bulkUpdateDomainStatus(updates);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('verified');
      expect(results[1].status).toBe('failed');
      expect(service.updateDomainStatus).toHaveBeenCalledTimes(2);
    });

    it('should throw error for empty updates array', async () => {
      await expect(service.bulkUpdateDomainStatus([])).rejects.toThrow('No updates provided');
    });

    it('should handle partial failures in bulk update', async () => {
      const updates = [
        { id: 'id1', status: 'verified' as DomainStatus },
        { id: 'invalid-id', status: 'failed' as DomainStatus }
      ];

      vi.spyOn(service, 'updateDomainStatus')
        .mockResolvedValueOnce({ ...mockDomainConfig, id: 'id1', status: 'verified' } as DomainConfiguration)
        .mockRejectedValueOnce(new Error('Domain not found'));

      await expect(service.bulkUpdateDomainStatus(updates))
        .rejects.toThrow('Bulk update completed with errors');
    });
  });

  describe('getDomainsByStatus', () => {
    it('should fetch domains by status', async () => {
      const mockData = [mockDomainConfig];
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: mockData,
              error: null
            }))
          }))
        }))
      });

      const result = await service.getDomainsByStatus('pending');

      expect(result).toEqual(mockData);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('domain_configurations');
    });

    it('should handle error when fetching domains by status', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      await expect(service.getDomainsByStatus('pending'))
        .rejects.toThrow('Failed to fetch domains by status: Database error');
    });
  });

  describe('getDomainCountByStatus', () => {
    it('should count domains by status', async () => {
      const mockDomains = [
        { ...mockDomainConfig, id: '1', status: 'pending' as DomainStatus },
        { ...mockDomainConfig, id: '2', status: 'verified' as DomainStatus },
        { ...mockDomainConfig, id: '3', status: 'enabled' as DomainStatus },
        { ...mockDomainConfig, id: '4', status: 'pending' as DomainStatus }
      ];

      vi.spyOn(service, 'getDomainConfigurations').mockResolvedValue(mockDomains);

      const counts = await service.getDomainCountByStatus();

      expect(counts).toEqual({
        pending: 2,
        verified: 1,
        failed: 0,
        enabled: 1
      });
    });

    it('should return zero counts when no domains exist', async () => {
      vi.spyOn(service, 'getDomainConfigurations').mockResolvedValue([]);

      const counts = await service.getDomainCountByStatus();

      expect(counts).toEqual({
        pending: 0,
        verified: 0,
        failed: 0,
        enabled: 0
      });
    });
  });
});