import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, AlertCircle, Monitor, Smartphone } from 'lucide-react';
import { HospitalLogo } from '@/components/HospitalLogo';

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  size: string;
  releaseDate: string;
  changelog: string[];
}

const DownloadPage = () => {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Fetch release information from GitHub Pages
    fetchReleaseInfo();
  }, []);

  const fetchReleaseInfo = async () => {
    try {
      // Simulate fetching from GitHub Pages API or static JSON
      const response = await fetch('https://moradok.github.io/VaccineHomeBot/release-info.json');
      
      if (response.ok) {
        const data = await response.json();
        setReleaseInfo(data);
      } else {
        // Fallback to default info
        setReleaseInfo({
          version: '1.0.0',
          downloadUrl: 'https://moradok.github.io/VaccineHomeBot/downloads/VCHome-Hospital-Setup.exe',
          size: '186.8 MB',
          releaseDate: '9 ตุลาคม 2025',
          changelog: [
            'ระบบจัดการวัคซีนครบครัน',
            'หน้าต่างผู้ดูแลระบบ',
            'ระบบเจ้าหน้าที่และผู้ป่วย',
            'การเชื่อมต่อ LINE Bot',
            'ฐานข้อมูล Supabase'
          ]
        });
      }
    } catch (error) {
      console.error('Failed to fetch release info:', error);
      // Use fallback data
      setReleaseInfo({
        version: '1.0.0',
        downloadUrl: '#',
        size: '186.8 MB',
        releaseDate: '9 ตุลาคม 2025',
        changelog: ['ระบบจัดการวัคซีนครบครัน']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!releaseInfo) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsDownloading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Trigger actual download
      const link = document.createElement('a');
      link.href = releaseInfo.downloadUrl;
      link.download = `VCHome-Hospital-Setup-${releaseInfo.version}.exe`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Download failed:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังตรวจสอบเวอร์ชันล่าสุด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <HospitalLogo className="mx-auto mb-6" size={120} />
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            ดาวน์โหลด VCHome Hospital
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ระบบจัดการวัคซีนสำหรับโรงพยาบาลโฮม
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Download Card */}
            <Card className="card-balanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Monitor className="h-6 w-6 text-primary" />
                  Windows Desktop App
                </CardTitle>
              </CardHeader>
              <CardContent>
                {releaseInfo && (
                  <div className="space-y-4">
                    {/* Version Info */}
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-semibold">เวอร์ชัน {releaseInfo.version}</p>
                        <p className="text-sm text-muted-foreground">
                          อัพเดท: {releaseInfo.releaseDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{releaseInfo.size}</p>
                        <p className="text-sm text-muted-foreground">ขนาดไฟล์</p>
                      </div>
                    </div>

                    {/* System Requirements */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">ความต้องการของระบบ:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Windows 10/11 (64-bit หรือ 32-bit)</li>
                        <li>• RAM 4GB ขั้นต่ำ (แนะนำ 8GB)</li>
                        <li>• พื้นที่ว่าง 500MB</li>
                        <li>• การเชื่อมต่ออินเทอร์เน็ต</li>
                      </ul>
                    </div>

                    {/* Download Button */}
                    <div className="space-y-3">
                      {isDownloading ? (
                        <div className="space-y-2">
                          <div className="w-full bg-muted rounded-full h-3">
                            <div 
                              className="bg-primary h-3 rounded-full transition-all duration-300"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-center text-muted-foreground">
                            กำลังดาวน์โหลด... {downloadProgress}%
                          </p>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleDownload}
                          className="w-full btn-primary"
                          size="lg"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          ดาวน์โหลดตัวติดตั้ง
                        </Button>
                      )}
                      
                      <p className="text-xs text-center text-muted-foreground">
                        ดาวน์โหลดจาก: moradok.github.io/VaccineHomeBot
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Installation Guide */}
            <Card className="card-balanced">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-medical-success" />
                  วิธีการติดตั้ง
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">ดาวน์โหลดไฟล์</p>
                        <p className="text-sm text-muted-foreground">
                          คลิกปุ่ม "ดาวน์โหลดตัวติดตั้ง" ด้านซ้าย
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">รันไฟล์ติดตั้ง</p>
                        <p className="text-sm text-muted-foreground">
                          เปิดไฟล์ .exe ที่ดาวน์โหลดมา
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">ทำตามขั้นตอน</p>
                        <p className="text-sm text-muted-foreground">
                          ติดตั้งตามขั้นตอนที่แสดงบนหน้าจอ
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-medical-success text-white rounded-full flex items-center justify-center text-sm font-bold">
                        ✓
                      </div>
                      <div>
                        <p className="font-medium">เริ่มใช้งาน</p>
                        <p className="text-sm text-muted-foreground">
                          เปิดแอปจาก Start Menu หรือ Desktop
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Security Note */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          หมายเหตุด้านความปลอดภัย
                        </p>
                        <p className="text-xs text-amber-700">
                          Windows อาจแสดงคำเตือนเนื่องจากไฟล์ยังไม่ได้ลงนามดิจิทัล
                          คลิก "More info" → "Run anyway" เพื่อติดตั้ง
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Changelog */}
          {releaseInfo && (
            <Card className="card-balanced mt-8">
              <CardHeader>
                <CardTitle>🆕 ฟีเจอร์ในเวอร์ชันนี้</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {releaseInfo.changelog.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-medical-success" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Alternative Options */}
          <Card className="card-balanced mt-8">
            <CardHeader>
              <CardTitle>🌐 ตัวเลือกอื่น</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">เว็บแอปพลิเคชัน</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    ใช้งานผ่านเว็บเบราว์เซอร์โดยไม่ต้องติดตั้ง
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://moradok.github.io/VaccineHomeBot/', '_blank')}
                  >
                    เปิดเว็บแอป
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Smartphone className="h-5 w-5 text-medical-success" />
                    <h4 className="font-semibold">LINE Bot</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    ใช้งานผ่าน LINE สำหรับผู้ป่วย
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://line.me/R/ti/p/@vchome', '_blank')}
                  >
                    เพิ่มเพื่อน LINE
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <div className="text-center mt-8 p-6 bg-card rounded-lg border">
            <h3 className="font-semibold mb-2">ต้องการความช่วยเหลือ?</h3>
            <p className="text-muted-foreground mb-4">
              หากมีปัญหาในการติดตั้งหรือใช้งาน กรุณาติดต่อทีมสนับสนุน
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline"
                onClick={() => window.open('https://github.com/moradok/VaccineHomeBot/issues', '_blank')}
              >
                รายงานปัญหา
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.open('mailto:support@vchome.hospital', '_blank')}
              >
                ติดต่อสนับสนุน
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;