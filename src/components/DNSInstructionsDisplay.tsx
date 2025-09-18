/**
 * DNS Instructions Display Component
 * Shows DNS configuration instructions for domain setup
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, ExternalLink, Info, AlertTriangle, Settings } from 'lucide-react';
import { DomainConfiguration } from '@/types/domain-config';
import { domainService } from '@/lib/domain-service';
import { DNSInstructionGenerator } from './DNSInstructionGenerator';
import { useToast } from '@/hooks/use-toast';

interface DNSInstructionsDisplayProps {
  domain: DomainConfiguration;
}

export function DNSInstructionsDisplay({ domain }: DNSInstructionsDisplayProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const instructions = domainService.getDNSInstructions(domain);
  const fullDomain = domain.subdomain 
    ? `${domain.subdomain}.${domain.domain}` 
    : domain.domain;

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

  const getProviderGuideLink = (provider: string) => {
    const guides = {
      cloudflare: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
      godaddy: 'https://www.godaddy.com/help/add-an-a-record-19238',
      namecheap: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/',
      route53: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html',
    };
    return guides[provider as keyof typeof guides];
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">DNS Configuration Instructions</h4>
        <p className="text-sm text-muted-foreground">
          Configure these DNS records with your domain provider to enable {fullDomain}
        </p>
      </div>

      <Tabs defaultValue="quick" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Quick Setup
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Provider-Specific
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4">
          {/* DNS Record Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">DNS Record Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Record Type</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{instructions.recordType}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(instructions.recordType, 'Record Type')}
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
                  <Label>Name/Host</Label>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {instructions.name}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(instructions.name, 'Name/Host')}
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
                  <Label>Value/Target</Label>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {instructions.value}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(instructions.value, 'Value/Target')}
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

              {/* TTL Recommendation */}
              <div className="pt-2">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>TTL (Time To Live):</strong> Set to 300 seconds (5 minutes) for faster propagation during setup. 
                    You can increase it to 3600 (1 hour) or higher once the domain is working properly.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-step Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {instructions.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Provider-specific Guides */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Provider-specific Guides</CardTitle>
              <CardDescription>
                Click on your DNS provider for detailed setup instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['cloudflare', 'godaddy', 'namecheap', 'route53'].map((provider) => (
                  <Button
                    key={provider}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      const link = getProviderGuideLink(provider);
                      if (link) window.open(link, '_blank');
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h5 className="font-medium mb-1">DNS Propagation</h5>
                <p className="text-muted-foreground">
                  DNS changes can take up to 48 hours to propagate globally. Use tools like{' '}
                  <a 
                    href="https://www.whatsmydns.net" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    whatsmydns.net
                  </a>{' '}
                  to check propagation status.
                </p>
              </div>

              <Separator />

              <div>
                <h5 className="font-medium mb-1">ANAME/ALIAS Not Supported</h5>
                <p className="text-muted-foreground">
                  If your DNS provider doesn't support ANAME or ALIAS records, use an A record pointing to{' '}
                  <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">216.24.57.1</code> instead.
                </p>
              </div>

              <Separator />

              <div>
                <h5 className="font-medium mb-1">SSL Certificate Issues</h5>
                <p className="text-muted-foreground">
                  SSL certificates are automatically provisioned once DNS is properly configured. 
                  This process may take a few minutes after DNS propagation completes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <DNSInstructionGenerator domain={domain} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-700">{children}</label>;
}