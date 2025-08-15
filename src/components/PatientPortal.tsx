import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, CheckCircle, Syringe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PatientData {
  fullName: string;
  phone: string;
  selectedVaccine: string;
}

const PatientPortal = () => {
  // Webhook URL สำหรับ รพ.โฮม (ค่าคงที่สำหรับการใช้งานจริง)
  const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://your-n8n-webhook-url.com';
  
  const [patientData, setPatientData] = useState<PatientData>({
    fullName: '',
    phone: '',
    selectedVaccine: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const { toast } = useToast();

  const vaccineOptions = [
    { value: 'flu', label: 'วัคซีนไข้หวัดใหญ่' },
    { value: 'hep_b', label: 'วัคซีนไวรัสตับอักเสบบี' },
    { value: 'tetanus', label: 'วัคซีนป้องกันบาดทะยัก' },
    { value: 'shingles', label: 'วัคซีนงูสวัด' },
    { value: 'hpv', label: 'วัคซีนป้องกันมะเร็งปากมดลูก' },
    { value: 'pneumonia', label: 'วัคซีนปอดอักเสบ' },
    { value: 'chickenpox', label: 'วัคซีนอีสุกอีใส' },
    { value: 'rabies', label: 'วัคซีนพิษสุนัขบ้า' },
    { value: 'other', label: 'อื่นๆ (แจ้งเจ้าหน้าที่)' }
  ];

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitRegistration = async () => {
    if (!patientData.fullName || !patientData.phone || !patientData.selectedVaccine) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    // ตรวจสอบรูปแบบเบอร์โทรศัพท์
    const phoneRegex = /^[0-9]{9,10}$/;
    if (!phoneRegex.test(patientData.phone.replace(/[-\s]/g, ''))) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedVaccineLabel = vaccineOptions.find(v => v.value === patientData.selectedVaccine)?.label || patientData.selectedVaccine;
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'patient_registration',
          data: {
            ...patientData,
            selectedVaccineLabel,
            hospital: 'โรงพยาบาลโฮม',
            registrationId: `HOM-${Date.now()}`,
            timestamp: new Date().toISOString(),
            source: 'web_portal'
          }
        }),
      });

      if (response.ok) {
        setIsRegistered(true);
        toast({
          title: "ลงทะเบียนสำเร็จ",
          description: "ลงทะเบียนฉีดวัคซีนสำเร็จแล้ว",
        });
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      toast({
        title: "ลงทะเบียนไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPatientData({
      fullName: '',
      phone: '',
      selectedVaccine: ''
    });
    setIsRegistered(false);
  };

  if (isRegistered) {
    const selectedVaccineLabel = vaccineOptions.find(v => v.value === patientData.selectedVaccine)?.label || patientData.selectedVaccine;
    
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <img 
                  src="/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png" 
                  alt="โรงพยาบาลโฮม" 
                  className="mx-auto h-16 w-auto object-contain mb-4"
                />
              </div>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                ลงทะเบียนสำเร็จ!
              </h2>
              <p className="text-green-700 mb-6">
                ขอบคุณที่ลงทะเบียนฉีดวัคซีน เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันนัดหมาย
              </p>
              
              <div className="bg-white p-4 rounded-lg border mb-6 text-left">
                <h3 className="font-semibold mb-2">ข้อมูลที่ลงทะเบียน:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>ชื่อ:</strong> {patientData.fullName}</p>
                  <p><strong>เบอร์โทร:</strong> {patientData.phone}</p>
                  <p><strong>วัคซีนที่ต้องการ:</strong> {selectedVaccineLabel}</p>
                  <p><strong>สถานที่:</strong> โรงพยาบาลโฮม</p>
                </div>
              </div>

              <Button onClick={resetForm} className="w-full">
                ลงทะเบียนใหม่
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header with Logo */}
        <div className="text-center">
          <div className="mb-4">
            <img 
              src="/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png" 
              alt="โรงพยาบาลโฮม" 
              className="mx-auto h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold">ลงทะเบียนฉีดวัคซีน</h1>
          <h2 className="text-xl text-muted-foreground mt-2 font-semibold">
            โรงพยาบาลโฮม
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            กรุณากรอกข้อมูลเพื่อลงทะเบียนฉีดวัคซีน
          </p>
        </div>

        {/* Patient Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              ข้อมูลผู้ลงทะเบียน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
              <Input
                id="fullName"
                placeholder="นาย/นาง/นางสาว ชื่อ นามสกุล"
                value={patientData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">หมายเลขโทรศัพท์</Label>
              <Input
                id="phone"
                placeholder="08x-xxx-xxxx"
                value={patientData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vaccine Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              เลือกประเภทวัคซีน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="vaccine">ประเภทวัคซีนที่ต้องการ</Label>
              <Select value={patientData.selectedVaccine} onValueChange={(value) => handleInputChange('selectedVaccine', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="เลือกประเภทวัคซีน" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border rounded-md shadow-lg z-50">
                  {vaccineOptions.map((vaccine) => (
                    <SelectItem key={vaccine.value} value={vaccine.value}>
                      {vaccine.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={submitRegistration}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนฉีดวัคซีน'}
        </Button>

        <Alert>
          <AlertDescription>
            หลังจากลงทะเบียน เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันนัดหมาย
            และตรวจสอบความเหมาะสมของวัคซีนที่เลือก
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default PatientPortal;