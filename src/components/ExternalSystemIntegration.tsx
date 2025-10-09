import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PatientDataService } from '@/lib/patient-data-service';
import {
  Upload,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Database,
  FileText,
  Users,
  Activity
} from 'lucide-react';

interface SyncResult {
  success: number;
  errors: string[];
  timestamp: string;
}

export const ExternalSystemIntegration: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [jsonData, setJsonData] = useState('');
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await syncData(data);
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบ JSON",
        variant: "destructive"
      });
    }
  };

  const handleApiSync = async () => {
    if (!apiEndpoint) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาระบุ API endpoint",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(apiEndpoint, { headers });
      const data = await response.json();
      
      await syncData(data);
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถเชื่อมต่อ API ได้: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJsonSync = async () => {
    if (!jsonData.trim()) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาใส่ข้อมูล JSON",
        variant: "destructive"
      });
      return;
    }

    try {
      const data = JSON.parse(jsonData);
      await syncData(data);
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: "รูปแบบ JSON ไม่ถูกต้อง",
        variant: "destructive"
      });
    }
  };

  const syncData = async (data: any[]) => {
    setIsLoading(true);
    try {
      const result = await PatientDataService.syncWithExternalSystem(
        Array.isArray(data) ? data : [data]
      );
      
      const syncResult: SyncResult = {
        ...result,
        timestamp: new Date().toLocaleString('th-TH')
      };
      
      setSyncResults(prev => [syncResult, ...prev.slice(0, 9)]); // Keep last 10 results
      
      toast({
        title: "ซิงค์ข้อมูลสำเร็จ",
        description: `นำเข้าข้อมูลสำเร็จ ${result.success} รายการ${result.errors.length > 0 ? `, ข้อผิดพลาด ${result.errors.length} รายการ` : ''}`,
        variant: result.errors.length === 0 ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถซิงค์ข้อมูลได้: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    try {
      // Export patient data (example)
      const patients = await PatientDataService.searchPatients('');
      const dataToExport = {
        export_date: new Date().toISOString(),
        total_patients: patients.length,
        patients: patients
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "ส่งออกข้อมูลสำเร็จ",
        description: "ไฟล์ข้อมูลถูกดาวน์โหลดแล้ว"
      });
    } catch (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: `ไม่สามารถส่งออกข้อมูลได้: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* API Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            เชื่อมต่อระบบภายนอก
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="api-endpoint">API Endpoint</Label>
              <Input
                id="api-endpoint"
                placeholder="https://api.example.com/patients"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="api-key">API Key (ถ้ามี)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Bearer token หรือ API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={handleApiSync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            ซิงค์จาก API
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            นำเข้าจากไฟล์
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file-upload">เลือกไฟล์ JSON</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            รูปแบบไฟล์: JSON array ของข้อมูลผู้ป่วย
          </div>
        </CardContent>
      </Card>

      {/* Manual JSON Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ใส่ข้อมูล JSON
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="json-data">ข้อมูล JSON</Label>
            <Textarea
              id="json-data"
              placeholder={`[
  {
    "patient_id": "P001",
    "name": "นายสมชาย ใจดี",
    "phone": "0812345678",
    "id_number": "1234567890123",
    "birth_date": "1990-01-01",
    "vaccinations": [
      {
        "vaccine_type": "COVID-19",
        "date": "2024-01-15",
        "dose_number": 1
      }
    ]
  }
]`}
              rows={10}
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleJsonSync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            นำเข้าข้อมูล
          </Button>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ส่งออกข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={exportData} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            ส่งออกข้อมูลผู้ป่วย (JSON)
          </Button>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ประวัติการซิงค์ข้อมูล</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {result.errors.length === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        สำเร็จ {result.success} รายการ
                        {result.errors.length > 0 && (
                          <span className="text-red-500 ml-2">
                            ข้อผิดพลาด {result.errors.length} รายการ
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.timestamp}
                      </div>
                    </div>
                  </div>
                  <Badge variant={result.errors.length === 0 ? "default" : "destructive"}>
                    {result.errors.length === 0 ? "สำเร็จ" : "มีข้อผิดพลาด"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExternalSystemIntegration;