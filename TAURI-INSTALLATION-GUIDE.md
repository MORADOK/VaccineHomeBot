# 🚀 คู่มือติดตั้งและใช้งาน Tauri Desktop App

## 📋 ความต้องการของระบบ

### Windows
- Windows 10/11 (64-bit)
- WebView2 Runtime (จะติดตั้งอัตโนมัติ)
- 4 GB RAM ขึ้นไป
- 500 MB พื้นที่ว่าง

### macOS
- macOS 10.15+ (Catalina or later)
- 4 GB RAM ขึ้นไป
- 500 MB พื้นที่ว่าง

### Linux
- Ubuntu 20.04+ / Debian 11+ / Fedora 35+
- WebKitGTK 4.0
- 4 GB RAM ขึ้นไป
- 500 MB พื้นที่ว่าง

---

## 🔧 การติดตั้งสำหรับผู้พัฒนา

### 1. ติดตั้ง Dependencies

#### Windows
```bash
# ติดตั้ง Rust
winget install --id=Rustlang.Rust.MSVC -e

# ติดตั้ง Node.js (ถ้ายังไม่มี)
winget install OpenJS.NodeJS

# รีสตาร์ต terminal หลังติดตั้ง
```

#### macOS
```bash
# ติดตั้ง Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# ติดตั้ง Xcode Command Line Tools
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
# ติดตั้ง dependencies
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# ติดตั้ง Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Clone และ Setup โปรเจค

```bash
# Clone repository
git clone <your-repo-url>
cd VaccineHomeBot

# ติดตั้ง Node dependencies
npm install

# ตรวจสอบว่า Tauri CLI ถูกติดตั้ง
npx tauri --version
```

### 3. Development Mode

```bash
# รันในโหมดพัฒนา (Hot Reload)
npm run dev:tauri

# หรือแยกคำสั่ง
npm run dev          # รัน Vite dev server
npm run tauri dev    # รัน Tauri app (ในหน้าต่างใหม่)
```

### 4. Build สำหรับ Production

```bash
# Build สำหรับระบบปัจจุบัน
npm run build:tauri

# หรือใช้ Tauri CLI โดยตรง
npx tauri build

# ไฟล์ที่ build จะอยู่ที่:
# - Windows: src-tauri/target/release/bundle/nsis/
# - macOS: src-tauri/target/release/bundle/dmg/
# - Linux: src-tauri/target/release/bundle/appimage/
```

---

## 📦 การติดตั้งสำหรับผู้ใช้งาน

### Windows

1. ดาวน์โหลดไฟล์ `VCHome Hospital_1.0.0_x64-setup.exe`
2. ดับเบิ้ลคลิกเพื่อติดตั้ง
3. ถ้า Windows Defender แจ้งเตือน:
   - คลิก "More info"
   - คลิก "Run anyway"
4. ทำตามขั้นตอนการติดตั้ง
5. เปิดใช้งานจาก Desktop หรือ Start Menu

### macOS

1. ดาวน์โหลดไฟล์ `.dmg`
2. เปิดไฟล์ .dmg
3. ลากไอคอนแอปไปที่ Applications folder
4. เปิดแอปครั้งแรก:
   - Right-click แอป → Open
   - คลิก "Open" อีกครั้งเมื่อมีการเตือน
5. ครั้งถัดไปเปิดตามปกติได้

### Linux

#### AppImage (แนะนำ)
```bash
# ดาวน์โหลดแล้วทำให้รันได้
chmod +x VCHome-Hospital_1.0.0_amd64.AppImage

# รันเลย
./VCHome-Hospital_1.0.0_amd64.AppImage
```

#### Debian/Ubuntu (.deb)
```bash
# ติดตั้งจากไฟล์ .deb
sudo dpkg -i vchome-hospital_1.0.0_amd64.deb

# แก้ไข dependencies (ถ้ามี)
sudo apt-get install -f
```

---

## 🔍 การแก้ปัญหา

### Windows

#### ปัญหา: "WebView2 Runtime not found"
```bash
# ติดตั้ง WebView2 Runtime manually
# ดาวน์โหลดจาก: https://developer.microsoft.com/microsoft-edge/webview2/
```

#### ปัญหา: แอปไม่เปิด (จอขาว)
1. ลบโฟลเดอร์ cache: `%APPDATA%/io.moradok.vchomehospital`
2. Restart แอป

### macOS

#### ปัญหา: "App can't be opened"
```bash
# ลบ quarantine attribute
xattr -cr /Applications/VCHome\ Hospital.app
```

#### ปัญหา: แอปช้าหรือค้าง
```bash
# Clear cache
rm -rf ~/Library/Application\ Support/io.moradok.vchomehospital
```

### Linux

#### ปัญหา: Missing libraries
```bash
# Ubuntu/Debian
sudo apt-get install libwebkit2gtk-4.1-0 libayatana-appindicator3-1

# Fedora
sudo dnf install webkit2gtk4.1 libappindicator-gtk3

# Arch
sudo pacman -S webkit2gtk libappindicator-gtk3
```

---

## 🔒 Security Features

Tauri Desktop App มี security features ดังนี้:

1. **Content Security Policy (CSP)**
   - จำกัดการโหลด resources จาก external sources
   - ป้องกัน XSS attacks

2. **Context Isolation**
   - แยก JavaScript context ระหว่าง app กับ webview

3. **Secure IPC**
   - การสื่อสารระหว่าง frontend และ backend ผ่าน secure channels

4. **No Node.js Integration**
   - ไม่เปิดให้เข้าถึง Node.js APIs โดยตรง

---

## 📝 Configuration Files

### tauri.conf.json
- การตั้งค่าหลักของ Tauri app
- CSP policy
- Window configuration
- Bundle settings

### Cargo.toml
- Rust dependencies
- Build configuration

### .env
- Environment variables (Supabase credentials)

---

## 🎯 คำสั่งที่ใช้บ่อย

```bash
# Development
npm run dev:tauri              # รันในโหมดพัฒนา
npm run tauri info            # แสดงข้อมูลระบบ

# Building
npm run build:tauri           # Build สำหรับระบบปัจจุบัน
npx tauri build --debug       # Build แบบ debug

# Debugging
npx tauri dev --verbose       # รันพร้อม debug logs
RUST_BACKTRACE=1 npm run dev:tauri  # แสดง Rust stack traces
```

---

## 📊 ขนาดไฟล์

| Platform | Installer Size | Installed Size |
|----------|---------------|----------------|
| Windows (NSIS) | ~15-20 MB | ~40-50 MB |
| macOS (DMG) | ~10-15 MB | ~30-40 MB |
| Linux (AppImage) | ~20-25 MB | ~45-55 MB |

---

## 🚀 Performance Tips

1. **Optimize Build**
   ```bash
   # Build with optimizations
   npx tauri build --config src-tauri/tauri.conf.json
   ```

2. **Reduce Bundle Size**
   - ใช้ code splitting ใน Vite
   - Tree-shaking unused dependencies
   - Optimize images และ assets

3. **Faster Startup**
   - Lazy load heavy components
   - Use React.lazy() และ Suspense
   - Minimize initial bundle size

---

## 🔄 Updates

### Auto-update (Coming Soon)
Tauri รองรับ auto-update ผ่าน tauri-plugin-updater

### Manual Update
1. ดาวน์โหลด version ใหม่
2. ติดตั้งทับ version เก่า
3. Settings และ data จะไม่สูญหาย

---

## 📞 Support

- 🐛 พบ Bug: [เปิด Issue](https://github.com/MORADOK/VaccineHomeBot/issues)
- 📖 Documentation: [Tauri Docs](https://tauri.app/)
- 💬 Community: [Tauri Discord](https://discord.com/invite/tauri)

---

## 📄 License

Copyright © 2024 VCHome Hospital. All rights reserved.

---

**สร้างด้วย ❤️ โดย Tauri + React + TypeScript**
