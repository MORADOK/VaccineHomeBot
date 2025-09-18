/**
 * Domain verification progress component with status indicators
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  Loader2,
  Play,
  Square
} from 'lucide-react';
import { DomainConfiguration } from '@/types/domain-config';
import { useDomainVerification } from '@/hooks/use-domain-verification';

interface DomainVerificationProgressProps {
  domain: DomainConfiguration;
  onVerificationComplete?: () => void;
}

export function DomainVerificationProgress({ 
  domain, 
  onVerificationComplete 
}: DomainVerificationProgressProps) {
  const {
    verificationStatus,
    isVerifying,
    currentStep,
    progress,
    startVerification,
    stopVerification,
    retryVerification,
  } = useDomainVerification(domain);

  // Handle verification completion
  React.useEffect(() => {
    if (currentStep?.step === 'complete' && onVerificationComplete) {
      onVerificationComplete();
    }
  }, [currentStep?.step, onVerificationComplete]);

  const getStatusIcon = () => {
    if (isVerifying) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }

    switch (domain.status) {
      case 'enabled':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    if (isVerifying) {
      return <Badge variant="secondary">Verifying...</Badge>;
    }

    switch (domain.status) {
      case 'enabled':
        return <Badge variant="default" className="bg-green-500">Enabled</Badge>;
      case 'verified':
        return <Badge variant="secondary" className="bg-yellow-500">Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getStepIcon = (stepName: string) => {
    if (!currentStep) return <Clock className="h-4 w-4 text-gray-400" />;

    const isCurrentStep = currentStep.step === stepName;
    const isCompleted = getStepOrder(currentStep.step) > getStepOrder(stepName);
    const isError = currentStep.isError && isCurrentStep;

    if (isError) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (isCurrentStep) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepOrder = (step: string): number => {
    switch (step) {
      case 'dns_check': return 1;
      case 'ssl_check': return 2;
      case 'accessibility_check': return 3;
      case 'complete': return 4;
      default: return 0;
    }
  };

  const canStartVerification = !isVerifying && domain.status !== 'enabled';
  const canRetry = !isVerifying && (domain.status === 'failed' || currentStep?.isError);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Domain Verification</span>
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Domain Info */}
        <div className="text-sm text-gray-600">
          <strong>Domain:</strong> {domain.domain}
          {domain.subdomain && (
            <>
              <br />
              <strong>Subdomain:</strong> {domain.subdomain}
            </>
          )}
        </div>

        {/* Progress Bar */}
        {isVerifying && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Current Step Message */}
        {currentStep && (
          <Alert className={currentStep.isError ? 'border-red-200 bg-red-50' : undefined}>
            <AlertTriangle className={`h-4 w-4 ${currentStep.isError ? 'text-red-500' : 'text-blue-500'}`} />
            <AlertDescription>
              {currentStep.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Steps */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Verification Steps</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {getStepIcon('dns_check')}
              <span>DNS Configuration Check</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {getStepIcon('ssl_check')}
              <span>SSL Certificate Verification</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {getStepIcon('accessibility_check')}
              <span>Domain Accessibility Test</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {getStepIcon('complete')}
              <span>Verification Complete</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {domain.error_message && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {domain.error_message}
            </AlertDescription>
          </Alert>
        )}

        {/* Retry Information */}
        {verificationStatus && verificationStatus.retryCount > 0 && (
          <div className="text-sm text-gray-600">
            Retry attempt: {verificationStatus.retryCount} / {verificationStatus.maxRetries}
            {verificationStatus.nextCheck && (
              <div>
                Next check: {verificationStatus.nextCheck.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canStartVerification && (
            <Button 
              onClick={startVerification}
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Verification
            </Button>
          )}
          
          {isVerifying && (
            <Button 
              onClick={stopVerification}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
          
          {canRetry && (
            <Button 
              onClick={retryVerification}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>

        {/* Last Verified */}
        {domain.last_verified_at && (
          <div className="text-xs text-gray-500">
            Last verified: {new Date(domain.last_verified_at).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}