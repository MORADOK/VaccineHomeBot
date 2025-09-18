/**
 * Tests for Add Domain Form Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AddDomainForm } from '../AddDomainForm';
import { domainService } from '@/lib/domain-service';
import { DomainConfiguration } from '@/types/domain-config';

// Mock the domain service
vi.mock('@/lib/domain-service', () => ({
  domainService: {
    addDomainConfiguration: vi.fn(),
    getRecommendedDNSRecordType: vi.fn(),
  },
}));

// Mock domain validation
vi.mock('@/lib/domain-validation', () => ({
  validateDomainFormat: vi.fn(),
  detectDNSRecordType: vi.fn(),
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
  AlertCircle: () => <div data-testid="alert-icon" />,
  Info: () => <div data-testid="info-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Check: () => <div data-testid="check-icon" />,
}));

const mockDomain: DomainConfiguration = {
  id: '1',
  domain: 'example.com',
  status: 'pending',
  dns_record_type: 'ANAME',
  target_value: 'line-intent-router-bot.onrender.com',
  ssl_enabled: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

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

describe('AddDomainForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    expect(screen.getByLabelText('Domain Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Subdomain (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('DNS Record Type')).toBeInTheDocument();
    expect(screen.getByText('Add Domain')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('validates required domain field', async () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByText('Add Domain');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Domain name is required')).toBeInTheDocument();
    });
  });

  it('validates domain format', async () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const domainInput = screen.getByLabelText('Domain Name');
    fireEvent.change(domainInput, { target: { value: 'invalid-domain' } });

    const submitButton = screen.getByText('Add Domain');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid domain name')).toBeInTheDocument();
    });
  });

  it('auto-detects DNS record type when domain is entered', async () => {
    vi.mocked(domainService.getRecommendedDNSRecordType).mockReturnValue('ANAME');

    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const domainInput = screen.getByLabelText('Domain Name');
    fireEvent.change(domainInput, { target: { value: 'example.com' } });

    await waitFor(() => {
      expect(domainService.getRecommendedDNSRecordType).toHaveBeenCalledWith('example.com');
    });
  });

  it('shows domain preview when domain and subdomain are entered', async () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const domainInput = screen.getByLabelText('Domain Name');
    const subdomainInput = screen.getByLabelText('Subdomain (Optional)');

    fireEvent.change(domainInput, { target: { value: 'example.com' } });
    fireEvent.change(subdomainInput, { target: { value: 'www' } });

    await waitFor(() => {
      expect(screen.getByText('www.example.com')).toBeInTheDocument();
    });
  });

  it('shows DNS record type descriptions', async () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    // Open the select dropdown
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    expect(screen.getByText('ANAME/ALIAS (Recommended)')).toBeInTheDocument();
    expect(screen.getByText('CNAME (For subdomains)')).toBeInTheDocument();
    expect(screen.getByText('A Record (Fallback)')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    vi.mocked(domainService.addDomainConfiguration).mockResolvedValue(mockDomain);

    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const domainInput = screen.getByLabelText('Domain Name');
    fireEvent.change(domainInput, { target: { value: 'example.com' } });

    // Select DNS record type
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('ANAME/ALIAS (Recommended)'));

    const submitButton = screen.getByText('Add Domain');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(domainService.addDomainConfiguration).toHaveBeenCalledWith({
        domain: 'example.com',
        subdomain: '',
        dns_record_type: 'ANAME',
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('handles form submission errors', async () => {
    const errorMessage = 'Domain already exists';
    vi.mocked(domainService.addDomainConfiguration).mockRejectedValue(
      new Error(errorMessage)
    );

    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const domainInput = screen.getByLabelText('Domain Name');
    fireEvent.change(domainInput, { target: { value: 'example.com' } });

    // Select DNS record type
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('ANAME/ALIAS (Recommended)'));

    const submitButton = screen.getByText('Add Domain');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables form during submission', async () => {
    vi.mocked(domainService.addDomainConfiguration).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const domainInput = screen.getByLabelText('Domain Name');
    fireEvent.change(domainInput, { target: { value: 'example.com' } });

    // Select DNS record type
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    fireEvent.click(screen.getByText('ANAME/ALIAS (Recommended)'));

    const submitButton = screen.getByText('Add Domain');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Adding Domain...')).toBeInTheDocument();
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('validates subdomain format', async () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    const subdomainInput = screen.getByLabelText('Subdomain (Optional)');
    fireEvent.change(subdomainInput, { target: { value: 'invalid-subdomain-' } });

    const submitButton = screen.getByText('Add Domain');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid subdomain')).toBeInTheDocument();
    });
  });

  it('shows helpful text for subdomain field', () => {
    renderWithQueryClient(
      <AddDomainForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
    );

    expect(screen.getByText(/Leave empty for apex domain/)).toBeInTheDocument();
  });
});