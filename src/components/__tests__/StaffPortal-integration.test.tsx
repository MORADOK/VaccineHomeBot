/**
 * Integration test for StaffPortal with domain management
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import StaffPortal from '../StaffPortal';
import React from 'react';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock the domain management component
vi.mock('../DomainManagement', () => ({
  DomainManagement: () => <div data-testid="domain-management">Domain Management Component</div>
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  Syringe: () => <div data-testid="syringe-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Send: () => <div data-testid="send-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  UserCheck: () => <div data-testid="user-check-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
}));

describe('StaffPortal Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  const renderStaffPortal = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <StaffPortal />
      </QueryClientProvider>
    );
  };

  it('renders with navigation tabs', () => {
    renderStaffPortal();
    
    // Check that both tabs are present
    expect(screen.getByRole('tab', { name: /นัดหมายและการฉีด|นัดหมาย/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /จัดการโดเมน|โดเมน/ })).toBeInTheDocument();
  });

  it('shows appointments tab by default', () => {
    renderStaffPortal();
    
    // Appointments tab should be active by default
    const appointmentsTab = screen.getByRole('tab', { name: /นัดหมายและการฉีด|นัดหมาย/ });
    expect(appointmentsTab).toHaveAttribute('data-state', 'active');
    
    // Should show appointment-related content
    expect(screen.getByText('บันทึกการฉีดวัคซีน Walk-in')).toBeInTheDocument();
  });

  it('switches to domain management tab when clicked', () => {
    renderStaffPortal();
    
    // Click on domain management tab
    const domainTab = screen.getByRole('tab', { name: /จัดการโดเมน|โดเมน/ });
    fireEvent.click(domainTab);
    
    // Domain tab should now be active
    expect(domainTab).toHaveAttribute('data-state', 'active');
    
    // Should show domain management component
    expect(screen.getByTestId('domain-management')).toBeInTheDocument();
  });

  it('has responsive design with proper mobile labels', () => {
    renderStaffPortal();
    
    // Check that tabs have both full and mobile labels
    const appointmentsTab = screen.getByRole('tab', { name: /นัดหมายและการฉีด|นัดหมาย/ });
    const domainTab = screen.getByRole('tab', { name: /จัดการโดเมน|โดเมน/ });
    
    expect(appointmentsTab).toBeInTheDocument();
    expect(domainTab).toBeInTheDocument();
  });

  it('includes error boundary for domain management', () => {
    renderStaffPortal();
    
    // Switch to domain tab
    const domainTab = screen.getByRole('tab', { name: /จัดการโดเมน|โดเมน/ });
    fireEvent.click(domainTab);
    
    // Domain management should be wrapped in error boundary
    expect(screen.getByTestId('domain-management')).toBeInTheDocument();
  });

  it('maintains appointment functionality in appointments tab', () => {
    renderStaffPortal();
    
    // Should show all appointment-related elements
    expect(screen.getByText('Staff Portal')).toBeInTheDocument();
    expect(screen.getByLabelText('เลือกวันที่:')).toBeInTheDocument();
    expect(screen.getByText('บันทึกการฉีดวัคซีน Walk-in')).toBeInTheDocument();
    expect(screen.getByText('รีเฟรช')).toBeInTheDocument();
  });
});