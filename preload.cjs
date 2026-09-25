// public/preload.js
const { contextBridge } = require('electron');

// โชว์ตัวอย่าง API ปลอดภัย (ขยายได้ทีหลัง)
contextBridge.exposeInMainWorld('api', {
  ping: () => 'pong'
});
