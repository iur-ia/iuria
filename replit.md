# Sistema de Gestão Jurídica (Legal Management System)

## Overview

A comprehensive legal management system designed for Brazilian law firms, inspired by Projuris ADV. The application provides tools for managing legal cases (processos), court notifications (intimações), case movements, tasks, documents, and finances. Built as a full-stack web application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Routing**: Wouter (lightweight React router alternative)
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for a legal/professional theme
- **Typography**: Inter font for UI text, JetBrains Mono for legal codes and case numbers

### Design System
The application follows Material Design 3 principles customized for enterprise legal contexts:
- Color-coded status indicators for legal processes (incomplete, moved, stopped, active)
- Professional typography hierarchy optimized for information-dense displays
- Responsive grid layouts for dashboard metrics and process cards
- Custom CSS variables for consistent theming across light/dark modes

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Neon serverless driver
- **ORM**: Drizzle ORM with Zod schema validation
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions
- **API Pattern**: RESTful endpoints prefixed with `/api`

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/   # UI components (shadcn/ui + custom)
│   │   ├── pages/        # Route page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer interface
│   └── db.ts         # Database connection setup
└── shared/           # Shared code between client/server
    └── schema.ts     # Drizzle database schema definitions
```

### Data Layer
- **Schema Definition**: Drizzle ORM schemas in `shared/schema.ts` with Zod validation via `drizzle-zod`
- **Storage Interface**: Abstract `IStorage` interface in `server/storage.ts` enabling swappable storage implementations
- **Current Implementation**: In-memory storage (`MemStorage`) as default, designed for easy migration to PostgreSQL

### Build and Development
- **Development**: `npm run dev` runs Vite dev server with HMR and Express backend concurrently
- **Production Build**: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.js`
- **Database Migrations**: `npm run db:push` applies schema changes via Drizzle Kit

## External Dependencies

### Database
- **PostgreSQL**: Primary database via Neon serverless (`@neondatabase/serverless`)
- **Connection**: Requires `DATABASE_URL` environment variable
- **WebSocket Support**: Uses `ws` package for Neon's WebSocket connections

### UI Component Libraries
- **Radix UI**: Full suite of accessible primitive components (dialogs, dropdowns, tabs, etc.)
- **shadcn/ui**: Pre-built component implementations using Radix primitives
- **Lucide React**: Icon library for consistent iconography

### Form and Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation for both client and server
- **@hookform/resolvers**: Zod integration with React Hook Form

### Charting and Data Visualization
- **Recharts**: Chart components for financial and activity reports

### Date Handling
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment
- **TypeScript**: Strict mode enabled with path aliases for clean imports