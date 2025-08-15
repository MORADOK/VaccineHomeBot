import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface PatientData {
  fullName: string;
  phone: string;
}

const PatientPortal = () => {
  
  const [patientData, setPatientData] = useState<PatientData>({
    fullName: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitRegistration = async () => {
    if (!patientData.fullName || !patientData.phone) {
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
      const registrationId = `HOM-${Date.now()}`;
      
      const { error } = await supabase
        .from('patient_registrations')
        .insert({
          full_name: patientData.fullName,
          phone: patientData.phone,
          hospital: 'โรงพยาบาลโฮม',
          registration_id: registrationId,
          source: 'web_portal',
          status: 'pending'
        });

      if (error) {
        throw error;
      }

      setIsRegistered(true);
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "ลงทะเบียนรับบริการสำเร็จแล้ว",
      });
    } catch (error) {
      console.error('Registration error:', error);
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
      phone: ''
    });
    setIsRegistered(false);
  };

  if (isRegistered) {
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
                ขอบคุณที่ลงทะเบียน เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันนัดหมายและแจ้งข้อมูลบริการ
              </p>
              
              <div className="bg-white p-4 rounded-lg border mb-6 text-left">
                <h3 className="font-semibold mb-2">ข้อมูลที่ลงทะเบียน:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>ชื่อ:</strong> {patientData.fullName}</p>
                  <p><strong>เบอร์โทร:</strong> {patientData.phone}</p>
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
              className="mx-auto h-24 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold">ลงทะเบียนรับบริการ</h1>
          <h2 className="text-xl text-muted-foreground mt-2 font-semibold">
            โรงพยาบาลโฮม
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            กรุณากรอกข้อมูลเพื่อลงทะเบียนรับบริการ
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

        {/* Submit Button */}
        <Button 
          onClick={submitRegistration}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนรับบริการ'}
        </Button>

        <Alert>
          <AlertDescription>
            หลังจากลงทะเบียน เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันนัดหมาย
            และแจ้งข้อมูลบริการที่ต้องการ
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default PatientPortal;