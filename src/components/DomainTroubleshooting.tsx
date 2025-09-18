import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Mail,
  MessageCircle,
  Globe
} from 'lucide-react';
import { validateDomain } from '@/lib/domain-validation';
import { checkDNSPropagation, verifySSLCertificate } from '@/lib/dns-service';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  solution?: string;
}

interface TroubleshootingIssue {
  id: string;
  title: string;
  description: string;
  symptoms: string[];
  solutions: string[];
  provider?: string;
}

const commonIssues: TroubleshootingIssue[] = [
  {
    id: 'dns-propagation',
    title: 'DNS Records Not Propagating',
    description: 'DNS changes can take up to 48 hours to propagate globally.',
    symptoms: [
      'Domain shows "DNS update required" message',
      'Website not accessible from some locations',
      'Intermittent connectivity issues'
    ],
    solutions: [
      'Wait 24-48 hours for full DNS propagation',
      'Clear your local DNS cache',
      'Use a different DNS server (8.8.8.8 or 1.1.1.1)',
      'Check DNS propagation using online tools'
    ]
  },
  {
    id: 'wrong-record-type',
    title: 'Incorrect DNS Record Type',
    description: 'Using the wrong DNS record type for your domain configuration.',
    symptoms: [
      'Domain verification fails',
      'SSL certificate issues',
      'Redirect loops or errors'
    ],
    solutions: [
      'Use ANAME/ALIAS record if supported by your provider',
      'Use A record pointing to 216.24.57.1 if ANAME not supported',
      'Ensure www subdomain uses CNAME pointing to main domain',
      'Remove conflicting DNS records'
    ]
  },
  {
    id: 'ssl-certificate',
    title: 'SSL Certificate Issues',
    description: 'Problems with SSL certificate provisioning or validation.',
    symptoms: [
      'Browser security warnings',
      'Certificate not trusted errors',
      'Mixed content warnings'
    ],
    solutions: [
      'Ensure DNS records are correctly configured first',
      'Wait for automatic SSL certificate provisioning',
      'Check that domain is accessible via HTTP',
      'Verify domain ownership is complete'
    ]
  }
];

const providerSpecificIssues: Record<string, TroubleshootingIssue[]> = {
  cloudflare: [
    {
      id: 'cloudflare-proxy',
      title: 'Cloudflare Proxy Settings',
      description: 'Cloudflare proxy can interfere with domain verification.',
      symptoms: ['Domain verification fails', 'SSL certificate issues'],
      solutions: [
        'Temporarily disable Cloudflare proxy (gray cloud)',
        'Use "DNS only" mode during initial setup',
        'Re-enable proxy after domain verification completes'
      ],
      provider: 'Cloudflare'
    }
  ],
  godaddy: [
    {
      id: 'godaddy-forwarding',
      title: 'GoDaddy Domain Forwarding Conflict',
      description: 'Domain forwarding can conflict with DNS records.',
      symptoms: ['DNS records not working', 'Unexpected redirects'],
      solutions: [
        'Disable domain forwarding in GoDaddy control panel',
        'Remove any existing forwarding rules',
        'Ensure DNS management is set to "Custom"'
      ],
      provider: 'GoDaddy'
    }
  ]
};

export const DomainTroubleshooting: React.FC = () => {
  const [diagnosticDomain, setDiagnosticDomain] = useState('');
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('diagnostics');

  const runDiagnostics = async () => {
    if (!diagnosticDomain) return;

    setIsRunningDiagnostics(true);
    const results: DiagnosticResult[] = [];

    try {
      // Domain format validation
      const domainValidation = validateDomain(diagnosticDomain);
      results.push({
        test: 'Domain Format',
        status: domainValidation.isValid ? 'pass' : 'fail',
        message: domainValidation.isValid 
          ? 'Domain format is valid' 
          : domainValidation.error || 'Invalid domain format',
        solution: domainValidation.isValid ? undefined : 'Check domain spelling and format'
      });

      if (domainValidation.isValid) {
        // DNS propagation check
        try {
          const dnsResult = await checkDNSPropagation(diagnosticDomain);
          results.push({
            test: 'DNS Resolution',
            status: dnsResult.isResolved ? 'pass' : 'fail',
            message: dnsResult.isResolved 
              ? `DNS resolves to: ${dnsResult.resolvedIPs?.join(', ')}` 
              : 'DNS not resolving',
            solution: dnsResult.isResolved ? undefined : 'Check DNS record configuration'
          });
        } catch (error) {
          results.push({
            test: 'DNS Resolution',
            status: 'fail',
            message: 'DNS check failed',
            solution: 'Verify DNS records are configured correctly'
          });
        }

        // SSL certificate check
        try {
          const sslResult = await verifySSLCertificate(diagnosticDomain);
          results.push({
            test: 'SSL Certificate',
            status: sslResult.isValid ? 'pass' : 'warning',
            message: sslResult.isValid 
              ? 'SSL certificate is valid' 
              : 'SSL certificate not found or invalid',
            solution: sslResult.isValid ? undefined : 'Wait for SSL provisioning or check domain configuration'
          });
        } catch (error) {
          results.push({
            test: 'SSL Certificate',
            status: 'warning',
            message: 'SSL check unavailable',
            solution: 'Manual SSL verification may be needed'
          });
        }
      }
    } catch (error) {
      results.push({
        test: 'Diagnostic Error',
        status: 'fail',
        message: 'Failed to run complete diagnostics',
        solution: 'Try again or contact support'
      });
    }

    setDiagnosticResults(results);
    setIsRunningDiagnostics(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Domain Troubleshooting
          </CardTitle>
          <CardDescription>
            Diagnose and resolve common domain configuration issues
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={selectedProvider} onValueChange={setSelectedProvider} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="general">Common Issues</TabsTrigger>
          <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
          <TabsTrigger value="godaddy">GoDaddy</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Diagnostics</CardTitle>
              <CardDescription>
                Run automated checks on your domain configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter domain to diagnose (e.g., example.com)"
                  value={diagnosticDomain}
                  onChange={(e) => setDiagnosticDomain(e.target.value)}
                />
                <Button 
                  onClick={runDiagnostics}
                  disabled={isRunningDiagnostics || !diagnosticDomain}
                >
                  {isRunningDiagnostics ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Run Diagnostics'
                  )}
                </Button>
              </div>

              {diagnosticResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Diagnostic Results</h4>
                  {diagnosticResults.map((result, index) => (
                    <Alert key={index}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{result.test}</span>
                              {getStatusBadge(result.status)}
                            </div>
                            <AlertDescription className="mt-1">
                              {result.message}
                            </AlertDescription>
                            {result.solution && (
                              <AlertDescription className="mt-2 text-sm text-muted-foreground">
                                <strong>Solution:</strong> {result.solution}
                              </AlertDescription>
                            )}
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          {commonIssues.map((issue) => (
            <Card key={issue.id}>
              <CardHeader>
                <CardTitle className="text-lg">{issue.title}</CardTitle>
                <CardDescription>{issue.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Symptoms:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {issue.symptoms.map((symptom, index) => (
                      <li key={index}>{symptom}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Solutions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {issue.solutions.map((solution, index) => (
                      <li key={index}>{solution}</li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {Object.entries(providerSpecificIssues).map(([provider, issues]) => (
          <TabsContent key={provider} value={provider} className="space-y-4">
            {issues.map((issue) => (
              <Card key={issue.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {issue.title}
                    <Badge variant="outline">{issue.provider}</Badge>
                  </CardTitle>
                  <CardDescription>{issue.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Symptoms:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {issue.symptoms.map((symptom, index) => (
                        <li key={index}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Solutions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {issue.solutions.map((solution, index) => (
                        <li key={index}>{solution}</li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Contact Support Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Need Additional Help?
          </CardTitle>
          <CardDescription>
            Contact our support team for personalized assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Support
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Documentation
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              When contacting support, please include your domain name and any error messages you're seeing.
              This helps us provide faster, more accurate assistance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainTroubleshooting;