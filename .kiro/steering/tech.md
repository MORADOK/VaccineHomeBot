# Technology Stack

## Build System & Framework
- **Vite**: Fast build tool and development server
- **React 18**: Frontend framework with TypeScript support
- **TypeScript**: Type-safe JavaScript with relaxed configuration

## UI & Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom medical theme
- **Radix UI**: Headless UI components for accessibility
- **Lucide React**: Icon library
- **next-themes**: Dark/light mode support

## State Management & Data
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form handling with Zod validation
- **Supabase**: Backend-as-a-Service for database and auth
- **React Router DOM**: Client-side routing

## Development Tools
- **ESLint**: Code linting with React-specific rules
- **PostCSS**: CSS processing with Autoprefixer
- **SWC**: Fast TypeScript/JavaScript compiler

## Common Commands

```bash
# Development
npm run dev          # Start development server on port 3000
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Package Management
npm i                # Install dependencies
```

## Path Aliases
- `@/*` maps to `./src/*` for clean imports
- Components use absolute imports from `@/components`
- Utils and hooks accessible via `@/lib` and `@/hooks`

## Medical Theme
Custom Tailwind configuration includes medical-specific color schemes, status indicators, and healthcare-focused animations for professional medical interfaces.