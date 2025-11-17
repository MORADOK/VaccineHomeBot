import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, XCircle, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface UpdateLogEntry {
  timestamp: string;
  action: 'check' | 'download' | 'install' | 'error';
  version?: string;
  details: string;
  success: boolean;
}

const UpdateHistoryLog = () => {
  const [logs, setLogs] = useState<UpdateLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<UpdateLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load logs from electron or localStorage
    loadLogs();

    // Listen for new log entries if in Electron
    if (window.electron?.ipcRenderer) {
      const handleNewLog = (_event: any, log: UpdateLogEntry) => {
        setLogs(prevLogs => [log, ...prevLogs]);
      };

      window.electron.ipcRenderer.on('update-log-entry', handleNewLog);

      return () => {
        window.electron?.ipcRenderer.removeListener('update-log-entry', handleNewLog);
      };
    }
  }, []);

  useEffect(() => {
    // Filter logs based on search query
    if (searchQuery.trim() === '') {
      setFilteredLogs(logs);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = logs.filter(log => 
        log.action.toLowerCase().includes(query) ||
        log.version?.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: th }).includes(query)
      );
      setFilteredLogs(filtered);
    }
  }, [searchQuery, logs]);

  const loadLogs = () => {
    // Try to load from localStorage first (for demo/testing)
    const storedLogs = localStorage.getItem('update-logs');
    if (storedLogs) {
      try {
        const parsedLogs = JSON.parse(storedLogs);
        setLogs(parsedLogs);
        setFilteredLogs(parsedLogs);
      } catch (error) {
        console.error('Failed to parse stored logs:', error);
      }
    }

    // If in Electron, request logs from main process
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('get-update-logs');
      
      const handleLogsReceived = (_event: any, receivedLogs: UpdateLogEntry[]) => {
        setLogs(receivedLogs);
        setFilteredLogs(receivedLogs);
      };

      window.electron.ipcRenderer.on('update-logs-data', handleLogsReceived);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'check':
        return <RefreshCw className="h-4 w-4" />;
      case 'download':
        return <Download className="h-4 w-4" />;
      case 'install':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'check':
        return 'ตรวจสอบ';
      case 'download':
        return 'ดาวน์โหลด';
      case 'install':
        return 'ติดตั้ง';
      case 'error':
        return 'ข้อผิดพลาด';
      default:
        return action;
    }
  };

  const getStatusBadge = (success: boolean, action: string) => {
    if (action === 'error') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          ล้มเหลว
        </Badge>
      );
    }
    
    if (success) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          สำเร็จ
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          ล้มเหลว
        </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ประวัติการอัพเดท</CardTitle>
        <CardDescription>
          บันทึกการตรวจสอบและติดตั้งอัพเดท
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="ค้นหาจากเวอร์ชัน, การกระทำ, หรือรายละเอียด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Logs Table */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>
              {searchQuery ? 'ไม่พบผลลัพธ์ที่ตรงกับการค้นหา' : 'ยังไม่มีประวัติการอัพเดท'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">วันที่/เวลา</TableHead>
                  <TableHead className="w-[120px]">การกระทำ</TableHead>
                  <TableHead className="w-[100px]">เวอร์ชัน</TableHead>
                  <TableHead className="w-[100px]">สถานะ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: th })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm">{getActionLabel(log.action)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.version ? (
                        <Badge variant="outline">{log.version}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.success, log.action)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary */}
        {filteredLogs.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            แสดง {filteredLogs.length} รายการ
            {searchQuery && ` จากทั้งหมด ${logs.length} รายการ`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpdateHistoryLog;
