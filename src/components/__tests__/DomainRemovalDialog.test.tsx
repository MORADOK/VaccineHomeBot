/**
 * Domain Removal Dialog Component Tests
 * Tests for the domain removal dialog with confirmation and safety checks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DomainRemovalDialog } from '../DomainRemovalDialog';
import { DomainConfiguration } from '@/types/domain-config';
import { domainService } from '@/lib/domain-service';

// Mock the domain service
vi.mock('@/lib/domain-service', () => ({
  domainService: {
    forceDeleteDomainConfiguration: vi.fn(),
    safeDomainRemoval: vi.fn(),
    generateDeletionConfirmationToken: vi.fn()
  }
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      data-testid="button"
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      data-testid="confirmation-input"
    />
  )
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="force-delete-checkbox"
    />
  )
}));

describe('DomainRemovalDialog', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockDomain: DomainConfiguration = {
    id: 'test-domain-id',
    domain: 'example.com',
    subdomain: undefined,
    status: 'pending',
    dns_record_type: 'ANAME',
    target_value: 'line-intent-router-bot.onrender.com',
    ssl_enabled: false,
    verification_token: 'test-token',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockEnabledDomain: DomainConfiguration = {
    ...mockDomain,
    id: 'enabled-domain-id',
    domain: 'enabled.com',
    status: 'enabled',
    ssl_enabled: true
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const renderDialog = (domain: DomainConfiguration | null, isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DomainRemovalDialog
          domain={domain}
          isOpen={isOpen}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      </QueryClientProvider>
    );
  };

  describe('Dialog Display', () => {
    it('should not render when domain is null', () => {
      renderDialog(null);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      renderDialog(mockDomain, false);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should render warning step initially', () => {
      renderDialog(mockDomain);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Remove Domain Configuration/)).toBeInTheDocument();
      expect(screen.getByText(/example.com/)).toBeInTheDocument();
    });

    it('should show enabled domain warning', () => {
      renderDialog(mockEnabledDomain);
      
      expect(screen.getByText(/currently enabled/)).toBeInTheDocument();
      expect(screen.getByTestId('force-delete-checkbox')).toBeInTheDocument();
    });

    it('should show domain details in warning step', () => {
      renderDialog(mockDomain);
      
      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText(/ANAME → line-intent-router-bot.onrender.com/)).toBeInTheDocument();
    });
  });

  describe('Warning Step Interactions', () => {
    it('should close dialog when cancel is clicked', () => {
      renderDialog(mockDomain);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should proceed to confirmation when continue is clicked for pending domain', () => {
      renderDialog(mockDomain);
      
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
      
      expect(screen.getByText(/Confirm Domain Removal/)).toBeInTheDocument();
    });

    it('should disable continue button for enabled domain without force delete', () => {
      renderDialog(mockEnabledDomain);
      
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeDisabled();
    });

    it('should enable continue button when force delete is checked', () => {
      renderDialog(mockEnabledDomain);
      
      const forceDeleteCheckbox = screen.getByTestId('force-delete-checkbox');
      fireEvent.click(forceDeleteCheckbox);
      
      const continueButton = screen.getByText('Continue');
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('Confirmation Step', () => {
    beforeEach(() => {
      renderDialog(mockDomain);
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
    });

    it('should show confirmation step content', () => {
      expect(screen.getByText(/Confirm Domain Removal/)).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
      expect(screen.getByTestId('confirmation-input')).toBeInTheDocument();
    });

    it('should go back to warning step when back is clicked', () => {
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      expect(screen.getByText(/Remove Domain Configuration/)).toBeInTheDocument();
    });

    it('should disable delete button when confirmation text is incorrect', () => {
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'wrong-domain.com' } });
      
      const deleteButton = screen.getByText(/Delete Domain/);
      expect(deleteButton).toBeDisabled();
    });

    it('should enable delete button when confirmation text matches', () => {
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      
      const deleteButton = screen.getByText(/Delete Domain/);
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Domain Deletion', () => {
    beforeEach(() => {
      vi.mocked(domainService.generateDeletionConfirmationToken).mockReturnValue('test-confirmation-token');
    });

    it('should call safeDomainRemoval for normal deletion', async () => {
      vi.mocked(domainService.safeDomainRemoval).mockResolvedValue();
      
      renderDialog(mockDomain);
      
      // Navigate to confirmation step
      fireEvent.click(screen.getByText('Continue'));
      
      // Enter confirmation text
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      
      // Click delete
      const deleteButton = screen.getByText(/Delete Domain/);
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(domainService.safeDomainRemoval).toHaveBeenCalledWith(
          'test-domain-id',
          'test-confirmation-token'
        );
      });
    });

    it('should call forceDeleteDomainConfiguration for force deletion', async () => {
      vi.mocked(domainService.forceDeleteDomainConfiguration).mockResolvedValue();
      
      renderDialog(mockEnabledDomain);
      
      // Enable force delete
      const forceDeleteCheckbox = screen.getByTestId('force-delete-checkbox');
      fireEvent.click(forceDeleteCheckbox);
      
      // Navigate to confirmation step
      fireEvent.click(screen.getByText('Continue'));
      
      // Click delete (no confirmation text needed for force delete)
      const deleteButton = screen.getByText(/Delete Domain/);
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(domainService.forceDeleteDomainConfiguration).toHaveBeenCalledWith('enabled-domain-id');
      });
    });

    it('should call onSuccess after successful deletion', async () => {
      vi.mocked(domainService.safeDomainRemoval).mockResolvedValue();
      
      renderDialog(mockDomain);
      
      // Navigate to confirmation and delete
      fireEvent.click(screen.getByText('Continue'));
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      fireEvent.click(screen.getByText(/Delete Domain/));
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle deletion errors gracefully', async () => {
      vi.mocked(domainService.safeDomainRemoval).mockRejectedValue(new Error('Deletion failed'));
      
      renderDialog(mockDomain);
      
      // Navigate to confirmation and delete
      fireEvent.click(screen.getByText('Continue'));
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      fireEvent.click(screen.getByText(/Delete Domain/));
      
      // Should not call onSuccess on error
      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Subdomain Handling', () => {
    it('should display full domain with subdomain', () => {
      const subdomainDomain = {
        ...mockDomain,
        subdomain: 'www',
        domain: 'example.com'
      };
      
      renderDialog(subdomainDomain);
      
      expect(screen.getByText(/www.example.com/)).toBeInTheDocument();
    });

    it('should require base domain for confirmation with subdomain', () => {
      const subdomainDomain = {
        ...mockDomain,
        subdomain: 'www',
        domain: 'example.com'
      };
      
      renderDialog(subdomainDomain);
      
      // Navigate to confirmation step
      fireEvent.click(screen.getByText('Continue'));
      
      // Should require base domain, not full subdomain
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      
      const deleteButton = screen.getByText(/Delete Domain/);
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe('Dialog State Management', () => {
    it('should reset state when dialog closes', () => {
      renderDialog(mockDomain);
      
      // Navigate to confirmation step and enter text
      fireEvent.click(screen.getByText('Continue'));
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      
      // Close dialog
      fireEvent.click(screen.getByText('Back'));
      fireEvent.click(screen.getByText('Cancel'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show loading state during deletion', async () => {
      // Mock a slow deletion
      vi.mocked(domainService.safeDomainRemoval).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderDialog(mockDomain);
      
      // Navigate to confirmation and delete
      fireEvent.click(screen.getByText('Continue'));
      const input = screen.getByTestId('confirmation-input');
      fireEvent.change(input, { target: { value: 'example.com' } });
      fireEvent.click(screen.getByText(/Delete Domain/));
      
      // Should show loading state
      expect(screen.getByText(/Removing.../)).toBeInTheDocument();
    });
  });
});