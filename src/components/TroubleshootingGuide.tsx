import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle, XCircle, Info, Settings, Database, Shield, Server } from 'lucide-react';

const TroubleshootingGuide = () => {
  const commonIssues = [
    {
      issue: "Package.json ไม่สามารถเปิดใน n8n Render ได้",
      category: "deployment",
      severity: "high",
      symptoms: [
        "Build failed บน Render",
        "n8n ไม่ start",
        "Error: Cannot find module 'n8n'",
        "Version compatibility issues"
      ],
      solutions: [
        {
          step: "ตรวจสอบ Node.js Version",
          details: "ใช้ Node.js 18.10.0 ขึ้นไป (แนะนำ 20.x)",
          code: `"engines": {
  "node": ">=18.10.0",
  "npm": ">=9.0.0"
}`
        },
        {
          step: "แก้ไข n8n Version",
          details: "ใช้ version 'latest' แทน version เฉพาะ",
          code: `"dependencies": {
  "n8n": "latest"
}`
        },
        {
          step: "เพิ่ม Build Script ที่ถูกต้อง",
          details: "Render ต้องการ build script ที่ทำงานได้",
          code: `"scripts": {
  "start": "n8n start",
  "build": "echo 'Build completed'",
  "postinstall": "echo 'Dependencies installed'"
}`
        }
      ]
    },
    {
      issue: "n8n ไม่สามารถเชื่อมต่อ Database ได้",
      category: "database",
      severity: "high",
      symptoms: [
        "Database connection error",
        "PostgreSQL connection failed",
        "Authentication failed for user"
      ],
      solutions: [
        {
          step: "ตรวจสอบ Environment Variables",
          details: "ให้แน่ใจว่าตั้งค่า DB variables ถูกต้อง",
          code: `DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=your-postgres-host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n_db
DB_POSTGRESDB_USER=n8n_user
DB_POSTGRESDB_PASSWORD=your-password`
        },
        {
          step: "ใช้ Connection String Format",
          details: "บางครั้งใช้ connection string ง่ายกว่า",
          code: `DATABASE_URL=postgresql://user:password@host:5432/database`
        }
      ]
    },
    {
      issue: "Webhook ไม่ทำงาน",
      category: "network",
      severity: "medium",
      symptoms: [
        "LINE Bot ไม่ตอบกลับ",
        "Webhook timeout",
        "404 Not Found"
      ],
      solutions: [
        {
          step: "ตรวจสอบ WEBHOOK_URL",
          details: "ใช้ URL ที่ Render สร้างให้",
          code: `WEBHOOK_URL=https://your-app-name.onrender.com`
        },
        {
          step: "เปิด n8n Webhook",
          details: "ตั้งค่า webhook endpoint ใน n8n",
          code: `https://your-app-name.onrender.com/webhook/line-bot`
        }
      ]
    },
    {
      issue: "Environment Variables ไม่ถูกอ่าน",
      category: "config",
      severity: "medium",
      symptoms: [
        "API keys ไม่ทำงาน",
        "undefined environment variables",
        "Authentication errors"
      ],
      solutions: [
        {
          step: "ตั้งค่าใน Render Dashboard",
          details: "ไม่ใส่ใน code แต่ตั้งใน Environment section",
          code: `Settings → Environment → Add Environment Variable`
        },
        {
          step: "Redeploy หลังเปลี่ยน ENV",
          details: "Render ต้อง redeploy เมื่อเปลี่ยน environment variables",
          code: `Manual Deploy → Deploy Latest Commit`
        }
      ]
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "deployment": return <Server className="h-5 w-5" />;
      case "database": return <Database className="h-5 w-5" />;
      case "network": return <Settings className="h-5 w-5" />;
      case "config": return <Shield className="h-5 w-5" />;
      default: return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          🔧 คู่มือแก้ไขปัญหา N8N บน Render
        </h1>
        <p className="text-muted-foreground">
          แนวทางแก้ไขปัญหาที่พบบ่อยในการ deploy N8N Vaccine Workflow
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>วิธีการดีบัก:</strong> ตรวจสอบ Render Logs ได้ที่ Dashboard → Service → Logs 
          เพื่อดูข้อผิดพลาดแบบละเอียด
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {commonIssues.map((item, index) => (
          <Card key={index} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getCategoryIcon(item.category)}
                  <CardTitle className="text-lg">{item.issue}</CardTitle>
                </div>
                <Badge className={getSeverityColor(item.severity)}>
                  {item.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  อาการที่พบ:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                  {item.symptoms.map((symptom, idx) => (
                    <li key={idx}>{symptom}</li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  วิธีแก้ไข:
                </h4>
                <div className="space-y-4">
                  {item.solutions.map((solution, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-muted/50">
                      <h5 className="font-medium mb-2">
                        {idx + 1}. {solution.step}
                      </h5>
                      <p className="text-sm text-muted-foreground mb-3">
                        {solution.details}
                      </p>
                      {solution.code && (
                        <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
                          <code>{solution.code}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-700 flex items-center gap-2">
            <Info className="h-5 w-5" />
            เทคนิคการดีบัก
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">1. ตรวจสอบ Render Logs</h4>
              <p className="text-sm text-muted-foreground">
                Dashboard → Service → Logs → ดู error messages แบบ real-time
              </p>
            </div>
            <div>
              <h4 className="font-semibold">2. ทดสอบ Environment Variables</h4>
              <p className="text-sm text-muted-foreground">
                เพิ่ม console.log ใน n8n workflow เพื่อดูค่าของ env variables
              </p>
            </div>
            <div>
              <h4 className="font-semibold">3. ใช้ n8n Editor</h4>
              <p className="text-sm text-muted-foreground">
                เข้า https://your-app.onrender.com เพื่อเปิด n8n editor
              </p>
            </div>
            <div>
              <h4 className="font-semibold">4. ทดสอบ Webhook</h4>
              <p className="text-sm text-muted-foreground">
                ใช้ Postman หรือ curl ทดสอบ webhook endpoint
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-700">✅ Checklist การ Deploy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Files ที่จำเป็น:</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Dockerfile
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  package.json (ที่แก้ไขแล้ว)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  render.yaml (optional)
                </li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Environment Variables:</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Database connection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  LINE Bot credentials
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Google API keys
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TroubleshootingGuide;