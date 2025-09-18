import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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

describe('useDomainMonitoring - Basic Tests', () => {
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

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    expect(result.current.isMonitoring).toBe(true);
    expect(Array.isArray(result.current.alerts)).toBe(true);
    expect(Array.isArray(result.current.domains)).toBe(true);
    expect(typeof result.current.criticalAlertsCount).toBe('number');
  });

  it('should provide monitoring control functions', () => {
    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    expect(typeof result.current.startMonitoring).toBe('function');
    expect(typeof result.current.stopMonitoring).toBe('function');
    expect(typeof result.current.resolveAlert).toBe('function');
    expect(typeof result.current.performHealthCheck).toBe('function');
    expect(typeof result.current.getAlertsBySeverity).toBe('function');
  });

  it('should handle monitoring state changes', () => {
    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    // Test stop monitoring
    result.current.stopMonitoring();
    expect(result.current.isMonitoring).toBe(false);

    // Test start monitoring
    result.current.startMonitoring();
    expect(result.current.isMonitoring).toBe(true);
  });

  it('should provide loading states', () => {
    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    expect(typeof result.current.alertsLoading).toBe('boolean');
    expect(typeof result.current.domainsLoading).toBe('boolean');
    expect(typeof result.current.isResolvingAlert).toBe('boolean');
    expect(typeof result.current.isPerformingHealthCheck).toBe('boolean');
  });

  it('should filter alerts by severity', () => {
    const { result } = renderHook(() => useDomainMonitoring(), { wrapper: createWrapper });

    const criticalAlerts = result.current.getAlertsBySeverity('critical');
    const mediumAlerts = result.current.getAlertsBySeverity('medium');

    expect(Array.isArray(criticalAlerts)).toBe(true);
    expect(Array.isArray(mediumAlerts)).toBe(true);
  });
});