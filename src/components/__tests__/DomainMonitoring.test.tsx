import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DomainMonitoring } from '../DomainMonitoring';
import React from 'react';

// Mock the domain monitoring hook
const mockUseDomainMonitoring = {
  isMonitoring: true,
  alerts: [],
  domains: [],
  criticalAlertsCount: 0,
  alertsLoading: false,
  domainsLoading: false,
  isResolvingAlert: false,
  isPerformingHealthCheck: false,
  alertsError: null,
  resolveAlertError: null,
  healthCheckError: null,
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  resolveAlert: vi.fn(),
  performHealthCheck: vi.fn(),
  getAlertsBySeverity: vi.fn(() => []),
};

vi.mock('@/hooks/use-domain-monitoring', () => ({
  useDomainMonitoring: () => mockUseDomainMonitoring,
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
}));

describe('DomainMonitoring', () => {
  let queryClient: QueryClient;

  const createWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

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

  it('should render monitoring status correctly', () => {
    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('Domain Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Continuous monitoring of domain accessibility and SSL certificates')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    mockUseDomainMonitoring.alertsLoading = true;
    mockUseDomainMonitoring.domainsLoading = true;

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('should display monitoring statistics', () => {
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: true,
        ssl_valid: true,
      },
      {
        id: '2',
        domain: 'test.com',
        status: 'enabled',
        is_accessible: false,
        ssl_valid: false,
      },
    ];
    mockUseDomainMonitoring.criticalAlertsCount = 2;
    mockUseDomainMonitoring.alerts = [
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
        message: 'SSL certificate expired',
        createdAt: new Date(),
        resolved: false,
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('2')).toBeInTheDocument(); // Monitored domains
    expect(screen.getByText('2')).toBeInTheDocument(); // Critical alerts
    expect(screen.getByText('2')).toBeInTheDocument(); // Total alerts
  });

  it('should display active alerts', () => {
    mockUseDomainMonitoring.alerts = [
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

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('Domain not accessible')).toBeInTheDocument();
  });

  it('should handle alert resolution', async () => {
    mockUseDomainMonitoring.alerts = [
      {
        id: 'alert-123',
        domain: 'example.com',
        alertType: 'accessibility',
        severity: 'critical',
        message: 'Domain not accessible',
        createdAt: new Date(),
        resolved: false,
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    const resolveButton = screen.getByText('Resolve');
    fireEvent.click(resolveButton);

    expect(mockUseDomainMonitoring.resolveAlert).toHaveBeenCalledWith('alert-123');
  });

  it('should display domain health status', () => {
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: true,
        ssl_valid: true,
        response_time_ms: 150,
        last_health_check: new Date().toISOString(),
        ssl_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('Domain Health Status')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('should handle manual health checks', async () => {
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: true,
        ssl_valid: true,
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    const checkButton = screen.getByText('Check Now');
    fireEvent.click(checkButton);

    expect(mockUseDomainMonitoring.performHealthCheck).toHaveBeenCalledWith('example.com');
  });

  it('should display error states for domains', () => {
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: false,
        ssl_valid: false,
        last_error: 'Connection timeout',
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('Inaccessible')).toBeInTheDocument();
    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('should display SSL expiration information', () => {
    const expirationDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: true,
        ssl_valid: true,
        ssl_expires_at: expirationDate.toISOString(),
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('SSL Expires:')).toBeInTheDocument();
    expect(screen.getByText(expirationDate.toLocaleDateString())).toBeInTheDocument();
  });

  it('should show inactive monitoring status', () => {
    mockUseDomainMonitoring.isMonitoring = false;

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('should display empty state when no domains configured', () => {
    mockUseDomainMonitoring.domains = [];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('No domains configured for monitoring')).toBeInTheDocument();
  });

  it('should format time correctly', () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: true,
        ssl_valid: true,
        last_health_check: fiveMinutesAgo.toISOString(),
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('should handle different alert severities with correct styling', () => {
    mockUseDomainMonitoring.alerts = [
      {
        id: '1',
        domain: 'example.com',
        alertType: 'accessibility',
        severity: 'critical',
        message: 'Critical issue',
        createdAt: new Date(),
        resolved: false,
      },
      {
        id: '2',
        domain: 'test.com',
        alertType: 'ssl_expiring',
        severity: 'medium',
        message: 'Medium issue',
        createdAt: new Date(),
        resolved: false,
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('should disable buttons during loading states', () => {
    mockUseDomainMonitoring.isResolvingAlert = true;
    mockUseDomainMonitoring.isPerformingHealthCheck = true;
    mockUseDomainMonitoring.alerts = [
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
    mockUseDomainMonitoring.domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'enabled',
        is_accessible: true,
        ssl_valid: true,
      },
    ];

    render(<DomainMonitoring />, { wrapper: createWrapper });

    const resolveButton = screen.getByText('Resolve');
    const checkButton = screen.getByText('Check Now');

    expect(resolveButton).toBeDisabled();
    expect(checkButton).toBeDisabled();
  });
});