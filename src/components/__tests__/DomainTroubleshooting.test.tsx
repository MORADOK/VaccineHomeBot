import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DomainTroubleshooting from '../DomainTroubleshooting';

// Mock the validation and DNS service modules
vi.mock('@/lib/domain-validation', () => ({
  validateDomain: vi.fn()
}));

vi.mock('@/lib/dns-service', () => ({
  checkDNSPropagation: vi.fn(),
  verifySSLCertificate: vi.fn()
}));

// Import the mocked functions
const { validateDomain } = await import('@/lib/domain-validation');
const { checkDNSPropagation, verifySSLCertificate } = await import('@/lib/dns-service');

const mockValidateDomain = vi.mocked(validateDomain);
const mockCheckDNSPropagation = vi.mocked(checkDNSPropagation);
const mockVerifySSLCertificate = vi.mocked(verifySSLCertificate);

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('DomainTroubleshooting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders troubleshooting interface with all tabs', () => {
    render(<DomainTroubleshooting />);
    
    expect(screen.getByText('Domain Troubleshooting')).toBeInTheDocument();
    expect(screen.getByText('Diagnose and resolve common domain configuration issues')).toBeInTheDocument();
    
    // Check all tabs are present
    expect(screen.getByRole('tab', { name: 'Diagnostics' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Common Issues' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cloudflare' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'GoDaddy' })).toBeInTheDocument();
  });

  it('displays diagnostic input and run button', () => {
    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first since it's not the default
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled(); // Should be disabled when no domain entered
  });

  it('enables run diagnostics button when domain is entered', () => {
    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    
    expect(button).not.toBeDisabled();
  });

  it('runs diagnostics and displays results for valid domain', async () => {
    mockValidateDomain.mockReturnValue({ isValid: true });
    mockCheckDNSPropagation.mockResolvedValue({
      isResolved: true,
      resolvedIPs: ['192.168.1.1'],
      propagationStatus: 'complete'
    });
    mockVerifySSLCertificate.mockResolvedValue({
      isValid: true,
      expiresAt: new Date(),
      issuer: 'Test CA'
    });

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Diagnostic Results')).toBeInTheDocument();
    });

    expect(screen.getByText('Domain Format')).toBeInTheDocument();
    expect(screen.getByText('DNS Resolution')).toBeInTheDocument();
    expect(screen.getByText('SSL Certificate')).toBeInTheDocument();
    
    expect(screen.getByText('Domain format is valid')).toBeInTheDocument();
    expect(screen.getByText('DNS resolves to: 192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('SSL certificate is valid')).toBeInTheDocument();
  });

  it('displays error results for invalid domain', async () => {
    mockValidateDomain.mockReturnValue({ 
      isValid: false, 
      error: 'Invalid domain format' 
    });

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'invalid-domain' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Diagnostic Results')).toBeInTheDocument();
    });

    expect(screen.getByText('Invalid domain format')).toBeInTheDocument();
    expect(screen.getByText(/Check domain spelling and format/)).toBeInTheDocument();
  });

  it('handles DNS resolution failures', async () => {
    mockValidateDomain.mockReturnValue({ isValid: true });
    mockCheckDNSPropagation.mockResolvedValue({
      isResolved: false,
      resolvedIPs: [],
      propagationStatus: 'failed'
    });

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('DNS not resolving')).toBeInTheDocument();
    });

    expect(screen.getByText(/Check DNS record configuration/)).toBeInTheDocument();
  });

  it('handles SSL certificate issues', async () => {
    mockValidateDomain.mockReturnValue({ isValid: true });
    mockCheckDNSPropagation.mockResolvedValue({
      isResolved: true,
      resolvedIPs: ['192.168.1.1'],
      propagationStatus: 'complete'
    });
    mockVerifySSLCertificate.mockResolvedValue({
      isValid: false,
      expiresAt: undefined,
      issuer: undefined
    });

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('SSL certificate not found or invalid')).toBeInTheDocument();
    });

    expect(screen.getByText(/Wait for SSL provisioning or check domain configuration/)).toBeInTheDocument();
  });

  it('can switch to common issues tab', () => {
    render(<DomainTroubleshooting />);
    
    const generalTab = screen.getByRole('tab', { name: 'Common Issues' });
    expect(generalTab).toBeInTheDocument();
    
    // Should be able to click the tab without errors
    fireEvent.click(generalTab);
  });

  it('can switch to Cloudflare tab', () => {
    render(<DomainTroubleshooting />);
    
    const cloudflareTab = screen.getByRole('tab', { name: 'Cloudflare' });
    expect(cloudflareTab).toBeInTheDocument();
    
    // Should be able to click the tab without errors
    fireEvent.click(cloudflareTab);
  });

  it('can switch to GoDaddy tab', () => {
    render(<DomainTroubleshooting />);
    
    const godaddyTab = screen.getByRole('tab', { name: 'GoDaddy' });
    expect(godaddyTab).toBeInTheDocument();
    
    // Should be able to click the tab without errors
    fireEvent.click(godaddyTab);
  });

  it('displays contact support section', () => {
    render(<DomainTroubleshooting />);
    
    expect(screen.getByText('Need Additional Help?')).toBeInTheDocument();
    expect(screen.getByText('Contact our support team for personalized assistance')).toBeInTheDocument();
    
    expect(screen.getByRole('button', { name: /Email Support/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Chat/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Documentation/ })).toBeInTheDocument();
  });

  it('shows loading state during diagnostics', async () => {
    mockValidateDomain.mockReturnValue({ isValid: true });
    mockCheckDNSPropagation.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(button);

    // Button should be disabled and show loading state
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('handles diagnostic errors gracefully', async () => {
    mockValidateDomain.mockReturnValue({ isValid: true });
    mockCheckDNSPropagation.mockRejectedValue(new Error('Network error'));

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('DNS check failed')).toBeInTheDocument();
    });

    expect(screen.getByText(/Verify DNS records are configured correctly/)).toBeInTheDocument();
  });

  it('displays appropriate status badges for different result types', async () => {
    mockValidateDomain.mockReturnValue({ isValid: true });
    mockCheckDNSPropagation.mockResolvedValue({
      isResolved: false,
      resolvedIPs: [],
      propagationStatus: 'failed'
    });
    mockVerifySSLCertificate.mockResolvedValue({
      isValid: false,
      expiresAt: undefined,
      issuer: undefined
    });

    render(<DomainTroubleshooting />);
    
    // Click on diagnostics tab first
    fireEvent.click(screen.getByRole('tab', { name: 'Diagnostics' }));
    
    const input = screen.getByPlaceholderText('Enter domain to diagnose (e.g., example.com)');
    const button = screen.getByRole('button', { name: 'Run Diagnostics' });
    
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('PASS')).toBeInTheDocument(); // Domain format
      expect(screen.getByText('FAIL')).toBeInTheDocument(); // DNS resolution
      expect(screen.getByText('WARNING')).toBeInTheDocument(); // SSL certificate
    });
  });
});