import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Server, Shield, Settings, Code2, Database, Key, Download } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const RenderSetupGuide = () => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, itemName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      toast({
        title: "คัดลอกแล้ว!",
        description: `คัดลอก ${itemName} เรียบร้อย`,
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถคัดลอกได้",
        variant: "destructive",
      });
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "ดาวน์โหลดแล้ว!",
      description: `ดาวน์โหลด ${filename} เรียบร้อย`,
    });
  };

  const dockerFile = `# Dockerfile สำหรับ n8n บน Render
FROM n8nio/n8n:latest

# ติดตั้ง dependencies เพิ่มเติม
USER root

# ติดตั้ง dependencies ที่จำเป็น
RUN apk add --no-cache \\
    tzdata \\
    curl \\
    bash

# ตั้งค่า timezone เป็นไทย
ENV TZ=Asia/Bangkok
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# กลับไปใช้ user node
USER node

# ตั้งค่า working directory
WORKDIR /home/node

# สร้าง .n8n directory
RUN mkdir -p /home/node/.n8n

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\
  CMD curl -f http://localhost:5678/healthz || exit 1

# เปิด port
EXPOSE 5678

# Start command
CMD ["n8n", "start"]`;

  const renderYaml = `# render.yaml - การตั้งค่า Render Service
services:
  - type: web
    name: n8n-vaccine-workflow
    env: docker
    dockerfilePath: ./Dockerfile
    plan: starter # หรือ standard, pro ตามความต้องการ
    region: singapore # เลือก region ที่ใกล้ที่สุด
    branch: main
    buildCommand: ""
    startCommand: "n8n start"
    
    # การตั้งค่า Environment Variables
    envVars:
      - key: NODE_ENV
        value: production
      
      - key: N8N_HOST
        value: 0.0.0.0
      
      - key: N8N_PORT
        value: 5678
      
      - key: N8N_PROTOCOL
        value: https
      
      - key: N8N_EDITOR_BASE_URL
        fromService:
          type: web
          name: n8n-vaccine-workflow
          property: host
      
      - key: WEBHOOK_URL
        fromService:
          type: web
          name: n8n-vaccine-workflow
          property: host
      
      - key: N8N_ENCRYPTION_KEY
        generateValue: true # Render จะสร้างค่าสุ่มให้
      
      - key: DB_TYPE
        value: postgresdb
      
      - key: DB_POSTGRESDB_HOST
        fromDatabase:
          name: n8n-postgres
          property: host
      
      - key: DB_POSTGRESDB_PORT
        fromDatabase:
          name: n8n-postgres
          property: port
      
      - key: DB_POSTGRESDB_DATABASE
        fromDatabase:
          name: n8n-postgres
          property: database
      
      - key: DB_POSTGRESDB_USER
        fromDatabase:
          name: n8n-postgres
          property: user
      
      - key: DB_POSTGRESDB_PASSWORD
        fromDatabase:
          name: n8n-postgres
          property: password
      
      # LINE Bot Credentials (ตั้งค่าใน Render Dashboard)
      - key: LINE_CHANNEL_ACCESS_TOKEN
        sync: false # ป้อนเองใน Dashboard
      
      - key: LINE_CHANNEL_SECRET
        sync: false
      
      # Google API Credentials
      - key: GOOGLE_ACCESS_TOKEN
        sync: false
      
      - key: GOOGLE_REFRESH_TOKEN
        sync: false
      
      - key: GOOGLE_CLIENT_ID
        sync: false
      
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      
      - key: GOOGLE_SPREADSHEET_ID
        sync: false
      
      # OpenAI API Key (สำหรับ AI Router)
      - key: OPENAI_API_KEY
        sync: false

databases:
  - name: n8n-postgres
    databaseName: n8n_db
    user: n8n_user
    plan: starter # หรือตามความต้องการ
    region: singapore`;

  const envExample = `# .env.example - ตัวอย่างการตั้งค่า Environment Variables

# ===========================================
# 🔧 N8N Core Configuration
# ===========================================
NODE_ENV=production
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://your-app-name.onrender.com
WEBHOOK_URL=https://your-app-name.onrender.com
N8N_ENCRYPTION_KEY=your-super-secret-encryption-key-32-chars

# ===========================================
# 🗄️ Database Configuration (PostgreSQL)
# ===========================================
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=your-postgres-host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n_db
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=your-secure-password

# ===========================================
# 📱 LINE Bot Credentials
# ===========================================
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret

# ===========================================
# 📊 Google API Credentials
# ===========================================
GOOGLE_ACCESS_TOKEN=your-google-access-token
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_SPREADSHEET_ID=your-google-spreadsheet-id

# ===========================================
# 🤖 OpenAI API (สำหรับ AI Smart Router)
# ===========================================
OPENAI_API_KEY=sk-your-openai-api-key

# ===========================================
# 🔒 Security & Authentication
# ===========================================
N8N_USER_MANAGEMENT_DISABLED=true
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-admin-password

# ===========================================
# 📧 Email Configuration (Optional)
# ===========================================
N8N_EMAIL_MODE=smtp
N8N_SMTP_HOST=smtp.gmail.com
N8N_SMTP_PORT=587
N8N_SMTP_USER=your-email@gmail.com
N8N_SMTP_PASS=your-app-password
N8N_SMTP_SENDER=your-email@gmail.com`;

  const packageJson = `{
  "name": "n8n-vaccine-workflow",
  "version": "1.0.0",
  "description": "N8N Vaccine Workflow System on Render",
  "main": "index.js",
  "scripts": {
    "start": "n8n start",
    "dev": "n8n start --tunnel",
    "build": "echo 'Build completed'",
    "postinstall": "echo 'Dependencies installed'"
  },
  "engines": {
    "node": ">=18.10.0",
    "npm": ">=9.0.0"
  },
  "dependencies": {
    "n8n": "latest"
  },
  "devDependencies": {},
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/n8n-vaccine-workflow.git"
  },
  "keywords": [
    "n8n",
    "workflow",
    "automation",
    "vaccine",
    "line-bot",
    "render",
    "healthcare"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/yourusername/n8n-vaccine-workflow/issues"
  },
  "homepage": "https://github.com/yourusername/n8n-vaccine-workflow#readme"
}`;

  const setupSteps = [
    {
      step: 1,
      title: "สร้าง Repository ใน GitHub",
      description: "สร้าง repository ใหม่และเพิ่มไฟล์ที่จำเป็น",
      details: [
        "สร้าง GitHub repository ใหม่",
        "เพิ่ม Dockerfile, render.yaml, package.json",
        "Commit และ push ไฟล์ทั้งหมด"
      ]
    },
    {
      step: 2,
      title: "ตั้งค่า Render Service",
      description: "สร้าง Web Service ใน Render",
      details: [
        "เข้า Render Dashboard → New → Web Service",
        "เชื่อมต่อ GitHub repository",
        "เลือก Docker environment",
        "ตั้งชื่อ service (เช่น n8n-vaccine-workflow)"
      ]
    },
    {
      step: 3,
      title: "สร้าง PostgreSQL Database",
      description: "สร้างฐานข้อมูลสำหรับ n8n",
      details: [
        "ใน Render Dashboard → New → PostgreSQL",
        "ตั้งชื่อ database: n8n-postgres",
        "เลือก plan ที่เหมาะสม (Starter แนะนำ)",
        "บันทึก connection details"
      ]
    },
    {
      step: 4,
      title: "ตั้งค่า Environment Variables",
      description: "เพิ่ม environment variables ที่จำเป็น",
      details: [
        "ใน Web Service Settings → Environment",
        "เพิ่ม variables ตามตัวอย่าง .env",
        "ระวังอย่าให้มี sensitive data ใน public repo",
        "ใช้ Render's secret management"
      ]
    },
    {
      step: 5,
      title: "Deploy และทดสอบ",
      description: "Deploy service และทดสอบการทำงาน",
      details: [
        "กด Deploy ใน Render Dashboard",
        "รอจนกว่า deployment จะเสร็จ",
        "เข้าถึง n8n ผ่าน URL ที่ Render สร้างให้",
        "ทดสอบ webhook และ LINE Bot integration"
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🚀 คู่มือติดตั้ง N8N บน Render
        </h1>
        <p className="text-muted-foreground">
          Setup N8N Vaccine Workflow บน Render พร้อม Environment Variables ที่ปลอดภัย
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="files">ไฟล์ที่ต้องการ</TabsTrigger>
          <TabsTrigger value="steps">ขั้นตอนการตั้งค่า</TabsTrigger>
          <TabsTrigger value="env">Environment Variables</TabsTrigger>
          <TabsTrigger value="security">ความปลอดภัย</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              <strong>💾 ดาวน์โหลดไฟล์:</strong> ในแต่ละ tab สามารถคลิกปุ่ม Download เพื่อดาวน์โหลดไฟล์ได้ทันที 
              หรือคลิก Copy เพื่อคัดลอกเนื้อหา
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <Server className="h-12 w-12 mx-auto text-blue-500 mb-2" />
                <CardTitle>Render Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✅ Free tier available</li>
                  <li>✅ Auto-scaling</li>
                  <li>✅ SSL certificates</li>
                  <li>✅ PostgreSQL support</li>
                  <li>✅ Environment variables</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <CardTitle>ความปลอดภัย</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>🔒 Environment variables</li>
                  <li>🔐 Secret management</li>
                  <li>🛡️ HTTPS encryption</li>
                  <li>🔑 Authentication</li>
                  <li>📱 API key protection</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <Database className="h-12 w-12 mx-auto text-purple-500 mb-2" />
                <CardTitle>ฟีเจอร์</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>💉 Vaccine workflow</li>
                  <li>📱 LINE Bot integration</li>
                  <li>📊 Google Sheets sync</li>
                  <li>📅 Calendar scheduling</li>
                  <li>🤖 AI smart routing</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>ข้อดีของ Render:</strong> ไม่มีข้อจำกัดเรื่อง $node.context().get() เหมือน n8n Cloud 
              และสามารถใช้ Environment Variables ได้อย่างปลอดภัย
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Dockerfile
                </CardTitle>
                <CardDescription>ไฟล์สำหรับ build Docker image</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{dockerFile}</code>
                  </pre>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(dockerFile, "Dockerfile")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(dockerFile, "Dockerfile")}
                    >
                      {copiedItem === "Dockerfile" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  render.yaml
                </CardTitle>
                <CardDescription>การตั้งค่า Render service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                    <code>{renderYaml}</code>
                  </pre>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(renderYaml, "render.yaml")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(renderYaml, "render.yaml")}
                    >
                      {copiedItem === "render.yaml" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  package.json
                </CardTitle>
                <CardDescription>Node.js dependencies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{packageJson}</code>
                  </pre>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(packageJson, "package.json")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(packageJson, "package.json")}
                    >
                      {copiedItem === "package.json" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  .env.example
                </CardTitle>
                <CardDescription>ตัวอย่าง Environment Variables</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm max-h-96">
                    <code>{envExample}</code>
                  </pre>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(envExample, ".env.example")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(envExample, ".env.example")}
                    >
                      {copiedItem === ".env.example" ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="steps" className="space-y-6">
          <div className="space-y-6">
            {setupSteps.map((step, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {step.step}
                    </Badge>
                    <CardTitle>{step.title}</CardTitle>
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>สำคัญ:</strong> อย่าใส่ API keys หรือ secrets ใน repository! 
              ใช้ Environment Variables ใน Render Dashboard เท่านั้น
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="env" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">✅ ปลอดภัย - ตั้งใน Render Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold">LINE_CHANNEL_ACCESS_TOKEN</p>
                  <p className="text-sm text-muted-foreground">Token สำหรับ LINE Bot API</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold">GOOGLE_ACCESS_TOKEN</p>
                  <p className="text-sm text-muted-foreground">Token สำหรับ Google Sheets API</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold">OPENAI_API_KEY</p>
                  <p className="text-sm text-muted-foreground">API Key สำหรับ AI Smart Router</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold">N8N_ENCRYPTION_KEY</p>
                  <p className="text-sm text-muted-foreground">Encryption key สำหรับ n8n</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">ℹ️ ข้อมูลทั่วไป - ใส่ใน render.yaml ได้</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold">NODE_ENV</p>
                  <p className="text-sm text-muted-foreground">production</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold">N8N_HOST</p>
                  <p className="text-sm text-muted-foreground">0.0.0.0</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold">N8N_PORT</p>
                  <p className="text-sm text-muted-foreground">5678</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold">DB_TYPE</p>
                  <p className="text-sm text-muted-foreground">postgresdb</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>🔧 วิธีการตั้งค่า Environment Variables ใน Render</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">1. เข้า Render Dashboard</h4>
                <p className="text-sm text-muted-foreground ml-4">
                  → เลือก Web Service ของคุณ → Settings → Environment
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-semibold">2. เพิ่ม Environment Variable</h4>
                <ul className="ml-4 space-y-2 text-sm text-muted-foreground">
                  <li>• กด "Add Environment Variable"</li>
                  <li>• ใส่ Key (เช่น LINE_CHANNEL_ACCESS_TOKEN)</li>
                  <li>• ใส่ Value (API key ที่ได้จาก LINE)</li>
                  <li>• กด "Save Changes"</li>
                </ul>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-semibold">3. Deploy ใหม่</h4>
                <p className="text-sm text-muted-foreground ml-4">
                  Render จะ redeploy service อัตโนมัติเมื่อมีการเปลี่ยนแปลง Environment Variables
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  ✅ แนวทางที่ปลอดภัย
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="font-medium">Environment Variables</p>
                  <p className="text-sm text-muted-foreground">
                    ใช้ Render's Environment Variables สำหรับ sensitive data
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">Secret Management</p>
                  <p className="text-sm text-muted-foreground">
                    Render เข้ารหัส environment variables อัตโนมัติ
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">HTTPS Only</p>
                  <p className="text-sm text-muted-foreground">
                    การสื่อสารทั้งหมดผ่าน HTTPS เท่านั้น
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">Database Encryption</p>
                  <p className="text-sm text-muted-foreground">
                    PostgreSQL บน Render มี encryption at rest
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  ❌ สิ่งที่ไม่ควรทำ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="font-medium">API Keys ใน Code</p>
                  <p className="text-sm text-muted-foreground">
                    อย่าใส่ API keys ลงใน source code
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">.env ใน Repository</p>
                  <p className="text-sm text-muted-foreground">
                    อย่า commit ไฟล์ .env ขึ้น git repository
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">Plain Text Passwords</p>
                  <p className="text-sm text-muted-foreground">
                    อย่าเก็บ password แบบ plain text
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium">Public Repositories</p>
                  <p className="text-sm text-muted-foreground">
                    อย่าใส่ secrets ใน public GitHub repositories
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>🛡️ Security Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold">Environment Variables</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      ใช้ Render Environment Variables
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      ไม่ commit .env ไฟล์
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      ใช้ strong encryption keys
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Access Control</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      ตั้งค่า Basic Authentication
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      ใช้ strong passwords
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      จำกัด IP access (ถ้าจำเป็น)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RenderSetupGuide;