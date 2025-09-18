/**
 * Add Domain Form Component
 * Form for adding new custom domain configurations
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { domainService } from '@/lib/domain-service';
import { DomainFormData, DNSRecordType } from '@/types/domain-config';
import { validateDomainFormat, detectDNSRecordType } from '@/lib/domain-validation';
import { useToast } from '@/hooks/use-toast';

interface AddDomainFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddDomainForm({ onSuccess, onCancel }: AddDomainFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<DomainFormData>();

  const watchedDomain = watch('domain');
  const watchedRecordType = watch('dns_record_type');

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: (data: DomainFormData) => domainService.addDomainConfiguration(data),
    onSuccess: (newDomain) => {
      toast({
        title: 'Domain Added',
        description: `${newDomain.domain} has been added successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add domain';
      setError('root', { message: errorMessage });
      toast({
        title: 'Failed to Add Domain',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Auto-detect DNS record type when domain changes
  React.useEffect(() => {
    if (watchedDomain && !watchedRecordType) {
      try {
        const validation = validateDomainFormat(watchedDomain);
        if (validation.isValid) {
          const recommended = domainService.getRecommendedDNSRecordType(watchedDomain);
          setValue('dns_record_type', recommended);
          clearErrors('domain');
        }
      } catch (error) {
        // Ignore errors during auto-detection
      }
    }
  }, [watchedDomain, watchedRecordType, setValue, clearErrors]);

  const onSubmit = (data: DomainFormData) => {
    // Validate domain format
    const validation = validateDomainFormat(data.domain);
    if (!validation.isValid) {
      setError('domain', { message: validation.errors[0] });
      return;
    }

    // Clear any previous errors
    clearErrors();

    // Submit the form
    addDomainMutation.mutate(data);
  };

  const getDNSRecordDescription = (recordType: DNSRecordType) => {
    switch (recordType) {
      case 'ANAME':
        return 'Recommended: Points directly to the service hostname (best performance)';
      case 'CNAME':
        return 'For subdomains: Points to another domain name';
      case 'A':
        return 'Fallback: Points to a specific IP address';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Custom Domain</CardTitle>
        <CardDescription>
          Configure a new custom domain for your vaccine hospital service
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Domain Input */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domain Name</Label>
            <Input
              id="domain"
              placeholder="example.com"
              {...register('domain', {
                required: 'Domain name is required',
                pattern: {
                  value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/,
                  message: 'Please enter a valid domain name',
                },
              })}
              className={errors.domain ? 'border-red-500' : ''}
            />
            {errors.domain && (
              <p className="text-sm text-red-500">{errors.domain.message}</p>
            )}
          </div>

          {/* Subdomain Input */}
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain (Optional)</Label>
            <Input
              id="subdomain"
              placeholder="www"
              {...register('subdomain', {
                pattern: {
                  value: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/,
                  message: 'Please enter a valid subdomain',
                },
              })}
              className={errors.subdomain ? 'border-red-500' : ''}
            />
            {errors.subdomain && (
              <p className="text-sm text-red-500">{errors.subdomain.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty for apex domain (e.g., example.com) or enter 'www' for www subdomain
            </p>
          </div>

          {/* DNS Record Type */}
          <div className="space-y-2">
            <Label htmlFor="dns_record_type">DNS Record Type</Label>
            <Select
              value={watchedRecordType}
              onValueChange={(value: DNSRecordType) => setValue('dns_record_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select DNS record type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANAME">ANAME/ALIAS (Recommended)</SelectItem>
                <SelectItem value="CNAME">CNAME (For subdomains)</SelectItem>
                <SelectItem value="A">A Record (Fallback)</SelectItem>
              </SelectContent>
            </Select>
            {watchedRecordType && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  {getDNSRecordDescription(watchedRecordType)}
                </p>
              </div>
            )}
          </div>

          {/* Domain Preview */}
          {watchedDomain && (
            <div className="space-y-2">
              <Label>Domain Preview</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="font-mono text-sm">
                  {watch('subdomain') ? `${watch('subdomain')}.${watchedDomain}` : watchedDomain}
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.root && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={addDomainMutation.isPending}
              className="flex-1"
            >
              {addDomainMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding Domain...
                </>
              ) : (
                'Add Domain'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={addDomainMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}