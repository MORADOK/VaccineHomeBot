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

## Desktop Application

See `DESKTOP-APP-README.md` for desktop app build instructions and distribution.

## License

Copyright © 2024 VCHome Hospital. All rights reserved.
