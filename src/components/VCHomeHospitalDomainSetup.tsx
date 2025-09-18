/**
 * VCHome Hospital Domain Setup Component
 * Quick setup for www.vchomehospital.co.th
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Zap, CheckCircle, Copy, ExternalLink, Globe, Shield, Clock } from 'lucide-react';
import { domainService } from '@/lib/domain-service';
import { useToast } from '@/hooks/use-toast';
import { DOMAIN_PRESETS, RENDER_CONFIG } from '@/config/domain-presets';

interface VCHomeHospitalDomainSetupProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VCHomeHospitalDomainSetup({ onSuccess, onCancel }: VCHomeHospitalDomainSetupProps) {
  const [step, setStep] = useState<'setup' | 'instructions' | 'monitoring'>('setup');
  const [selectedPreset, setSelectedPreset] = useState('vchomehospital-www');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const preset = DOMAIN_PRESETS.find(p => p.id === selectedPreset);

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async () => {
      if (!preset) throw new Error('No preset selected');
      
      const formData = {
        domain: preset.domain,
        subdomain: preset.subdomain,
        dns_record_type: preset.dns_record_type
      };
      
      return domainService.addDomainConfiguration(formData);
    },
    onSuccess: (domain) => {
      toast({
        title: 'Domain Added Successfully',
        description: `${preset?.subdomain ? `${preset.subdomain}.` : ''}${preset?.domain} has been added to your configuration`,
      });
      setStep('instructions');
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Domain',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: 'DNS record information copied',
    });
  };

  const handleSetupDomain = () => {
    addDomainMutation.mutate();
  };

  const handleComplete = () => {
    setStep('monitoring');
    queryClient.invalidateQueries({ queryKey: ['domain-configurations'] });
    onSuccess?.();
  };

  if (!preset) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Invalid preset configuration</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                VCHome Hospital Domain Setup
              </CardTitle>
              <CardDescription>
                Quick setup for www.vchomehospital.co.th on Render
              </CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {preset.subdomain ? `${preset.subdomain}.` : ''}{preset.domain}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DOMAIN_PRESETS.filter(p => p.domain === 'vchomehospital.co.th').map((presetOption) => (
                  <Card 
                    key={presetOption.id}
                    className={`cursor-pointer transition-colors ${
                      selectedPreset === presetOption.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPreset(presetOption.id)}
                  >
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="font-medium text-sm">
                          {presetOption.subdomain ? `${presetOption.subdomain}.` : ''}{presetOption.domain}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {presetOption.description}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {presetOption.dns_record_type} Record
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">What happens next:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium text-xs">1</span>
                    </div>
                    <div>
                      <div className="font-medium">Add to Render</div>
                      <div className="text-muted-foreground">Domain will be added to your Render service</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium text-xs">2</span>
                    </div>
                    <div>
                      <div className="font-medium">DNS Setup</div>
                      <div className="text-muted-foreground">You'll get step-by-step DNS instructions</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-medium text-xs">3</span>
                    </div>
                    <div>
                      <div className="font-medium">Auto SSL</div>
                      <div className="text-muted-foreground">Free SSL certificate from Let's Encrypt</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSetupDomain}
                  disabled={addDomainMutation.isPending}
                  className="flex-1"
                >
                  {addDomainMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Setup Domain
                    </>
                  )}
                </Button>
                {onCancel && (
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'instructions' && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Domain added successfully! Now you need to configure DNS records.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium">DNS Configuration Required</h3>
                
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">DNS Record Type:</span>
                        <Badge>{preset.dns_record_type}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Name:</span>
                        <code className="bg-white px-2 py-1 rounded text-sm">
                          {preset.subdomain || '@'}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Value:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded text-sm">
                            {preset.dns_record_type === 'CNAME' 
                              ? RENDER_CONFIG.defaultTarget 
                              : RENDER_CONFIG.ipAddress}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(
                              preset.dns_record_type === 'CNAME' 
                                ? RENDER_CONFIG.defaultTarget 
                                : RENDER_CONFIG.ipAddress
                            )}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">TTL:</span>
                        <code className="bg-white px-2 py-1 rounded text-sm">300</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h4 className="font-medium">Step-by-step instructions:</h4>
                  <ol className="space-y-2 text-sm">
                    {preset.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">
                          {index + 1}
                        </span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>DNS Propagation Time:</strong> {RENDER_CONFIG.propagationTime}
                    <br />
                    You can check propagation status at{' '}
                    <a 
                      href="https://dnschecker.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      dnschecker.org <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                {preset.notes && (
                  <Alert>
                    <AlertDescription>
                      <strong>Note:</strong> {preset.notes}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleComplete} className="flex-1">
                  <Shield className="h-4 w-4 mr-2" />
                  Start Monitoring
                </Button>
                <Button variant="outline" onClick={() => setStep('setup')}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 'monitoring' && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Setup complete! Your domain is now being monitored automatically.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="font-medium">What's being monitored:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    DNS Resolution
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    SSL Certificate
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Domain Accessibility
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Response Time
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                You can view the domain status in the Domain Management section.
                The system will automatically detect when your DNS changes take effect.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}