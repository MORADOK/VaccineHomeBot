# Project Structure

## Root Directory
```
├── src/                    # Source code
├── public/                 # Static assets
├── supabase/              # Supabase configuration and migrations
├── .kiro/                 # Kiro AI assistant configuration
└── node_modules/          # Dependencies
```

## Source Organization (`src/`)

### Core Application
- `main.tsx` - Application entry point
- `App.tsx` - Root component with routing and providers
- `App.css` & `index.css` - Global styles

### Components (`src/components/`)
- **Feature Components**: Domain-specific components (PatientPortal, StaffPortal, LineBot, etc.)
- **Layout Components**: AppLayout, AppSidebar for consistent structure
- **Utility Components**: ErrorBoundary, Logo, SetupGuide
- **UI Components**: `ui/` subdirectory contains shadcn/ui components

### Pages (`src/pages/`)
Route-based page components following React Router structure:
- `HomePage.tsx` - Landing page
- `AuthPage.tsx` - Authentication
- `PatientPortalPage.tsx` - Patient interface
- `StaffPortalPage.tsx` - Staff interface
- `LineBotPage.tsx` - LINE Bot interface
- `NotFound.tsx` - 404 error page

### Supporting Directories
- `hooks/` - Custom React hooks (use-mobile, use-toast)
- `lib/` - Utility functions and configurations
- `integrations/` - External service integrations (Supabase)

## Naming Conventions
- **Components**: PascalCase (PatientPortal.tsx)
- **Pages**: PascalCase with "Page" suffix (PatientPortalPage.tsx)
- **Hooks**: camelCase with "use" prefix (use-mobile.tsx)
- **Utilities**: camelCase (utils.ts)

## File Organization Rules
- One component per file
- Co-locate related components in feature directories
- Keep UI components separate in `ui/` subdirectory
- Use absolute imports with `@/` alias
- Group by feature, not by file type

## Configuration Files
- `components.json` - shadcn/ui configuration
- `tailwind.config.ts` - Tailwind CSS with medical theme
- `vite.config.ts` - Build configuration with path aliases
- `tsconfig.json` - TypeScript configuration with relaxed rules