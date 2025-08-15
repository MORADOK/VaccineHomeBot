import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Bot, UserPlus, Users } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png" 
              alt="โรงพยาบาลโฮม" 
              className="mx-auto h-32 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">ระบบจัดการวัคซีน</h1>
          <h2 className="text-2xl text-muted-foreground mb-2">โรงพยาบาลโฮม</h2>
          <p className="text-muted-foreground">เลือกระบบที่ต้องการใช้งาน</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                LINE Bot Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                จัดการการตั้งค่า LINE Bot และทดสอบการเชื่อมต่อ
              </p>
              <Button asChild className="w-full">
                <Link to="/LineBot">เข้าสู่ระบบ</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                ลงทะเบียนผู้ป่วย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                หน้าสำหรับผู้ป่วยลงทะเบียนฉีดวัคซีน
              </p>
              <Button asChild className="w-full">
                <Link to="/PatientPortal">เข้าสู่ระบบ</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                จัดการนัดหมาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                หน้าสำหรับเจ้าหน้าที่จัดการนัดหมายผู้ป่วย
              </p>
              <Button asChild className="w-full">
                <Link to="/StaffPortal">เข้าสู่ระบบ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
