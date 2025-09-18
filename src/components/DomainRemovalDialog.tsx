/**
 * Domain Removal Dialog Component
 * Provides safe domain removal with confirmation dialogs and validation
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { domainService } from '@/lib/domain-service';
import { DomainConfiguration } from '@/types/domain-config';
import { useToast } from '@/hooks/use-toast';

interface DomainRemovalDialogProps {
  domain: DomainConfiguration | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DomainRemovalDialog({
  domain,
  isOpen,
  onClose,
  onSuccess
}: DomainRemovalDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [forceDelete, setForceDelete] = useState(false);
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async () => {
      if (!domain) throw new Error('No domain selected');
      
      if (forceDelete) {
        return domainService.forceDeleteDomainConfiguration(domain.id);
      } else {
        const confirmationToken = domainService.generateDeletionConfirmationToken(domain);
        return domainService.safeDomainRemoval(domain.id, confirmationToken);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
      toast({
        title: 'Domain Removed',
        description: `${domain?.domain} has been successfully removed`,
      });
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: 'Removal Failed',
        description: error instanceof Error ? error.message : 'Failed to remove domain',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setConfirmationText('');
    setForceDelete(false);
    setStep('warning');
    onClose();
  };

  const handleProceedToConfirmation = () => {
    setStep('confirmation');
  };

  const handleConfirmDeletion = () => {
    if (!domain) return;

    // Validate confirmation text
    const expectedText = domain.domain;
    if (!forceDelete && confirmationText !== expectedText) {
      toast({
        title: 'Confirmation Failed',
        description: `Please type "${expectedText}" exactly to confirm deletion`,
        variant: 'destructive',
      });
      return;
    }

    deleteDomainMutation.mutate();
  };

  if (!domain) return null;

  const fullDomain = domain.subdomain 
    ? `${domain.subdomain}.${domain.domain}` 
    : domain.domain;

  const isEnabled = domain.status === 'enabled';
  const canDelete = !isEnabled || forceDelete;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'warning' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Remove Domain Configuration
              </DialogTitle>
              <DialogDescription>
                You are about to remove the domain configuration for <strong>{fullDomain}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant={isEnabled ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {isEnabled ? (
                    <>
                      <strong>Warning:</strong> This domain is currently enabled and may be actively serving traffic.
                      Removing it will make the service inaccessible through this domain.
                    </>
                  ) : (
                    <>
                      This will permanently remove the domain configuration. 
                      DNS records will need to be manually cleaned up from your DNS provider.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-3 text-sm">
                <div>
                  <strong>Domain:</strong> {fullDomain}
                </div>
                <div>
                  <strong>Status:</strong> {domain.status}
                </div>
                <div>
                  <strong>DNS Record:</strong> {domain.dns_record_type} → {domain.target_value}
                </div>
                {domain.ssl_enabled && (
                  <div>
                    <strong>SSL:</strong> Active
                  </div>
                )}
              </div>

              {isEnabled && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="force-delete"
                    checked={forceDelete}
                    onCheckedChange={(checked) => setForceDelete(checked as boolean)}
                  />
                  <Label htmlFor="force-delete" className="text-sm">
                    Force delete (bypass safety checks)
                  </Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedToConfirmation}
                disabled={!canDelete}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirmation' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Confirm Domain Removal
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please confirm by typing the domain name below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Final Warning:</strong> This will permanently delete the domain configuration.
                  You will need to manually remove DNS records from your DNS provider.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  Type <strong>{domain.domain}</strong> to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={domain.domain}
                  className="font-mono"
                />
              </div>

              {forceDelete && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Force Delete Mode:</strong> All safety checks will be bypassed.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('warning')}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDeletion}
                disabled={
                  deleteDomainMutation.isPending || 
                  (!forceDelete && confirmationText !== domain.domain)
                }
              >
                {deleteDomainMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Domain
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}