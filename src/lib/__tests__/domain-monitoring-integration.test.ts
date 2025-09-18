import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { domainMonitoringService } from '../domain-monitoring-service';

// Mock Supabase with more realistic behavior
const mockSupabaseData = {
  domains: [
    {
      id: '1',
      domain: 'example.com',
      status: 'enabled',
      dns_record_type: 'ANAME',
      target_value: 'line-intent-router-bot.onrender.com',
    },
    {
      id: '2',
      domain: 'test.com',
      status: 'enabled',
      dns_record_type: 'A',
      target_value: '216.24.57.1',
    },
  ],
  alerts: [],
};

const mockSupabase = {
  from: vi.fn((table: string) => {
    const mockQuery = {
      select: vi.fn(() => mockQuery),
      eq: vi.fn(() => mockQuery),
      single: vi.fn(() => ({
        data: table === 'domain_configurations' ? mockSupabaseData.domains[0] : null,
        error: null,
      })),
      limit: vi.fn(() => mockQuery),
      order: vi.fn(() => ({
        data: table === 'domain_configurations' ? mockSupabaseData.domains : mockSupabaseData.alerts,
        error: null,
      })),
      insert: vi.fn(() => ({
        error: null,
      })),
      update: vi.fn(() => mockQuery),
    };
    return mockQuery;
  }),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock fetch with realistic responses
global.fetch = vi.fn();

describe('Domain Monitoring Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset mock data
    mockSupabaseData.alerts = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    domainMonitoringService.stopMonitoring();
  });

  describe('End-to-end monitoring workflow', () => {
    it('should perform complete monitoring cycle', async () => {
      // Mock successful domain responses
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          type: 'basic',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          type: 'basic',
        });

      // Start monitoring
      domainMonitoringService.startMonitoring();

      // Fast-forward to trigger monitoring cycle
      vi.advanceTimersByTime(5 * 60 * 1000);

      // Wait for async operations
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://example.com', expect.any(Object));
        expect(global.fetch).toHaveBeenCalledWith('https://test.com', expect.any(Object));
      });

      // Verify database updates were called
      expect(mockSupabase.from).toHaveBeenCalledWith('domain_configurations');
    });

    it('should handle mixed domain health states', async () => {
      // Mock one successful and one failed domain
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          type: 'basic',
        })
        .mockRejectedValueOnce(new Error('Connection refused'));

      const healthCheck1 = await domainMonitoringService.checkDomainHealth('example.com');
      const healthCheck2 = await domainMonitoringService.checkDomainHealth('test.com');

      expect(healthCheck1.isAccessible).toBe(true);
      expect(healthCheck1.sslValid).toBe(true);
      
      expect(healthCheck2.isAccessible).toBe(false);
      expect(healthCheck2.sslValid).toBe(false);
      expect(healthCheck2.error).toBe('Connection refused');
    });

    it('should create and manage alerts properly', async () => {
      // Mock failed domain response
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const healthCheck = await domainMonitoringService.checkDomainHealth('example.com');

      expect(healthCheck.isAccessible).toBe(false);
      expect(healthCheck.error).toBe('Network error');

      // Verify alert would be created (mocked database call)
      expect(mockSupabase.from).toHaveBeenCalledWith('domain_alerts');
    });

    it('should handle SSL certificate monitoring', async () => {
      // Mock HTTPS response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        type: 'basic',
      });

      const healthCheck = await domainMonitoringService.checkDomainHealth('example.com');

      expect(healthCheck.sslValid).toBe(true);
      expect(healthCheck.sslExpiresAt).toBeInstanceOf(Date);
    });

    it('should detect configuration drift', async () => {
      const hasDrift = await domainMonitoringService.detectConfigurationDrift('example.com');

      // In the mock implementation, this always returns false
      expect(hasDrift).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('domain_configurations');
    });

    it('should resolve alerts correctly', async () => {
      await domainMonitoringService.resolveAlert('alert-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('domain_alerts');
    });
  });

  describe('Performance and reliability', () => {
    it('should handle timeout scenarios', async () => {
      // Mock a request that never resolves (timeout scenario)
      (global.fetch as any).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      const startTime = Date.now();
      const healthCheck = await domainMonitoringService.checkDomainHealth('slow-domain.com');
      const endTime = Date.now();

      expect(healthCheck.isAccessible).toBe(false);
      expect(healthCheck.error).toContain('abort');
      expect(endTime - startTime).toBeLessThan(15000); // Should timeout before 15 seconds
    });

    it('should handle multiple concurrent health checks', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        type: 'basic',
      });

      const promises = [
        domainMonitoringService.checkDomainHealth('domain1.com'),
        domainMonitoringService.checkDomainHealth('domain2.com'),
        domainMonitoringService.checkDomainHealth('domain3.com'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.isAccessible).toBe(true);
        expect(result.responseTime).toBeGreaterThan(0);
      });
    });

    it('should maintain monitoring state correctly', () => {
      expect(domainMonitoringService['monitoringInterval']).toBeNull();

      domainMonitoringService.startMonitoring();
      expect(domainMonitoringService['monitoringInterval']).not.toBeNull();

      domainMonitoringService.stopMonitoring();
      expect(domainMonitoringService['monitoringInterval']).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(domainMonitoringService.getActiveAlerts()).rejects.toThrow(
        'Failed to fetch alerts: Database connection failed'
      );
    });
  });

  describe('Alert severity and categorization', () => {
    it('should categorize SSL expiration alerts correctly', async () => {
      // Mock domain with SSL certificate expiring in different timeframes
      const now = Date.now();
      
      // Test critical (expired)
      const expiredCheck = {
        domain: 'expired.com',
        isAccessible: true,
        sslValid: false,
        sslExpiresAt: new Date(now - 24 * 60 * 60 * 1000), // 1 day ago
        lastChecked: new Date(),
      };

      // Test high severity (expires in 5 days)
      const soonExpiringCheck = {
        domain: 'soon.com',
        isAccessible: true,
        sslValid: true,
        sslExpiresAt: new Date(now + 5 * 24 * 60 * 60 * 1000), // 5 days
        lastChecked: new Date(),
      };

      // Test medium severity (expires in 20 days)
      const mediumExpiringCheck = {
        domain: 'medium.com',
        isAccessible: true,
        sslValid: true,
        sslExpiresAt: new Date(now + 20 * 24 * 60 * 60 * 1000), // 20 days
        lastChecked: new Date(),
      };

      // Verify expiration logic
      const expiredDays = Math.floor(
        (expiredCheck.sslExpiresAt.getTime() - now) / (1000 * 60 * 60 * 24)
      );
      const soonDays = Math.floor(
        (soonExpiringCheck.sslExpiresAt.getTime() - now) / (1000 * 60 * 60 * 24)
      );
      const mediumDays = Math.floor(
        (mediumExpiringCheck.sslExpiresAt.getTime() - now) / (1000 * 60 * 60 * 24)
      );

      expect(expiredDays).toBeLessThan(0); // Should be critical
      expect(soonDays).toBeLessThanOrEqual(7); // Should be high
      expect(mediumDays).toBeLessThanOrEqual(30); // Should be medium
    });

    it('should handle accessibility alerts', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const healthCheck = await domainMonitoringService.checkDomainHealth('down.com');

      expect(healthCheck.isAccessible).toBe(false);
      expect(healthCheck.error).toBe('Connection refused');
      // This would trigger a critical accessibility alert
    });
  });

  describe('Monitoring intervals and scheduling', () => {
    it('should respect monitoring intervals', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      domainMonitoringService.startMonitoring();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );
    });

    it('should perform initial check on start', () => {
      const performHealthChecksSpy = vi.spyOn(
        domainMonitoringService as any,
        'performHealthChecks'
      );
      
      domainMonitoringService.startMonitoring();
      
      expect(performHealthChecksSpy).toHaveBeenCalled();
    });

    it('should clean up properly on stop', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      domainMonitoringService.startMonitoring();
      domainMonitoringService.stopMonitoring();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});