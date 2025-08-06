import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, MessageSquare, Send, Copy, Settings, Link } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LineBot = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const { toast } = useToast();

  const testConnection = async () => {
    if (!webhookUrl) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอก Webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test',
          message: 'Connection test from web app',
          timestamp: new Date().toISOString()
        }),
      });

      setConnectionStatus('connected');
      toast({
        title: "เชื่อมต่อสำเร็จ",
        description: "เชื่อมต่อกับ n8n workflow สำเร็จ",
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "เชื่อมต่อไม่สำเร็จ",
        description: "ไม่สามารถเชื่อมต่อกับ n8n workflow ได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!webhookUrl || !testMessage) return;

    setIsLoading(true);
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          data: {
            message: testMessage,
            source: 'web_app_test'
          }
        }),
      });

      toast({
        title: "ส่งข้อความสำเร็จ",
        description: "ส่งข้อความทดสอบไปยัง n8n แล้ว",
      });
      setTestMessage('');
    } catch (error) {
      toast({
        title: "ส่งข้อความไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการส่งข้อความ",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    const lineWebhookUrl = `${webhookUrl}/line-webhook`;
    navigator.clipboard.writeText(lineWebhookUrl);
    toast({
      title: "คัดลอกสำเร็จ",
      description: "คัดลอก LINE Webhook URL แล้ว",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">LINE Bot Management</h1>
          <p className="text-muted-foreground mt-2">
            จัดการและเชื่อมต่อ LINE Bot กับ n8n workflow
          </p>
        </div>

        {/* n8n Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              เชื่อมต่อ n8n Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">n8n Webhook URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="webhook-url"
                  placeholder="https://your-n8n.render.com/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <Button 
                  onClick={testConnection} 
                  disabled={isLoading}
                  variant={connectionStatus === 'connected' ? 'secondary' : 'default'}
                >
                  {connectionStatus === 'connected' ? 'เชื่อมต่อแล้ว' : 'ทดสอบ'}
                </Button>
              </div>
            </div>

            {connectionStatus === 'connected' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  เชื่อมต่อกับ n8n workflow สำเร็จ! สำหรับ LINE Bot ให้ใช้ URL: 
                  <code className="mx-1 p-1 bg-muted rounded">{webhookUrl}/line-webhook</code>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={copyWebhookUrl}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* LINE Bot Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              การตั้งค่า LINE Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="channel-access-token">Channel Access Token</Label>
              <Input
                id="channel-access-token"
                type="password"
                placeholder="Channel Access Token จาก LINE Developers"
                value={channelAccessToken}
                onChange={(e) => setChannelAccessToken(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="channel-secret">Channel Secret</Label>
              <Input
                id="channel-secret"
                type="password"
                placeholder="Channel Secret จาก LINE Developers"
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
              />
            </div>

            <Alert>
              <AlertDescription>
                <strong>วิธีการตั้งค่า LINE Bot:</strong>
                <br />1. ไปที่ LINE Developers Console
                <br />2. คัดลอก Webhook URL ไปใส่ใน Messaging API
                <br />3. กรอก Channel Access Token และ Channel Secret ที่นี่
                <br />4. เปิดใช้งาน Webhook ใน LINE Developers
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Test Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              ทดสอบส่งข้อความ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="test-message">ข้อความทดสอบ</Label>
              <Textarea
                id="test-message"
                placeholder="พิมพ์ข้อความที่ต้องการทดสอบ..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={sendTestMessage}
              disabled={!webhookUrl || !testMessage || isLoading}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'กำลังส่ง...' : 'ส่งข้อความทดสอบ'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LineBot;