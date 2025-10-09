/**
 * Tests for DomainVerificationProgress component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DomainVerificationProgress } from '../DomainVerificationProgress';
import { useDomainVerification } from '@/hooks/use-domain-verification';
import { DomainConfiguration } from '@/types/domain-config';

// Mock the hook
vi.mock('@/hooks/use-domain-verification');

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Square: () => <div data-testid="square-icon" />,
}));

describe('DomainVerificationProgress', () => {
  let mockDomain: DomainConfiguration;
  let mockHookReturn: ReturnType<typeof useDomainVerification>;

  beforeEach(() => {
    mockDomain = {
      id: 'test-domain-id',
      domain: 'example.com',
      status: 'pending',
      dns_record_type: 'ANAME',
      target_value: 'line-intent-router-bot.onrender.com',
      ssl_enabled: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockHookReturn = {
      verificationStatus: null,
      isVerifying: false,
      currentStep: null,
      progress: 0,
      startVerification: vi.fn(),
      stopVerification: vi.fn(),
      retryVerification: vi.fn(),
    };

    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);
  });

  it('should render domain information', () => {
    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Domain Verification')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render subdomain information when present', () => {
    const domainWithSubdomain = { ...mockDomain, subdomain: 'www' };
    render(<DomainVerificationProgress domain={domainWithSubdomain} />);

    expect(screen.getByText(/subdomain:/i)).toBeInTheDocument();
    // Check that the subdomain value is in the document
    expect(screen.getByText(/www/)).toBeInTheDocument();
  });

  it('should show start verification button when not verifying', () => {
    render(<DomainVerificationProgress domain={mockDomain} />);

    const startButton = screen.getByRole('button', { name: /start verification/i });
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();
  });

  it('should call startVerification when start button is clicked', async () => {
    render(<DomainVerificationProgress domain={mockDomain} />);

    const startButton = screen.getByRole('button', { name: /start verification/i });
    fireEvent.click(startButton);

    expect(mockHookReturn.startVerification).toHaveBeenCalled();
  });

  it('should show progress bar when verifying', () => {
    mockHookReturn.isVerifying = true;
    mockHookReturn.progress = 50;
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show current step message', () => {
    mockHookReturn.isVerifying = true;
    mockHookReturn.currentStep = {
      step: 'dns_check',
      message: 'Checking DNS configuration...',
      progress: 25,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Checking DNS configuration...')).toBeInTheDocument();
  });

  it('should show error message when step has error', () => {
    mockHookReturn.currentStep = {
      step: 'dns_check',
      message: 'DNS configuration failed',
      progress: 0,
      isError: true,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('DNS configuration failed')).toBeInTheDocument();
  });

  it('should show stop button when verifying', () => {
    mockHookReturn.isVerifying = true;
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toBeInTheDocument();
  });

  it('should call stopVerification when stop button is clicked', () => {
    mockHookReturn.isVerifying = true;
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    expect(mockHookReturn.stopVerification).toHaveBeenCalled();
  });

  it('should show retry button when verification failed', () => {
    mockDomain.status = 'failed';
    mockHookReturn.currentStep = {
      step: 'dns_check',
      message: 'Verification failed',
      progress: 0,
      isError: true,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should call retryVerification when retry button is clicked', () => {
    mockDomain.status = 'failed';
    mockHookReturn.currentStep = {
      step: 'dns_check',
      message: 'Verification failed',
      progress: 0,
      isError: true,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockHookReturn.retryVerification).toHaveBeenCalled();
  });

  it('should show verification steps with correct icons', () => {
    mockHookReturn.currentStep = {
      step: 'ssl_check',
      message: 'Verifying SSL certificate...',
      progress: 50,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('DNS Configuration Check')).toBeInTheDocument();
    expect(screen.getByText('SSL Certificate Verification')).toBeInTheDocument();
    expect(screen.getByText('Domain Accessibility Test')).toBeInTheDocument();
    expect(screen.getByText('Verification Complete')).toBeInTheDocument();
  });

  it('should show domain error message', () => {
    mockDomain.error_message = 'DNS records not found';
    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('DNS records not found')).toBeInTheDocument();
  });

  it('should show retry count information', () => {
    mockHookReturn.verificationStatus = {
      domainId: mockDomain.id,
      isVerifying: false,
      currentStep: null,
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + 30000),
      retryCount: 2,
      maxRetries: 5,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText(/retry attempt: 2 \/ 5/i)).toBeInTheDocument();
  });

  it('should show last verified timestamp', () => {
    mockDomain.last_verified_at = '2024-01-01T12:00:00Z';
    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText(/last verified:/i)).toBeInTheDocument();
  });

  it('should call onVerificationComplete when verification completes', async () => {
    const onVerificationComplete = vi.fn();
    
    // Initially not complete
    render(
      <DomainVerificationProgress 
        domain={mockDomain} 
        onVerificationComplete={onVerificationComplete}
      />
    );

    expect(onVerificationComplete).not.toHaveBeenCalled();

    // Update to complete
    mockHookReturn.currentStep = {
      step: 'complete',
      message: 'Verification complete!',
      progress: 100,
    };
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    // Re-render with updated hook return
    render(
      <DomainVerificationProgress 
        domain={mockDomain} 
        onVerificationComplete={onVerificationComplete}
      />
    );

    await waitFor(() => {
      expect(onVerificationComplete).toHaveBeenCalled();
    });
  });

  it('should show enabled status badge for enabled domains', () => {
    mockDomain.status = 'enabled';
    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('should show verified status badge for verified domains', () => {
    mockDomain.status = 'verified';
    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('should show failed status badge for failed domains', () => {
    mockDomain.status = 'failed';
    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should disable start button for enabled domains', () => {
    mockDomain.status = 'enabled';
    render(<DomainVerificationProgress domain={mockDomain} />);

    const startButton = screen.queryByRole('button', { name: /start verification/i });
    expect(startButton).not.toBeInTheDocument();
  });

  it('should show verifying badge when verification is in progress', () => {
    mockHookReturn.isVerifying = true;
    (useDomainVerification as Mock).mockReturnValue(mockHookReturn);

    render(<DomainVerificationProgress domain={mockDomain} />);

    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });
});