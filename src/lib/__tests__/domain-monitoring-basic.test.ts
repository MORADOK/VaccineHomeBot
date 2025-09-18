import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { domainMonitoringService } from '../domain-monitoring-service';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('DomainMonitoringService - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    domainMonitoringService.stopMonitoring();
  });

  describe('checkDomainHealth', () => {
    it('should return health check result for accessible domain', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        type: 'basic',
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await domainMonitoringService.checkDomainHealth('example.com');

      expect(result).toMatchObject({
        domain: 'example.com',
        isAccessible: true,
        statusCode: 200,
        sslValid: true,
      });
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('should return unhealthy status for inaccessible domain', async () => {
      const mockError = new Error('Network error');
      (global.fetch as any).mockRejectedValue(mockError);

      const result = await domainMonitoringService.checkDomainHealth('invalid-domain.com');

      expect(result).toMatchObject({
        domain: 'invalid-domain.com',
        isAccessible: false,
        sslValid: false,
        error: 'Network error',
      });
      expect(result.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring with correct interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      domainMonitoringService.startMonitoring();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );
    });

    it('should stop monitoring correctly', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      domainMonitoringService.startMonitoring();
      domainMonitoringService.stopMonitoring();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('alert management', () => {
    it('should fetch active alerts', async () => {
      const result = await domainMonitoringService.getActiveAlerts();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should resolve alerts', async () => {
      await expect(domainMonitoringService.resolveAlert('alert-123')).resolves.not.toThrow();
    });
  });

  describe('configuration drift detection', () => {
    it('should detect configuration drift', async () => {
      const result = await domainMonitoringService.detectConfigurationDrift('example.com');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('SSL monitoring', () => {
    it('should check SSL certificate status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        type: 'basic',
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await domainMonitoringService.checkDomainHealth('example.com');

      expect(result.sslValid).toBe(true);
      expect(result.sslExpiresAt).toBeInstanceOf(Date);
    });

    it('should handle SSL check failures', async () => {
      (global.fetch as any).mockRejectedValue(new Error('SSL error'));

      const result = await domainMonitoringService.checkDomainHealth('example.com');

      expect(result.sslValid).toBe(false);
      expect(result.sslExpiresAt).toBeUndefined();
    });
  });
});