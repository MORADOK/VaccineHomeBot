/**
 * Tests for DNS Instructions Display Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DNSInstructionsDisplay } from '../DNSInstructionsDisplay';
import { domainService } from '@/lib/domain-service';
import { DomainConfiguration } from '@/types/domain-config';

// Mock the domain service
vi.mock('@/lib/domain-service', () => ({
  domainService: {
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
  Copy: () => <div data-testid="copy-icon" />,
  Check: () => <div data-testid="check-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Info: () => <div data-testid="info-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

const mockDomain: DomainConfiguration = {
  id: '1',
  domain: 'example.com',
  subdomain: 'www',
  status: 'pending',
  dns_record_type: 'ANAME',
  target_value: 'line-intent-router-bot.onrender.com',
  ssl_enabled: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

const mockInstructions = {
  recordType: 'ANAME' as const,
  name: 'www',
  value: 'line-intent-router-bot.onrender.com',
  instructions: [
    'Log in to your DNS provider\'s control panel',
    'Create an ANAME record',
    'Set Name/Host to: www',
    'Set Value/Target to: line-intent-router-bot.onrender.com',
    'Save the record and wait for DNS propagation (up to 48 hours)',
  ],
};

describe('DNSInstructionsDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(domainService.getDNSInstructions).mockReturnValue(mockInstructions);
  });

  it('renders DNS configuration instructions', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText('DNS Configuration Instructions')).toBeInTheDocument();
    expect(screen.getByText(/Configure these DNS records with your domain provider/)).toBeInTheDocument();
  });

  it('displays DNS record details correctly', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText('ANAME')).toBeInTheDocument();
    expect(screen.getByText('www')).toBeInTheDocument();
    expect(screen.getByText('line-intent-router-bot.onrender.com')).toBeInTheDocument();
  });

  it('shows full domain name in instructions', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText(/to enable www.example.com/)).toBeInTheDocument();
  });

  it('handles apex domain without subdomain', () => {
    const apexDomain = { ...mockDomain, subdomain: undefined };
    const apexInstructions = { ...mockInstructions, name: '@' };
    vi.mocked(domainService.getDNSInstructions).mockReturnValue(apexInstructions);

    render(<DNSInstructionsDisplay domain={apexDomain} />);

    expect(screen.getByText(/to enable example.com/)).toBeInTheDocument();
    expect(screen.getByText('@')).toBeInTheDocument();
  });

  it('displays step-by-step instructions', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    mockInstructions.instructions.forEach((instruction, index) => {
      expect(screen.getByText(instruction)).toBeInTheDocument();
      expect(screen.getByText((index + 1).toString())).toBeInTheDocument();
    });
  });

  it('shows TTL recommendation', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText(/TTL \(Time To Live\)/)).toBeInTheDocument();
    expect(screen.getByText(/Set to 300 seconds/)).toBeInTheDocument();
  });

  it('displays provider-specific guide links', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText('Cloudflare')).toBeInTheDocument();
    expect(screen.getByText('Godaddy')).toBeInTheDocument();
    expect(screen.getByText('Namecheap')).toBeInTheDocument();
    expect(screen.getByText('Route53')).toBeInTheDocument();
  });

  it('opens provider guide links in new tab', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<DNSInstructionsDisplay domain={mockDomain} />);

    const cloudflareButton = screen.getByText('Cloudflare');
    fireEvent.click(cloudflareButton);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
      '_blank'
    );

    windowOpenSpy.mockRestore();
  });

  it('copies values to clipboard when copy buttons are clicked', async () => {
    const mockWriteText = vi.mocked(navigator.clipboard.writeText);
    mockWriteText.mockResolvedValue();

    render(<DNSInstructionsDisplay domain={mockDomain} />);

    const copyButtons = screen.getAllByTestId('copy-icon');
    
    // Click the first copy button (Record Type)
    fireEvent.click(copyButtons[0].closest('button')!);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('ANAME');
    });
  });

  it('shows check icon after successful copy', async () => {
    const mockWriteText = vi.mocked(navigator.clipboard.writeText);
    mockWriteText.mockResolvedValue();

    render(<DNSInstructionsDisplay domain={mockDomain} />);

    const copyButtons = screen.getAllByTestId('copy-icon');
    fireEvent.click(copyButtons[0].closest('button')!);

    await waitFor(() => {
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  it('handles clipboard copy errors gracefully', async () => {
    const mockWriteText = vi.mocked(navigator.clipboard.writeText);
    mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

    render(<DNSInstructionsDisplay domain={mockDomain} />);

    const copyButtons = screen.getAllByTestId('copy-icon');
    fireEvent.click(copyButtons[0].closest('button')!);

    // Should not throw an error
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  it('displays troubleshooting section', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText('Troubleshooting')).toBeInTheDocument();
    expect(screen.getByText('DNS Propagation')).toBeInTheDocument();
    expect(screen.getByText('ANAME/ALIAS Not Supported')).toBeInTheDocument();
    expect(screen.getByText('SSL Certificate Issues')).toBeInTheDocument();
  });

  it('includes link to DNS propagation checker', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    const link = screen.getByText('whatsmydns.net');
    expect(link).toHaveAttribute('href', 'https://www.whatsmydns.net');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows fallback IP address in troubleshooting', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(screen.getByText('216.24.57.1')).toBeInTheDocument();
  });

  it('calls domainService.getDNSInstructions with correct parameters', () => {
    render(<DNSInstructionsDisplay domain={mockDomain} />);

    expect(domainService.getDNSInstructions).toHaveBeenCalledWith(mockDomain);
  });
});