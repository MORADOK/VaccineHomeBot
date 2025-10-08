/**
 * Domain Migration Helper Component
 * Helps migrate from existing domain to new custom domain
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Globe, Copy, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DomainMigrationHelperProps {
  currentDomain?: string;
  onMigrate?: (newDomain: string) => void;
}

export function DomainMigrationHelper({ 
  currentDomain = 'your-app.onrender.com',
  onMigrate 
}: DomainMigrationHelperProps) {
  const [newDomain, setNewDomain] = useState('www.vchomehospital.co.th');
  const [step, setStep] = useState<'planning' | 'instructions' | 'verification'>('planning');
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'DNS record copied to clipboard',
    });
  };

  const handleStartMigration = () => {
    setStep('instructions');
  };

  const handleComplete = () => {
    setStep('verification');
    onMigrate?.(newDomain);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Domain Migration Assistant
          </CardTitle>
          <CardDescription>
            Migrate from your current domain to a custom domain
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'planning' && (
            <div className="space-y-6">
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">Current</Badge>
                    <div className="font-mono text-sm bg-gray-100 px-3 py-2 rounded">
                      {currentDomain}
                    </div>
                  </div>
                  <ArrowRight className="h-6 w-6 text-blue-500" />
                  <div className="text-center">
                    <Badge variant="default" className="mb-2">New Custom Domain</Badge>
                    <div className="font-mono text-sm bg-blue-50 px-3 py-2 rounded border border-blue-200">
                      {newDomain}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-domain">Custom Domain</Label>
                  <Input
                    id="new-domain"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="www.yourdomain.com"
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Migration Benefits:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Professional branded domain</li>
                      <li>• Better SEO and user trust</li>
                      <li>• Free SSL certificate</li>
                      <li>• No additional costs</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">Migration Steps:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium text-xs">1</span>
                      </div>
                      <div>
                        <div className="font-medium">DNS Setup</div>
                        <div className="text-muted-foreground">Configure DNS records</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium text-xs">2</span>
                      </div>
                      <div>
                        <div className="font-medium">Verification</div>
                        <div className="text-muted-foreground">Test new domain</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium text-xs">3</span>
                      </div>
                      <div>
                        <div className="font-medium">Go Live</div>
                        <div className="text-muted-foreground">Switch to new domain</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleStartMigration} className="w-full">
                Start Migration
              </Button>
            </div>
          )}

          {step === 'instructions' && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to migrate to <strong>{newDomain}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium">Step 1: Add Custom Domain in Render</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="text-sm">
                    1. Go to your Render service dashboard
                  </div>
                  <div className="text-sm">
                    2. Click <strong>Settings</strong> → <strong>Custom Domains</strong>
                  </div>
                  <div className="text-sm">
                    3. Click <strong>"Add Custom Domain"</strong>
                  </div>
                  <div className="text-sm flex items-center gap-2">
                    4. Enter: 
                    <code className="bg-white px-2 py-1 rounded text-xs">{newDomain}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(newDomain)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium">Step 2: Configure DNS Records</h3>
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Type:</span>
                        <Badge>CNAME</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Name:</span>
                        <code className="bg-white px-2 py-1 rounded text-sm">www</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Value:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-white px-2 py-1 rounded text-sm">
                            {currentDomain}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(currentDomain)}
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
              </div>

              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> DNS propagation can take 15 minutes to 48 hours. 
                  Your current domain will continue working during this time.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={handleComplete} className="flex-1">
                  DNS Configured - Test Domain
                </Button>
                <Button variant="outline" onClick={() => setStep('planning')}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 'verification' && (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Migration in progress! Your new domain is being set up.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-medium">Verification Steps:</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>DNS records configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>Waiting for DNS propagation...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border border-gray-300 rounded-full" />
                    <span>SSL certificate generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border border-gray-300 rounded-full" />
                    <span>Domain verification</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Test Your New Domain:</h4>
                <div className="space-y-2">
                  <div className="text-sm text-blue-800">
                    Try accessing: <a 
                      href={`https://${newDomain}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline font-mono"
                    >
                      https://{newDomain}
                    </a>
                  </div>
                  <div className="text-xs text-blue-600">
                    If it doesn't work yet, wait a bit longer for DNS propagation.
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Next Steps:</strong> Once your new domain is working, you can update 
                  bookmarks, links, and inform users about the new address. Your old domain 
                  will continue to work as a backup.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}