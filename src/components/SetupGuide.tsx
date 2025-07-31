import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  MessageSquare, 
  Database, 
  Calendar, 
  Bell, 
  CheckCircle, 
  ArrowRight, 
  Download,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Smartphone,
  Globe,
  Shield,
  Users,
  Syringe
} from 'lucide-react';

const SetupGuide = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showApiKey, setShowApiKey] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`คัดลอก ${label} แล้ว!`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            🏥 คู่มือการติดตั้งระบบลงทะเบียนวัคซีน
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            ระบบจัดการการลงทะเบียนวัคซีนผ่าน LINE Bot พร้อมระบบนัดหมายอัตโนมัติ
            สำหรับโรงพยาบาล คลินิก และสถานพยาบาล
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
            <TabsTrigger value="requirements">ความต้องการ</TabsTrigger>
            <TabsTrigger value="line-setup">ตั้งค่า LINE</TabsTrigger>
            <TabsTrigger value="n8n-setup">ตั้งค่า n8n</TabsTrigger>
            <TabsTrigger value="calendar">Google Calendar</TabsTrigger>
            <TabsTrigger value="usage">การใช้งาน</TabsTrigger>
          </TabsList>

          {/* ภาพรวมระบบ */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Syringe className="h-5 w-5" />
                    ภาพรวมระบบ
                  </CardTitle>
                  <CardDescription>
                    ระบบลงทะเบียนวัคซีนแบบครบวงจร ประกอบด้วย 3 ส่วนหลัก
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Smartphone className="h-8 w-8 text-primary" />
                        <h3 className="font-semibold">LINE Bot</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        คนไข้ลงทะเบียนชื่อ-นามสกุลผ่าน LINE Bot พร้อม Rich Menu
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="h-8 w-8 text-primary" />
                        <h3 className="font-semibold">Staff Dashboard</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        เจ้าหน้าที่เลือกวัคซีน สร้างนัดหมาย และส่งการแจ้งเตือน
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="h-8 w-8 text-primary" />
                        <h3 className="font-semibold">Auto Scheduling</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ระบบนัดหมายอัตโนมัติใน Google Calendar พร้อมแจ้งเตือน
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🔄 ขั้นตอนการทำงาน</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">1</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>คนไข้ลงทะเบียนผ่าน LINE Bot</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">2</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>เจ้าหน้าที่เลือกวัคซีนและสร้างนัดหมาย</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">3</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>ระบบส่งการแจ้งเตือนไป LINE และสร้างนัดใน Google Calendar</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">4</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span>แจ้งเตือนอัตโนมัติก่อนวันนัด</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ความต้องการระบบ */}
          <TabsContent value="requirements" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    ความต้องการของระบบ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        บัญชีและเครื่องมือที่จำเป็น
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">LINE Developers Account</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">n8n Self-hosted หรือ Cloud</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Google Account</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Google Sheets</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Google Calendar</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        ข้อกำหนดทางเทคนิค
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Public URL สำหรับ Webhook</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">SSL Certificate (HTTPS)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Internet Connection</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>หมายเหตุ:</strong> หากใช้ n8n แบบ Self-hosted จำเป็นต้องมี Server ที่สามารถรัน Docker 
                  หรือ Node.js และมี Public URL สำหรับรับ Webhook จาก LINE
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* การตั้งค่า LINE Bot */}
          <TabsContent value="line-setup" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    การตั้งค่า LINE Bot
                  </CardTitle>
                  <CardDescription>
                    ขั้นตอนการสร้างและตั้งค่า LINE Bot สำหรับการลงทะเบียนวัคซีน
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">1. สร้าง LINE Bot</h3>
                    <div className="pl-4 space-y-2">
                      <p className="text-sm">• ไปที่ <a href="https://developers.line.biz" target="_blank" className="text-primary underline">LINE Developers Console</a></p>
                      <p className="text-sm">• สร้าง Provider ใหม่ (ถ้ายังไม่มี)</p>
                      <p className="text-sm">• สร้าง Channel ประเภท "Messaging API"</p>
                      <p className="text-sm">• ตั้งชื่อ Bot เช่น "ระบบลงทะเบียนวัคซีน"</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">2. ตั้งค่า Webhook</h3>
                    <div className="pl-4 space-y-3">
                      <p className="text-sm">• ในหน้า Channel Settings</p>
                      <p className="text-sm">• เปิดใช้งาน "Use webhook"</p>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-2">Webhook URL:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-background px-2 py-1 rounded border">
                            https://your-n8n-domain.com/webhook/line-vaccine
                          </code>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToClipboard('https://your-n8n-domain.com/webhook/line-vaccine', 'Webhook URL')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">3. ข้อมูลสำคัญที่ต้องเก็บ</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-2">Channel Access Token:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-background px-2 py-1 rounded border flex-1">
                            {showApiKey ? 'YOUR_CHANNEL_ACCESS_TOKEN_HERE' : '••••••••••••••••••••'}
                          </code>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-2">Channel Secret:</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-background px-2 py-1 rounded border flex-1">
                            {showApiKey ? 'YOUR_CHANNEL_SECRET_HERE' : '••••••••••••••••••••'}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">4. สร้าง Rich Menu</h3>
                    <div className="pl-4 space-y-2">
                      <p className="text-sm">• ใช้ LINE Official Account Manager</p>
                      <p className="text-sm">• สร้างเมนูขนาด 2500x843 pixels</p>
                      <p className="text-sm">• แบ่งเป็น 3 พื้นที่:</p>
                      <div className="ml-4 space-y-1">
                        <p className="text-xs">- ลงทะเบียนคนไข้</p>
                        <p className="text-xs">- จองวัคซีน</p>
                        <p className="text-xs">- ตรวจสอบการจอง</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* การตั้งค่า n8n */}
          <TabsContent value="n8n-setup" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    การตั้งค่า n8n Workflow
                  </CardTitle>
                  <CardDescription>
                    ขั้นตอนการสร้างและกำหนดค่า n8n workflow สำหรับระบบ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">1. ติดตั้ง n8n</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm font-medium mb-2">Docker (แนะนำ):</p>
                      <code className="text-sm block bg-background p-2 rounded border">
                        docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
                      </code>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-md mt-3">
                      <p className="text-sm font-medium mb-2">NPM:</p>
                      <code className="text-sm block bg-background p-2 rounded border">
                        npm install n8n -g<br/>
                        n8n start
                      </code>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">2. กำหนด Environment Variables</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-md">
                        <code className="text-sm block">
                          LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token<br/>
                          LINE_CHANNEL_SECRET=your_line_channel_secret<br/>
                          GOOGLE_ACCESS_TOKEN=your_google_access_token<br/>
                          GOOGLE_SPREADSHEET_ID=your_spreadsheet_id<br/>
                          GOOGLE_CALENDAR_ID=your_calendar_id
                        </code>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">3. สร้าง Workflow Nodes</h3>
                    <div className="grid gap-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Webhook Trigger</h4>
                        <p className="text-sm text-muted-foreground mb-2">รับข้อมูลจาก LINE Bot</p>
                        <div className="text-xs bg-background p-2 rounded border">
                          Method: POST<br/>
                          Path: /webhook/line-vaccine
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Code Node - Vaccine Mapping</h4>
                        <p className="text-sm text-muted-foreground mb-2">ใช้โค้ดที่คุณให้มา</p>
                        <Button size="sm" variant="outline" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          ดาวน์โหลดโค้ด Vaccine Mapping
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">Google Sheets</h4>
                        <p className="text-sm text-muted-foreground mb-2">บันทึกข้อมูลคนไข้และนัดหมาย</p>
                        <div className="text-xs bg-background p-2 rounded border">
                          Operation: Append<br/>
                          Sheet: Patients, Appointments
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">LINE Message Reply</h4>
                        <p className="text-sm text-muted-foreground mb-2">ส่งข้อความตอบกลับ</p>
                        <div className="text-xs bg-background p-2 rounded border">
                          Type: Reply Message<br/>
                          Format: Text, Flex Message
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Google Calendar */}
          <TabsContent value="calendar" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    การตั้งค่า Google Calendar
                  </CardTitle>
                  <CardDescription>
                    เชื่อมต่อระบบกับ Google Calendar สำหรับการนัดหมายอัตโนมัติ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">1. สร้าง Google Cloud Project</h3>
                    <div className="pl-4 space-y-2">
                      <p className="text-sm">• ไปที่ <a href="https://console.cloud.google.com" target="_blank" className="text-primary underline">Google Cloud Console</a></p>
                      <p className="text-sm">• สร้าง Project ใหม่</p>
                      <p className="text-sm">• เปิดใช้งาน Google Calendar API</p>
                      <p className="text-sm">• สร้าง Service Account</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">2. สร้าง Calendar สำหรับวัคซีน</h3>
                    <div className="pl-4 space-y-2">
                      <p className="text-sm">• เข้า Google Calendar</p>
                      <p className="text-sm">• สร้าง Calendar ใหม่ชื่อ "วัคซีนคลินิก"</p>
                      <p className="text-sm">• แชร์ Calendar ให้ Service Account</p>
                      <p className="text-sm">• คัดลอก Calendar ID</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">3. ตั้งค่าการแจ้งเตือน</h3>
                    <div className="space-y-3">
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-sm font-medium mb-2">การแจ้งเตือนอัตโนมัติ:</p>
                        <div className="text-sm space-y-1">
                          <p>• 1 วันก่อนนัด - ส่งข้อความไป LINE</p>
                          <p>• 1 ชั่วโมงก่อนนัด - แจ้งเตือนใน Calendar</p>
                          <p>• 30 นาทีก่อนนัด - Email reminder</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* การใช้งาน */}
          <TabsContent value="usage" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    วิธีการใช้งานระบบ
                  </CardTitle>
                  <CardDescription>
                    คู่มือการใช้งานสำหรับเจ้าหน้าที่และคนไข้
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">สำหรับคนไข้ (ผ่าน LINE Bot)</h3>
                    <div className="pl-4 space-y-2">
                      <p className="text-sm">1. เพิ่มเพื่อน LINE Bot ของคลินิก</p>
                      <p className="text-sm">2. กดเมนู "ลงทะเบียนคนไข้"</p>
                      <p className="text-sm">3. กรอกข้อมูล ชื่อ-นามสกุล และเบอร์โทร</p>
                      <p className="text-sm">4. รอเจ้าหน้าที่ติดต่อกลับเพื่อนัดหมาย</p>
                      <p className="text-sm">5. ได้รับการแจ้งเตือนการนัดผ่าน LINE</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">สำหรับเจ้าหน้าที่</h3>
                    <div className="pl-4 space-y-2">
                      <p className="text-sm">1. เข้าใช้งาน Staff Dashboard</p>
                      <p className="text-sm">2. ดูรายชื่อคนไข้ที่ลงทะเบียน</p>
                      <p className="text-sm">3. เลือกคนไข้และกดปุ่ม "จองวัคซีน"</p>
                      <p className="text-sm">4. เลือกประเภทวัคซีนและวันเวลานัด</p>
                      <p className="text-sm">5. ระบบจะส่งการแจ้งเตือนอัตโนมัติ</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-3">การจัดการวัคซีนหลายโดส</h3>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm mb-2">ระบบรองรับวัคซีนที่ต้องฉีดหลายโดส:</p>
                      <div className="text-sm space-y-1 ml-4">
                        <p>• วัคซีนไวรัสตับอักเสบบี: 3 โดส</p>
                        <p>• วัคซีนป้องกันมะเร็งปากมดลูก: 3 โดส</p>
                        <p>• วัคซีนพิษสุนัขบ้า: 5 เข็ม</p>
                        <p>• ระบบจะคำนวณวันนัดครั้งถัดไปอัตโนมัติ</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  <strong>เคล็ดลับ:</strong> ใช้ฟีเจอร์ค้นหาใน Staff Dashboard เพื่อหาคนไข้ได้เร็วขึ้น 
                  สามารถค้นหาด้วยชื่อหรือเบอร์โทรศัพท์
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SetupGuide;