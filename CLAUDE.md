# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VCHome Hospital Management System** - A comprehensive hospital vaccine management application built with React + TypeScript + Vite, designed as both a web application and Electron desktop app. The system manages patient registrations, vaccine appointments, LINE bot integration, and domain configuration for healthcare providers.

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui (Radix UI primitives), Tailwind CSS
- **State Management**: TanStack React Query, React Hook Form
- **Backend/Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Desktop**: Electron (cross-platform desktop app)
- **Routing**: React Router DOM
- **Testing**: Vitest, Testing Library
- **External Integrations**: LINE Bot API, LIFF (LINE Front-end Framework), Google Sheets

## Development Commands

### Web Development
```bash
npm run dev              # Start Vite dev server on http://localhost:5173
npm run build            # Production build for web
npm run build:dev        # Development build
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run test             # Run Vitest in watch mode
npm run test:run         # Run tests once
```

### Electron Desktop Development
```bash
npm run electron-dev     # Run development server + Electron window
npm run electron-clean   # Run Electron without console logs
npm run dist-win         # Build Windows installer + portable exe
npm run dist-mac         # Build macOS .dmg
npm run dist-linux       # Build Linux AppImage + .deb
npm run pack             # Quick build without installer (testing)
```

**Important**: Always run `npm run build` before building desktop installers.

## Project Architecture

### Route Structure

The app uses React Router with a base path that changes based on environment (GitHub Pages support):
- **Production**: `/VaccineHomeBot` base path
- **Development**: `/` base path

Main routes defined in `src/App.tsx`:
- `/` - HomePage (landing page)
- `/auth` - AuthPage (authentication)
- `/admin` - Admin dashboard (Index page)
- `/line-bot` - LINE Bot configuration
- `/patient-portal` - Patient portal
- `/staff-portal` - Staff dashboard
- `/liff-patient-portal` - LIFF integration page
- `/vaccine-status` - Vaccine status checker

### Database Schema (Supabase)

Key tables defined in migrations (`supabase/migrations/`):
- `appointments` - Vaccine appointments with patient info
- `appointment_notifications` - Notification tracking
- `domain_configurations` - Custom domain management
- `domain_monitoring` - Domain health monitoring
- `vaccine_schedules` - Vaccination schedules
- `patients` - Patient records
- `vaccination_records` - Historical vaccination data

**Database Access**: All Supabase interactions go through `src/integrations/supabase/client.ts` with TypeScript types from `src/integrations/supabase/types.ts`.

### Component Organization

```
src/
├── components/
│   ├── ui/              # shadcn/ui components (design system)
│   ├── *Dashboard.tsx   # Main dashboard components
│   ├── *Portal.tsx      # Portal components (Patient, Staff)
│   ├── Domain*.tsx      # Domain management components
│   ├── DNS*.tsx         # DNS configuration helpers
│   └── __tests__/       # Component tests
├── pages/               # Route page components
├── hooks/               # Custom React hooks
│   ├── use-domain-*.ts  # Domain-related hooks
│   ├── use-toast.ts     # Toast notifications
│   └── use-admin-auth.ts # Admin authentication
├── lib/                 # Utility functions and services
│   ├── domain-*.ts      # Domain service logic
│   ├── dns-service.ts   # DNS utilities
│   └── __tests__/       # Service tests
├── config/              # Configuration files
├── integrations/        # External service integrations
│   └── supabase/        # Supabase client and types
└── types/               # TypeScript type definitions
```

### Key Services and Patterns

**Domain Management System**: Multi-file architecture for custom domain configuration:
- `lib/domain-service.ts` - Core domain operations
- `lib/domain-verification-service.ts` - Domain verification logic
- `lib/domain-monitoring-service.ts` - Health monitoring
- `lib/dns-service.ts` - DNS configuration helpers
- `hooks/use-domain-*.ts` - React hooks for domain features
- `components/Domain*.tsx` - UI components

**Patient Data Flow**:
1. Patient registers via `PatientRegistration.tsx`
2. Data stored in Supabase `patients` and `appointments` tables
3. Staff manages via `StaffDashboard.tsx`
4. Notifications sent via `AutoNotificationSystem.tsx`
5. LINE bot integration through `LineBot.tsx`

**Authentication**: Simple admin password-based auth using `hooks/use-admin-auth.ts`. No complex user management - focused on hospital staff access.

### Electron Architecture

- **Main Process**: `public/electron.js` - Window management, native menus, IPC
- **Development**: Loads `http://localhost:5173` (Vite dev server)
- **Production**: Loads `dist/index.html` (built React app)
- **Build Config**: `package.json` → `build` section (electron-builder config)
- **Security**: Context isolation enabled, node integration disabled

## Environment Variables

Required variables (see `.env.example`):
```bash
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anonymous key
VITE_APP_ENVIRONMENT=        # production/development
VITE_ENABLE_DESKTOP_MODE=    # true for desktop features
```

Optional integrations:
```bash
VITE_LINE_CHANNEL_ACCESS_TOKEN=   # LINE Bot API
VITE_LINE_CHANNEL_SECRET=          # LINE Bot secret
VITE_GOOGLE_SHEETS_API_KEY=        # Google Sheets integration
```

## Testing Strategy

- **Unit Tests**: Vitest for services and hooks (`lib/__tests__/`, `hooks/__tests__/`)
- **Component Tests**: Testing Library for React components (`components/__tests__/`)
- **Test Setup**: `src/test/setup.ts` configures jsdom environment
- **Run single test**: `npm test -- <test-file-name>`

## Code Style and Conventions

- **TypeScript**: Strict mode enabled, all files should be `.ts` or `.tsx`
- **Components**: Use functional components with hooks
- **Styling**: Tailwind CSS utility classes, shadcn/ui components for consistency
- **Imports**: Use `@/` alias for src imports (configured in `vite.config.ts`)
- **Forms**: React Hook Form + Zod for validation
- **Data Fetching**: TanStack Query for async state management

## Deployment

### Web (GitHub Pages)
- Automatic deployment via GitHub Actions on push to main
- Served at: `https://[username].github.io/VaccineHomeBot`
- Base path configured in `vite.config.ts`

### Desktop Application
- Build artifacts created via GitHub Actions on git tags
- Manual builds: `npm run dist-win|mac|linux`
- Outputs to `dist/` directory
- Installer formats: NSIS (Windows), DMG (macOS), AppImage/deb (Linux)

### Database (Supabase)
- Migrations in `supabase/migrations/`
- Apply via Supabase dashboard or CLI
- Enable Row Level Security (RLS) policies for production

## Important Notes

- **LINE LIFF Integration**: LIFF pages require special URL structure and initialization (see `LiffPatientPortal.tsx`)
- **Domain System**: Complex DNS verification flow - read `lib/domain-service.ts` before modifying
- **Electron Security**: Never enable nodeIntegration or disable contextIsolation
- **Supabase Types**: Regenerate `src/integrations/supabase/types.ts` when schema changes
- **GitHub Pages Routing**: All routes must work with base path `/VaccineHomeBot` in production

## Common Tasks

### Adding a New Route
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation in `AppSidebar.tsx` or `AppLayout.tsx`

### Adding a Supabase Table
1. Create migration SQL in `supabase/migrations/`
2. Run migration in Supabase
3. Regenerate types: Update `src/integrations/supabase/types.ts`
4. Create service in `src/lib/` if needed
5. Add React Query hooks in `src/hooks/`

### Adding a shadcn/ui Component
```bash
npx shadcn-ui@latest add <component-name>
```
Components auto-install to `src/components/ui/`

### Working with Domain Features
- DNS configuration uses multiple providers (Cloudflare, Google Domains, etc.)
- Domain verification is async with polling mechanism
- Always test domain features with mock data before production
- Comprehensive tests exist in `lib/__tests__/domain-*.test.ts`

## Documentation References

- `DEPLOYMENT-GUIDE.md` - Complete deployment instructions (Thai language)
- `DESKTOP-APP-README.md` - Desktop app build and distribution
- `ELECTRON-CLEAN-MODE.md` - Electron without console logs
- `GITHUB-PAGES-SETUP.md` - GitHub Pages configuration
- `README.md` - Basic project info (Lovable template)
