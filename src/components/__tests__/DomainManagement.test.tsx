/**
 * Tests for Domain Management Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DomainManagement } from '../DomainManagement';
import { domainService } from '@/lib/domain-service';
import { DomainConfiguration } from '@/types/domain-config';

// Mock the domain service
vi.mock('@/lib/domain-service', () => ({
  domainService: {
    getDomainConfigurations: vi.fn(),
    verifyDomainConfiguration: vi.fn(),
    deleteDomainConfiguration: vi.fn(),
    getDNSInstructions: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  Plus: () => <div data-testid="plus-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  XCircle: () => <div data-testid="x-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
}));

const mockDomains: DomainConfiguration[] = [
  {
    id: '1',
    domain: 'example.com',
    subdomain: 'www',
    status: 'enabled',
    dns_record_type: 'ANAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: true,
    verification_token: 'token123',
    last_verified_at: '2023-01-01T00:00:00Z',
    error_message: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    domain: 'test.com',
    status: 'pending',
    dns_record_type: 'A',
    target_value: '216.24.57.1',
    ssl_enabled: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('DomainManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(domainService.getDomainConfigurations).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(<DomainManagement />);
    
    expect(screen.getByText('Loading domain configurations...')).toBeInTheDocument();
  });

  it('renders domain configurations when loaded', async () => {
    vi.mocked(domainService.getDomainConfigurations).mockResolvedValue(mockDomains);

    renderWithQueryClient(<DomainManagement />);

    await waitFor(() => {
      expect(screen.getByText('Domain Management')).toBeInTheDocument();
    });

    // Check if the component renders the basic structure
    expect(screen.getByText('Configure custom domains for your vaccine hospital service')).toBeInTheDocument();
  });

  it('renders empty state when no domains exist', async () => {
    vi.mocked(domainService.getDomainConfigurations).mockResolvedValue([]);

    renderWithQueryClient(<DomainManagement />);

    await waitFor(() => {
      expect(screen.getByText('No domain configurations found.')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    const errorMessage = 'Failed to fetch domains';
    vi.mocked(domainService.getDomainConfigurations).mockRejectedValue(
      new Error(errorMessage)
    );

    renderWithQueryClient(<DomainManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load domain configurations/)).toBeInTheDocument();
    });
  });

  it('shows add domain form when add button is clicked', async () => {
    vi.mocked(domainService.getDomainConfigurations).mockResolvedValue([]);

    renderWithQueryClient(<DomainManagement />);

    await waitFor(() => {
      expect(screen.getByText('Add Domain')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Domain'));

    expect(screen.getByText('Add Custom Domain')).toBeInTheDocument();
  });

  it('shows basic interface elements', async () => {
    vi.mocked(domainService.getDomainConfigurations).mockResolvedValue([]);

    renderWithQueryClient(<DomainManagement />);

    await waitFor(() => {
      expect(screen.getByText('Domain Management')).toBeInTheDocument();
      expect(screen.getByText('Add Domain')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });

  it('calls service to fetch domains on mount', async () => {
    vi.mocked(domainService.getDomainConfigurations).mockResolvedValue([]);

    renderWithQueryClient(<DomainManagement />);

    await waitFor(() => {
      expect(domainService.getDomainConfigurations).toHaveBeenCalledTimes(1);
    });
  });
});