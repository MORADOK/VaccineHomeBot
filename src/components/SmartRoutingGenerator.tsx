import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Zap, Copy, CheckCircle, ArrowRight, Bot, Settings, Code, Download, FileDown } from 'lucide-react';

interface SmartRoutingNode {
  id: string;
  name: string;
  type: 'ai-router' | 'response-generator' | 'context-manager';
  code: string;
  description: string;
  replaces: string[];
  workflowJSON?: any;
}

interface SmartRoutingGeneratorProps {
  workflowNodes?: any[];
}

const SmartRoutingGenerator = ({ workflowNodes = [] }: SmartRoutingGeneratorProps) => {
  const [generatedNodes, setGeneratedNodes] = useState<SmartRoutingNode[]>([]);
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSmartRouting = () => {
    // หา Switch nodes ที่สามารถแทนที่ได้
    const switchNodes = workflowNodes.filter(node => 
      node.type === 'n8n-nodes-base.switch'
    );

    const routingNodes: SmartRoutingNode[] = [
      {
        id: 'ai-smart-router',
        name: 'AI Smart Router (Input Processor)',
        type: 'ai-router',
        description: 'เตรียมข้อมูลสำหรับส่งไป OpenAI API',
        replaces: switchNodes.map(node => node.name),
        code: `// AI Smart Router - Input Processor with Validation
const input = $json.body?.events?.[0];
if (!input) {
  throw new Error('Invalid webhook payload: No events found');
}

const userMessage = input.message?.text || input.postbackData?.data || '';
const userId = input.source?.userId;

if (!userId) {
  throw new Error('Invalid webhook payload: No userId found');
}

if (!userMessage.trim()) {
  throw new Error('Empty message received');
}

// AI Prompt สำหรับ Smart Routing
const routingPrompt = \`คุณเป็น Smart Router สำหรับระบบจองวัคซีน วิเคราะห์ข้อความนี้และส่งคืน JSON:

Input: "\${userMessage}"

ส่งคืนในรูปแบบ:
{
  "action": "vaccine_info|book_appointment|cancel_booking|check_status|general_info",
  "vaccine_type": "covid|flu|hepatitis|hpv|other",
  "intent_confidence": 0.8,
  "required_data": ["age", "location", "vaccine_type"],
  "response_type": "text|rich_menu|carousel|confirm"
}

ตัวอย่าง:
- "ขอดูข้อมูลวัคซีนโควิด" → action: "vaccine_info", vaccine_type: "covid"
- "จองวัคซีนไข้หวัดใหญ่" → action: "book_appointment", vaccine_type: "flu"
- "ยกเลิกการจอง" → action: "cancel_booking"
\`;

// เตรียมข้อมูลสำหรับ HTTP Request
$json.openai_request = {
  model: 'gpt-4',
  messages: [{ role: 'user', content: routingPrompt }],
  temperature: 0.1
};

$json.userId = userId;
$json.originalInput = input;
$json.userMessage = userMessage;
$json.timestamp = new Date().toISOString();

return $input.all();`
      },
      {
        id: 'dynamic-response-generator',
        name: 'Dynamic Response Generator',
        type: 'response-generator',
        description: 'สร้าง response แบบ dynamic ตาม AI routing results',
        replaces: ['Static Response Nodes'],
        code: `// Dynamic Response Generator
const { routing, userId } = $json;

// เก็บ Configuration แบบ JSON
const vaccineConfig = {
  "covid": {
    "info": "วัคซีนโควิด-19 ป้องกันการติดเชื้อ รุนแรง ลดการเสียชีวิต",
    "booking_flow": "ask_age_location",
    "quick_replies": ["จองเลย", "ดูข้อมูลเพิ่ม", "สถานที่ให้บริการ"],
    "age_requirement": "6 เดือนขึ้นไป"
  },
  "flu": {
    "info": "วัคซีนไข้หวัดใหญ่ ป้องกันไข้หวัด โดยเฉพาะในกลุ่มเสี่ยง",
    "booking_flow": "ask_age_only", 
    "quick_replies": ["จองวัคซีนไข้หวัด", "ราคา", "ใครควรฉีด"],
    "age_requirement": "6 เดือนขึ้นไป"
  },
  "hepatitis": {
    "info": "วัคซีนไวรัสตับอักเสบบี ป้องกันโรคตับอักเสบ",
    "booking_flow": "ask_age_location",
    "quick_replies": ["จองวัคซีน", "กลุ่มเสี่ยง", "ราคา"],
    "age_requirement": "แรกเกิดขึ้นไป"
  },
  "hpv": {
    "info": "วัคซีน HPV ป้องกันมะเร็งปากมดลูกและโรคอื่นๆ",
    "booking_flow": "ask_age_location",
    "quick_replies": ["จองวัคซีน", "ช่วงอายุที่เหมาะสม", "ราคา"],
    "age_requirement": "9-45 ปี"
  }
};

// สร้าง Response แบบ Dynamic
let response = {};

switch(routing.action) {
  case 'vaccine_info':
    const vaccineData = vaccineConfig[routing.vaccine_type];
    if (vaccineData) {
      response = {
        type: 'flex',
        altText: \`ข้อมูลวัคซีน\${routing.vaccine_type}\`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: \`วัคซีน\${routing.vaccine_type.toUpperCase()}\`,
                weight: 'bold',
                size: 'xl',
                color: '#1DB446'
              },
              {
                type: 'text',
                text: vaccineData.info,
                wrap: true,
                margin: 'md'
              },
              {
                type: 'text',
                text: \`อายุที่เหมาะสม: \${vaccineData.age_requirement}\`,
                size: 'sm',
                color: '#666666',
                margin: 'md'
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: vaccineData.quick_replies.map(text => ({
              type: 'button',
              action: {
                type: 'message',
                label: text,
                text: text
              },
              style: 'primary',
              margin: 'sm'
            }))
          }
        }
      };
    }
    break;

  case 'book_appointment':
    if (routing.intent_confidence > 0.7) {
      const vaccineInfo = vaccineConfig[routing.vaccine_type];
      response = {
        type: 'template',
        altText: 'เลือกวันที่จอง',
        template: {
          type: 'buttons',
          text: \`จองวัคซีน \${routing.vaccine_type}\`,
          actions: [
            { 
              type: 'datetimepicker', 
              label: 'เลือกวันที่', 
              data: \`date_\${routing.vaccine_type}\`,
              mode: 'date'
            },
            { 
              type: 'message', 
              label: 'ดูข้อมูลเพิ่ม', 
              text: \`ข้อมูลวัคซีน\${routing.vaccine_type}\`
            },
            { 
              type: 'message', 
              label: 'ยกเลิก', 
              text: 'ยกเลิก' 
            }
          ]
        }
      };
    } else {
      // ถ้า confidence ต่ำ ให้ clarify
      response = {
        type: 'text',
        text: 'ขออภัย ไม่แน่ใจว่าต้องการจองวัคซีนประเภทไหน กรุณาเลือกจากเมนูด้านล่าง',
        quickReply: {
          items: Object.keys(vaccineConfig).map(vaccine => ({
            type: 'action',
            action: {
              type: 'message',
              label: \`วัคซีน\${vaccine}\`,
              text: \`จองวัคซีน\${vaccine}\`
            }
          }))
        }
      };
    }
    break;

  case 'cancel_booking':
    response = {
      type: 'template',
      altText: 'ยืนยันการยกเลิก',
      template: {
        type: 'confirm',
        text: 'คุณแน่ใจหรือไม่ที่ต้องการยกเลิกการจองวัคซีน?',
        actions: [
          {
            type: 'message',
            label: 'ยืนยันยกเลิก',
            text: 'confirm_cancel'
          },
          {
            type: 'message',
            label: 'ไม่ยกเลิก',
            text: 'keep_booking'
          }
        ]
      }
    };
    break;

  case 'check_status':
    response = {
      type: 'text',
      text: 'กำลังตรวจสอบสถานะการจองของคุณ...',
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: 'ดูการจองทั้งหมด',
              text: 'booking_history'
            }
          }
        ]
      }
    };
    break;

  case 'general_info':
    // สำหรับ general info ใช้ template response แทนการเรียก API ซ้ำ
    response = {
      type: 'text',
      text: \`ขอบคุณที่สอบถาม! 🩹\n\nเรามีข้อมูลวัคซีนดังนี้:\n• วัคซีนโควิด-19\n• วัคซีนไข้หวัดใหญ่\n• วัคซีนไวรัสตับอักเสบบี\n• วัคซีน HPV\n\nกรุณาเลือกประเภทวัคซีนที่ต้องการสอบถามจากเมนูด้านล่าง\`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: 'วัคซีนโควิด',
              text: 'ข้อมูลวัคซีนโควิด'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: 'วัคซีนไข้หวัด',
              text: 'ข้อมูลวัคซีนไข้หวัด'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: 'วัคซีน HPV',
              text: 'ข้อมูลวัคซีน HPV'
            }
          }
        ]
      }
    };
    break;

  default:
    response = {
      type: 'text',
      text: 'ขออภัย ไม่เข้าใจคำสั่ง กรุณาลองใหม่อีกครั้ง'
    };
}

$json.lineResponse = response;
$json.processedBy = 'dynamic-response-generator';

return $input.all();`
      },
      {
        id: 'context-manager',
        name: 'Context Manager',
        type: 'context-manager',
        description: 'จัดการ user context และ session state',
        replaces: ['Multiple Set Nodes'],
        code: `// Context Manager - จัดการ User Session
const staticData = getWorkflowStaticData('global');
const { routing, userId } = $json;

// จัดการ User Context
if (!staticData.userSessions) staticData.userSessions = {};
if (!staticData.userSessions[userId]) {
  staticData.userSessions[userId] = {
    currentFlow: null,
    data: {},
    history: [],
    preferences: {},
    lastActivity: new Date().toISOString()
  };
}

const userSession = staticData.userSessions[userId];

// Update Context based on AI Routing
switch(routing.action) {
  case 'book_appointment':
    userSession.currentFlow = 'booking';
    userSession.data.vaccineType = routing.vaccine_type;
    userSession.data.step = 'select_date';
    userSession.data.confidence = routing.intent_confidence;
    break;
    
  case 'cancel_booking':
    userSession.currentFlow = 'cancellation';
    userSession.data.step = 'confirm_cancel';
    break;
    
  case 'vaccine_info':
    userSession.currentFlow = 'information';
    userSession.data.viewedVaccines = userSession.data.viewedVaccines || [];
    if (!userSession.data.viewedVaccines.includes(routing.vaccine_type)) {
      userSession.data.viewedVaccines.push(routing.vaccine_type);
    }
    break;
    
  case 'check_status':
    userSession.currentFlow = 'status_check';
    break;
}

// เก็บประวัติ (เก็บ 10 รายการล่าสุด)
userSession.history.push({
  input: $json.originalInput,
  routing: routing,
  timestamp: new Date().toISOString(),
  confidence: routing.intent_confidence
});

if (userSession.history.length > 10) {
  userSession.history = userSession.history.slice(-10);
}

// Update last activity
userSession.lastActivity = new Date().toISOString();

// ตรวจสอบและทำความสะอาด old sessions (เก็บ 24 ชั่วโมง)
const now = new Date();
Object.keys(staticData.userSessions).forEach(sessionUserId => {
  const session = staticData.userSessions[sessionUserId];
  const lastActivity = new Date(session.lastActivity);
  const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff > 24) {
    delete staticData.userSessions[sessionUserId];
  }
});

// Set user preferences based on behavior
if (userSession.history.length >= 3) {
  const recentActions = userSession.history.slice(-3).map(h => h.routing.action);
  const mostCommonAction = recentActions.reduce((a, b, _, arr) => 
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  );
  userSession.preferences.preferredAction = mostCommonAction;
}

// Determine next action
let nextAction = 'continue';
if (routing.action === 'book_appointment' && routing.intent_confidence < 0.6) {
  nextAction = 'clarify_vaccine_type';
} else if (routing.action === 'general_info' && routing.intent_confidence < 0.5) {
  nextAction = 'show_menu';
} else if (userSession.currentFlow === 'booking' && userSession.data.step === 'select_date') {
  nextAction = 'handle_date_selection';
}

$json.userSession = userSession;
$json.nextAction = nextAction;
$json.sessionStats = {
  totalUsers: Object.keys(staticData.userSessions).length,
  currentUserHistory: userSession.history.length,
  userPreferences: userSession.preferences
};

return $input.all();`
      }
    ];

    // สร้าง Complete n8n Workflow JSON พร้อม HTTP Request
    const completeWorkflow = {
      name: 'Smart Routing Vaccine Booking Workflow (HTTP Version)',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'vaccine-webhook',
            options: {}
          },
          id: 'webhook-node',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [240, 300],
          webhookId: 'webhook-id'
        },
        {
          parameters: {
            jsCode: routingNodes[0].code
          },
          id: 'input-processor-node', 
          name: 'Input Processor',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [460, 300]
        },
        {
          parameters: {
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            authentication: 'predefinedCredentialType',
            nodeCredentialType: 'openAiApi',
            headers: {
              'Content-Type': 'application/json'
            },
            body: '={{ JSON.stringify($json.openai_request) }}',
            options: {
              timeout: 15000,
              response: {
                response: {
                  neverError: true,
                  responseFormat: 'json'
                }
              },
              redirect: {
                redirect: {
                  followRedirect: false,
                  maxRedirect: 0
                }
              }
            }
          },
          id: 'openai-http-node',
          name: 'OpenAI HTTP Request (with Credentials)',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4,
          position: [680, 300]
        },
        {
            parameters: {
            jsCode: `// AI Response Processor with Robust Error Handling
try {
  const httpResponse = $json;
  let routing = {};
  
  // ตรวจสอบ HTTP status และ response structure
  if (httpResponse.statusCode && httpResponse.statusCode !== 200) {
    console.warn('OpenAI API returned non-200 status:', httpResponse.statusCode);
    throw new Error(\`API returned status: \${httpResponse.statusCode}\`);
  }
  
  // ตรวจสอบ response structure
  if (!httpResponse.choices || !httpResponse.choices[0] || !httpResponse.choices[0].message) {
    throw new Error('Invalid OpenAI API response format');
  }
  
  // Parse AI response with validation
  let routing;
  try {
    routing = JSON.parse(aiResult.choices[0].message.content);
  } catch (parseError) {
    // ถ้า JSON ไม่ถูกต้อง ใช้ fallback
    routing = {
      action: 'general_info',
      vaccine_type: 'covid',
      intent_confidence: 0.3,
      required_data: [],
      response_type: 'text'
    };
  }
  
  // Validate routing object
  if (!routing.action) {
    routing.action = 'general_info';
  }
  if (!routing.intent_confidence || routing.intent_confidence < 0 || routing.intent_confidence > 1) {
    routing.intent_confidence = 0.5;
  }
  
  // Combine with previous data
  $json.routing = routing;
  $json.userId = $('Input Processor').item.json.userId;
  $json.originalInput = $('Input Processor').item.json.originalInput;
  $json.userMessage = $('Input Processor').item.json.userMessage;
  $json.timestamp = $('Input Processor').item.json.timestamp;
  $json.apiSuccess = true;
  
} catch (error) {
  // Error handling - ใช้ fallback routing
  console.error('OpenAI API Error:', error);
  
  $json.routing = {
    action: 'general_info',
    vaccine_type: 'covid',
    intent_confidence: 0.2,
    required_data: [],
    response_type: 'text',
    error: true
  };
  $json.userId = $('Input Processor').item.json.userId;
  $json.originalInput = $('Input Processor').item.json.originalInput;
  $json.userMessage = $('Input Processor').item.json.userMessage;
  $json.timestamp = $('Input Processor').item.json.timestamp;
  $json.apiSuccess = false;
  $json.errorMessage = error.message;
}

return $input.all();`
          },
          id: 'ai-response-processor-node',
          name: 'AI Response Processor',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [900, 300]
        },
        {
          parameters: {
            jsCode: routingNodes[2].code
          },
          id: 'context-manager-node',
          name: 'Context Manager', 
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [1120, 300]
        },
        {
          parameters: {
            jsCode: routingNodes[1].code
          },
          id: 'response-generator-node',
          name: 'Dynamic Response Generator',
          type: 'n8n-nodes-base.code', 
          typeVersion: 2,
          position: [1340, 300]
        },
        {
          parameters: {
            authentication: 'lineNotifyOAuth2Api',
            resource: 'message',
            operation: 'send',
            message: '={{ $json.lineResponse }}'
          },
          id: 'line-response-node',
          name: 'LINE Response',
          type: 'n8n-nodes-base.line',
          typeVersion: 1,
          position: [1560, 300]
        }
      ],
      connections: {
        'Webhook': {
          main: [
            [
              {
                node: 'Input Processor',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Input Processor': {
          main: [
            [
              {
                node: 'OpenAI HTTP Request',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'OpenAI HTTP Request': {
          main: [
            [
              {
                node: 'AI Response Processor',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'AI Response Processor': {
          main: [
            [
              {
                node: 'Context Manager',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Context Manager': {
          main: [
            [
              {
                node: 'Dynamic Response Generator',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Dynamic Response Generator': {
          main: [
            [
              {
                node: 'LINE Response',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false,
      settings: {
        executionOrder: 'v1'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      id: 'smart-routing-workflow-http',
      tags: []
    };

    // เพิ่ม workflow JSON ให้กับแต่ละ node
    routingNodes.forEach(node => {
      node.workflowJSON = completeWorkflow;
    });

    setGeneratedNodes(routingNodes);
  };

  const copyToClipboard = async (code: string, nodeId: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      setCopiedNodeId(nodeId);
      setTimeout(() => setCopiedNodeId(null), 2000);
      
      toast({
        title: "คัดลอกสำเร็จ",
        description: "โค้ดถูกคัดลอกไปยัง clipboard แล้ว",
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกได้ กรุณาลองใช้ปุ่มดาวน์โหลดแทน",
        variant: "destructive",
      });
    }
  };

  const downloadAsFile = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadWorkflowJSON = (workflowJSON: any) => {
    const blob = new Blob([JSON.stringify(workflowJSON, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-routing-workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "ดาวน์โหลดสำเร็จ",
      description: "ไฟล์ workflow JSON ถูกดาวน์โหลดแล้ว สามารถ import เข้า n8n ได้เลย",
    });
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ai-router': return <Bot className="w-4 h-4" />;
      case 'response-generator': return <Zap className="w-4 h-4" />;
      case 'context-manager': return <Settings className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'ai-router': return 'bg-blue-500';
      case 'response-generator': return 'bg-green-500';
      case 'context-manager': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Smart Routing Generator
          </CardTitle>
          <CardDescription>
            สร้างโค้ด AI Smart Routing เพื่อแทนที่ Switch nodes และปรับปรุงประสิทธิภาพ workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflowNodes.length === 0 ? (
            <Alert>
              <AlertDescription>
                กรุณาวิเคราะห์ workflow ก่อนเพื่อดู nodes ที่สามารถแทนที่ด้วย Smart Routing ได้
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    พบ {workflowNodes.filter(n => n.type === 'n8n-nodes-base.switch').length} Switch nodes ที่สามารถแทนที่ได้
                  </p>
                </div>
                <Button onClick={generateSmartRouting} className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  สร้าง Smart Routing
                </Button>
              </div>

              {generatedNodes.length > 0 && (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      สร้าง Smart Routing สำเร็จ! ดาวน์โหลด Workflow JSON เพื่อ import เข้า n8n โดยตรง
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => downloadWorkflowJSON(generatedNodes[0].workflowJSON)}
                      className="flex items-center gap-2"
                      variant="default"
                    >
                      <FileDown className="w-4 h-4" />
                      ดาวน์โหลด Complete Workflow (JSON)
                    </Button>
                    <Button 
                      onClick={() => copyToClipboard(JSON.stringify(generatedNodes[0].workflowJSON, null, 2), 'workflow-json')}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {copiedNodeId === 'workflow-json' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedNodeId === 'workflow-json' ? 'คัดลอกแล้ว' : 'คัดลอก JSON'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {generatedNodes.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {generatedNodes.map((node) => (
              <Card key={node.id} className="border-l-4" style={{ borderLeftColor: getNodeColor(node.type).replace('bg-', '') }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md text-white ${getNodeColor(node.type)}`}>
                      {getNodeIcon(node.type)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{node.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {node.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {node.replaces.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2">แทนที่:</h5>
                      <div className="flex flex-wrap gap-1">
                        {node.replaces.map((replaced, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {replaced}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-sm">Code สำหรับ n8n:</h5>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(node.code, node.id)}
                          className="flex items-center gap-1"
                        >
                          {copiedNodeId === node.id ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedNodeId === node.id ? 'คัดลอกแล้ว' : 'คัดลอก'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadAsFile(node.code, node.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          ดาวน์โหลด
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={node.code}
                      readOnly
                      className="font-mono text-xs h-32 bg-muted"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                วิธีใช้งาน Smart Routing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold">1. เตรียม Environment Variables</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-sm">
                      OPENAI_API_KEY=your_openai_api_key
                    </code>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">2. สร้าง Code Nodes</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• สร้าง Code node ชื่อ "AI Smart Router"</li>
                    <li>• สร้าง Code node ชื่อ "Dynamic Response Generator"</li>
                    <li>• สร้าง Code node ชื่อ "Context Manager"</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">3. เชื่อมต่อ Workflow</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Webhook → AI Smart Router</li>
                    <li>• AI Smart Router → Context Manager</li>
                    <li>• Context Manager → Dynamic Response Generator</li>
                    <li>• Dynamic Response Generator → LINE Response</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">4. ลบ Switch Nodes เก่า</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• ลบ Switch nodes ที่ไม่ใช้แล้ว</li>
                    <li>• ลบ Static response nodes</li>
                    <li>• ทดสอบ workflow ใหม่</li>
                  </ul>
                </div>
              </div>
              
              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>ข้อดีของ Smart Routing:</strong> ลดความซับซ้อน, เพิ่มความยืดหยุ่น, เข้าใจบริบทได้ดีกว่า, ง่ายต่อการ maintain
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SmartRoutingGenerator;