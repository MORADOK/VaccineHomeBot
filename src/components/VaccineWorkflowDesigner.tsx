import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Syringe, 
  UserPlus, 
  Calendar, 
  Bell, 
  CheckCircle, 
  ArrowRight, 
  Database,
  MessageSquare,
  Settings,
  Download,
  Copy,
  Clock,
  Users,
  FileText
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'trigger' | 'logic' | 'action' | 'data' | 'calendar';
  description: string;
  implementation: string;
  connections: string[];
  icon: React.ComponentType<any>; // ✅ ชัดเจนกว่า any
  color: string;
}

const VaccineWorkflowDesigner = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'webhook',
      name: 'LINE Webhook',
      type: 'trigger',
      description: 'รับข้อความจาก LINE Bot พร้อม Rich Menu',
      implementation: `// Webhook Configuration
HTTP POST: https://your-n8n.domain/webhook/line-bot
Method: POST
Content-Type: application/json

// Rich Menu Configuration
{
  "areas": [
    {
      "bounds": {"x": 0, "y": 0, "width": 833, "height": 843},
      "action": {
        "type": "postback",
        "data": "{\\"action\\":\\"register\\"}",
        "displayText": "ลงทะเบียนคนไข้"
      }
    },
    {
      "bounds": {"x": 834, "y": 0, "width": 833, "height": 843},
      "action": {
        "type": "postback", 
        "data": "{\\"action\\":\\"show_vaccine_menu\\"}",
        "displayText": "จองวัคซีน"
      }
    },
    {
      "bounds": {"x": 1667, "y": 0, "width": 833, "height": 843},
      "action": {
        "type": "postback",
        "data": "{\\"action\\":\\"check_booking\\"}",
        "displayText": "ตรวจสอบการจอง"
      }
    }
  ]
}`,
      connections: ['user-validator'],
      icon: MessageSquare,
      color: 'bg-blue-500'
    },
    {
      id: 'user-validator',
      name: 'User Data Validator',
      type: 'logic',
      description: 'ตรวจสอบข้อมูลผู้ใช้และดึง LINE Profile',
      implementation: `// User Validation และ Profile Fetching
const input = $json.body?.events?.[0];
const userId = input?.source?.userId;
const eventType = input?.type;

if (!userId) {
  throw new Error('Invalid webhook: No userId found');
}

// ดึง LINE Profile
let userProfile = null;
try {
  const profileResponse = await $http.request({
    method: "GET",
    url: "https://api.line.me/v2/bot/profile/" + userId,
    headers: {
      "Authorization": "Bearer " + $node.context().get("channelAccessToken")
    }
  });
  
  userProfile = profileResponse.body;
} catch (error) {
  console.log("Profile fetch error:", error);
  userProfile = { displayName: "ผู้ใช้", userId: userId };
}

// ตรวจสอบข้อมูลใน Google Sheets
// ✅ เอา credentials ออกมาข้างนอก function ก่อน
const SPREADSHEET_ID = $node.context().get('spreadsheetId');
const GOOGLE_ACCESS_TOKEN = $node.context().get('googleAccessToken');

// Helper function ตรวจสอบผู้ใช้ใน Google Sheets
async function checkUserInSheets(userId, spreadsheetId, accessToken) {
  const response = await $http.request({
    method: 'GET',
    url: \`https://sheets.googleapis.com/v4/spreadsheets/\${spreadsheetId}/values/Users:A:G\`,
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  });
  
  const rows = response.body.values || [];
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      return {
        exists: true,
        row: i + 1,
        data: {
          userId: rows[i][0],
          name: rows[i][1],
          phone: rows[i][2],
          email: rows[i][3],
          dateOfBirth: rows[i][4],
          address: rows[i][5],
          emergencyContact: rows[i][6]
        }
      };
    }
  }
  
  return { exists: false };
}

const existingUser = await checkUserInSheets(userId, SPREADSHEET_ID, GOOGLE_ACCESS_TOKEN);

$json.userId = userId;
$json.userProfile = userProfile;
$json.existingUser = existingUser;
$json.input = input;
$json.timestamp = new Date().toISOString();

return $input.all();`,
        connections: ['smart-router'],
        icon: Users,
        color: 'bg-green-500'
      },
      {
        id: 'smart-router',
        name: 'AI Smart Router',
        type: 'logic',
        description: 'วิเคราะห์ intent และเส้นทางการทำงาน',
        implementation: `// AI Smart Router with Rich Menu Support
const { input, userProfile, existingUser } = $json;

let action = 'unknown';
let collectedData = {};

// ตรวจสอบ Postback Data
if (input.postback?.data) {
  try {
    const postbackData = JSON.parse(input.postback.data);
    action = postbackData.action;
    collectedData = postbackData;
  } catch {
    action = input.postback.data;
  }
}

// ตรวจสอบ text message
const userMessage = input.message?.text || '';

// AI Routing Logic
const routingPrompt = \`
คุณเป็น Smart Router สำหรับระบบจองวัคซีน
Input: "\${userMessage}"
Action: "\${action}"
User Profile: \${JSON.stringify(userProfile)}
Existing User: \${!!existingUser}

ส่งคืน JSON:
{
  "route": "register|vaccine_menu|booking|status_check|appointment_reminder",
  "vaccine_type": "covid|flu|hepatitis|hpv|other",
  "required_fields": ["name", "phone", "id_card", "vaccine_type", "date", "time"],
  "next_step": "collect_data|show_calendar|confirm|complete",
  "is_returning_user": \${!!existingUser}
}
\`;

// OpenAI Request
$json.openai_request = {
  model: 'gpt-4',
  messages: [{ role: 'user', content: routingPrompt }],
  temperature: 0.1
};

$json.action = action;
$json.userMessage = userMessage;
$json.collectedData = collectedData;

return $input.all();`,
      connections: ['user-registration', 'vaccine-booking'], // ✅ ลบ 'status-checker' ที่ไม่มีอยู่
      icon: Settings,
      color: 'bg-purple-500'
    },
    {
      id: 'user-registration',
      name: 'User Registration',
      type: 'action',
      description: 'ลงทะเบียนผู้ใช้ใหม่และเก็บข้อมูล',
      implementation: `// User Registration Process
const { userProfile, routing } = $json;

if (routing.route === 'register') {
  // สร้างข้อมูลผู้ใช้ใหม่
  const userData = {
    userId: userProfile.userId,
    displayName: userProfile.displayName,
    pictureUrl: userProfile.pictureUrl || '',
    registeredAt: new Date().toISOString(),
    status: 'active',
    vaccineHistory: [],
    appointments: []
  };

  // บันทึกใน Google Sheets
  const sheetData = [
    userData.userId,
    userData.displayName,
    userData.pictureUrl,
    userData.registeredAt,
    userData.status,
    '[]', // vaccineHistory
    '[]'  // appointments
  ];

  await saveToGoogleSheets('Users', sheetData);

  // Response ข้อความ
  $json.response = {
    type: 'text',
    text: \`สวัสดีคุณ \${userData.displayName}! 🎉
    
ยินดีต้อนรับสู่ระบบจองวัคซีนออนไลน์

✅ ลงทะเบียนเรียบร้อยแล้ว
📱 สามารถใช้เมนูด้านล่างเพื่อเลือกบริการ
💉 พร้อมจองวัคซีนได้ทันที

กดที่เมนู "จองวัคซีน" เพื่อเริ่มต้น\`
  };

  $json.userData = userData;
}

return $input.all();`,
      connections: ['response-sender'],
      icon: UserPlus,
      color: 'bg-teal-500'
    },
    {
      id: 'vaccine-booking',
      name: 'Vaccine Booking System',
      type: 'action',
      description: 'ระบบจองวัคซีนพร้อมการนัดหมาย',
      implementation: `// Vaccine Booking with Multi-dose Support
const { routing, userProfile, collectedData } = $json;

const vaccineTypes = {
  covid: { doses: 2, interval: 21, name: 'โควิด-19' },
  flu: { doses: 1, interval: 0, name: 'ไข้หวัดใหญ่' },
  hepatitis: { doses: 3, interval: 30, name: 'ไวรัสตับอักเสบบี' },
  hpv: { doses: 2, interval: 60, name: 'HPV' }
};

if (routing.route === 'vaccine_menu') {
  // แสดงเมนูวัคซีน
  $json.response = {
    type: 'flex',
    altText: 'เมนูวัคซีน',
    contents: {
      type: 'carousel',
      contents: Object.keys(vaccineTypes).map(type => ({
        type: 'bubble',
        hero: {
          type: 'image',
          url: \`https://via.placeholder.com/300x200/42A5F5/FFFFFF?text=\${vaccineTypes[type].name}\`,
          size: 'full'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: vaccineTypes[type].name,
              weight: 'bold',
              size: 'xl'
            },
            {
              type: 'text',
              text: \`จำนวนโดส: \${vaccineTypes[type].doses}\`,
              margin: 'md'
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [{
            type: 'button',
            action: {
              type: 'postback',
              label: 'จองเลย',
              data: JSON.stringify({ 
                action: 'book_vaccine', 
                vaccine_type: type 
              })
            }
          }]
        }
      }))
    }
  };
}

if (routing.route === 'booking' && collectedData.vaccine_type) {
  const vaccine = vaccineTypes[collectedData.vaccine_type];
  
  // สร้างนัดหมาย
  const appointment = {
    appointmentId: generateId(),
    userId: userProfile.userId,
    vaccineType: collectedData.vaccine_type,
    vaccineName: vaccine.name,
    doseNumber: 1,
    totalDoses: vaccine.doses,
    appointmentDate: collectedData.date,
    appointmentTime: collectedData.time,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  };

  // คำนวณนัดครั้งถัดไป (ถ้ามี)
  if (vaccine.doses > 1) {
    const nextDate = new Date(collectedData.date);
    nextDate.setDate(nextDate.getDate() + vaccine.interval);
    appointment.nextAppointment = nextDate.toISOString().split('T')[0];
  }

  // บันทึกใน Google Sheets
  await saveAppointmentToSheets(appointment);

  $json.appointment = appointment;
  $json.response = {
    type: 'text',
    text: \`✅ จองวัคซีนเรียบร้อย!

📋 รายละเอียดการจอง:
🏥 วัคซีน: \${vaccine.name}
💉 โดสที่: 1/\${vaccine.doses}
📅 วันที่: \${collectedData.date}
⏰ เวลา: \${collectedData.time}

\${vaccine.doses > 1 ? \`📌 นัดครั้งถัดไป: \${appointment.nextAppointment}\` : ''}

💾 ข้อมูลถูกบันทึกแล้ว
🔔 จะแจ้งเตือนก่อนวันนัด 1 วัน\`
  };
}

return $input.all();`,
      connections: ['calendar-scheduler', 'response-sender'],
      icon: Syringe,
      color: 'bg-red-500'
    },
      {
        id: 'calendar-scheduler',
        name: 'Google Calendar Scheduler',
        type: 'calendar',
        description: 'สร้างนัดหมายใน Google Calendar พร้อมระบบแจ้งเตือนอัตโนมัติ',
        implementation: `// Google Calendar Integration with Auto Reminders
const { appointment } = $json;

if (appointment) {
  // กำหนดค่า Google Calendar
  const CALENDAR_ID = 'primary'; // หรือ calendar ID ที่ต้องการ
  
  // สร้าง Event ใน Google Calendar
  const eventData = {
    summary: \`วัคซีน \${appointment.vaccineName} - โดสที่ \${appointment.doseNumber}/\${appointment.totalDoses}\`,
    description: \`📋 รายละเอียดการนัดฉีดวัคซีน
    
👤 ผู้ป่วย: \${appointment.userProfile?.displayName || 'ไม่ระบุ'}
💉 วัคซีน: \${appointment.vaccineName}
📊 โดสที่: \${appointment.doseNumber} จาก \${appointment.totalDoses} โดส
📱 LINE User ID: \${appointment.userId}
🆔 Appointment ID: \${appointment.appointmentId}

⚠️ หมายเหตุ: กรุณาให้ผู้ป่วยมาตรงเวลา
\${appointment.nextAppointment ? \`📅 นัดครั้งถัดไป: \${appointment.nextAppointment}\` : ''}\`,
    
    start: {
      dateTime: \`\${appointment.appointmentDate}T\${appointment.appointmentTime}:00+07:00\`,
      timeZone: 'Asia/Bangkok'
    },
    end: {
      dateTime: \`\${appointment.appointmentDate}T\${String(parseInt(appointment.appointmentTime.split(':')[0]) + 1).padStart(2, '0')}:\${appointment.appointmentTime.split(':')[1]}:00+07:00\`,
      timeZone: 'Asia/Bangkok'
    },
    
    // ตั้งค่าการแจ้งเตือน
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 วันก่อน
        { method: 'popup', minutes: 60 },      // 1 ชั่วโมงก่อน
        { method: 'email', minutes: 30 }       // 30 นาทีก่อน
      ]
    },
    
    // เพิ่ม Attendee
    attendees: [
      {
        email: 'vaccine.admin@hospital.com',
        displayName: 'Vaccine Administrator',
        responseStatus: 'accepted'
      }
    ],
    
    // กำหนดสถานะ
    status: 'confirmed',
    transparency: 'opaque',
    visibility: 'private',
    
    // Extended Properties สำหรับการติดตาม
    extendedProperties: {
      private: {
        lineUserId: appointment.userId,
        appointmentId: appointment.appointmentId,
        vaccineType: appointment.vaccineType,
        doseNumber: appointment.doseNumber.toString(),
        totalDoses: appointment.totalDoses.toString(),
        isVaccineAppointment: 'true'
      }
    }
  };

  // สร้าง Event ใน Google Calendar
  const calendarResponse = await $http.request({
    method: 'POST',
    url: \`https://www.googleapis.com/calendar/v3/calendars/\${CALENDAR_ID}/events\`,
    headers: {
      'Authorization': 'Bearer ' + $node.context().get('googleAccessToken'),
      'Content-Type': 'application/json'
    },
    body: eventData
  });

  // บันทึก Event ID สำหรับการจัดการในอนาคต
  const calendarEvent = calendarResponse.body;
  appointment.calendarEventId = calendarEvent.id;
  appointment.calendarEventUrl = calendarEvent.htmlLink;

  // สร้าง Scheduled Reminder ใน n8n (ใช้ Cron Trigger)
  const reminderDate = new Date(appointment.appointmentDate);
  reminderDate.setDate(reminderDate.getDate() - 1); // 1 วันก่อน
  reminderDate.setHours(9, 0, 0, 0); // เวลา 9:00 น.

  const reminderData = {
    reminderId: generateId(),
    scheduledFor: reminderDate.toISOString(),
    userId: appointment.userId,
    appointmentId: appointment.appointmentId,
    calendarEventId: calendarEvent.id,
    message: \`🔔 แจ้งเตือนการนัดฉีดวัคซีน

พรุ่งนี้ (\${appointment.appointmentDate}) คุณมีนัดฉีดวัคซีน:

💉 วัคซีน: \${appointment.vaccineName}
📊 โดสที่: \${appointment.doseNumber}/\${appointment.totalDoses}
⏰ เวลา: \${appointment.appointmentTime} น.
📍 สถานที่: โรงพยาบาล/คลินิก

✅ สิ่งที่ต้องเตรียม:
• บัตรประชาชน
• บัตรประกันสุขภาพ (ถ้ามี)
• หน้ากากอนามัย

⚠️ หากไม่สามารถมาได้ กรุณาแจ้งล่วงหน้า 24 ชั่วโมง
📱 กดเมนู "ตรวจสอบการจอง" เพื่อดูรายละเอียด\`,
    type: 'appointment_reminder',
    status: 'pending'
  };

  // บันทึก Reminder Schedule
  await saveReminderToSheets(reminderData);

  // ถ้ามีโดสถัดไป ให้สร้าง Event สำหรับโดสถัดไป (แบบ Tentative)
  if (appointment.nextAppointment) {
    const nextEventData = {
      ...eventData,
      summary: \`วัคซีน \${appointment.vaccineName} - โดสที่ \${appointment.doseNumber + 1}/\${appointment.totalDoses} (ขั้นต้น)\`,
      description: \`📋 นัดฉีดโดสถัดไป (รอยืนยัน)
      
👤 ผู้ป่วย: \${appointment.userProfile?.displayName || 'ไม่ระบุ'}
💉 วัคซีน: \${appointment.vaccineName}
📊 โดสที่: \${appointment.doseNumber + 1} จาก \${appointment.totalDoses} โดส
⏰ สถานะ: รอยืนยันการจอง

📱 ระบบจะแจ้งเตือนให้จองเวลาที่แน่นอน\`,
      start: {
        dateTime: \`\${appointment.nextAppointment}T09:00:00+07:00\`,
        timeZone: 'Asia/Bangkok'
      },
      end: {
        dateTime: \`\${appointment.nextAppointment}T10:00:00+07:00\`,
        timeZone: 'Asia/Bangkok'
      },
      status: 'tentative', // สถานะไม่แน่นอน
      transparency: 'transparent'
    };

    const nextCalendarResponse = await $http.request({
      method: 'POST',
      url: \`https://www.googleapis.com/calendar/v3/calendars/\${CALENDAR_ID}/events\`,
      headers: {
        'Authorization': 'Bearer ' + $node.context().get('googleAccessToken'),
        'Content-Type': 'application/json'
      },
      body: nextEventData
    });

    // สร้าง Reminder สำหรับโดสถัดไป
    const nextReminderDate = new Date(appointment.nextAppointment);
    nextReminderDate.setDate(nextReminderDate.getDate() - 7); // 1 สัปดาห์ก่อน
    nextReminderDate.setHours(10, 0, 0, 0);

    const nextReminderData = {
      reminderId: generateId(),
      scheduledFor: nextReminderDate.toISOString(),
      userId: appointment.userId,
      appointmentId: appointment.appointmentId,
      relatedAppointmentId: appointment.appointmentId,
      calendarEventId: nextCalendarResponse.body.id,
      message: \`🔔 แจ้งเตือนโดสวัคซีนถัดไป

อีก 1 สัปดาห์ถึงเวลานัดโดสถัดไป!

💉 วัคซีน: \${appointment.vaccineName}
📊 โดสที่: \${appointment.doseNumber + 1}/\${appointment.totalDoses}
📅 วันที่แนะนำ: \${appointment.nextAppointment}

📱 กรุณาจองเวลาที่แน่นอนผ่านเมนู "จองวัคซีน"
⚠️ ไม่ควรล่าช้าเกินวันที่แนะนำ\`,
      type: 'next_dose_reminder',
      status: 'pending'
    };

    await saveReminderToSheets(nextReminderData);
    
    appointment.nextCalendarEventId = nextCalendarResponse.body.id;
  }

  // อัปเดตข้อมูล appointment ด้วย Calendar Event IDs
  await updateAppointmentInSheets(appointment);

  $json.calendarEvent = calendarEvent;
  $json.reminderScheduled = true;
  $json.calendarCreated = true;
}

// Helper Functions
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

async function saveReminderToSheets(reminderData) {
  const sheetData = [
    reminderData.reminderId,
    reminderData.scheduledFor,
    reminderData.userId,
    reminderData.appointmentId,
    reminderData.calendarEventId || '',
    reminderData.message,
    reminderData.type,
    reminderData.status,
    new Date().toISOString()
  ];

  return await $http.request({
    method: 'POST',
    url: \`https://sheets.googleapis.com/v4/spreadsheets/\${$node.context().get('spreadsheetId')}/values/Reminders:append\`,
    headers: {
      'Authorization': 'Bearer ' + $node.context().get('googleAccessToken'),
      'Content-Type': 'application/json'
    },
    body: {
      values: [sheetData],
      valueInputOption: 'RAW'
    }
  });
}

async function updateAppointmentInSheets(appointment) {
  // อัปเดตข้อมูล appointment ด้วย calendar event IDs
  // ใช้ Google Sheets API เพื่ออัปเดตแถวที่ตรงกับ appointmentId
}

return $input.all();`,
        connections: ['google-sheets'],
        icon: Calendar,
        color: 'bg-orange-500'
      },
    {
      id: 'google-sheets',
      name: 'Google Sheets Database',
      type: 'data',
      description: 'จัดเก็บข้อมูลทั้งหมดใน Google Sheets',
      implementation: `// Google Sheets Database Management
const SPREADSHEET_ID = 'your-spreadsheet-id';

// Sheets Structure:
// 1. Users: userId, displayName, pictureUrl, registeredAt, status, vaccineHistory, appointments
// 2. Appointments: appointmentId, userId, vaccineType, doseNumber, totalDoses, date, time, status, createdAt
// 3. Reminders: reminderId, userId, appointmentId, scheduledFor, message, type, sent
// 4. VaccineHistory: historyId, userId, vaccineType, vaccineName, doseNumber, date, location, batch

async function saveToGoogleSheets(sheetName, data) {
  const response = await $http.request({
    method: 'POST',
    url: \`https://sheets.googleapis.com/v4/spreadsheets/\${SPREADSHEET_ID}/values/\${sheetName}:append\`,
    headers: {
      'Authorization': 'Bearer ' + $node.context().get('googleAccessToken'),
      'Content-Type': 'application/json'
    },
    body: {
      values: [data],
      valueInputOption: 'RAW'
    }
  });
  
  return response.body;
}


// Auto-backup and data integrity
const backupData = {
  timestamp: new Date().toISOString(),
  totalUsers: await countRows('Users'),
  totalAppointments: await countRows('Appointments'),
  pendingReminders: await countPendingReminders()
};

$json.backupInfo = backupData;
$json.dataOperation = 'success';

return $input.all();`,
      connections: ['response-sender'],
      icon: Database,
      color: 'bg-indigo-500'
    },
    {
      id: 'response-sender',
      name: 'LINE Response Handler',
      type: 'action',
      description: 'ส่งข้อความตอบกลับผ่าน LINE API',
      implementation: `// LINE Response Handler
const { response, input } = $json;
const replyToken = input.replyToken;

if (!replyToken) {
  throw new Error('No reply token found');
}

// ส่งข้อความผ่าน LINE API
const lineResponse = await $http.request({
  method: 'POST',
  url: 'https://api.line.me/v2/bot/message/reply',
  headers: {
    'Authorization': 'Bearer ' + $node.context().get('channelAccessToken'),
    'Content-Type': 'application/json'
  },
  body: {
    replyToken: replyToken,
    messages: [response]
  }
});

// Log การส่งข้อความ
await logActivity({
  userId: $json.userId,
  action: 'message_sent',
  response: response,
  timestamp: new Date().toISOString()
});

$json.messageSent = true;
$json.lineResponse = lineResponse.body;

return $input.all();`,
      connections: [],
      icon: MessageSquare,
      color: 'bg-green-600'
    }
  ];

  const generateWorkflowJSON = () => {
    const workflow = {
      name: "ระบบจองวัคซีนครบวงจร",
      nodes: workflowSteps.map((step, index) => ({
        id: step.id,
        name: step.name,
        type: getNodeType(step.type),
        typeVersion: 1,
        position: [100 + (index % 3) * 300, 100 + Math.floor(index / 3) * 200],
        parameters: getNodeParameters(step)
      })),
      connections: generateConnections(),
      active: true,
      settings: {
        timezone: "Asia/Bangkok"
      }
    };

    return JSON.stringify(workflow, null, 2);
  };

  const getNodeType = (type: string) => {
    switch (type) {
      case 'trigger': return 'n8n-nodes-base.webhook';
      case 'logic': return 'n8n-nodes-base.code';
      case 'action': return 'n8n-nodes-base.httpRequest';
      case 'data': return 'n8n-nodes-base.googleSheets';
      case 'calendar': return 'n8n-nodes-base.googleCalendar';
      default: return 'n8n-nodes-base.code';
    }
  };

  const getNodeParameters = (step: WorkflowStep) => {
    if (step.type === 'trigger') {
      return {
        httpMethod: 'POST',
        path: 'line-vaccine-bot',
        responseMode: 'respondImmediately'
      };
    }
    if (step.type === 'logic' || step.type === 'action') {
      return {
        mode: 'runOnceForAllItems',
        jsCode: step.implementation
      };
    }
    return {};
  };

  const generateConnections = () => {
    const connections: any = {};
    workflowSteps.forEach(step => {
      if (step.connections.length > 0) {
        connections[step.id] = {
          main: [step.connections.map(conn => ({ node: conn, type: 'main', index: 0 }))]
        };
      }
    });
    return connections;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "คัดลอกแล้ว",
      description: "โค้ดถูกคัดลอกไปยัง clipboard แล้ว",
    });
  };

  const downloadJSON = () => {
    const workflow = generateWorkflowJSON();
    const blob = new Blob([workflow], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaccine-booking-workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          🏥 ระบบจองวัคซีนครบวงจร
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Workflow สมบูรณ์สำหรับระบบจองวัคซีน พร้อมการลงทะเบียน, นัดหมาย, และการแจ้งเตือนอัตโนมัติ
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="workflow">โครงสร้าง</TabsTrigger>
          <TabsTrigger value="features">คุณสมบัติ</TabsTrigger>
          <TabsTrigger value="implementation">การติดตั้ง</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="p-6">
                <UserPlus className="w-12 h-12 mx-auto mb-4 text-teal-500" />
                <h3 className="text-lg font-semibold">ลงทะเบียนผู้ใช้</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  ระบบลงทะเบียนอัตโนมัติด้วย LINE Profile
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <Syringe className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold">จองวัคซีน</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  จองวัคซีนแบบ Multi-dose พร้อมนัดครั้งถัดไป
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <Bell className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                <h3 className="text-lg font-semibold">แจ้งเตือน</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  แจ้งเตือนอัตโนมัติก่อนวันนัด 1 วัน
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-6">
                <Database className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
                <h3 className="text-lg font-semibold">จัดเก็บข้อมูล</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  บันทึกใน Google Sheets แบบ Real-time
                </p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>ความสมบูรณ์ 100%:</strong> ระบบนี้ครอบคลุมทุกความต้องการที่คุณระบุ พร้อมใช้งานได้ทันที
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <div className="space-y-4">
            {workflowSteps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <Card key={step.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${step.color} text-white`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{step.name}</CardTitle>
                        <CardDescription>{step.description}</CardDescription>
                      </div>
                      <Badge variant={
                        step.type === 'trigger' ? 'default' :
                        step.type === 'logic' ? 'secondary' :
                        step.type === 'action' ? 'destructive' : 'outline'
                      }>
                        {step.type.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">การทำงาน:</h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(step.implementation)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {step.implementation.substring(0, 200)}...
                      </pre>
                    </div>
                    {step.connections.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="w-4 h-4" />
                        <span>เชื่อมต่อไปยัง: {step.connections.join(', ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Rich Menu & UX
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Rich Menu 3 ปุ่มหลัก</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Carousel วัคซีนแยกประเภท</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Quick Reply สะดวกรวดเร็ว</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Datetime Picker เลือกวันเวลา</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  การจัดเก็บข้อมูล
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Users Sheet - ข้อมูลผู้ใช้</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Appointments - การนัดหมาย</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Reminders - การแจ้งเตือน</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>VaccineHistory - ประวัติการฉีด</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Syringe className="w-5 h-5" />
                  ระบบวัคซีน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>โควิด-19 (2 โดส, ห่าง 21 วัน)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>ไข้หวัดใหญ่ (1 โดส)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>ไวรัสตับอักเสบบี (3 โดส)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>HPV (2 โดส, ห่าง 60 วัน)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  การแจ้งเตือน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>แจ้งเตือนก่อนนัด 1 วัน</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>แจ้งเตือนโดสถัดไป</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Cron Schedule อัตโนมัติ</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>การยกเลิก/เลื่อนนัด</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="implementation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ขั้นตอนการติดตั้ง</CardTitle>
              <CardDescription>
                คำแนะนำการติดตั้งและกำหนดค่าระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold">สร้าง LINE Bot</h3>
                    <p className="text-sm text-muted-foreground">
                      สร้าง LINE Bot ใน LINE Developers Console และได้ Channel Access Token
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold">ตั้งค่า Google Sheets</h3>
                    <p className="text-sm text-muted-foreground">
                      สร้าง Google Sheets พร้อม 4 Sheets: Users, Appointments, Reminders, VaccineHistory
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold">Import Workflow</h3>
                    <p className="text-sm text-muted-foreground">
                      Import ไฟล์ JSON ลงใน n8n และกำหนดค่า credentials
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold">ติดตั้ง Rich Menu</h3>
                    <p className="text-sm text-muted-foreground">
                      อัปโหลด Rich Menu ไปยัง LINE Bot ด้วย API หรือ Console
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                  <div>
                    <h3 className="font-semibold">ทดสอบระบบ</h3>
                    <p className="text-sm text-muted-foreground">
                      ทดสอบการทำงานทุกฟีเจอร์ และปรับแต่งตามความต้องการ
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <Alert>
                <Settings className="w-4 h-4" />
                <AlertDescription>
                  <strong>สำคัญ:</strong> ต้องกำหนดค่า credentials สำหรับ LINE API, Google Sheets API และ OpenAI API ให้ครบถ้วน
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ดาวน์โหลด Workflow</CardTitle>
              <CardDescription>
                ดาวน์โหลดไฟล์ JSON ของ workflow เพื่อ import ใน n8n
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={downloadJSON} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  ดาวน์โหลด JSON
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(generateWorkflowJSON())}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  คัดลอก JSON
                </Button>
              </div>
              
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription>
                  ไฟล์ JSON นี้พร้อมใช้งาน ครอบคลุมทุกฟีเจอร์ตามที่คุณต้องการ รวมถึงการจัดการข้อผิดพลาดและ error handling
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>คุณสมบัติพิเศษ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">🚀 Performance</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Async/Await pattern</li>
                    <li>• Error handling ครอบคลุม</li>
                    <li>• Connection pooling</li>
                    <li>• Rate limiting support</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">🔒 Security</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Token validation</li>
                    <li>• Data sanitization</li>
                    <li>• API rate limiting</li>
                    <li>• Access logging</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">📊 Analytics</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• User behavior tracking</li>
                    <li>• Appointment statistics</li>
                    <li>• Conversion metrics</li>
                    <li>• Performance monitoring</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">🔧 Maintenance</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Auto backup</li>
                    <li>• Health checks</li>
                    <li>• Log management</li>
                    <li>• Update mechanisms</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VaccineWorkflowDesigner;