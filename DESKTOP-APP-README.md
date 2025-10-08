# VCHome Hospital Desktop Application

## 🖥️ Desktop App Overview

VCHome Hospital Management System is now available as a desktop application for Windows, macOS, and Linux. The desktop version provides the same functionality as the web version with additional benefits:

### ✨ Benefits of Desktop App
- **Offline Capabilities**: Work without internet connection (limited features)
- **Native OS Integration**: System notifications, file associations
- **Better Performance**: Optimized for desktop use
- **Security**: Runs in isolated environment
- **Auto Updates**: Automatic application updates
- **Professional Feel**: Native window controls and menus

## 🚀 Development Commands

### Development Mode
```bash
# Start development server with Electron
npm run electron-dev
```

### Building for Production

#### Windows
```bash
# Build Windows installer (.exe)
npm run dist-win

# Output: dist/VCHome Hospital Setup 1.0.0.exe
# Output: dist/VCHome-Hospital-Portable.exe
```

#### macOS
```bash
# Build macOS app (.dmg)
npm run dist-mac

# Output: dist/VCHome Hospital-1.0.0.dmg
```

#### Linux
```bash
# Build Linux packages
npm run dist-linux

# Output: dist/VCHome Hospital-1.0.0.AppImage
# Output: dist/vchome-hospital-desktop_1.0.0_amd64.deb
```

#### All Platforms
```bash
# Build for all platforms
npm run dist
```

## 📦 Installation

### Windows
1. Download `VCHome Hospital Setup 1.0.0.exe`
2. Run the installer
3. Follow installation wizard
4. Launch from Start Menu or Desktop shortcut

### Windows Portable
1. Download `VCHome-Hospital-Portable.exe`
2. Run directly (no installation required)
3. Can be run from USB drive

### macOS
1. Download `VCHome Hospital-1.0.0.dmg`
2. Open the DMG file
3. Drag app to Applications folder
4. Launch from Applications or Launchpad

### Linux
#### AppImage (Universal)
1. Download `VCHome Hospital-1.0.0.AppImage`
2. Make executable: `chmod +x VCHome\ Hospital-1.0.0.AppImage`
3. Run: `./VCHome\ Hospital-1.0.0.AppImage`

#### Debian/Ubuntu
1. Download `vchome-hospital-desktop_1.0.0_amd64.deb`
2. Install: `sudo dpkg -i vchome-hospital-desktop_1.0.0_amd64.deb`
3. Launch from applications menu

## 🔧 Configuration

### Environment Variables
The desktop app uses the same environment variables as the web version:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Settings Location
- **Windows**: `%APPDATA%/VCHome Hospital/`
- **macOS**: `~/Library/Application Support/VCHome Hospital/`
- **Linux**: `~/.config/VCHome Hospital/`

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Start development: `npm run electron-dev`

### Project Structure
```
├── public/
│   ├── electron.js          # Electron main process
│   └── favicon.ico          # App icon
├── src/                     # React application source
├── build/                   # Built React app (after npm run build)
├── dist/                    # Electron distribution files
└── package.json            # Dependencies and build config
```

## 🔒 Security Features

### Secure Defaults
- Context isolation enabled
- Node integration disabled
- Remote module disabled
- Web security enabled

### External Link Handling
- External links open in default browser
- Prevents navigation to malicious sites
- Secure communication with Supabase

### Auto Updates
- Secure update mechanism (future feature)
- Code signing for trusted installation
- Incremental updates to reduce download size

## 🐛 Troubleshooting

### Common Issues

#### App Won't Start
1. Check if port 3000 is available
2. Verify Node.js version (18+)
3. Clear npm cache: `npm cache clean --force`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

#### Build Fails
1. Check disk space (need ~500MB free)
2. Verify all dependencies installed
3. Try building web version first: `npm run build`
4. Check build logs for specific errors

#### Performance Issues
1. Close unnecessary applications
2. Check available RAM (minimum 4GB recommended)
3. Update graphics drivers
4. Disable hardware acceleration if needed

### Debug Mode
```bash
# Enable debug logging
DEBUG=electron* npm run electron-dev
```

### Log Files
- **Windows**: `%USERPROFILE%/AppData/Roaming/VCHome Hospital/logs/`
- **macOS**: `~/Library/Logs/VCHome Hospital/`
- **Linux**: `~/.config/VCHome Hospital/logs/`

## 📱 Features

### Desktop-Specific Features
- **Native Menus**: File, Edit, View, Window, Help menus
- **Keyboard Shortcuts**: Standard desktop shortcuts
- **Window Management**: Minimize, maximize, fullscreen
- **Zoom Controls**: Zoom in/out with Ctrl+Plus/Minus
- **System Integration**: Taskbar/dock integration

### Shared Features (Web + Desktop)
- Patient registration and management
- Vaccine scheduling and tracking
- Appointment management
- Staff portal with admin controls
- Domain management (admin only)
- Real-time notifications
- Data synchronization with Supabase

## 🔄 Updates

### Automatic Updates (Future)
- Background update checks
- Incremental updates
- User notification for updates
- Rollback capability

### Manual Updates
1. Download latest version
2. Install over existing version
3. Data and settings preserved

## 📞 Support

### Getting Help
1. Check this README
2. Review troubleshooting section
3. Check GitHub issues
4. Contact VCHome Hospital IT support

### Reporting Issues
When reporting issues, include:
- Operating system and version
- App version
- Steps to reproduce
- Error messages or screenshots
- Log files (if applicable)

## 🏗️ Building from Source

### Full Build Process
```bash
# 1. Clone repository
git clone <repository-url>
cd VaccineHomeBot

# 2. Install dependencies
npm install

# 3. Build web application
npm run build

# 4. Build desktop app
npm run dist-win    # Windows
npm run dist-mac    # macOS
npm run dist-linux  # Linux

# 5. Find built apps in dist/ folder
```

### Development Build
```bash
# Quick development build (no installer)
npm run pack
```

## 📄 License

This software is proprietary to VCHome Hospital. All rights reserved.

## 🏥 About VCHome Hospital

VCHome Hospital Management System is designed specifically for healthcare providers managing vaccination programs. The desktop application provides healthcare professionals with a reliable, secure, and efficient tool for patient management and vaccine administration tracking.