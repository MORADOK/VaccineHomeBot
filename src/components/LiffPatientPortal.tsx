import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, CheckCircle, Smartphone, AlertCircle, Syringe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// LIFF Type Definitions
declare global {
  interface Window {
    liff: any;
  }
}

interface PatientData {
  fullName: string;
  phone: string;
  selectedVaccine: string;
  lineUserId?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
}

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

const LiffPatientPortal = () => {
  const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://firstprojecthome.onrender.com/webhook-test/Webhook-Vaccine';
  const LIFF_ID = import.meta.env.VITE_LIFF_ID || 'your-liff-id';
  
  const [patientData, setPatientData] = useState<PatientData>({
    fullName: '',
    phone: '',
    selectedVaccine: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [inLineApp, setInLineApp] = useState(false);
  const [liffProfile, setLiffProfile] = useState<LiffProfile | null>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize LIFF
  useEffect(() => {
    const initializeLiff = async () => {
      try {
        if (typeof window !== 'undefined' && window.liff) {
          console.log('LIFF SDK found, initializing...');
          
          await window.liff.init({ liffId: LIFF_ID });
          setLiffReady(true);
          setInLineApp(window.liff.isInClient());
          
          if (window.liff.isLoggedIn()) {
            try {
              const profile = await window.liff.getProfile();
              setLiffProfile(profile);
              setPatientData(prev => ({
                ...prev,
                lineUserId: profile.userId,
                lineDisplayName: profile.displayName,
                linePictureUrl: profile.pictureUrl,
                fullName: profile.displayName || prev.fullName
              }));
              
              console.log('LIFF Profile loaded:', profile);
              toast({
                title: "เชื่อมต่อ LINE สำเร็จ",
                description: `ยินดีต้อนรับ ${profile.displayName}`,
              });
            } catch (profileError) {
              console.error('Error getting LIFF profile:', profileError);
              setLiffError('ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้');
            }
          } else {
            console.log('User not logged in to LINE');
            if (window.liff.isInClient()) {
              window.liff.login();
            }
          }
        } else {
          console.log('LIFF SDK not found, loading...');
          await loadLiffSDK();
        }
      } catch (error) {
        console.error('LIFF initialization failed:', error);
        setLiffError(`LIFF เริ่มต้นไม่สำเร็จ: ${error}`);
      }
    };

    initializeLiff();
  }, [LIFF_ID, toast]);

  // Load LIFF SDK dynamically
  const loadLiffSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
      script.onload = async () => {
        try {
          await window.liff.init({ liffId: LIFF_ID });
          setLiffReady(true);
          setInLineApp(window.liff.isInClient());
          
          if (window.liff.isLoggedIn()) {
            const profile = await window.liff.getProfile();
            setLiffProfile(profile);
            setPatientData(prev => ({
              ...prev,
              lineUserId: profile.userId,
              lineDisplayName: profile.displayName,
              linePictureUrl: profile.pictureUrl,
              fullName: profile.displayName || prev.fullName
            }));
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

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
      // Save to Supabase database instead of webhook
      const appointmentId = `HOM-${Date.now().toString().slice(-6)}`;
      const appointmentDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          appointment_id: appointmentId,
          patient_name: patientData.fullName,
          patient_phone: patientData.phone,
          patient_id_number: patientData.lineUserId,
          vaccine_type: patientData.selectedVaccine,
          appointment_date: appointmentDate,
          appointment_time: '09:00',
          status: 'scheduled',
          scheduled_by: 'patient_liff',
          line_user_id: patientData.lineUserId,
          notes: `ลงทะเบียนผ่าน LINE LIFF - ${patientData.lineDisplayName}`
        })
        .select()
        .single();

      if (error) throw error;

      setIsRegistered(true);
      toast({
        title: "ลงทะเบียนสำเร็จ",
        description: `นัดหมายฉีดวัคซีน ${patientData.selectedVaccine} สำเร็จแล้ว (ID: ${appointmentId})`,
      });

      // ส่งข้อความยืนยันผ่าน LINE Bot API (ถ้ามี LINE User ID)
      if (patientData.lineUserId) {
        try {
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
          
          const selectedVaccineLabel = vaccineOptions.find(v => v.value === patientData.selectedVaccine)?.label || patientData.selectedVaccine;
          
          await supabase.functions.invoke('send-line-message', {
            body: {
              userId: patientData.lineUserId,
              message: `✅ ลงทะเบียนฉีดวัคซีนสำเร็จ\n\n📋 รายละเอียด:\n• ชื่อ: ${patientData.fullName}\n• เบอร์โทร: ${patientData.phone}\n• วัคซีน: ${selectedVaccineLabel}\n• วันที่: ${appointmentDate}\n• รหัสนัดหมาย: ${appointmentId}\n\n🏥 โรงพยาบาลโฮม\nเจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันนัดหมาย`,
              type: 'template',
              templateData: {
                appointmentId,
                patientName: patientData.fullName,
                vaccineType: selectedVaccineLabel,
                appointmentDate
              }
            }
          });
        } catch (messageError) {
          console.error('Error sending LINE message:', messageError);
          // ไม่ต้อง throw error เพราะการลงทะเบียนสำเร็จแล้ว
        }
      }

      // ส่งข้อความใน LINE Chat (ถ้าอยู่ใน LINE App)
      if (inLineApp && window.liff) {
        try {
          await window.liff.sendMessages([
            {
              type: 'text',
              text: `✅ ลงทะเบียนฉีดวัคซีนสำเร็จ\n\nชื่อ: ${patientData.fullName}\nเบอร์: ${patientData.phone}\nวัคซีน: ${patientData.selectedVaccine}\nรหัส: ${appointmentId}\n\nโรงพยาบาลโฮม\nเจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันนัดหมาย`
            }
          ]);
        } catch (messageError) {
          console.error('Error sending LINE chat message:', messageError);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "ลงทะเบียนไม่สำเร็จ",
        description: `เกิดข้อผิดพลาด: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setPatientData({
      fullName: liffProfile?.displayName || '',
      phone: '',
      selectedVaccine: '',
      lineUserId: liffProfile?.userId,
      lineDisplayName: liffProfile?.displayName,
      linePictureUrl: liffProfile?.pictureUrl
    });
    setIsRegistered(false);
  };

  const closeLiff = () => {
    if (window.liff && window.liff.isInClient()) {
      window.liff.closeWindow();
    }
  };

  // Success Screen
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
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
                  <p><strong>วัคซีน:</strong> {(() => {
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
                    return vaccineOptions.find(v => v.value === patientData.selectedVaccine)?.label || patientData.selectedVaccine;
                  })()}</p>
                  <p><strong>สถานที่:</strong> โรงพยาบาลโฮม</p>
                  {patientData.lineUserId && (
                    <p><strong>LINE ID:</strong> {patientData.lineUserId}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Button onClick={resetForm} className="w-full">
                  ลงทะเบียนใหม่
                </Button>
                {inLineApp && (
                  <Button onClick={closeLiff} variant="outline" className="w-full">
                    ปิดหน้าต่าง
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">ลงทะเบียนฉีดวัคซีน</h1>
          <h2 className="text-xl text-muted-foreground mt-2 font-semibold">
            โรงพยาบาลโฮม
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            กรุณากรอกข้อมูลเพื่อลงทะเบียนฉีดวัคซีน
          </p>
        </div>

        {/* LIFF Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              สถานะ LINE App
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liffError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{liffError}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>LIFF พร้อมใช้:</span>
                  <span className={liffReady ? "text-green-600" : "text-red-600"}>
                    {liffReady ? "✓ พร้อม" : "✗ ไม่พร้อม"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ใน LINE App:</span>
                  <span className={inLineApp ? "text-green-600" : "text-yellow-600"}>
                    {inLineApp ? "✓ ใช่" : "✗ เบราว์เซอร์"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>โปรไฟล์:</span>
                  <span className={liffProfile ? "text-green-600" : "text-yellow-600"}>
                    {liffProfile ? "✓ เชื่อมต่อแล้ว" : "✗ ยังไม่เชื่อมต่อ"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LINE Profile Display */}
        {liffProfile && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {liffProfile.pictureUrl && (
                  <img 
                    src={liffProfile.pictureUrl} 
                    alt="LINE Profile" 
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold">{liffProfile.displayName}</p>
                  <p className="text-sm text-muted-foreground">เชื่อมต่อจาก LINE</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <SelectItem value="flu">วัคซีนไข้หวัดใหญ่</SelectItem>
                  <SelectItem value="hep_b">วัคซีนไวรัสตับอักเสบบี</SelectItem>
                  <SelectItem value="tetanus">วัคซีนป้องกันบาดทะยัก</SelectItem>
                  <SelectItem value="shingles">วัคซีนงูสวัด</SelectItem>
                  <SelectItem value="hpv">วัคซีนป้องกันมะเร็งปากมดลูก</SelectItem>
                  <SelectItem value="pneumonia">วัคซีนปอดอักเสบ</SelectItem>
                  <SelectItem value="chickenpox">วัคซีนอีสุกอีใส</SelectItem>
                  <SelectItem value="rabies">วัคซีนพิษสุนัขบ้า</SelectItem>
                  <SelectItem value="other">อื่นๆ (แจ้งเจ้าหน้าที่)</SelectItem>
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
            และแจ้งประเภทวัคซีนที่เหมาะสมกับคุณ
            {inLineApp && " ข้อความยืนยันจะถูกส่งไปที่แชท LINE ของคุณ"}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default LiffPatientPortal;