/**
 * DNS Instruction Generator Component
 * Generates provider-specific DNS instructions with capability detection
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, ExternalLink, Info, AlertTriangle, Globe, Server, Shield } from 'lucide-react';
import { DomainConfiguration } from '@/types/domain-config';
import { useToast } from '@/hooks/use-toast';

interface DNSProvider {
  id: string;
  name: string;
  supportsANAME: boolean;
  supportsALIAS: boolean;
  supportsCNAME: boolean;
  supportsA: boolean;
  guideUrl?: string;
  logo?: string;
  notes?: string[];
}

interface DNSInstructionSet {
  provider: DNSProvider;
  recordType: string;
  name: string;
  value: string;
  ttl: number;
  instructions: string[];
  warnings?: string[];
  tips?: string[];
}

interface DNSInstructionGeneratorProps {
  domain: DomainConfiguration;
  className?: string;
}

// DNS Provider configurations with capability detection
const DNS_PROVIDERS: DNSProvider[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    supportsANAME: false,
    supportsALIAS: true, // Cloudflare calls it "CNAME flattening"
    supportsCNAME: true,
    supportsA: true,
    guideUrl: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
    notes: ['Uses CNAME flattening for root domains', 'Automatic SSL certificate provisioning']
  },
  {
    id: 'godaddy',
    name: 'GoDaddy',
    supportsANAME: false,
    supportsALIAS: false,
    supportsCNAME: true,
    supportsA: true,
    guideUrl: 'https://www.godaddy.com/help/add-an-a-record-19238',
    notes: ['Use A records for root domains', 'CNAME only for subdomains']
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    supportsANAME: false,
    supportsALIAS: true,
    supportsCNAME: true,
    supportsA: true,
    guideUrl: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/',
    notes: ['ALIAS records available for root domains', 'Advanced DNS required for ALIAS']
  },
  {
    id: 'route53',
    name: 'AWS Route 53',
    supportsANAME: false,
    supportsALIAS: true,
    supportsCNAME: true,
    supportsA: true,
    guideUrl: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html',
    notes: ['ALIAS records recommended for root domains', 'Health checks available']
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    supportsANAME: false,
    supportsALIAS: false,
    supportsCNAME: true,
    supportsA: true,
    guideUrl: 'https://docs.digitalocean.com/products/networking/dns/how-to/manage-records/',
    notes: ['A records only for root domains']
  },
  {
    id: 'google-domains',
    name: 'Google Domains',
    supportsANAME: false,
    supportsALIAS: false,
    supportsCNAME: true,
    supportsA: true,
    guideUrl: 'https://support.google.com/domains/answer/3290350',
    notes: ['Synthetic records available for some configurations']
  },
  {
    id: 'generic',
    name: 'Other DNS Provider',
    supportsANAME: true,
    supportsALIAS: true,
    supportsCNAME: true,
    supportsA: true,
    notes: ['Check your provider documentation for ANAME/ALIAS support']
  }
];

export function DNSInstructionGenerator({ domain, className }: DNSInstructionGeneratorProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const fullDomain = domain.subdomain 
    ? `${domain.subdomain}.${domain.domain}` 
    : domain.domain;

  const isRootDomain = !domain.subdomain;
  const isWwwSubdomain = domain.subdomain === 'www';

  // Helper function to generate instruction sets
  const generateInstructionSet = (
    provider: DNSProvider, 
    recordType: string, 
    domain: string
  ): DNSInstructionSet => {
    // Parse domain to determine if it's root domain or subdomain
    const domainParts = domain.split('.');
    const isRootDomainCheck = domainParts.length === 2; // e.g., "example.com"
    const isWwwSubdomainCheck = domain.startsWith('www.'); // e.g., "www.example.com"
    
    let name: string;
    let value: string;
    let instructions: string[];
    let warnings: string[] = [];
    let tips: string[] = [];

    // Determine the name field based on domain type
    if (isRootDomainCheck) {
      name = '@'; // Root domain uses @
    } else if (isWwwSubdomainCheck) {
      name = 'www'; // www subdomain
    } else {
      name = domainParts[0]; // Other subdomains use the first part
    }

    switch (recordType) {
      case 'ANAME':
      case 'ALIAS':
        value = 'line-intent-router-bot.onrender.com';
        instructions = [
          `Log in to your ${provider.name} DNS management panel`,
          `Navigate to DNS records for ${isRootDomainCheck ? domain : domainParts.slice(-2).join('.')}`,
          `Create a new ${recordType} record`,
          `Set Name/Host field to: ${name}`,
          `Set Value/Target field to: ${value}`,
          'Set TTL to 300 (5 minutes) for initial setup',
          'Save the record',
          'Wait for DNS propagation (typically 5-30 minutes)'
        ];
        tips.push(`${recordType} records automatically resolve to the correct IP address`);
        tips.push('This is the recommended configuration for reliability');
        break;

      case 'CNAME':
        value = 'line-intent-router-bot.onrender.com';
        instructions = [
          `Log in to your ${provider.name} DNS management panel`,
          `Navigate to DNS records for ${isRootDomainCheck ? domain : domainParts.slice(-2).join('.')}`,
          'Create a new CNAME record',
          `Set Name/Host field to: ${name}`,
          `Set Value/Target field to: ${value}`,
          'Set TTL to 300 (5 minutes) for initial setup',
          'Save the record',
          'Wait for DNS propagation (typically 5-30 minutes)'
        ];
        if (isRootDomainCheck) {
          warnings.push('CNAME records cannot be used for root domains on most DNS providers');
        }
        break;

      case 'A':
        value = '216.24.57.1';
        instructions = [
          `Log in to your ${provider.name} DNS management panel`,
          `Navigate to DNS records for ${isRootDomainCheck ? domain : domainParts.slice(-2).join('.')}`,
          'Create a new A record',
          `Set Name/Host field to: ${name}`,
          `Set Value/Target field to: ${value}`,
          'Set TTL to 300 (5 minutes) for initial setup',
          'Save the record',
          'Wait for DNS propagation (typically 5-30 minutes)'
        ];
        warnings.push('A records point to a fixed IP address which may change');
        tips.push('Use ANAME/ALIAS records if available for better reliability');
        break;

      default:
        throw new Error(`Unsupported record type: ${recordType}`);
    }

    return {
      provider,
      recordType,
      name,
      value,
      ttl: 300,
      instructions,
      warnings,
      tips
    };
  };

  // Generate instructions based on provider capabilities
  const instructionSets = useMemo(() => {
    if (!selectedProvider) return [];

    const provider = DNS_PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) return [];

    const instructions: DNSInstructionSet[] = [];

    // Determine best record type based on provider capabilities and domain type
    if (isRootDomain) {
      // For root domains, prefer ANAME/ALIAS, fallback to A
      if (provider.supportsANAME) {
        instructions.push(generateInstructionSet(provider, 'ANAME', fullDomain));
      } else if (provider.supportsALIAS) {
        instructions.push(generateInstructionSet(provider, 'ALIAS', fullDomain));
      }
      
      // Always provide A record option as fallback
      instructions.push(generateInstructionSet(provider, 'A', fullDomain));
    } else {
      // For subdomains, prefer CNAME, fallback to A
      if (provider.supportsCNAME) {
        instructions.push(generateInstructionSet(provider, 'CNAME', fullDomain));
      }
      
      // A record option for subdomains
      instructions.push(generateInstructionSet(provider, 'A', fullDomain));
    }

    return instructions;
  }, [selectedProvider, fullDomain, isRootDomain, generateInstructionSet]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: 'Copied to clipboard',
        description: `${fieldName} has been copied`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const getRecordTypeIcon = (recordType: string) => {
    switch (recordType) {
      case 'ANAME':
      case 'ALIAS':
        return <Globe className="h-4 w-4" />;
      case 'CNAME':
        return <Server className="h-4 w-4" />;
      case 'A':
        return <Shield className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getRecordTypeDescription = (recordType: string) => {
    switch (recordType) {
      case 'ANAME':
        return 'Points to a hostname and resolves to its IP address (recommended)';
      case 'ALIAS':
        return 'Similar to ANAME, resolves to the target hostname\'s IP (recommended)';
      case 'CNAME':
        return 'Points to another domain name (good for subdomains)';
      case 'A':
        return 'Points directly to an IP address (fallback option)';
      default:
        return '';
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            DNS Configuration Generator
          </CardTitle>
          <CardDescription>
            Get provider-specific DNS instructions for {fullDomain}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select your DNS provider:</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your DNS provider..." />
              </SelectTrigger>
              <SelectContent>
                {DNS_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProvider && instructionSets.length > 0 && (
            <>
              <Separator />
              
              {/* Provider Information */}
              {(() => {
                const provider = DNS_PROVIDERS.find(p => p.id === selectedProvider);
                return provider && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p><strong>{provider.name}</strong> capabilities:</p>
                        <div className="flex flex-wrap gap-2">
                          {provider.supportsANAME && <Badge variant="secondary">ANAME</Badge>}
                          {provider.supportsALIAS && <Badge variant="secondary">ALIAS</Badge>}
                          {provider.supportsCNAME && <Badge variant="secondary">CNAME</Badge>}
                          {provider.supportsA && <Badge variant="secondary">A Record</Badge>}
                        </div>
                        {provider.notes && provider.notes.length > 0 && (
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            {provider.notes.map((note, index) => (
                              <li key={index}>• {note}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })()}

              {/* Instruction Tabs */}
              <Tabs defaultValue="0" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  {instructionSets.map((instructionSet, index) => (
                    <TabsTrigger key={index} value={index.toString()} className="flex items-center gap-2">
                      {getRecordTypeIcon(instructionSet.recordType)}
                      {instructionSet.recordType} Record
                      {index === 0 && <Badge variant="default" className="ml-1 text-xs">Recommended</Badge>}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {instructionSets.map((instructionSet, index) => (
                  <TabsContent key={index} value={index.toString()} className="space-y-4">
                    {/* Record Type Description */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {getRecordTypeDescription(instructionSet.recordType)}
                      </AlertDescription>
                    </Alert>

                    {/* Warnings */}
                    {instructionSet.warnings && instructionSet.warnings.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="space-y-1">
                            {instructionSet.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* DNS Record Values */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">DNS Record Values</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Record Type</label>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getRecordTypeIcon(instructionSet.recordType)}
                                {instructionSet.recordType}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(instructionSet.recordType, 'Record Type')}
                              >
                                {copiedField === 'Record Type' ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Name/Host</label>
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                                {instructionSet.name}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(instructionSet.name, 'Name/Host')}
                              >
                                {copiedField === 'Name/Host' ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Value/Target</label>
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                                {instructionSet.value}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(instructionSet.value, 'Value/Target')}
                              >
                                {copiedField === 'Value/Target' ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              TTL (Time To Live): {instructionSet.ttl} seconds
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(instructionSet.ttl.toString(), 'TTL')}
                            >
                              {copiedField === 'TTL' ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Step-by-step Instructions */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Step-by-step Instructions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-3 text-sm">
                          {instructionSet.instructions.map((instruction, idx) => (
                            <li key={idx} className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                {idx + 1}
                              </span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>

                    {/* Tips */}
                    {instructionSet.tips && instructionSet.tips.length > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-medium mb-2">Tips:</p>
                          <ul className="space-y-1">
                            {instructionSet.tips.map((tip, idx) => (
                              <li key={idx}>• {tip}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Provider Guide Link */}
                    {instructionSet.provider.guideUrl && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => window.open(instructionSet.provider.guideUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View {instructionSet.provider.name} DNS Guide
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}

          {selectedProvider && instructionSets.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No compatible DNS record types found for the selected provider and domain configuration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}