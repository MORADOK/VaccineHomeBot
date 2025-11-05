import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Search, Edit, Trash2, RefreshCw, Save, X } from 'lucide-react';

interface Appointment {
  id: string;
  patient_name: string;
  patient_id_number: string;
  vaccine_name: string;
  vaccine_type: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  line_user_id: string | null;
}

const EditAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['scheduled', 'pending'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filteredAppointments = appointments.filter(appt =>
    appt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.vaccine_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patient_id_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment({ ...appointment });
    setIsDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: editingAppointment.appointment_date,
          status: editingAppointment.status,
          notes: editingAppointment.notes,
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "แก้ไขนัดหมายเรียบร้อยแล้ว",
      });

      setIsDialogOpen(false);
      setEditingAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการแก้ไขได้",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกนัดหมายนี้?')) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "ยกเลิกสำเร็จ",
        description: "ยกเลิกนัดหมายเรียบร้อยแล้ว",
      });

      loadAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getDaysUntilAppointment = (date: string) => {
    const today = new Date();
    const apptDate = new Date(date);
    const diffTime = apptDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">นัดแล้ว</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">รอยืนยัน</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">แก้ไขนัดผู้ป่วย</h1>
            <p className="text-sm text-muted-foreground">
              จัดการและแก้ไขนัดหมายที่กำลังจะถึง
            </p>
          </div>
        </div>
        <Button onClick={loadAppointments} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              ค้นหานัดหมาย
            </CardTitle>
            <Badge variant="secondary">
              ทั้งหมด {filteredAppointments.length} นัด
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ค้นหาด้วยชื่อผู้ป่วย, ประเภทวัคซีน, หรือ ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const daysUntil = getDaysUntilAppointment(appointment.appointment_date);
              return (
                <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(appointment.appointment_date).toLocaleDateString('th-TH')}
                        </div>
                        <div>วัคซีน: {appointment.vaccine_name}</div>
                        <div>
                          {daysUntil > 0 ? `อีก ${daysUntil} วัน` : daysUntil === 0 ? 'วันนี้' : `เลยมา ${Math.abs(daysUntil)} วัน`}
                        </div>
                      </div>
                      {appointment.notes && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          หมายเหตุ: {appointment.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(appointment)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(appointment.id)}
                        disabled={deletingId === appointment.id}
                      >
                        {deletingId === appointment.id ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีนัดหมายในขณะนี้'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขนัดหมาย</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              <div>
                <Label>ชื่อผู้ป่วย</Label>
                <Input value={editingAppointment.patient_name} disabled />
              </div>
              <div>
                <Label>วันที่นัด</Label>
                <Input
                  type="date"
                  value={editingAppointment.appointment_date}
                  onChange={(e) => setEditingAppointment({
                    ...editingAppointment,
                    appointment_date: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>สถานะ</Label>
                <Select
                  value={editingAppointment.status}
                  onValueChange={(value) => setEditingAppointment({
                    ...editingAppointment,
                    status: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">นัดแล้ว</SelectItem>
                    <SelectItem value="pending">รอยืนยัน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>หมายเหตุ</Label>
                <Input
                  value={editingAppointment.notes || ''}
                  onChange={(e) => setEditingAppointment({
                    ...editingAppointment,
                    notes: e.target.value
                  })}
                  placeholder="หมายเหตุเพิ่มเติม..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-1" />
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditAppointments;
