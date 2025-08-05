import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Phone, User, Clock, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PatientData {
  fullName: string;
  phone: string;
  vaccineType: string;
  appointmentDate: string;
  appointmentTime: string;
  hospital: string;
}

const PatientPortal = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [patientData, setPatientData] = useState<PatientData>({
    fullName: '',
    phone: '',
    vaccineType: '',
    appointmentDate: '',
    appointmentTime: '',
    hospital: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const { toast } = useToast();

  const hospitals = [
    'โรงพยาบาลจุฬาลงกรณ์',
    'โรงพยาบาลศิริราช',
    'โรงพยาบาลรามาธิบดี',
    'โรงพยาบาลพระมงกุฎเกล้า',
    'โรงพยาบาลกรุงเทพ',
  ];

  const vaccineTypes = [
    'Pfizer-BioNTech',
    'Moderna',
    'AstraZeneca',
    'Sinopharm',
    'Sinovac',
  ];

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
  ];

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitRegistration = async () => {
    if (!webhookUrl) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอก Webhook URL ก่อน",
        variant: "destructive",
      });
      return;
    }

    if (!patientData.fullName || !patientData.phone || !patientData.vaccineType || 
        !patientData.appointmentDate || !patientData.appointmentTime || !patientData.hospital) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'patient_registration',
          data: {
            ...patientData,
            registrationId: `REG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            source: 'web_portal'
          }
        }),
      });

      setIsRegistered(true);
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: "ลงทะเบียนฉีดวัคซีนสำเร็จแล้ว",
      });
    } catch (error) {
      toast({
        title: "ลงทะเบียนไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการลงทะเบียน",
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
      vaccineType: '',
      appointmentDate: '',
      appointmentTime: '',
      hospital: ''
    });
    setIsRegistered(false);
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                ลงทะเบียนสำเร็จ!
              </h2>
              <p className="text-green-700 mb-6">
                ขอบคุณที่ลงทะเบียนฉีดวัคซีน เราจะส่งการยืนยันไปยังหมายเลขโทรศัพท์ของคุณ
              </p>
              
              <div className="bg-white p-4 rounded-lg border mb-6 text-left">
                <h3 className="font-semibold mb-2">รายละเอียดการนัดหมาย:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>ชื่อ:</strong> {patientData.fullName}</p>
                  <p><strong>เบอร์โทร:</strong> {patientData.phone}</p>
                  <p><strong>วัคซีน:</strong> {patientData.vaccineType}</p>
                  <p><strong>วันที่:</strong> {patientData.appointmentDate}</p>
                  <p><strong>เวลา:</strong> {patientData.appointmentTime}</p>
                  <p><strong>สถานที่:</strong> {patientData.hospital}</p>
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">ลงทะเบียนฉีดวัคซีน</h1>
          <p className="text-muted-foreground mt-2">
            กรุณากรอกข้อมูลเพื่อลงทะเบียนฉีดวัคซีน
          </p>
        </div>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>เชื่อมต่อระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="webhook">n8n Webhook URL</Label>
              <Input
                id="webhook"
                placeholder="https://your-n8n.render.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

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
              />
            </div>

            <div>
              <Label htmlFor="phone">หมายเลขโทรศัพท์</Label>
              <Input
                id="phone"
                placeholder="08x-xxx-xxxx"
                value={patientData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="vaccineType">ประเภทวัคซีน</Label>
              <Select onValueChange={(value) => handleInputChange('vaccineType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทวัคซีน" />
                </SelectTrigger>
                <SelectContent>
                  {vaccineTypes.map((vaccine) => (
                    <SelectItem key={vaccine} value={vaccine}>
                      {vaccine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hospital">สถานที่ฉีดวัคซีน</Label>
              <Select onValueChange={(value) => handleInputChange('hospital', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกโรงพยาบาล" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital} value={hospital}>
                      {hospital}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointmentDate">วันที่นัดหมาย</Label>
                <Input
                  id="appointmentDate"
                  type="date"
                  value={patientData.appointmentDate}
                  onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="appointmentTime">เวลานัดหมาย</Label>
                <Select onValueChange={(value) => handleInputChange('appointmentTime', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกเวลา" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            หลังจากลงทะเบียนสำเร็จ คุณจะได้รับ SMS ยืนยันการนัดหมาย
            และสามารถตรวจสอบสถานะได้ผ่าน LINE Bot
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default PatientPortal;