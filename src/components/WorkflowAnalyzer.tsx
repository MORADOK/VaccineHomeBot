import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, XCircle, Info, Settings, Zap, MessageSquare, Database } from 'lucide-react';

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters?: any;
  credentials?: any;
}

interface WorkflowConnection {
  [nodeId: string]: {
    main: { node: string; type: string; index: number }[][];
  };
}

interface WorkflowData {
  nodes: WorkflowNode[];
  connections: WorkflowConnection;
}

interface Issue {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  nodeId?: string;
  solution: string;
}

const WorkflowAnalyzer = () => {
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeWorkflow = (data: WorkflowData): Issue[] => {
    const foundIssues: Issue[] = [];
    const nodeIds = new Set(data.nodes.map(node => node.id));
    const connectedNodes = new Set<string>();

    // ตรวจสอบ connections ที่มีปัญหา
    Object.entries(data.connections).forEach(([nodeId, connections]) => {
      if (connections.main) {
        connections.main.forEach((outputConnections, outputIndex) => {
          if (Array.isArray(outputConnections)) {
            outputConnections.forEach(connection => {
              connectedNodes.add(nodeId);
              connectedNodes.add(connection.node);
              
              // ตรวจสอบว่า node ที่เชื่อมต่อมีอยู่จริงไหม
              if (!nodeIds.has(connection.node)) {
                foundIssues.push({
                  type: 'error',
                  title: 'Connection ชี้ไปยัง Node ที่ไม่มีอยู่',
                  description: `Node "${nodeId}" พยายามเชื่อมต่อไปยัง node "${connection.node}" ที่ไม่มีอยู่ใน workflow`,
                  nodeId,
                  solution: 'ตรวจสอบและแก้ไข connection ที่เสียหายหรือลบ node ที่ไม่ใช้แล้ว'
                });
              }
            });
          }
        });
      }
    });

    // ตรวจสอบ isolated nodes
    data.nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && node.type !== 'n8n-nodes-base.webhook') {
        foundIssues.push({
          type: 'warning',
          title: 'Node แยกตัวออกมา (Isolated)',
          description: `Node "${node.name}" (${node.id}) ไม่ได้เชื่อมต่อกับ node อื่นใด`,
          nodeId: node.id,
          solution: 'เชื่อมต่อ node นี้เข้ากับ workflow หรือลบออกหากไม่ต้องการใช้'
        });
      }
    });

    // ตรวจสอบ workflow structure issues
    const webhookNodes = data.nodes.filter(node => node.type === 'n8n-nodes-base.webhook');
    const switchNodes = data.nodes.filter(node => node.type === 'n8n-nodes-base.switch');
    const httpNodes = data.nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest');

    // ตรวจสอบ Switch node ที่ไม่มี fallback
    switchNodes.forEach(switchNode => {
      const connections = data.connections[switchNode.id];
      if (connections && connections.main) {
        const outputCount = connections.main.filter(output => output && output.length > 0).length;
        const totalRules = switchNode.parameters?.conditions?.conditions?.length || 
                          switchNode.parameters?.rules?.rules?.length || 0;
        
        // ตรวจสอบว่ามี fallback path หรือไม่ (output index สุดท้าย)
        const hasFallback = connections.main.length > totalRules && 
                           connections.main[connections.main.length - 1]?.length > 0;
        
        if (!hasFallback && totalRules > 0) {
          foundIssues.push({
            type: 'warning',
            title: 'Switch Node ไม่มี Fallback Path',
            description: `Switch node "${switchNode.name}" มี ${totalRules} เงื่อนไข แต่ไม่มี fallback path สำหรับกรณีที่ไม่ตรงเงื่อนไขใดๆ`,
            nodeId: switchNode.id,
            solution: 'เพิ่ม fallback path โดยเชื่อมต่อ output ท้ายสุดของ Switch node เพื่อจัดการกรณีที่ไม่ตรงเงื่อนไข'
          });
        }
      }
    });

    // ตรวจสอบ HTTP nodes ที่ไม่มี error handling
    httpNodes.forEach(httpNode => {
      const connections = data.connections[httpNode.id];
      const hasErrorHandling = connections?.main && connections.main.length > 1 && 
                              connections.main[1]?.length > 0;
      
      // ตรวจสอบว่าเป็น critical API calls หรือไม่
      const isCriticalAPI = httpNode.parameters?.url?.includes('api.line.me') ||
                           httpNode.parameters?.url?.includes('openai.com') ||
                           httpNode.name?.toLowerCase().includes('line') ||
                           httpNode.name?.toLowerCase().includes('ai');
      
      if (!hasErrorHandling) {
        foundIssues.push({
          type: isCriticalAPI ? 'error' : 'warning',
          title: 'HTTP Request ไม่มี Error Handling',
          description: `HTTP node "${httpNode.name}" ${isCriticalAPI ? '(Critical API)' : ''} ไม่มีการจัดการ error กรณีที่ request ล้มเหลว`,
          nodeId: httpNode.id,
          solution: 'เพิ่ม error output และเชื่อมต่อไปยัง error handling nodes เช่น Set node สำหรับ log หรือ HTTP node สำหรับส่งการแจ้งเตือน'
        });
      }
    });

    // ตรวจสอบปัญหาเฉพาะของ LINE Bot
    const hasWebhook = webhookNodes.length > 0;
    const lineResponseNodes = data.nodes.filter(node => 
      node.name.toLowerCase().includes('line') || 
      (node.type === 'n8n-nodes-base.httpRequest' && 
       node.parameters?.url?.includes('api.line.me'))
    );

    // ตรวจสอบเฉพาะเมื่อมี webhook (เป็น chatbot workflow)
    if (hasWebhook && lineResponseNodes.length === 0) {
      foundIssues.push({
        type: 'error',
        title: 'ไม่พบ LINE Response Node',
        description: 'Chatbot workflow ควรมี node สำหรับตอบกลับข้อความผ่าน LINE API',
        solution: 'เพิ่ม HTTP Request node ที่เรียก https://api.line.me/v2/bot/message/reply พร้อม reply token และข้อความที่ต้องการส่ง'
      });
    }

    // ตรวจสอบ LINE Reply Token
    lineResponseNodes.forEach(lineNode => {
      const hasReplyToken = lineNode.parameters?.bodyParametersJson?.includes('replyToken') ||
                           lineNode.parameters?.body?.includes('replyToken') ||
                           JSON.stringify(lineNode.parameters).includes('replyToken');
      
      if (!hasReplyToken) {
        foundIssues.push({
          type: 'error',
          title: 'LINE Node ไม่มี Reply Token',
          description: `LINE response node "${lineNode.name}" ไม่ได้ใช้ reply token ที่ได้จาก webhook`,
          nodeId: lineNode.id,
          solution: 'ใช้ reply token จาก webhook data ในรูปแบบ {{ $json["events"][0]["replyToken"] }}'
        });
      }
    });

    // ตรวจสอบ AI Agent configuration
    const aiNodes = data.nodes.filter(node => 
      node.type.includes('langchain') || 
      node.type.includes('openai') ||
      node.name.toLowerCase().includes('ai') ||
      node.name.toLowerCase().includes('gpt')
    );
    
    aiNodes.forEach(aiNode => {
      const hasPrompt = aiNode.parameters?.prompt || 
                       aiNode.parameters?.text ||
                       aiNode.parameters?.message;
      
      if (!hasPrompt) {
        foundIssues.push({
          type: 'warning',
          title: 'AI Agent ไม่มี Prompt',
          description: `AI node "${aiNode.name}" ไม่ได้กำหนด prompt หรือ instruction ที่ชัดเจน`,
          nodeId: aiNode.id,
          solution: 'กำหนด prompt ที่ชัดเจน รวมถึง role, context และ instruction สำหรับ AI Agent'
        });
      }

      // ตรวจสอบ API key configuration สำหรับ AI nodes
      const hasApiKey = aiNode.parameters?.apiKey || 
                       aiNode.credentials ||
                       aiNode.parameters?.authentication ||
                       aiNode.parameters?.model;
      
      if (!hasApiKey && (aiNode.type.includes('openai') || aiNode.type.includes('langchain'))) {
        foundIssues.push({
          type: 'error',
          title: 'AI Agent ไม่มี API Key',
          description: `AI node "${aiNode.name}" ไม่ได้กำหนด API key หรือ credentials สำหรับการเชื่อมต่อ AI service`,
          nodeId: aiNode.id,
          solution: 'กำหนด API key ผ่าน credentials หรือ parameters ของ node ให้ตรงกับ AI service ที่ใช้'
        });
      }
    });

    // ตรวจสอบ Google Sheets logging
    const sheetsNodes = data.nodes.filter(node => node.type === 'n8n-nodes-base.googleSheets');
    sheetsNodes.forEach(sheetsNode => {
      if (!sheetsNode.parameters?.documentId) {
        foundIssues.push({
          type: 'error',
          title: 'Google Sheets ไม่ได้กำหนด Document ID',
          description: `Google Sheets node "${sheetsNode.name}" ไม่ได้ระบุ spreadsheet ที่ต้องการใช้`,
          nodeId: sheetsNode.id,
          solution: 'กำหนด Google Sheets document ID และ sheet name ที่ถูกต้อง'
        });
      }
    });

    return foundIssues;
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    try {
      const parsed = JSON.parse(jsonInput);
      setWorkflowData(parsed);
      const foundIssues = analyzeWorkflow(parsed);
      setIssues(foundIssues);
    } catch (error) {
      setIssues([{
        type: 'error',
        title: 'JSON Format ไม่ถูกต้อง',
        description: 'ไม่สามารถ parse JSON ได้ กรุณาตรวจสอบรูปแบบ JSON',
        solution: 'ตรวจสอบ syntax JSON ให้ถูกต้อง เช่น การใช้ comma, brackets และ quotes'
      }]);
    }
    setIsAnalyzing(false);
  };

  const getNodeTypeIcon = (type: string) => {
    if (type.includes('webhook')) return <MessageSquare className="w-4 h-4" />;
    if (type.includes('switch')) return <Settings className="w-4 h-4" />;
    if (type.includes('langchain')) return <Zap className="w-4 h-4" />;
    if (type.includes('httpRequest')) return <MessageSquare className="w-4 h-4" />;
    if (type.includes('googleSheets')) return <Database className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const getNodeTypeColor = (type: string) => {
    if (type.includes('webhook')) return 'bg-node-webhook';
    if (type.includes('switch')) return 'bg-node-switch';
    if (type.includes('langchain')) return 'bg-node-ai';
    if (type.includes('httpRequest')) return 'bg-node-http';
    if (type.includes('googleSheets')) return 'bg-node-function';
    return 'bg-muted';
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-workflow-error" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-workflow-warning" />;
      case 'info': return <Info className="w-4 h-4 text-workflow-info" />;
      default: return <CheckCircle className="w-4 h-4 text-workflow-success" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-workflow-primary to-workflow-info bg-clip-text text-transparent">
          n8n Workflow Analyzer
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          วิเคราะห์และตรวจสอบข้อผิดพลาดใน n8n workflow ของคุณ พร้อมคำแนะนำการแก้ไขแบบละเอียด
        </p>
      </div>

      <Card className="shadow-workflow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            อัพโหลด Workflow JSON
          </CardTitle>
          <CardDescription>
            วางโค้ด JSON ของ n8n workflow ที่ต้องการวิเคราะห์
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="วาง n8n workflow JSON ที่นี่..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <Button 
            onClick={handleAnalyze}
            disabled={!jsonInput.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ Workflow'}
          </Button>
        </CardContent>
      </Card>

      {workflowData && (
        <Tabs defaultValue="issues" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="issues">ปัญหาที่พบ ({issues.length})</TabsTrigger>
            <TabsTrigger value="overview">ภาพรวม เวิร์คโฟลว์</TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="space-y-4">
            {issues.length === 0 ? (
              <Alert className="border-workflow-success">
                <CheckCircle className="w-4 h-4 text-workflow-success" />
                <AlertDescription className="text-workflow-success">
                  ไม่พบปัญหาสำคัญใน workflow นี้ แต่ควรตรวจสอบการทำงานจริงด้วยการทดสอบ
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {issues.map((issue, index) => (
                  <Card key={index} className={`border-l-4 ${
                    issue.type === 'error' ? 'border-l-workflow-error' :
                    issue.type === 'warning' ? 'border-l-workflow-warning' :
                    'border-l-workflow-info'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <CardTitle className="text-lg">{issue.title}</CardTitle>
                          {issue.nodeId && (
                            <Badge variant="outline" className="mt-1">
                              Node: {issue.nodeId.slice(0, 8)}...
                            </Badge>
                          )}
                        </div>
                        <Badge variant={
                          issue.type === 'error' ? 'destructive' :
                          issue.type === 'warning' ? 'secondary' : 'default'
                        }>
                          {issue.type === 'error' ? 'ข้อผิดพลาด' :
                           issue.type === 'warning' ? 'คำเตือน' : 'ข้อมูล'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-muted-foreground">{issue.description}</p>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-workflow-primary">💡 วิธีแก้ไข:</h4>
                        <p className="text-sm bg-muted p-3 rounded-md">{issue.solution}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">จำนวน Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-workflow-primary">
                    {workflowData.nodes.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">การเชื่อมต่อ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-workflow-info">
                    {Object.keys(workflowData.connections).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">ข้อผิดพลาด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-workflow-error">
                    {issues.filter(i => i.type === 'error').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">คำเตือน</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-workflow-warning">
                    {issues.filter(i => i.type === 'warning').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>รายการ Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workflowData.nodes.map((node) => (
                    <div key={node.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`p-2 rounded-md ${getNodeTypeColor(node.type)}`}>
                        {getNodeTypeIcon(node.type)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{node.name}</div>
                        <div className="text-sm text-muted-foreground">{node.type}</div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {node.id.slice(0, 8)}...
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default WorkflowAnalyzer;