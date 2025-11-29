import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Phone, Calendar, CheckCircle, RefreshCw } from 'lucide-react';

interface PatientRegistration {
  id: string;
  patient_name: string;
  phone_number: string;
  hospital: string;
  registration_id: string;
  source: string;
  status: string;
  notes?: string;
  line_user_id?: string;
  created_at: string;
  updated_at: string;
}

const PatientRegistrationsList = () => {
  const [registrations, setRegistrations] = useState<PatientRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการลงทะเบียนได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRegistrationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('patient_registrations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: "อัปเดตสถานะการลงทะเบียนแล้ว",
      });

      loadRegistrations();
    } catch (error) {
      console.error('Error updating registration:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const filteredRegistrations = registrations.filter(reg =>
    reg.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.phone_number.includes(searchTerm) ||
    reg.registration_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'confirmed': return 'ยืนยันแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">รายการลงทะเบียน</h1>
            <p className="text-sm text-muted-foreground">จัดการข้อมูลผู้ลงทะเบียนรับวัคซีน</p>
          </div>
        </div>
        <Button onClick={loadRegistrations} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              ค้นหาผู้ลงทะเบียน
            </CardTitle>
            <Badge variant="secondary">
              ทั้งหมด {filteredRegistrations.length} คน
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือ ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredRegistrations.map((registration) => (
              <div key={registration.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{registration.patient_name}</h3>
                      <Badge className={getStatusColor(registration.status)}>
                        {getStatusText(registration.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {registration.phone_number}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        ID: {registration.registration_id}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(registration.created_at).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                    {registration.notes && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {registration.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {registration.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateRegistrationStatus(registration.id, 'confirmed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        ยืนยัน
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRegistrations.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีการลงทะเบียน'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientRegistrationsList;