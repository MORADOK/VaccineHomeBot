/**
 * Domain Management Component
 * Provides interface for managing custom domain configurations
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';
import { domainService } from '@/lib/domain-service';
import { DomainConfiguration, DomainStatus } from '@/types/domain-config';
import { AddDomainForm } from './AddDomainForm';
import { DNSInstructionsDisplay } from './DNSInstructionsDisplay';
import { DomainVerificationProgress } from './DomainVerificationProgress';
import { DomainRemovalDialog } from './DomainRemovalDialog';
import { VCHomeHospitalDomainSetup } from './VCHomeHospitalDomainSetup';
import { useToast } from '@/hooks/use-toast';

export function DomainManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVCHomeSetup, setShowVCHomeSetup] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<DomainConfiguration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch domain configurations
  const { 
    data: domains = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['domain-configurations'],
    queryFn: () => domainService.getDomainConfigurations(),
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: (id: string) => domainService.verifyDomainConfiguration(id),
    onSuccess: (updatedDomain) => {
      queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
      toast({
        title: 'Domain Verified',
        description: `${updatedDomain.domain} verification completed`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Failed to verify domain',
        variant: 'destructive',
      });
    },
  });



  const handleVerifyDomain = (id: string) => {
    verifyDomainMutation.mutate(id);
  };

  const handleDeleteDomain = (domain: DomainConfiguration) => {
    setDomainToDelete(domain);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading domain configurations...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load domain configurations: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Domain Management</CardTitle>
              <CardDescription>
                Configure custom domains for your vaccine hospital service
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowVCHomeSetup(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Quick Setup
              </Button>
              <Button
                onClick={() => setShowAddForm(true)}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {showVCHomeSetup && (
            <>
              <VCHomeHospitalDomainSetup
                onSuccess={() => {
                  setShowVCHomeSetup(false);
                  queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
                }}
                onCancel={() => setShowVCHomeSetup(false)}
              />
              <Separator className="my-6" />
            </>
          )}

          {showAddForm && (
            <>
              <AddDomainForm
                onSuccess={() => {
                  setShowAddForm(false);
                  queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
                }}
                onCancel={() => setShowAddForm(false)}
              />
              <Separator className="my-6" />
            </>
          )}

          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No domain configurations found.</p>
              <p className="text-sm mt-2">Add your first custom domain to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {domains.map((domain) => (
                <DomainConfigurationCard
                  key={domain.id}
                  domain={domain}
                  onVerify={() => handleVerifyDomain(domain.id)}
                  onDelete={() => handleDeleteDomain(domain)}
                  isVerifying={verifyDomainMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DomainRemovalDialog
        domain={domainToDelete}
        isOpen={!!domainToDelete}
        onClose={() => setDomainToDelete(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
        }}
      />
    </div>
  );
}

interface DomainConfigurationCardProps {
  domain: DomainConfiguration;
  onVerify: () => void;
  onDelete: () => void;
  isVerifying: boolean;
}

function DomainConfigurationCard({ 
  domain, 
  onVerify, 
  onDelete, 
  isVerifying
}: DomainConfigurationCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const fullDomain = domain.subdomain 
    ? `${domain.subdomain}.${domain.domain}` 
    : domain.domain;

  const getStatusIcon = (status: DomainStatus) => {
    switch (status) {
      case 'enabled':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: DomainStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'enabled':
        return 'default';
      case 'verified':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{fullDomain}</h3>
              <Badge variant={getStatusVariant(domain.status)} className="flex items-center gap-1">
                {getStatusIcon(domain.status)}
                {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>DNS Record: {domain.dns_record_type} → {domain.target_value}</p>
              {domain.last_verified_at && (
                <p>Last verified: {new Date(domain.last_verified_at).toLocaleString()}</p>
              )}
              {domain.ssl_enabled && (
                <p className="text-green-600">SSL Certificate: Active</p>
              )}
            </div>

            {domain.error_message && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{domain.error_message}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              DNS Setup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVerification(!showVerification)}
            >
              Verification
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onVerify}
              disabled={isVerifying || domain.status === 'enabled'}
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Quick Verify
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showInstructions && (
          <div className="mt-4 pt-4 border-t">
            <DNSInstructionsDisplay domain={domain} />
          </div>
        )}

        {showVerification && (
          <div className="mt-4 pt-4 border-t">
            <DomainVerificationProgress 
              domain={domain}
              onVerificationComplete={() => {
                // Refresh the domain list when verification completes
                window.location.reload();
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}