# 🔄 คู่มือระบบอัปเดตอัตโนมัติ VCHome Hospital Desktop App

## 📖 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การทำงานของระบบ](#การทำงานของระบบ)
3. [การใช้งานสำหรับผู้ใช้](#การใช้งานสำหรับผู้ใช้)
4. [การ Deploy เวอร์ชันใหม่](#การ-deploy-เวอร์ชันใหม่)
5. [การตั้งค่าและปรับแต่ง](#การตั้งค่าและปรับแต่ง)
6. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

---

## 🎯 ภาพรวมระบบ

ระบบ Auto-Update ของ VCHome Hospital Desktop App ช่วยให้ผู้ใช้สามารถอัปเดตโปรแกรมเป็นเวอร์ชันล่าสุดได้โดยอัตโนมัติ **โดยไม่ต้องดาวน์โหลดและติดตั้งใหม่ทั้งหมด**

### ✨ คุณสมบัติหลัก

- ✅ **ตรวจสอบอัปเดตอัตโนมัติ** - ตรวจสอบทุก 4 ชั่วโมงหรือเมื่อเปิดโปรแกรม
- ✅ **ดาวน์โหลดในพื้นหลัง** - ดาวน์โหลดขณะใช้งานโปรแกรมต่อได้
- ✅ **แสดงความคืบหน้า** - แสดง progress bar และความเร็วในการดาวน์โหลด
- ✅ **ติดตั้งอัตโนมัติ** - ติดตั้งเมื่อปิดโปรแกรม หรือติดตั้งทันทีได้
- ✅ **ปลอดภัย** - ตรวจสอบ checksum (SHA-512) ก่อนติดตั้ง
- ✅ **Retry อัตโนมัติ** - ลองใหม่อัตโนมัติหากเกิดข้อผิดพลาดจากเครือข่าย
- ✅ **การแจ้งเตือนภาษาไทย** - UI และข้อความทั้งหมดเป็นภาษาไทย

### 🏗️ สถาปัตยกรรม

```
┌─────────────────────────────────────────┐
│   GitHub Releases (Update Server)       │
│   - ไฟล์ .exe, .dmg, .AppImage          │
│   - latest.yml (metadata)               │
│   - SHA-512 checksums                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Electron Main Process                 │
│   - auto-updater.js (update logic)      │
│   - update-manager.js (state mgmt)      │
│   - electron.js (IPC handlers)          │
└─────────────────┬───────────────────────┘
                  │ IPC Events
                  ▼
┌─────────────────────────────────────────┐
│   React Renderer Process                │
│   - use-auto-update.ts (hook)           │
│   - UpdateNotification.tsx (UI)         │
│   - Update Dialogs (existing)           │
└─────────────────────────────────────────┘
```

---

## ⚙️ การทำงานของระบบ

### 1. การตรวจสอบอัปเดต (Check for Updates)

```
เปิดโปรแกรม → รอ 5 วินาที → ตรวจสอบอัปเดตจาก GitHub Releases
                                ↓
                        มีเวอร์ชันใหม่?
                        ↓               ↓
                       ใช่             ไม่
                        ↓               ↓
                แสดง Notification   ไม่แสดงอะไร
```

**ความถี่ในการตรวจสอบ:**
- เมื่อเปิดโปรแกรม: หลัง 5 วินาที
- ระหว่างใช้งาน: ทุก 4 ชั่วโมง
- Manual: กด "Check for Updates" ใน Help menu

### 2. การดาวน์โหลดอัปเดต (Download Update)

```
ผู้ใช้กดปุ่ม "ดาวน์โหลด" → ดาวน์โหลดไฟล์จาก GitHub
                              ↓
                    แสดง Progress Bar (%)
                              ↓
                    ตรวจสอบ SHA-512 Checksum
                              ↓
                          สำเร็จ?
                          ↓      ↓
                         ใช่    ไม่
                          ↓      ↓
              แสดง "พร้อมติดตั้ง"  Retry/Error
```

**ไฟล์ดาวน์โหลดเก็บที่:** `%APPDATA%/VCHome Hospital/pending/`

### 3. การติดตั้งอัปเดต (Install Update)

```
ผู้ใช้เลือก → ติดตั้งเดี๋ยวนี้ → ปิดโปรแกรม + ติดตั้ง + รีสตาร์ท
            ↓
         ติดตั้งทีหลัง → ติดตั้งอัตโนมัติเมื่อปิดโปรแกรม
```

---

## 👥 การใช้งานสำหรับผู้ใช้

### วิธีที่ 1: อัปเดตอัตโนมัติ (แนะนำ)

1. **เปิดโปรแกรม** - ระบบจะตรวจสอบอัปเดตอัตโนมัติหลัง 5 วินาที
2. **เห็น Notification** - มุมขวาล่างแสดง "มีเวอร์ชันใหม่!"
3. **กดปุ่ม "ดาวน์โหลดเดี๋ยวนี้"** - ดาวน์โหลดในพื้นหลัง
4. **รอให้ดาวน์โหลดเสร็จ** - แสดง progress bar
5. **เลือก "ติดตั้งเดี๋ยวนี้"** หรือ **"ทีหลัง"**
   - **ติดตั้งเดี๋ยวนี้:** โปรแกรมจะปิดและติดตั้งทันที
   - **ทีหลัง:** ติดตั้งอัตโนมัติเมื่อปิดโปรแกรมปกติ

### วิธีที่ 2: ตรวจสอบด้วยตนเอง

1. เปิดโปรแกรม
2. คลิกเมนู **Help → Check for Updates...**
3. รอผลการตรวจสอบ
4. ทำตามขั้นตอนเหมือนวิธีที่ 1

### วิธีที่ 3: ดาวน์โหลดแบบ Manual (กรณีเกิดข้อผิดพลาด)

1. เข้าไปที่: https://github.com/MORADOK/VaccineHomeBot/releases/latest
2. ดาวน์โหลดไฟล์ที่เหมาะกับระบบปฏิบัติการ:
   - Windows: `VCHome-Hospital-Setup.exe` หรือ `VCHome-Hospital-Portable.exe`
   - macOS: `VCHome-Hospital.dmg`
   - Linux: `VCHome-Hospital.AppImage` หรือ `.deb`
3. ติดตั้งตามปกติ

---

## 🚀 การ Deploy เวอร์ชันใหม่

### ขั้นตอนสำหรับ Developer

#### 1. อัปเดตเวอร์ชันใน `package.json`

```json
{
  "version": "1.0.21"  // เปลี่ยนจาก 1.0.20 เป็น 1.0.21
}
```

#### 2. Build แอปพลิเคชัน

```bash
# Build โปรแกรม
npm run build

# Build installer สำหรับแต่ละ platform
npm run dist-win      # Windows (.exe, portable)
npm run dist-mac      # macOS (.dmg)
npm run dist-linux    # Linux (.AppImage, .deb)
```

#### 3. สร้าง Git Tag และ Push

```bash
# สร้าง tag
git tag -a v1.0.21 -m "Release version 1.0.21"

# Push tag ไปยัง GitHub
git push origin v1.0.21
```

#### 4. สร้าง GitHub Release

##### วิธีที่ 1: ใช้ GitHub Actions (อัตโนมัติ - แนะนำ)

ถ้ามี GitHub Actions workflow:

```yaml
# .github/workflows/build.yml
name: Build and Release
on:
  push:
    tags:
      - 'v*'  # Trigger on version tags

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npm run build
          npm run publish-${{ matrix.os }}
```

##### วิธีที่ 2: Manual Upload

1. ไปที่ GitHub → Releases → "Draft a new release"
2. **Tag version:** v1.0.21
3. **Release title:** v1.0.21 - [คำอธิบายสั้นๆ]
4. **Description (Release Notes):**
   ```markdown
   ## 🎉 VCHome Hospital v1.0.21

   ### ✨ New Features
   - เพิ่มระบบอัปเดตอัตโนมัติ
   - เพิ่มฟีเจอร์เลือกขนาดกระดาษสำหรับพิมพ์บัตรนัด

   ### 🐛 Bug Fixes
   - แก้ไขปัญหาการคำนวณวันนัด
   - แก้ไขปัญหา...

   ### 📦 Installation
   ดาวน์โหลดไฟล์ที่เหมาะกับระบบปฏิบัติการของคุณ
   ```

5. **Upload files จาก `release/` folder:**
   - `VCHome-Hospital-Setup-1.0.21.exe`
   - `VCHome-Hospital-Portable-1.0.21.exe`
   - `VCHome-Hospital-1.0.21.dmg`
   - `VCHome-Hospital-1.0.21.AppImage`
   - `VCHome-Hospital-1.0.21.deb`
   - `latest.yml` (สำคัญ! ต้องมีไฟล์นี้)

6. **Publish release**

#### 5. ตรวจสอบการอัปเดต

```bash
# ใช้ script ตรวจสอบ
npm run verify-publish

# หรือตรวจสอบ URL โดยตรง
curl https://github.com/MORADOK/VaccineHomeBot/releases/latest/download/latest.yml
```

---

## 🔧 การตั้งค่าและปรับแต่ง

### ตั้งค่าใน `package.json`

```json
{
  "build": {
    "appId": "com.vchomehospital.vaccine-app",
    "publish": [
      {
        "provider": "github",
        "owner": "MORADOK",
        "repo": "VaccineHomeBot"
      }
    ],
    "win": {
      "verifyUpdateCodeSignature": false  // ปิด code signing
    }
  }
}
```

### ตั้งค่าใน `auto-updater.js`

```javascript
// ดาวน์โหลดอัตโนมัติเมื่อพบอัปเดต
autoUpdater.autoDownload = false;  // false = ถามผู้ใช้ก่อน

// ติดตั้งอัตโนมัติเมื่อปิดโปรแกรม
autoUpdater.autoInstallOnAppQuit = true;  // true = ติดตั้งอัตโนมัติ

// อนุญาต downgrade (สำหรับทดสอบ)
autoUpdater.allowDowngrade = false;

// ความถี่ในการตรวจสอบ (milliseconds)
const checkInterval = 4 * 60 * 60 * 1000;  // 4 ชั่วโมง
```

### Preferences ที่ผู้ใช้สามารถปรับได้

```typescript
interface UpdatePreferences {
  autoDownload: boolean;           // ดาวน์โหลดอัตโนมัติ
  autoInstallOnAppQuit: boolean;   // ติดตั้งเมื่อปิดโปรแกรม
  checkOnStartup: boolean;         // ตรวจสอบเมื่อเปิดโปรแกรม
  checkInterval: number;           // ช่วงเวลาตรวจสอบ (ms)
}
```

เก็บไว้ที่: `%APPDATA%/VCHome Hospital/update-preferences.json`

---

## 🔍 การแก้ไขปัญหา

### ปัญหา 1: ไม่พบอัปเดต

**อาการ:**
- แสดง "ใช้เวอร์ชันล่าสุดอยู่แล้ว" ทั้งที่มีเวอร์ชันใหม่

**วิธีแก้:**
1. ตรวจสอบว่ามี `latest.yml` ใน GitHub Release หรือไม่
2. ตรวจสอบ version ใน `package.json` ว่าเพิ่มขึ้นจริง
3. ตรวจสอบ GitHub Release ว่าเป็น "Latest" หรือ "Pre-release"
4. ล้าง cache: ลบโฟลเดอร์ `%APPDATA%/VCHome Hospital/pending/`

### ปัญหา 2: ดาวน์โหลดไม่สำเร็จ

**อาการ:**
- แสดง "Network error" หรือ "Download failed"

**วิธีแก้:**
1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
2. ปิด Firewall/Antivirus ชั่วคราว
3. ลองใหม่อีกครั้ง (ระบบจะ retry อัตโนมัติ 3 ครั้ง)
4. ดาวน์โหลดแบบ Manual จาก GitHub

### ปัญหา 3: Checksum ไม่ตรงกัน

**อาการ:**
- แสดง "Download integrity verification failed"

**วิธีแก้:**
1. ลบไฟล์ที่ดาวน์โหลดไว้: `%APPDATA%/VCHome Hospital/pending/`
2. ลองดาวน์โหลดใหม่
3. ตรวจสอบว่าไฟล์ใน GitHub Release ไม่เสียหาย

### ปัญหา 4: ติดตั้งไม่ได้

**อาการ:**
- แสดง "Permission denied" หรือ "EACCES"

**วิธีแก้:**
1. รันโปรแกรมด้วยสิทธิ์ Administrator
2. ตรวจสอบว่าไม่มีโปรแกรมตัวอื่นทำงานอยู่
3. ปิด Antivirus ชั่วคราว
4. ติดตั้งแบบ Manual

### ปัญหา 5: อัปเดตไม่ทำงานใน Development Mode

**อาการ:**
- แสดง "Auto-update not available in development mode"

**สาเหตุ:**
- ระบบ auto-update ไม่ทำงานใน development mode (npm run dev)

**วิธีแก้:**
- ทดสอบใน production build:
  ```bash
  npm run build
  npm run dist-win  # หรือ platform อื่น
  # รันไฟล์ .exe ที่ได้
  ```

### ดูข้อมูล Debug

**Log Files:**
- Windows: `%APPDATA%/VCHome Hospital/logs/`
- macOS: `~/Library/Logs/VCHome Hospital/`
- Linux: `~/.config/VCHome Hospital/logs/`

**ดู Update Logs:**
```typescript
// ใช้ IPC
const logs = await invoke('get-update-logs');
console.log(logs);
```

---

## 📊 สถิติและข้อมูล

### ขนาดไฟล์โดยประมาณ

- Windows Installer (.exe): ~200-300 MB
- Windows Portable (.exe): ~200-300 MB
- macOS (.dmg): ~250-350 MB
- Linux (.AppImage): ~200-300 MB
- Linux (.deb): ~200-300 MB

### เวลาในการดาวน์โหลด (โดยประมาณ)

| ความเร็วเน็ต | เวลาที่ใช้ |
|-------------|----------|
| 10 Mbps     | ~5 นาที  |
| 50 Mbps     | ~1 นาที  |
| 100 Mbps    | ~30 วินาที |

---

## 🔒 ความปลอดภัย

### การตรวจสอบความถูกต้อง

1. **SHA-512 Checksum** - ตรวจสอบทุกไฟล์ก่อนติดตั้ง
2. **HTTPS Only** - ดาวน์โหลดผ่าน HTTPS เท่านั้น
3. **GitHub Releases** - ใช้ GitHub เป็น CDN ที่เชื่อถือได้
4. **No Code Execution** - ไม่รันโค้ดจาก server

### Best Practices

- ✅ ใช้ Git Tags สำหรับทุกเวอร์ชัน
- ✅ เขียน Release Notes ที่ชัดเจน
- ✅ ทดสอบบน platform ทั้งหมดก่อน release
- ✅ สำรองข้อมูลก่อนอัปเดต
- ✅ ไม่ลบ Release เก่าออกทันที (เพื่อ rollback ได้)

---

## 📞 ติดต่อและช่วยเหลือ

**พบปัญหา?**
- Report issue: https://github.com/MORADOK/VaccineHomeBot/issues

**เอกสารเพิ่มเติม:**
- Electron Builder: https://www.electron.build
- electron-updater: https://www.electron.build/auto-update

---

## 📝 Changelog

### v1.0.21
- ✨ เพิ่มระบบอัปเดตอัตโนมัติครบทุกฟีเจอร์
- ✨ เพิ่มฟีเจอร์เลือกขนาดกระดาษสำหรับพิมพ์บัตรนัด
- 🐛 แก้ไขปัญหาการคำนวณวันนัด

### v1.0.20
- 🐛 แก้ไขปัญหา...

---

**สร้างโดย:** Claude Code (Anthropic AI)
**อัปเดตล่าสุด:** 12 มิถุนายน 2026
**License:** MIT
