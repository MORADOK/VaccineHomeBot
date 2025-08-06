import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  MessageSquare, 
  QrCode, 
  CheckCircle, 
  UserPlus,
  ArrowRight,
  Copy,
  ExternalLink,
  Send,
  Link,
  Settings
} from 'lucide-react';

const PatientRegistration = () => {
  const [showQR, setShowQR] = useState(false);
  const [lineCode, setLineCode] = useState('');
  const n8nWebhookUrl = import.meta.env.VITE_WEBHOOK_URL;

const testPatientRegistration = () => {
  if (!n8nWebhookUrl) {
    toast({ title: "Webhook URL ไม่ถูกต้อง", variant: "destructive" });
    return;
  }
  // ...
};

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const lineBot = {
    name: 'VaccineBot',
    id: '@vaccine-bot',
    qrCode: 'https://line.me/R/ti/p/@vaccine-bot',
    webhook: 'https://your-n8n.domain/webhook/line-bot'
  };

  const generateLineCode = () => {
    const webhookCode = `// LINE Bot Webhook สำหรับลงทะเบียนคนไข้
// URL: ${lineBot.webhook}

// ข้อความต้อนรับ
const welcomeMessage = {
  "type": "text",
  "text": "🏥 ยินดีต้อนรับสู่ระบบลงทะเบียนวัคซีน\\n\\n📝 กรุณากรอกข้อมูลของคุณ:\\n\\n1️⃣ ชื่อ-นามสกุล (เต็ม)\\n2️⃣ เบอร์โทรศัพท์\\n\\nตอบกลับข้อความนี้เพื่อเริ่มลงทะเบียน"
};

// การประมวลผลข้อความ
if (input.type === "message" && input.message.type === "text") {
  const userText = input.message.text.trim();
  const userId = input.source.userId;
  
  // ดึงข้อมูล Profile จาก LINE
  const profileResponse = await this.helpers.request({
    method: "GET",
    url: "https://api.line.me/v2/bot/profile/" + userId,
    headers: {
      "Authorization": "Bearer " + process.env.LINE_CHANNEL_ACCESS_TOKEN
    }
  });
  
  const profile = profileResponse.body;
  
  // วิเคราะห์ข้อความที่ส่งมา
  const patterns = {
    fullName: /^[ก-๙a-zA-Z\\s]{4,50}$/,
    phone: /^(08|09|06|02)\\d{8}$/
  };
  
  let responseMessage = "";
  
  // ตรวจสอบรูปแบบข้อมูล
  if (patterns.fullName.test(userText)) {
    // เป็นชื่อ-นามสกุล
    responseMessage = \`✅ บันทึกชื่อ: \${userText}\\n\\n📱 กรุณาส่งเบอร์โทรศัพท์ของคุณ\\n(ตัวอย่าง: 081-234-5678)\`;
    
    // บันทึกลง Google Sheets
    await saveToGoogleSheets('Patients', [
      userId,
      profile.displayName,
      userText, // ชื่อเต็มที่ผู้ใช้กรอก
      '', // เบอร์โทร - รอกรอก
      new Date().toISOString(),
      'pending-phone'
    ]);
    
  } else if (patterns.phone.test(userText.replace(/-/g, ''))) {
    // เป็นเบอร์โทรศัพท์
    responseMessage = \`✅ บันทึกเบอร์โทร: \${userText}\\n\\n🎉 ลงทะเบียนสำเร็จ!\\n\\n👩‍⚕️ เจ้าหน้าที่จะติดต่อกลับเพื่อนัดหมายการฉีดวัคซีน\\n\\n⏰ โดยปกติจะได้รับการติดต่อภายใน 24 ชั่วโมง\`;
    
    // อัปเดตข้อมูลใน Google Sheets
    await updatePatientPhone(userId, userText);
    
    // แจ้งเตือนเจ้าหน้าที่
    await notifyStaff(userId, profile.displayName, userText);
    
  } else {
    // รูปแบบไม่ถูกต้อง
    responseMessage = \`❌ รูปแบบข้อมูลไม่ถูกต้อง\\n\\n📝 กรุณาส่ง:\\n\\n1️⃣ ชื่อ-นามสกุล (ภาษาไทยหรืออังกฤษ)\\nตัวอย่าง: สมชาย ใจดี\\n\\n2️⃣ เบอร์โทรศัพท์ (10 หลัก)\\nตัวอย่าง: 081-234-5678\`;
  }
  
  // ส่งข้อความตอบกลับ
  return [{
    json: {
      to: userId,
      messages: [{
        type: "text",
        text: responseMessage
      }]
    }
  }];
}

// Helper Functions
async function saveToGoogleSheets(sheetName, data) {
  const response = await this.helpers.request({
    method: 'POST',
    url: \`https://sheets.googleapis.com/v4/spreadsheets/\${process.env.GOOGLE_SPREADSHEET_ID}/values/\${sheetName}:append\`,
    headers: {
      'Authorization': 'Bearer ' + process.env.GOOGLE_ACCESS_TOKEN,
      'Content-Type': 'application/json'
    },
    body: {
      values: [data],
      valueInputOption: 'RAW'
    }
  });
  return response.body;
}

async function updatePatientPhone(userId, phone) {
  // ค้นหาแถวที่ต้องอัปเดต
  const getResponse = await this.helpers.request({
    method: 'GET',
    url: \`https://sheets.googleapis.com/v4/spreadsheets/\${process.env.GOOGLE_SPREADSHEET_ID}/values/Patients:A:F\`,
    headers: {
      'Authorization': 'Bearer ' + process.env.GOOGLE_ACCESS_TOKEN
    }
  });
  
  const rows = getResponse.body.values || [];
  let updateRow = -1;
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      updateRow = i + 1;
      break;
    }
  }
  
  if (updateRow > 0) {
    // อัปเดตเบอร์โทรและสถานะ
    await this.helpers.request({
      method: 'PUT',
      url: \`https://sheets.googleapis.com/v4/spreadsheets/\${process.env.GOOGLE_SPREADSHEET_ID}/values/Patients:D\${updateRow}:F\${updateRow}\`,
      headers: {
        'Authorization': 'Bearer ' + process.env.GOOGLE_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: {
        values: [[
          phone,
          new Date().toISOString(),
          'completed'
        ]],
        valueInputOption: 'RAW'
      }
    });
  }
}

async function notifyStaff(userId, displayName, phone) {
  // ส่งการแจ้งเตือนไปยังระบบเจ้าหน้าที่
  // (สามารถใช้ Webhook, Email, หรือ Slack)
  console.log('New patient registered:', {
    userId,
    displayName,
    phone,
    timestamp: new Date().toISOString()
  });
}`;

    setLineCode(webhookCode);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "คัดลอกแล้ว",
      description: "คัดลอกโค้ดไปยังคลิปบอร์ดเรียบร้อยแล้ว"
    });
  };

  const sendToN8n = async (patientData: any) => {
    if (!n8nWebhookUrl) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอก n8n Webhook URL ก่อน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // mode: "no-cors",
        body: JSON.stringify({
          ...patientData,
          timestamp: new Date().toISOString(),
          source: "frontend_registration",
        }),
      });

      toast({
        title: "ส่งข้อมูลสำเร็จ",
        description: "ข้อมูลได้ถูกส่งไปยัง n8n workflow แล้ว",
      });
    } catch (error) {
      console.error("Error sending to n8n:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อมูลไปยัง n8n ได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
    const testData = {
      LineUserID: "test-user-123",
      displayName: "ทดสอบ ระบบ",
      fullName: "นาย ทดสอบ ระบบ",
      phone: "081-234-5678",
      registrationType: "manual",
    };
    
    sendToN8n(testData);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            ระบบลงทะเบียนคนไข้ผ่าน LINE Bot
          </h1>
          <p className="text-muted-foreground">
            คนไข้สามารถลงทะเบียนชื่อ-นามสกุลและเบอร์โทรศัพท์ผ่าน LINE Bot
          </p>
        </div>

        <div className="grid gap-6">
          {/* n8n Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                เชื่อมต่อกับ n8n Workflow
              </CardTitle>
              <CardDescription>
                ระบบจะเชื่อมต่อกับ n8n Webhook อัตโนมัติจากการตั้งค่าของผู้ดูแลระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="n8n-webhook">n8n Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                
                  <Button 
                    onClick={testPatientRegistration}
                    disabled={!n8nWebhookUrl || isLoading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? 'กำลังส่ง...' : 'ทดสอบ'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  URL จาก n8n workflow ที่มีอยู่แล้วบน Render
                </p>
              </div>
              
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>การใช้งานกับ workflow เดิม:</strong>
                  <br />• ใส่ Webhook URL จาก n8n workflow ที่รันอยู่แล้ว
                  <br />• กดปุ่ม "ทดสอบ" เพื่อส่งข้อมูลทดสอบ
                  <br />• ระบบจะส่งข้อมูลผู้ป่วยไปยัง workflow โดยอัตโนมัติ
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* ข้อมูล LINE Bot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                ข้อมูล LINE Bot
              </CardTitle>
              <CardDescription>
                ข้อมูลสำหรับตั้งค่า LINE Bot สำหรับรับลงทะเบียนคนไข้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>ชื่อบอท</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={lineBot.name} readOnly />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(lineBot.name)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>LINE Bot ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={lineBot.id} readOnly />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(lineBot.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={lineBot.webhook} readOnly />
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(lineBot.webhook)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowQR(!showQR)}>
                  <QrCode className="h-4 w-4 mr-2" />
                  {showQR ? 'ซ่อน QR Code' : 'แสดง QR Code'}
                </Button>
                <Button variant="outline" onClick={generateLineCode}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  สร้างโค้ด n8n
                </Button>
              </div>

              {showQR && (
                <div className="flex justify-center p-6 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-white p-4 rounded-lg shadow-md mx-auto mb-4">
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <QrCode className="h-20 w-20 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      QR Code สำหรับเพิ่มเพื่อน LINE Bot
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      เปิดใน LINE
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ขั้นตอนการลงทะเบียน */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                ขั้นตอนการลงทะเบียนสำหรับคนไข้
              </CardTitle>
              <CardDescription>
                ลำดับขั้นตอนที่คนไข้ต้องทำผ่าน LINE
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold">เพิ่มเพื่อน LINE Bot</h3>
                    <p className="text-sm text-muted-foreground">
                      สแกน QR Code หรือค้นหา ID: {lineBot.id}
                    </p>
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground ml-4" />

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold">ส่งชื่อ-นามสกุล</h3>
                    <p className="text-sm text-muted-foreground">
                      พิมพ์ชื่อ-นามสกุลเต็ม (ภาษาไทยหรืออังกฤษ)
                    </p>
                    <Badge variant="outline" className="mt-1">
                      ตัวอย่าง: สมชาย ใจดี
                    </Badge>
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground ml-4" />

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold">ส่งเบอร์โทรศัพท์</h3>
                    <p className="text-sm text-muted-foreground">
                      พิมพ์เบอร์โทรศัพท์ 10 หลัก
                    </p>
                    <Badge variant="outline" className="mt-1">
                      ตัวอย่าง: 081-234-5678
                    </Badge>
                  </div>
                </div>

                <ArrowRight className="h-5 w-5 text-muted-foreground ml-4" />

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-600">ลงทะเบียนสำเร็จ</h3>
                    <p className="text-sm text-muted-foreground">
                      เจ้าหน้าที่จะติดต่อกลับเพื่อนัดหมายภายใน 24 ชั่วโมง
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* โค้ด n8n */}
          {lineCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>โค้ด n8n Webhook</span>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(lineCode)}>
                    <Copy className="h-4 w-4 mr-2" />
                    คัดลอก
                  </Button>
                </CardTitle>
                <CardDescription>
                  โค้ดสำหรับใส่ใน Code Node ของ n8n เพื่อจัดการการลงทะเบียน
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{lineCode}</code>
                </pre>
              </CardContent>
            </Card>
          )}
              {!n8nWebhookUrl && (
      <Alert>
        <AlertDescription>
          <span className="text-red-500 font-bold">
            ระบบยังไม่ได้ตั้งค่า Webhook URL!
          </span>
        </AlertDescription>
      </Alert>
    )}

          {/* คำแนะนำ */}
          <Alert>
            <UserPlus className="h-4 w-4" />
            <AlertDescription>
              <strong>หมายเหตุ:</strong> ระบบนี้เป็นส่วนสำหรับคนไข้ลงทะเบียนเบื้องต้นเท่านั้น 
              เจ้าหน้าที่จะใช้ระบบ Staff Dashboard เพื่อจัดการการจองวัคซีนและการนัดหมาย
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default PatientRegistration;
