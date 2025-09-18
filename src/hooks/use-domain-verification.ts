/**
 * React hook for domain verification workflow management
 */

import { useState, useEffect, useCallback } from 'react';
import { domainVerificationService, VerificationStatus, VerificationProgress } from '@/lib/domain-verification-service';
import { DomainConfiguration } from '@/types/domain-config';

export interface UseDomainVerificationReturn {
  verificationStatus: VerificationStatus | null;
  isVerifying: boolean;
  currentStep: VerificationProgress | null;
  progress: number;
  startVerification: () => Promise<void>;
  stopVerification: () => void;
  retryVerification: () => Promise<void>;
}

export function useDomainVerification(domain: DomainConfiguration | null): UseDomainVerificationReturn {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Poll verification status
  useEffect(() => {
    if (!domain?.id || !isPolling) return;

    const pollInterval = setInterval(() => {
      const status = domainVerificationService.getVerificationStatus(domain.id);
      setVerificationStatus(status);
      
      // Stop polling if verification is complete or stopped
      if (!status?.isVerifying) {
        setIsPolling(false);
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [domain?.id, isPolling]);

  // Initialize verification status on domain change
  useEffect(() => {
    if (domain?.id) {
      const status = domainVerificationService.getVerificationStatus(domain.id);
      setVerificationStatus(status);
      setIsPolling(status?.isVerifying || false);
    }
  }, [domain?.id]);

  const startVerification = useCallback(async () => {
    if (!domain?.id) return;

    try {
      await domainVerificationService.startVerification(domain.id);
      setIsPolling(true);
    } catch (error) {
      console.error('Failed to start verification:', error);
      throw error;
    }
  }, [domain?.id]);

  const stopVerification = useCallback(() => {
    if (!domain?.id) return;

    domainVerificationService.stopVerification(domain.id);
    setIsPolling(false);
    setVerificationStatus(prev => prev ? { ...prev, isVerifying: false } : null);
  }, [domain?.id]);

  const retryVerification = useCallback(async () => {
    if (!domain?.id) return;

    // Stop current verification and start fresh
    domainVerificationService.stopVerification(domain.id);
    await startVerification();
  }, [domain?.id, startVerification]);

  return {
    verificationStatus,
    isVerifying: verificationStatus?.isVerifying || false,
    currentStep: verificationStatus?.currentStep || null,
    progress: verificationStatus?.currentStep?.progress || 0,
    startVerification,
    stopVerification,
    retryVerification,
  };
}