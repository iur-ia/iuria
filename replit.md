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

### Web Scraping (Consulta Processual)
- **Playwright (Python)**: Web scraping framework for court portal automation
- **CNJ Parser**: Automatic tribunal detection from process numbers
- **Scrapers Path**: `scraper/` directory contains Python scrapers for each tribunal

## Web Scraping Architecture

### Tribunal Scrapers
Located in `scraper/tribunais/`, each file implements scraping logic for a specific court:
- `stf.py` - Supremo Tribunal Federal (active)
- `stj.py` - Superior Tribunal de Justiça (planned)
- `trf2.py` - TRF 2ª Região (planned)
- `tjrj.py` - TJ Rio de Janeiro (planned)

### CNJ Parser (`scraper/cnj_parser.py`)
Parses Brazilian court process numbers and detects tribunal automatically:
- **CNJ Format**: `NNNNNNN-DD.AAAA.J.TR.OOOO`
- **Class Format**: `ADI 1`, `HC 123456`, `REsp 1234567`

### API Endpoints for Scraping
- `GET /api/detectar-tribunal/:numero` - Detects tribunal from process number
- `POST /api/consulta-processual` - Executes web scraping search

## Implementation Roadmap

### Phase 1 - Foundation (Completed)
- [x] STF scraper implementation
- [x] Automatic tribunal detection (CNJ parser)
- [x] Tabbed process details (Info, Partes, Andamentos, Decisões)
- [x] Party search page (Busca por Parte)

### Phase 2 - Priority Tribunals (Next)
- [ ] STJ - Superior Tribunal de Justiça
- [ ] TRF2 - Tribunal Regional Federal 2ª Região
- [ ] TJRJ - Tribunal de Justiça do Rio de Janeiro

### Phase 3 - Federal Expansion
- [ ] TRF1, TRF3, TRF4, TRF5, TRF6
- [ ] TJSP - Tribunal de Justiça de São Paulo

### Phase 4 - State Courts
- [ ] Remaining 25 State TJs

### Phase 5 - Monitoring (Partially Completed)
- [x] Process monitoring system (watchlist)
- [x] User-configurable check intervals (1h, 2h, 6h, 12h, 24h)
- [x] Visual alerts for new movements
- [x] Badge counter for unread movements
- [ ] DJE/DJEM module (Electronic Journal)
- [ ] Automatic deadline tracking
- [ ] Process-publication crossreferencing

## Process Monitoring System

The monitoring system allows users to track processes and receive alerts when new movements are detected.

### Database Tables
- `monitoramentos` - Stores monitored processes with configuration
- `verificacoes_monitoramento` - Stores verification history

### Key Fields
- `frequenciaMinutos`: Check interval (60=1h, 120=2h, 360=6h, 720=12h, 1440=24h)
- `contadorAndamentos`: Number of movements at last check
- `novosAndamentos`: New movements detected since last check
- `proximaChecagem`: Timestamp for next automatic check

### API Endpoints
- `GET /api/monitoramentos` - List active monitored processes
- `POST /api/monitoramentos` - Add process to monitoring
- `PATCH /api/monitoramentos/:id` - Update frequency or status
- `DELETE /api/monitoramentos/:id` - Remove from monitoring
- `POST /api/monitoramentos/:id/marcar-visto` - Mark new movements as seen
- `GET /api/monitoramentos/contador/novos` - Get total unread count

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard |
| `/processos` | Process list |
| `/consulta-processual` | Court portal search (auto-detection) |
| `/busca-parte` | Search by party name/CNPJ |
| `/monitoramento` | Process monitoring dashboard |
| `/atividades` | Activities/Tasks |
| `/financeiro/*` | Financial management |
| `/documentos/*` | Document management |
| `/gestao/*` | CRM and team management |