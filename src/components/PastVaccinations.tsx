import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { History, Search, Calendar, Syringe, RefreshCw, FileText } from 'lucide-react';

interface VaccinationHistory {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_id_number?: string;
  vaccine_type: string;
  appointment_date: string;
  appointment_time?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const PastVaccinations = () => {
  const [vaccinations, setVaccinations] = useState<VaccinationHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadVaccinations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setVaccinations(data || []);
    } catch (error) {
      console.error('Error loading vaccinations:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลประวัติการฉีดวัคซีนได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVaccinations();
  }, []);

  const filteredVaccinations = vaccinations.filter(vac =>
    vac.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vac.vaccine_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vac.patient_phone && vac.patient_phone.includes(searchTerm)) ||
    (vac.patient_id_number && vac.patient_id_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportData = () => {
    const csvContent = [
      ['วันที่', 'ชื่อผู้ป่วย', 'เบอร์โทร', 'ประเภทวัคซีน', 'หมายเหตุ'].join(','),
      ...filteredVaccinations.map(vac => [
        new Date(vac.appointment_date).toLocaleDateString('th-TH'),
        vac.patient_name,
        vac.patient_phone || '',
        vac.vaccine_type,
        vac.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vaccination_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ประวัติการฉีดวัคซีน</h1>
            <p className="text-sm text-muted-foreground">รายการผู้ที่ได้รับวัคซีนแล้ว</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportData} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            ส่งออก CSV
          </Button>
          <Button onClick={loadVaccinations} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              ค้นหาประวัติการฉีดวัคซีน
            </CardTitle>
            <Badge variant="secondary">
              ทั้งหมด {filteredVaccinations.length} ครั้ง
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ค้นหาด้วยชื่อผู้ป่วย, ประเภทวัคซีน, หรือเบอร์โทร"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredVaccinations.map((vaccination) => (
              <div key={vaccination.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{vaccination.patient_name}</h3>
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        ฉีดแล้ว
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(vaccination.appointment_date).toLocaleDateString('th-TH')}
                        {vaccination.appointment_time && ` เวลา ${vaccination.appointment_time}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Syringe className="h-4 w-4" />
                        {vaccination.vaccine_type}
                      </div>
                      {vaccination.patient_phone && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          {vaccination.patient_phone}
                        </div>
                      )}
                      {vaccination.patient_id_number && (
                        <div className="flex items-center gap-2">
                          <span>🆔</span>
                          {vaccination.patient_id_number}
                        </div>
                      )}
                    </div>
                    {vaccination.notes && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        หมายเหตุ: {vaccination.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredVaccinations.length === 0 && (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีประวัติการฉีดวัคซีน'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PastVaccinations;