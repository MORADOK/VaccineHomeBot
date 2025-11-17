# VCHome Hospital Management System

A comprehensive hospital vaccine management application for healthcare providers.

## About

VCHome Hospital Management System helps healthcare facilities manage patient vaccinations, appointments, and records. The system provides web and desktop applications with LINE bot integration.

## Features

- Patient registration and vaccination tracking
- Appointment scheduling and reminders
- Staff portal for healthcare providers
- LINE bot integration for patient communication
- Domain management and custom branding
- Google Sheets integration

## Development Setup

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

```sh
# Clone the repository
git clone https://github.com/MORADOK/VaccineHomeBot.git

# Navigate to project directory
cd VaccineHomeBot

# Install dependencies
npm install

# Start development server
npm run dev
```

## Technologies

- **Frontend:** React 18, TypeScript, Vite
- **UI:** shadcn/ui, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Desktop:** Electron
- **Testing:** Vitest, Testing Library

## Deployment

See `DEPLOYMENT-GUIDE.md` for complete deployment instructions including:
- Web deployment (GitHub Pages, Vercel, Netlify)
- Desktop builds (Windows, macOS, Linux)
- Supabase database setup

## Desktop App Auto-Updates

The desktop application includes an automatic update system powered by GitHub Releases that keeps your software up-to-date with the latest features, bug fixes, and security improvements.

### For Users

The application automatically checks for updates when you start it. When an update is available:
- You'll see a notification with version details and release notes
- Download progress is shown with speed and time remaining
- Choose to install immediately or postpone until later
- Updates install seamlessly with one click

**Manual Update Check:**
1. Open Settings (gear icon)
2. Scroll to Updates section
3. Click "Check for Updates"

**Documentation:**
- `USER-GUIDE.md` - Complete user guide with FAQs
- `TROUBLESHOOTING.md` - Solutions for common issues

### For Developers

Publishing updates is streamlined with automated tools and comprehensive documentation.

**Quick Publish:**
```bash
# 1. Verify setup
npm run verify-publish

# 2. Update version
npm version patch

# 3. Build and publish
npm run publish-win

# 4. Create GitHub Release with notes
```

**Documentation:**
- `.kiro/specs/auto-update-system/DEVELOPER-GUIDE.md` - Complete release process
- `.kiro/specs/auto-update-system/QUICK-START-PUBLISHING.md` - Quick reference
- `.kiro/specs/auto-update-system/GITHUB-RELEASES-GUIDE.md` - Detailed publishing guide
- `.kiro/specs/auto-update-system/TROUBLESHOOTING.md` - Developer troubleshooting
- `.kiro/specs/auto-update-system/TESTING-GUIDE.md` - Testing procedures
- `.kiro/specs/auto-update-system/RELEASE-CHECKLIST-TEMPLATE.md` - Release checklist

**Key Features:**
- Automatic update checks on app startup
- Progress tracking with download speed and ETA
- User-controlled installation timing
- Comprehensive error handling and logging
- Secure downloads with signature verification
- Update history tracking

## Desktop Application

See `DESKTOP-APP-README.md` for desktop app build instructions and distribution.

## License

Copyright © 2024 VCHome Hospital. All rights reserved.
