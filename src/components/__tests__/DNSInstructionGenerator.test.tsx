/**
 * Tests for DNSInstructionGenerator component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DNSInstructionGenerator } from '../DNSInstructionGenerator';
import { DomainConfiguration } from '@/types/domain-config';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe('DNSInstructionGenerator', () => {
  const mockRootDomain: DomainConfiguration = {
    id: '1',
    domain: 'example.com',
    subdomain: null,
    status: 'pending',
    dns_record_type: 'A',
    target_value: '216.24.57.1',
    ssl_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSubdomain: DomainConfiguration = {
    id: '2',
    domain: 'example.com',
    subdomain: 'www',
    status: 'pending',
    dns_record_type: 'CNAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the DNS instruction generator', () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      expect(screen.getByText('DNS Configuration Generator')).toBeInTheDocument();
      expect(screen.getByText(/Get provider-specific DNS instructions for example.com/)).toBeInTheDocument();
      expect(screen.getByText('Select your DNS provider:')).toBeInTheDocument();
    });

    it('displays provider selection dropdown', () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Choose your DNS provider...')).toBeInTheDocument();
    });

    it('shows correct domain in title for subdomain', () => {
      render(<DNSInstructionGenerator domain={mockSubdomain} />);
      
      expect(screen.getByText(/Get provider-specific DNS instructions for www.example.com/)).toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('shows provider capabilities when provider is selected', async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByText('Cloudflare capabilities:')).toBeInTheDocument();
        expect(screen.getByText('ALIAS')).toBeInTheDocument();
        expect(screen.getByText('CNAME')).toBeInTheDocument();
        expect(screen.getByText('A Record')).toBeInTheDocument();
      });
    });

    it('displays provider-specific notes', async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByText(/Uses CNAME flattening for root domains/)).toBeInTheDocument();
        expect(screen.getByText(/Automatic SSL certificate provisioning/)).toBeInTheDocument();
      });
    });

    it('shows instruction tabs when provider is selected', async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /ALIAS Record/ })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /A Record/ })).toBeInTheDocument();
        expect(screen.getByText('Recommended')).toBeInTheDocument();
      });
    });
  });

  describe('DNS Record Instructions', () => {
    beforeEach(async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /ALIAS Record/ })).toBeInTheDocument();
      });
    });

    it('displays DNS record values for ALIAS record', () => {
      expect(screen.getByText('DNS Record Values')).toBeInTheDocument();
      expect(screen.getByText('ALIAS')).toBeInTheDocument();
      expect(screen.getByText('@')).toBeInTheDocument();
      expect(screen.getByText('line-intent-router-bot.onrender.com')).toBeInTheDocument();
    });

    it('shows step-by-step instructions', () => {
      expect(screen.getByText('Step-by-step Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Log in to your Cloudflare DNS management panel/)).toBeInTheDocument();
      expect(screen.getByText(/Create a new ALIAS record/)).toBeInTheDocument();
      expect(screen.getByText(/Wait for DNS propagation/)).toBeInTheDocument();
    });

    it('displays record type description', () => {
      expect(screen.getByText(/Similar to ANAME, resolves to the target hostname's IP/)).toBeInTheDocument();
    });

    it('shows provider guide link', () => {
      const guideLink = screen.getByRole('button', { name: /View Cloudflare DNS Guide/ });
      expect(guideLink).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard Functionality', () => {
    beforeEach(async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /ALIAS Record/ })).toBeInTheDocument();
      });
    });

    it('copies record type to clipboard', async () => {
      const copyButtons = screen.getAllByRole('button');
      const recordTypeCopyButton = copyButtons.find(button => 
        button.closest('.space-y-2')?.querySelector('label')?.textContent === 'Record Type'
      );
      
      expect(recordTypeCopyButton).toBeInTheDocument();
      fireEvent.click(recordTypeCopyButton!);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ALIAS');
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied to clipboard',
          description: 'Record Type has been copied',
        });
      });
    });

    it('copies name/host to clipboard', async () => {
      const copyButtons = screen.getAllByRole('button');
      const nameCopyButton = copyButtons.find(button => 
        button.closest('.space-y-2')?.querySelector('label')?.textContent === 'Name/Host'
      );
      
      expect(nameCopyButton).toBeInTheDocument();
      fireEvent.click(nameCopyButton!);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('@');
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied to clipboard',
          description: 'Name/Host has been copied',
        });
      });
    });

    it('copies value/target to clipboard', async () => {
      const copyButtons = screen.getAllByRole('button');
      const valueCopyButton = copyButtons.find(button => 
        button.closest('.space-y-2')?.querySelector('label')?.textContent === 'Value/Target'
      );
      
      expect(valueCopyButton).toBeInTheDocument();
      fireEvent.click(valueCopyButton!);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('line-intent-router-bot.onrender.com');
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copied to clipboard',
          description: 'Value/Target has been copied',
        });
      });
    });

    it('handles clipboard copy failure', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Copy failed'));
      
      const copyButtons = screen.getAllByRole('button');
      const recordTypeCopyButton = copyButtons.find(button => 
        button.closest('.space-y-2')?.querySelector('label')?.textContent === 'Record Type'
      );
      
      fireEvent.click(recordTypeCopyButton!);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Copy failed',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Provider-Specific Behavior', () => {
    it('shows different record types for GoDaddy (no ALIAS support)', async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const godaddyOption = screen.getByText('GoDaddy');
      fireEvent.click(godaddyOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /A Record/ })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: /ALIAS Record/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Use A records for root domains/)).toBeInTheDocument();
      });
    });

    it('shows CNAME instructions for subdomain', async () => {
      render(<DNSInstructionGenerator domain={mockSubdomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /CNAME Record/ })).toBeInTheDocument();
        expect(screen.getByText('www')).toBeInTheDocument();
      });
    });

    it('displays warnings for inappropriate record types', async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const godaddyOption = screen.getByText('GoDaddy');
      fireEvent.click(godaddyOption);
      
      await waitFor(() => {
        const aRecordTab = screen.getByRole('tab', { name: /A Record/ });
        fireEvent.click(aRecordTab);
        
        expect(screen.getByText(/A records point to a fixed IP address which may change/)).toBeInTheDocument();
        expect(screen.getByText(/Use ANAME\/ALIAS records if available for better reliability/)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /ALIAS Record/ })).toBeInTheDocument();
      });
    });

    it('switches between record type tabs', async () => {
      const aliasTab = screen.getByRole('tab', { name: /ALIAS Record/ });
      const aRecordTab = screen.getByRole('tab', { name: /A Record/ });
      
      expect(aliasTab).toHaveAttribute('data-state', 'active');
      expect(aRecordTab).toHaveAttribute('data-state', 'inactive');
      
      fireEvent.click(aRecordTab);
      
      await waitFor(() => {
        expect(aRecordTab).toHaveAttribute('data-state', 'active');
        expect(screen.getByText('216.24.57.1')).toBeInTheDocument();
      });
    });

    it('shows different instructions for different record types', async () => {
      const aRecordTab = screen.getByRole('tab', { name: /A Record/ });
      fireEvent.click(aRecordTab);
      
      await waitFor(() => {
        expect(screen.getByText('216.24.57.1')).toBeInTheDocument();
        expect(screen.getByText(/Create a new A record/)).toBeInTheDocument();
        expect(screen.getByText(/Points directly to an IP address/)).toBeInTheDocument();
      });
    });
  });

  describe('External Links', () => {
    beforeEach(async () => {
      render(<DNSInstructionGenerator domain={mockRootDomain} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      
      const cloudflareOption = screen.getByText('Cloudflare');
      fireEvent.click(cloudflareOption);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /ALIAS Record/ })).toBeInTheDocument();
      });
    });

    it('opens provider guide in new window', () => {
      const originalOpen = window.open;
      window.open = vi.fn();
      
      const guideButton = screen.getByRole('button', { name: /View Cloudflare DNS Guide/ });
      fireEvent.click(guideButton);
      
      expect(window.open).toHaveBeenCalledWith(
        'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
        '_blank'
      );
      
      window.open = originalOpen;
    });
  });
});