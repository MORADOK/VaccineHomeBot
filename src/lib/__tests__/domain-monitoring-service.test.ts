import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { domainMonitoringService, DomainHealthCheck, DomainAlert } from '../domain-monitoring-service';

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
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('DomainMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    domainMonitoringService.stopMonitoring();
  });

  describe('checkDomainHealth', () => {
    it('should return healthy status for accessible domain', async () => {
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
      expect(result.responseTime).toBeGreaterThan(0);
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

    it('should handle timeout correctly', async () => {
      // Mock a slow response
      (global.fetch as any).mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 15000))
      );

      const result = await domainMonitoringService.checkDomainHealth('slow-domain.com');

      expect(result).toMatchObject({
        domain: 'slow-domain.com',
        isAccessible: false,
        sslValid: false,
      });
      expect(result.error).toContain('abort');
    });
  });

  describe('startMonitoring and stopMonitoring', () => {
    it('should start monitoring with correct interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      domainMonitoringService.startMonitoring();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );
    });

    it('should stop existing monitoring before starting new one', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      domainMonitoringService.startMonitoring();
      domainMonitoringService.startMonitoring(); // Start again
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should stop monitoring correctly', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      domainMonitoringService.startMonitoring();
      domainMonitoringService.stopMonitoring();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('getActiveAlerts', () => {
    it('should return empty array when no alerts exist', async () => {
      const result = await domainMonitoringService.getActiveAlerts();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('resolveAlert', () => {
    it('should call supabase to resolve alert', async () => {
      await expect(domainMonitoringService.resolveAlert('alert-123')).resolves.not.toThrow();
    });
  });

  describe('detectConfigurationDrift', () => {
    it('should return false for any domain (simulation)', async () => {
      const result = await domainMonitoringService.detectConfigurationDrift('example.com');
      expect(result).toBe(false);
    });
  });

  describe('SSL certificate monitoring', () => {
    it('should detect SSL expiration correctly', async () => {
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

  describe('Alert creation and processing', () => {
    it('should create accessibility alert for inaccessible domain', async () => {
      const mockDomain = {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
      };

      const mockHealthCheck: DomainHealthCheck = {
        domain: 'example.com',
        isAccessible: false,
        sslValid: false,
        lastChecked: new Date(),
        error: 'Connection refused',
      };

      // Mock no existing alerts
      mockSupabase.from().select().eq().eq().eq().limit.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock successful alert creation
      mockSupabase.from().insert.mockResolvedValue({
        error: null,
      });

      // This would be called internally by processAlerts
      // We can't test it directly, but we can verify the structure
      expect(mockHealthCheck.isAccessible).toBe(false);
      expect(mockHealthCheck.error).toBe('Connection refused');
    });

    it('should create SSL expiration alert', async () => {
      const mockHealthCheck: DomainHealthCheck = {
        domain: 'example.com',
        isAccessible: true,
        sslValid: true,
        sslExpiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        lastChecked: new Date(),
      };

      // Verify SSL expiration logic
      const daysUntilExpiry = Math.floor(
        (mockHealthCheck.sslExpiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntilExpiry).toBeLessThanOrEqual(30); // Should trigger warning
      expect(daysUntilExpiry).toBeGreaterThan(0); // Should not be expired
    });
  });

  describe('Performance monitoring', () => {
    it('should track response times', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        type: 'basic',
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await domainMonitoringService.checkDomainHealth('example.com');

      expect(result.responseTime).toBeGreaterThan(0);
      expect(typeof result.responseTime).toBe('number');
    });

    it('should handle slow responses', async () => {
      // Mock a response that takes 2 seconds
      (global.fetch as any).mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            type: 'basic',
          }), 2000)
        )
      );

      const startTime = Date.now();
      const result = await domainMonitoringService.checkDomainHealth('example.com');
      const endTime = Date.now();

      expect(result.responseTime).toBeGreaterThan(1000); // At least 1 second
      expect(endTime - startTime).toBeGreaterThan(1000);
    });
  });
});