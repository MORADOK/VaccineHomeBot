import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDomainMonitoring } from '../use-domain-monitoring';
import React from 'react';

// Mock the domain monitoring service
vi.mock('@/lib/domain-monitoring-service', () => ({
  domainMonitoringService: {
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    getActiveAlerts: vi.fn().mockResolvedValue([]),
    resolveAlert: vi.fn().mockResolvedValue(undefined),
    checkDomainHealth: vi.fn().mockResolvedValue({
      domain: 'test.com',
      isAccessible: true,
      sslValid: true,
      lastChecked: new Date(),
    }),
  },
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
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

describe('useDomainMonitoring', () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('should start monitoring on mount', async () => {
    const { domainMonitoringService } = await import('@/lib/domain-monitoring-service');
    renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    expect(domainMonitoringService.startMonitoring).toHaveBeenCalled();
  });

  it('should stop monitoring on unmount', async () => {
    const { unmount } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    unmount();

    expect(mockDomainMonitoringService.stopMonitoring).toHaveBeenCalled();
  });

  it('should fetch active alerts', async () => {
    const mockAlerts = [
      {
        id: '1',
        domain: 'example.com',
        alertType: 'accessibility',
        severity: 'critical',
        message: 'Domain not accessible',
        createdAt: new Date(),
        resolved: false,
      },
    ];

    mockDomainMonitoringService.getActiveAlerts.mockResolvedValue(mockAlerts);

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    await waitFor(() => {
      expect(result.current.alerts).toEqual(mockAlerts);
    });
  });

  it('should handle alerts loading state', async () => {
    mockDomainMonitoringService.getActiveAlerts.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    expect(result.current.alertsLoading).toBe(true);
  });

  it('should resolve alerts', async () => {
    mockDomainMonitoringService.resolveAlert.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    await waitFor(() => {
      expect(result.current.resolveAlert).toBeDefined();
    });

    result.current.resolveAlert('alert-123');

    expect(mockDomainMonitoringService.resolveAlert).toHaveBeenCalledWith('alert-123');
  });

  it('should perform manual health checks', async () => {
    const mockHealthCheck = {
      domain: 'example.com',
      isAccessible: true,
      sslValid: true,
      lastChecked: new Date(),
    };

    mockDomainMonitoringService.checkDomainHealth.mockResolvedValue(mockHealthCheck);

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    await waitFor(() => {
      expect(result.current.performHealthCheck).toBeDefined();
    });

    result.current.performHealthCheck('example.com');

    expect(mockDomainMonitoringService.checkDomainHealth).toHaveBeenCalledWith('example.com');
  });

  it('should filter alerts by severity', async () => {
    const mockAlerts = [
      {
        id: '1',
        domain: 'example.com',
        alertType: 'accessibility',
        severity: 'critical',
        message: 'Domain not accessible',
        createdAt: new Date(),
        resolved: false,
      },
      {
        id: '2',
        domain: 'test.com',
        alertType: 'ssl_expiring',
        severity: 'medium',
        message: 'SSL expires soon',
        createdAt: new Date(),
        resolved: false,
      },
    ];

    mockDomainMonitoringService.getActiveAlerts.mockResolvedValue(mockAlerts);

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    await waitFor(() => {
      expect(result.current.alerts).toEqual(mockAlerts);
    });

    const criticalAlerts = result.current.getAlertsBySeverity('critical');
    const mediumAlerts = result.current.getAlertsBySeverity('medium');

    expect(criticalAlerts).toHaveLength(1);
    expect(criticalAlerts[0].severity).toBe('critical');
    expect(mediumAlerts).toHaveLength(1);
    expect(mediumAlerts[0].severity).toBe('medium');
  });

  it('should count critical alerts correctly', async () => {
    const mockAlerts = [
      {
        id: '1',
        domain: 'example.com',
        alertType: 'accessibility',
        severity: 'critical',
        message: 'Domain not accessible',
        createdAt: new Date(),
        resolved: false,
      },
      {
        id: '2',
        domain: 'test.com',
        alertType: 'ssl_expired',
        severity: 'critical',
        message: 'SSL expired',
        createdAt: new Date(),
        resolved: false,
      },
      {
        id: '3',
        domain: 'other.com',
        alertType: 'ssl_expiring',
        severity: 'medium',
        message: 'SSL expires soon',
        createdAt: new Date(),
        resolved: false,
      },
    ];

    mockDomainMonitoringService.getActiveAlerts.mockResolvedValue(mockAlerts);

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    await waitFor(() => {
      expect(result.current.criticalAlertsCount).toBe(2);
    });
  });

  it('should handle monitoring state correctly', async () => {
    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    // Initially should be monitoring
    await waitFor(() => {
      expect(result.current.isMonitoring).toBe(true);
    });

    // Stop monitoring
    result.current.stopMonitoring();
    expect(result.current.isMonitoring).toBe(false);

    // Start monitoring again
    result.current.startMonitoring();
    expect(result.current.isMonitoring).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Network error');
    mockDomainMonitoringService.getActiveAlerts.mockRejectedValue(mockError);

    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    await waitFor(() => {
      expect(result.current.alertsError).toBeDefined();
    });
  });

  it('should set up real-time subscriptions', async () => {
    renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    expect(mockSupabase.channel).toHaveBeenCalledWith('domain_alerts_changes');
    expect(mockSupabase.channel).toHaveBeenCalledWith('domain_configurations_changes');
  });

  it('should clean up subscriptions on unmount', async () => {
    const { unmount } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });
});