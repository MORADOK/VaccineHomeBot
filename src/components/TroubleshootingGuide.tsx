import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Zap,
  MessageSquare,
  Database,
  Link,
  GitBranch,
  Shield,
  Play,
  Pause
} from 'lucide-react';

interface TroubleshootingStep {
  step: number;
  title: string;
  description: string;
  action: string;
  code?: string;
  warning?: string;
}

interface ProblemSolution {
  id: string;
  title: string;
  type: 'error' | 'warning' | 'info';
  description: string;
  impact: string;
  steps: TroubleshootingStep[];
  prevention: string;
}

const TroubleshootingGuide = () => {
  const [expandedSolutions, setExpandedSolutions] = useState<string[]>([]);

  const toggleSolution = (id: string) => {
    setExpandedSolutions(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const solutions: ProblemSolution[] = [
    {
      id: 'invalid-connections',
      title: 'Connection ชี้ไปยัง Node ที่ไม่มีอยู่',
      type: 'error',
      description: 'Node มีการเชื่อมต่อไปยัง node ที่ถูกลบแล้วหรือไม่มีอยู่',
      impact: 'ทำให้ workflow ไม่สามารถทำงานได้',
      steps: [
        {
          step: 1,
          title: 'ระบุ Node ที่มีปัญหา',
          description: 'ดู Node ID จากข้อความ error เพื่อหา node ที่มี connection เสียหาย',
          action: 'คลิกที่ node ในแผนผัง n8n และดู connections ที่มีเส้นสีแดงหรือขาด'
        },
        {
          step: 2,
          title: 'ลบ Connection ที่เสียหาย',
          description: 'ลบเส้นเชื่อมต่อที่ชี้ไปยัง node ที่ไม่มีอยู่',
          action: 'คลิกที่เส้นเชื่อมต่อและกด Delete หรือคลิกขวาเลือก Delete'
        },
        {
          step: 3,
          title: 'สร้าง Node ใหม่ (ถ้าจำเป็น)',
          description: 'หากต้องการ node ที่ถูกลบ ให้สร้างใหม่',
          action: 'ลาก node ใหม่จาก Node Panel และตั้งค่าตามต้องการ'
        },
        {
          step: 4,
          title: 'เชื่อมต่อใหม่',
          description: 'เชื่อมต่อ node ที่มีปัญหากับ node ปลายทางที่ถูกต้อง',
          action: 'ลากจาก output ของ node ต้นทางไปยัง input ของ node ปลายทาง'
        }
      ],
      prevention: 'ตรวจสอบ dependencies ก่อนลบ node และใช้ Duplicate แทน Delete เมื่อทดลองแก้ไข'
    },
    {
      id: 'isolated-nodes',
      title: 'Node แยกตัวออกมา (Isolated)',
      type: 'warning',
      description: 'Node ไม่ได้เชื่อมต่อกับ workflow หลัก',
      impact: 'Node จะไม่ทำงานเมื่อ workflow รัน',
      steps: [
        {
          step: 1,
          title: 'ระบุ Isolated Nodes',
          description: 'หา nodes ที่ไม่มีเส้นเชื่อมต่อเข้าหรือออก',
          action: 'มองหา nodes ที่อยู่แยกออกมาจาก workflow หลัก'
        },
        {
          step: 2,
          title: 'วิเคราะห์ความจำเป็น',
          description: 'ตัดสินใจว่า node นี้ต้องการใช้งานหรือไม่',
          action: 'อ่าน node name และ type เพื่อเข้าใจหน้าที่'
        },
        {
          step: 3,
          title: 'เชื่อมต่อหรือลบ',
          description: 'เชื่อมต่อเข้า workflow หรือลบออกหากไม่ต้องการ',
          action: 'หากต้องการใช้: เชื่อมต่อจาก trigger หรือ node อื่น\nหากไม่ต้องการ: กด Delete'
        }
      ],
      prevention: 'วางแผน workflow structure ก่อนสร้าง และทดสอบการเชื่อมต่อเป็นระยะ'
    },
    {
      id: 'switch-fallback',
      title: 'Switch Node ไม่มี Fallback Path',
      type: 'warning',
      description: 'Switch node ไม่มี path สำหรับกรณีที่ไม่ตรงเงื่อนไขใดๆ',
      impact: 'ข้อมูลอาจหายหรือ workflow หยุดทำงานเมื่อไม่ตรงเงื่อนไข',
      steps: [
        {
          step: 1,
          title: 'เปิด Switch Node Configuration',
          description: 'ดูจำนวนเงื่อนไขที่ตั้งไว้ใน Switch node',
          action: 'Double-click Switch node และนับจำนวน conditions'
        },
        {
          step: 2,
          title: 'เพิ่ม Output Connection',
          description: 'เพิ่ม output connection สำหรับ fallback case',
          action: 'ลากจาก output ท้ายสุดของ Switch node (หลังจาก condition สุดท้าย)'
        },
        {
          step: 3,
          title: 'สร้าง Fallback Handler',
          description: 'สร้าง node สำหรับจัดการกรณี default',
          action: 'เพิ่ม Set node หรือ HTTP Request node สำหรับ default response',
          code: `// ตัวอย่าง Set node สำหรับ fallback
{
  "message": "ไม่เข้าใจคำสั่ง กรุณาลองใหม่",
  "type": "fallback",
  "timestamp": "{{$now}}"
}`
        },
        {
          step: 4,
          title: 'ทดสอบ Fallback',
          description: 'ทดสอบส่งข้อมูลที่ไม่ตรงเงื่อนไขใดๆ',
          action: 'Execute workflow ด้วยข้อมูลที่ไม่ตรงเงื่อนไขเพื่อทดสอบ fallback path'
        }
      ],
      prevention: 'ออกแบบ Switch conditions ให้ครอบคลุมและเพิ่ม fallback เสมอ'
    },
    {
      id: 'http-error-handling',
      title: 'HTTP Request ไม่มี Error Handling',
      type: 'warning',
      description: 'HTTP nodes ไม่มีการจัดการ error เมื่อ API call ล้มเหลว',
      impact: 'Workflow อาจหยุดทำงานเมื่อ API มีปัญหา',
      steps: [
        {
          step: 1,
          title: 'เปิด HTTP Node Settings',
          description: 'ตรวจสอบการตั้งค่า error handling ใน HTTP Request node',
          action: 'Double-click HTTP node → ไปที่แท็บ Settings → ดู Continue On Fail'
        },
        {
          step: 2,
          title: 'เปิดใช้งาน Continue On Fail',
          description: 'เปิดการตั้งค่าให้ workflow ทำงานต่อเมื่อมี error',
          action: 'เช็ค "Continue On Fail" checkbox ใน Settings',
          warning: 'จะทำให้ workflow ทำงานต่อแม้ HTTP request ล้มเหลว'
        },
        {
          step: 3,
          title: 'เพิ่ม Error Output',
          description: 'เชื่อมต่อ error output ไปยัง error handling nodes',
          action: 'ลากจาก output สีแดง (error) ของ HTTP node ไปยัง error handler'
        },
        {
          step: 4,
          title: 'สร้าง Error Handler',
          description: 'สร้าง nodes สำหรับจัดการ error',
          action: 'เพิ่ม Set node หรือ HTTP node สำหรับ log error หรือส่งการแจ้งเตือน',
          code: `// ตัวอย่าง Error logging
{
  "error_type": "HTTP_REQUEST_FAILED",
  "node_name": "{{$node.name}}",
  "error_message": "{{$json.error.message}}",
  "timestamp": "{{$now}}",
  "workflow_id": "{{$workflow.id}}"
}`
        }
      ],
      prevention: 'เพิ่ม error handling ทุก HTTP request และใช้ retry logic สำหรับ critical APIs'
    },
    {
      id: 'line-bot-config',
      title: 'LINE Bot Configuration ไม่ครบถ้วน',
      type: 'error',
      description: 'ไม่พบ LINE Response node หรือไม่ได้ใช้ reply token',
      impact: 'Bot ไม่สามารถตอบกลับข้อความได้',
      steps: [
        {
          step: 1,
          title: 'เพิ่ม LINE Reply HTTP Node',
          description: 'สร้าง HTTP Request node สำหรับส่งข้อความกลับ',
          action: 'Add Node → HTTP Request → ตั้งชื่อ "LINE Reply"'
        },
        {
          step: 2,
          title: 'ตั้งค่า URL และ Method',
          description: 'กำหนด LINE API endpoint',
          action: 'URL: https://api.line.me/v2/bot/message/reply\nMethod: POST',
          code: `URL: https://api.line.me/v2/bot/message/reply
Method: POST`
        },
        {
          step: 3,
          title: 'เพิ่ม Authorization Header',
          description: 'ใส่ Channel Access Token ใน header',
          action: 'Headers → Add → Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN',
          code: `Headers:
Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN
Content-Type: application/json`
        },
        {
          step: 4,
          title: 'ตั้งค่า Request Body',
          description: 'สร้าง body สำหรับ reply message',
          action: 'Body → JSON → ใส่ reply token และข้อความ',
          code: `{
  "replyToken": "{{ $json['events'][0]['replyToken'] }}",
  "messages": [
    {
      "type": "text",
      "text": "สวัสดีครับ! ขอบคุณที่ติดต่อมา"
    }
  ]
}`
        },
        {
          step: 5,
          title: 'เชื่อมต่อจาก Webhook',
          description: 'เชื่อมต่อ LINE Reply node กับ Webhook node',
          action: 'ลากจาก Webhook output ไปยัง LINE Reply input'
        }
      ],
      prevention: 'ใช้ template workflow สำหรับ LINE Bot และทดสอบกับ LINE Messaging API Simulator'
    },
    {
      id: 'ai-agent-config',
      title: 'AI Agent Configuration ไม่สมบูรณ์',
      type: 'warning',
      description: 'AI nodes ไม่มี prompt หรือ API key',
      impact: 'AI ไม่สามารถประมวลผลหรือให้คำตอบที่ดีได้',
      steps: [
        {
          step: 1,
          title: 'ตรวจสอบ API Credentials',
          description: 'ตั้งค่า API key สำหรับ AI service',
          action: 'Double-click AI node → Credentials → Add new credential'
        },
        {
          step: 2,
          title: 'เพิ่ม OpenAI API Key',
          description: 'ใส่ API key จาก OpenAI dashboard',
          action: 'Name: OpenAI_API\nAPI Key: sk-...your-api-key...',
          warning: 'เก็บ API key ปลอดภัยและไม่แชร์ให้ผู้อื่น'
        },
        {
          step: 3,
          title: 'สร้าง System Prompt',
          description: 'กำหนด role และ instruction สำหรับ AI',
          action: 'ใส่ prompt ในช่อง System Message หรือ Text',
          code: `คุณเป็น AI Assistant ที่ช่วยตอบคำถามเกี่ยวกับ n8n workflow
- ตอบภาษาไทยอย่างสุภาพ
- ให้คำแนะนำที่ชัดเจนและเป็นขั้นตอน
- หากไม่เข้าใจ ให้ถามเพิ่มเติม
- ความยาวคำตอบไม่เกิน 200 คำ`
        },
        {
          step: 4,
          title: 'ใช้ Dynamic Input',
          description: 'เชื่อม user input เข้ากับ AI prompt',
          action: 'ใช้ expression: {{ $json["events"][0]["message"]["text"] }}',
          code: `Prompt: {{ $json["system_prompt"] }}

User Question: {{ $json["events"][0]["message"]["text"] }}

Please provide a helpful response in Thai.`
        }
      ],
      prevention: 'ทดสอบ AI responses และปรับ prompt ให้เหมาะสมกับ use case'
    }
  ];

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <CheckCircle className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
          คู่มือแก้ไขปัญหา n8n Workflow
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          แนวทางแก้ไขปัญหาแบบละเอียดทีละขั้นตอน สำหรับปัญหาที่พบบ่อยใน n8n workflow
        </p>
      </div>

      <Tabs defaultValue="solutions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="solutions">วิธีแก้ไขปัญหา</TabsTrigger>
          <TabsTrigger value="checklist">Checklist การตรวจสอบ</TabsTrigger>
        </TabsList>

        <TabsContent value="solutions" className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>คำแนะนำ:</strong> แก้ไขปัญหาตามลำดับความสำคัญ - Error → Warning → Info
              และสำรองข้อมูล workflow ก่อนแก้ไขทุกครั้ง
            </AlertDescription>
          </Alert>

          {solutions.map((solution) => (
            <Card key={solution.id} className={`border-l-4 ${
              solution.type === 'error' ? 'border-l-red-500' :
              solution.type === 'warning' ? 'border-l-yellow-500' :
              'border-l-blue-500'
            }`}>
              <Collapsible 
                open={expandedSolutions.includes(solution.id)}
                onOpenChange={() => toggleSolution(solution.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-md ${getPriorityColor(solution.type)}`}>
                          {getPriorityIcon(solution.type)}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{solution.title}</CardTitle>
                          <CardDescription className="mt-1">{solution.description}</CardDescription>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={solution.type === 'error' ? 'destructive' : 'secondary'}>
                              {solution.type === 'error' ? 'Critical' : 
                               solution.type === 'warning' ? 'Warning' : 'Info'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">• {solution.impact}</span>
                          </div>
                        </div>
                      </div>
                      {expandedSolutions.includes(solution.id) ? 
                        <ChevronDown className="w-5 h-5" /> : 
                        <ChevronRight className="w-5 h-5" />
                      }
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-4">
                      {solution.steps.map((step) => (
                        <div key={step.step} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {step.step}
                            </div>
                            <h4 className="font-semibold">{step.title}</h4>
                          </div>
                          <p className="text-muted-foreground">{step.description}</p>
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium">🎯 การดำเนินการ:</p>
                            <p className="text-sm mt-1 whitespace-pre-line">{step.action}</p>
                          </div>
                          {step.code && (
                            <div className="bg-gray-900 text-gray-100 p-3 rounded-md">
                              <p className="text-xs text-gray-400 mb-2">Code/Configuration:</p>
                              <pre className="text-sm whitespace-pre-wrap">{step.code}</pre>
                            </div>
                          )}
                          {step.warning && (
                            <Alert className="border-yellow-200 bg-yellow-50">
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <AlertDescription className="text-yellow-700">
                                <strong>ข้อควรระวัง:</strong> {step.warning}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div className="bg-green-50 border border-green-200 p-4 rounded-md">
                      <h4 className="font-semibold text-green-800 mb-2">🛡️ การป้องกันในอนาคต:</h4>
                      <p className="text-green-700 text-sm">{solution.prevention}</p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Checklist การตรวจสอบ Workflow
              </CardTitle>
              <CardDescription>
                รายการตรวจสอบก่อนและหลังแก้ไข workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Pause className="w-4 h-4" /> ก่อนแก้ไข
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>สำรองข้อมูล workflow (Export เป็น JSON)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>บันทึกสถานะการทำงานปัจจุบัน</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ระบุปัญหาที่พบและผลกระทบ</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>วางแผนการแก้ไขทีละปัญหา</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> ระหว่างแก้ไข
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>แก้ไขทีละปัญหาตามลำดับความสำคัญ</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ทดสอบหลังแก้ไขแต่ละปัญหา</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ตรวจสอบ connections และ configurations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ใช้ n8n Execute Mode เพื่อทดสอบ</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4" /> หลังแก้ไข
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>รัน workflow analyzer อีกครั้ง</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ทดสอบ end-to-end scenario</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ทดสอบกรณี edge cases</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>ตรวจสอบ logs และ error handling</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" />
                    <span>บันทึกการแก้ไขและผลลัพธ์</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TroubleshootingGuide;