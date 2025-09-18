/**
 * Tests for useDomainVerification hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDomainVerification } from '../use-domain-verification';
import { domainVerificationService } from '@/lib/domain-verification-service';
import { DomainConfiguration } from '@/types/domain-config';

// Mock the domain verification service
vi.mock('@/lib/domain-verification-service', () => ({
  domainVerificationService: {
    getVerificationStatus: vi.fn(),
    startVerification: vi.fn(),
    stopVerification: vi.fn(),
  },
}));

describe('useDomainVerification', () => {
  let mockDomain: DomainConfiguration;

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

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should return initial state when no domain is provided', () => {
    const { result } = renderHook(() => useDomainVerification(null));

    expect(result.current.verificationStatus).toBeNull();
    expect(result.current.isVerifying).toBe(false);
    expect(result.current.currentStep).toBeNull();
    expect(result.current.progress).toBe(0);
  });

  it('should initialize verification status for a domain', () => {
    const mockStatus = {
      domainId: mockDomain.id,
      isVerifying: false,
      currentStep: null,
      lastCheck: null,
      nextCheck: null,
      retryCount: 0,
      maxRetries: 5,
    };

    vi.mocked(domainVerificationService.getVerificationStatus).mockReturnValue(mockStatus);

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    expect(result.current.verificationStatus).toEqual(mockStatus);
    expect(result.current.isVerifying).toBe(false);
  });

  it('should start verification when startVerification is called', async () => {
    vi.mocked(domainVerificationService.startVerification).mockResolvedValue();
    vi.mocked(domainVerificationService.getVerificationStatus).mockReturnValue({
      domainId: mockDomain.id,
      isVerifying: true,
      currentStep: {
        step: 'dns_check',
        message: 'Checking DNS configuration...',
        progress: 25,
      },
      lastCheck: new Date(),
      nextCheck: null,
      retryCount: 0,
      maxRetries: 5,
    });

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    await act(async () => {
      await result.current.startVerification();
    });

    expect(domainVerificationService.startVerification).toHaveBeenCalledWith(mockDomain.id);
    expect(result.current.isVerifying).toBe(true);
  });

  it('should stop verification when stopVerification is called', () => {
    const mockStatus = {
      domainId: mockDomain.id,
      isVerifying: true,
      currentStep: {
        step: 'dns_check' as const,
        message: 'Checking DNS configuration...',
        progress: 25,
      },
      lastCheck: new Date(),
      nextCheck: null,
      retryCount: 0,
      maxRetries: 5,
    };

    vi.mocked(domainVerificationService.getVerificationStatus).mockReturnValue(mockStatus);

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    act(() => {
      result.current.stopVerification();
    });

    expect(domainVerificationService.stopVerification).toHaveBeenCalledWith(mockDomain.id);
  });

  it('should retry verification when retryVerification is called', async () => {
    vi.mocked(domainVerificationService.startVerification).mockResolvedValue();
    vi.mocked(domainVerificationService.stopVerification).mockImplementation(() => {});

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    await act(async () => {
      await result.current.retryVerification();
    });

    expect(domainVerificationService.stopVerification).toHaveBeenCalledWith(mockDomain.id);
    expect(domainVerificationService.startVerification).toHaveBeenCalledWith(mockDomain.id);
  });

  it('should poll verification status when verification is active', async () => {
    vi.useFakeTimers();

    const mockStatus = {
      domainId: mockDomain.id,
      isVerifying: true,
      currentStep: {
        step: 'dns_check' as const,
        message: 'Checking DNS configuration...',
        progress: 25,
      },
      lastCheck: new Date(),
      nextCheck: null,
      retryCount: 0,
      maxRetries: 5,
    };

    vi.mocked(domainVerificationService.getVerificationStatus)
      .mockReturnValueOnce(mockStatus)
      .mockReturnValueOnce({
        ...mockStatus,
        currentStep: {
          step: 'ssl_check' as const,
          message: 'Verifying SSL certificate...',
          progress: 50,
        },
      });

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    // Start verification to trigger polling
    await act(async () => {
      await result.current.startVerification();
    });

    expect(result.current.progress).toBe(25);

    // Advance timer to trigger polling
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.progress).toBe(50);

    vi.useRealTimers();
  });

  it('should stop polling when verification completes', async () => {
    vi.useFakeTimers();

    const mockStatus = {
      domainId: mockDomain.id,
      isVerifying: true,
      currentStep: {
        step: 'dns_check' as const,
        message: 'Checking DNS configuration...',
        progress: 25,
      },
      lastCheck: new Date(),
      nextCheck: null,
      retryCount: 0,
      maxRetries: 5,
    };

    const completedStatus = {
      ...mockStatus,
      isVerifying: false,
      currentStep: {
        step: 'complete' as const,
        message: 'Verification complete!',
        progress: 100,
      },
    };

    vi.mocked(domainVerificationService.getVerificationStatus)
      .mockReturnValueOnce(mockStatus)
      .mockReturnValueOnce(completedStatus);

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    // Start verification
    await act(async () => {
      await result.current.startVerification();
    });

    expect(result.current.isVerifying).toBe(true);

    // Advance timer to simulate completion
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isVerifying).toBe(false);
    expect(result.current.progress).toBe(100);

    vi.useRealTimers();
  });

  it('should handle errors in startVerification', async () => {
    const error = new Error('Verification failed');
    vi.mocked(domainVerificationService.startVerification).mockRejectedValue(error);

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    await expect(
      act(async () => {
        await result.current.startVerification();
      })
    ).rejects.toThrow('Verification failed');
  });

  it('should handle domain change', () => {
    const { result, rerender } = renderHook(
      ({ domain }) => useDomainVerification(domain),
      { initialProps: { domain: mockDomain } }
    );

    const newDomain = { ...mockDomain, id: 'new-domain-id', domain: 'newdomain.com' };

    rerender({ domain: newDomain });

    expect(domainVerificationService.getVerificationStatus).toHaveBeenCalledWith('new-domain-id');
  });

  it('should return correct progress from current step', () => {
    const mockStatus = {
      domainId: mockDomain.id,
      isVerifying: true,
      currentStep: {
        step: 'ssl_check' as const,
        message: 'Verifying SSL certificate...',
        progress: 75,
      },
      lastCheck: new Date(),
      nextCheck: null,
      retryCount: 0,
      maxRetries: 5,
    };

    vi.mocked(domainVerificationService.getVerificationStatus).mockReturnValue(mockStatus);

    const { result } = renderHook(() => useDomainVerification(mockDomain));

    expect(result.current.progress).toBe(75);
    expect(result.current.currentStep?.step).toBe('ssl_check');
  });
});