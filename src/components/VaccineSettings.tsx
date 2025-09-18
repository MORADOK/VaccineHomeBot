/**
 * Vaccine Settings Component
 * Admin-only vaccine configuration management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Edit, Trash2, Syringe, Settings, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProtectedRoute } from './ProtectedRoute';

interface VaccineSchedule {
  id: string;
  vaccine_type: string;
  vaccine_name: string;
  total_doses: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function VaccineSettings() {
  const [vaccines, setVaccines] = useState<VaccineSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    vaccine_type: '',
    vaccine_name: '',
    total_doses: 1
  });
  const { toast } = useToast();

  const loadVaccines = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .order('vaccine_name');

      if (error) throw error;
      setVaccines(data || []);
    } catch (error) {
      console.error('Error loading vaccines:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลวัคซีนได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.vaccine_type || !formData.vaccine_name || formData.total_doses < 1) {
      toast({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        // Update existing vaccine
        const { error } = await supabase
          .from('vaccine_schedules')
          .update({
            vaccine_type: formData.vaccine_type,
            vaccine_name: formData.vaccine_name,
            total_doses: formData.total_doses,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'อัพเดตสำเร็จ',
          description: 'อัพเดตข้อมูลวัคซีนแล้ว',
        });
      } else {
        // Add new vaccine
        const { error } = await supabase
          .from('vaccine_schedules')
          .insert([{
            vaccine_type: formData.vaccine_type,
            vaccine_name: formData.vaccine_name,
            total_doses: formData.total_doses,
            active: true
          }]);

        if (error) throw error;

        toast({
          title: 'เพิ่มสำเร็จ',
          description: 'เพิ่มวัคซีนใหม่แล้ว',
        });
      }

      setFormData({ vaccine_type: '', vaccine_name: '', total_doses: 1 });
      setEditingId(null);
      setShowAddForm(false);
      loadVaccines();
    } catch (error) {
      console.error('Error saving vaccine:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (vaccine: VaccineSchedule) => {
    setFormData({
      vaccine_type: vaccine.vaccine_type,
      vaccine_name: vaccine.vaccine_name,
      total_doses: vaccine.total_doses
    });
    setEditingId(vaccine.id);
    setShowAddForm(true);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('vaccine_schedules')
        .update({ 
          active: !currentActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'อัพเดตสำเร็จ',
        description: `${!currentActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}วัคซีนแล้ว`,
      });

      loadVaccines();
    } catch (error) {
      console.error('Error toggling vaccine status:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพเดตสถานะได้',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, vaccineName: string) => {
    if (!confirm(`คุณต้องการลบวัคซีน "${vaccineName}" หรือไม่?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vaccine_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'ลบสำเร็จ',
        description: 'ลบวัคซีนแล้ว',
      });

      loadVaccines();
    } catch (error) {
      console.error('Error deleting vaccine:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบวัคซีนได้',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setFormData({ vaccine_type: '', vaccine_name: '', total_doses: 1 });
    setEditingId(null);
    setShowAddForm(false);
  };

  useEffect(() => {
    loadVaccines();
  }, []);

  return (
    <ProtectedRoute requiredPermission="vaccine:write">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                การตั้งค่าวัคซีน
              </CardTitle>
              <CardDescription>
                จัดการประเภทวัคซีนและจำนวนเข็มที่ต้องฉีด
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มวัคซีน
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {showAddForm && (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {editingId ? 'แก้ไขวัคซีน' : 'เพิ่มวัคซีนใหม่'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="vaccine_type">รหัสวัคซีน</Label>
                      <Input
                        id="vaccine_type"
                        value={formData.vaccine_type}
                        onChange={(e) => setFormData({ ...formData, vaccine_type: e.target.value })}
                        placeholder="เช่น COVID19, INFLUENZA"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vaccine_name">ชื่อวัคซีน</Label>
                      <Input
                        id="vaccine_name"
                        value={formData.vaccine_name}
                        onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
                        placeholder="เช่น วัคซีนโควิด-19"
                      />
                    </div>
                    <div>
                      <Label htmlFor="total_doses">จำนวนเข็ม</Label>
                      <Input
                        id="total_doses"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.total_doses}
                        onChange={(e) => setFormData({ ...formData, total_doses: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? 'อัพเดต' : 'บันทึก'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      ยกเลิก
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Separator className="mb-6" />
            </>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">กำลังโหลดข้อมูลวัคซีน...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vaccines.map((vaccine) => (
                <Card key={vaccine.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Syringe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{vaccine.vaccine_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            รหัส: {vaccine.vaccine_type} • {vaccine.total_doses} เข็ม
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={vaccine.active ? 'default' : 'secondary'}>
                          {vaccine.active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(vaccine)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(vaccine.id, vaccine.active)}
                        >
                          {vaccine.active ? 'ปิด' : 'เปิด'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(vaccine.id, vaccine.vaccine_name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {vaccines.length === 0 && (
                <div className="text-center py-12">
                  <Syringe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ยังไม่มีวัคซีนในระบบ</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    คลิก "เพิ่มวัคซีน" เพื่อเริ่มต้น
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}