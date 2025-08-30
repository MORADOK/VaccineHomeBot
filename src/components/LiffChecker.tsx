import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Smartphone, Globe, User, MessageSquare, Copy } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// LIFF Type Definitions
declare global {
  interface Window {
    liff: any;
  }
}

interface LiffInfo {
  ready: boolean;
  inClient: boolean;
  loggedIn: boolean;
  profile: any;
  context: any;
  version: string;
  isApiAvailable: {
    shareTargetPicker: boolean;
    multipleLiffTransition: boolean;
    subwindowOpen: boolean;
    scanCode: boolean;
    sendMessages: boolean;
    permanentLink: boolean;
  };
}

const LiffChecker = () => {
  const LIFF_ID = import.meta.env.VITE_LIFF_ID || 'your-liff-id';
  const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://firstprojecthome.onrender.com/webhook-test/Webhook-Vaccine';
  
  const [liffInfo, setLiffInfo] = useState<LiffInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load LIFF SDK if not available
      if (!window.liff) {
        await loadLiffSDK();
      }

      // Initialize LIFF
      await window.liff.init({ liffId: LIFF_ID });

      // Get LIFF information
      const info: LiffInfo = {
        ready: true,
        inClient: window.liff.isInClient(),
        loggedIn: window.liff.isLoggedIn(),
        profile: null,
        context: null,
        version: window.liff.getVersion(),
        isApiAvailable: {
          shareTargetPicker: window.liff.isApiAvailable('shareTargetPicker'),
          multipleLiffTransition: window.liff.isApiAvailable('multipleLiffTransition'),
          subwindowOpen: window.liff.isApiAvailable('subwindowOpen'),
          scanCode: window.liff.isApiAvailable('scanCode'),
          sendMessages: window.liff.isApiAvailable('sendMessages'),
          permanentLink: window.liff.isApiAvailable('permanentLink')
        }
      };

      // Get profile if logged in
      if (window.liff.isLoggedIn()) {
        try {
          info.profile = await window.liff.getProfile();
        } catch (profileError) {
          console.error('Error getting profile:', profileError);
        }

        // Get context if in client
        if (window.liff.isInClient()) {
          try {
            info.context = await window.liff.getContext();
          } catch (contextError) {
            console.error('Error getting context:', contextError);
          }
        }
      }

      setLiffInfo(info);
      console.log('LIFF Info:', info);

    } catch (error) {
      console.error('LIFF initialization failed:', error);
      setError(`LIFF Initialization Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLiffSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const loginToLiff = async () => {
    try {
      if (window.liff) {
        window.liff.login();
      }
    } catch (error) {
      toast({
        title: "Login Error",
        description: `Failed to login: ${error}`,
        variant: "destructive",
      });
    }
  };

  const logoutFromLiff = async () => {
    try {
      if (window.liff) {
        window.liff.logout();
        // Refresh the page to update the state
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Logout Error",
        description: `Failed to logout: ${error}`,
        variant: "destructive",
      });
    }
  };

  const sendTestMessage = async () => {
    try {
      if (window.liff && window.liff.isInClient()) {
        await window.liff.sendMessages([
          {
            type: 'text',
            text: `🔧 LIFF Test Message\n\nTime: ${new Date().toLocaleString()}\nLIFF ID: ${LIFF_ID}\nWebhook: ${WEBHOOK_URL}`
          }
        ]);
        toast({
          title: "Message Sent",
          description: "Test message sent to LINE chat",
        });
      } else {
        toast({
          title: "Cannot Send Message",
          description: "Messages can only be sent from within LINE app",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Message Error",
        description: `Failed to send message: ${error}`,
        variant: "destructive",
      });
    }
  };

  const testWebhook = async () => {
    try {
      const testData = {
        type: 'liff_check',
        data: {
          liffId: LIFF_ID,
          timestamp: new Date().toISOString(),
          source: 'liff_checker'
        }
      };

      // Security: Use secure webhook proxy instead of direct external webhook
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-patient-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'secure-liff-check', // Simple secret for demo
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        toast({
          title: "Webhook Test Success",
          description: "Successfully sent data via secure proxy",
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      toast({
        title: "Webhook Test Failed",
        description: `Failed to connect to secure webhook: ${error}`,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const closeLiff = () => {
    if (window.liff && window.liff.isInClient()) {
      window.liff.closeWindow();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Initializing LIFF...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">LIFF Checker</h1>
          <p className="text-muted-foreground mt-2">
            ตรวจสอบสถานะและการทำงานของ LINE Front-end Framework
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* LIFF Status */}
        {liffInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                LIFF Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {liffInfo.ready ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                  <span>LIFF Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  {liffInfo.inClient ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-yellow-600" />}
                  <span>In LINE App</span>
                </div>
                <div className="flex items-center gap-2">
                  {liffInfo.loggedIn ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                  <span>Logged In</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Version: {liffInfo.version}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={initializeLiff} 
                  variant="outline" 
                  size="sm"
                >
                  Refresh
                </Button>
                {!liffInfo.loggedIn && (
                  <Button onClick={loginToLiff} size="sm">
                    Login
                  </Button>
                )}
                {liffInfo.loggedIn && (
                  <Button onClick={logoutFromLiff} variant="destructive" size="sm">
                    Logout
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Information */}
        {liffInfo?.profile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                LINE Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                {liffInfo.profile.pictureUrl && (
                  <img 
                    src={liffInfo.profile.pictureUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold">{liffInfo.profile.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    ID: {liffInfo.profile.userId}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 h-6 w-6 p-0"
                      onClick={() => copyToClipboard(liffInfo.profile.userId, 'User ID')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </p>
                  {liffInfo.profile.statusMessage && (
                    <p className="text-sm">{liffInfo.profile.statusMessage}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Context Information */}
        {liffInfo?.context && (
          <Card>
            <CardHeader>
              <CardTitle>Context Information</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(liffInfo.context, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* API Availability */}
        {liffInfo && (
          <Card>
            <CardHeader>
              <CardTitle>API Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(liffInfo.isApiAvailable).map(([api, available]) => (
                  <div key={api} className="flex items-center gap-2">
                    <Badge variant={available ? "default" : "secondary"}>
                      {available ? "✓" : "✗"}
                    </Badge>
                    <span className="text-sm">{api}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Test Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={sendTestMessage} 
              disabled={!liffInfo?.inClient || !liffInfo?.loggedIn}
              className="w-full"
            >
              Send Test Message to LINE
            </Button>
            
            <Button 
              onClick={testWebhook} 
              variant="outline"
              className="w-full"
            >
              Test Webhook Connection
            </Button>

            {liffInfo?.inClient && (
              <Button 
                onClick={closeLiff} 
                variant="secondary"
                className="w-full"
              >
                Close LIFF Window
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">LIFF ID:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{LIFF_ID}</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(LIFF_ID, 'LIFF ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Webhook URL:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded max-w-xs truncate">{WEBHOOK_URL}</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(WEBHOOK_URL, 'Webhook URL')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LiffChecker;