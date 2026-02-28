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
Located in `scraper/tribunais/`, scrapers use layered strategy:

**ScraperAPI (Brazilian residential proxies) — highest priority for real-time data:**
- `stf_api.py` - STF via ScraperAPI
- `stj_api.py` - STJ via ScraperAPI
- `trf2_api.py` - TRF2 via ScraperAPI
- `tjrj_api.py` - TJRJ via ScraperAPI

**Scrapling stealth (fallback after ScraperAPI):**
- `stf_scrapling.py`, `stj_scrapling.py`, `trf2_scrapling.py`, `tjrj_scrapling.py`
- `trf1_scrapling.py`, `trf3_scrapling.py`, `trf4_scrapling.py`, `trf5_scrapling.py`

**Parametric system scrapers (1 scraper covers many TJs):**
- `esaj_scraper.py` - covers TJSP, TJBA, TJCE, TJAC, TJAL, TJAM, TJSC, TJMS (8 TJs)
- `pje_scraper.py` - covers TJMG, TJPE, TJRS, TJPR, TJGO, TJMA, TJPI, TJRN, TJSE, TJTO, TJRO, TJMT, TJPA, TJPB, TJAP, TJRR, TJES, TJDFT (18 TJs)

**DataJud API (`scraper/datajud.py`) — covers 100% of tribunals:**
- Public CNJ API, ElasticSearch endpoint
- Strips number mask before querying (raw 20-digit format)
- Reformats number back to CNJ mask for display
- Movement names use `nome` field (human-readable)

### Scraping Priority Order in `run_scraper.py`
1. DataJud API (always first — fastest, covers all tribunals)
2. ScraperAPI with Brazilian proxies (real-time data when DataJud is insufficient)
3. Scrapling DynamicFetcher (stealth Playwright fallback)
4. Legacy Playwright (last resort)

### CNJ Parser (`scraper/cnj_parser.py`)
Parses Brazilian court process numbers and detects tribunal automatically:
- **CNJ Format**: `NNNNNNN-DD.AAAA.J.TR.OOOO`
- **Class Format**: `ADI 1`, `HC 123456`, `REsp 1234567`

### API Endpoints for Scraping
- `GET /api/detectar-tribunal/:numero` - Detects tribunal from process number
- `POST /api/consulta-processual` - Executes web scraping search
- `GET /api/datajud/:tribunal/:numero` - Direct DataJud lookup

## Implementation Roadmap

### Phase 1 - Foundation (Completed)
- [x] STF scraper implementation
- [x] Automatic tribunal detection (CNJ parser)
- [x] Process cover page layout (capa do processo) with party info, subject, lawyers
- [x] Movements list below cover page
- [x] Direct link to tribunal portal ("Ver no Portal")
- [x] CNJ number capture and display
- [x] One-click monitoring button on process details
- [x] Party search page (Busca por Parte)

### Phase 2 - Priority Tribunals (Completed)
- [x] STJ - Superior Tribunal de Justica (ScraperAPI + Scrapling)
- [x] TRF2 - Tribunal Regional Federal 2a Regiao (ScraperAPI + Scrapling)
- [x] TJRJ - Tribunal de Justica do Rio de Janeiro (ScraperAPI + Scrapling)

### Phase 3 - Federal Expansion (Completed)
- [x] TRF1, TRF3, TRF4, TRF5 - via Scrapling scrapers
- [x] All TRFs also covered by DataJud API

### Phase 4 - State Courts (Completed)
- [x] TJSP, TJBA, TJCE, TJAC, TJAL, TJAM, TJSC, TJMS - via eSAJ scraper
- [x] TJMG, TJPE, TJRS, TJPR, TJGO, TJMA, TJPI, TJRN, TJSE, TJTO, TJRO, TJMT, TJPA, TJPB, TJAP, TJRR, TJES, TJDFT - via PJe scraper
- [x] All 35 tribunals covered by DataJud API (100% coverage)

### DataJud Integration (Completed)
- [x] Public API key configured
- [x] CNJ number stripping for query (raw 20-digit format)
- [x] CNJ number reformatting for display (NNNNNNN-DD.AAAA.J.TR.OOOO)
- [x] Human-readable movement names from `nome` field
- [x] fonte badge in UI (blue=DataJud, green=tempo real)

### ScraperAPI Integration (Completed)
- [x] `scraper/scraper_api.py` - ScraperAPI client with Brazilian proxies
- [x] STF, STJ, TRF2, TJRJ — ScraperAPI scrapers implemented
- [x] SCRAPER_API_KEY configured as environment secret

### Phase 5 - Monitoring (Partially Completed)
- [x] Process monitoring system (watchlist)
- [x] User-configurable check intervals (1h, 2h, 6h, 12h, 24h)
- [x] Visual alerts for new movements
- [x] Badge counter for unread movements
- [x] DJE/DJEM module UI (Electronic Journal page created - scrapers pending)
- [ ] Automatic deadline tracking
- [ ] Process-publication crossreferencing

### Phase 6 - Digital Certificate & Enhanced Access (Completed)
- [x] TJRJ Playwright interactive scraper (`scraper/tribunais/tjrj_playwright.py`)
  - Real browser automation: types number, clicks search, waits for Angular to render results
  - Extracts CNJ numbers, parties, movements from rendered Angular SPA
  - Priority 1 in TJRJ scraper chain (before ScraperAPI/Scrapling/DataJud)
- [x] Universal A3 cloud certificate module (`scraper/cert_digital/`)
  - `base.py`: OAuth2 PKCE abstract interface (RFC 7636)
  - `certisign.py`: Certisign implementation (api.certisign.com.br)
  - `birdid.py`: BirdID/Soluti implementation
  - `vaultid.py`: VaultID/Dinamo implementation
  - `safesign.py`: SafeSign/Safeweb implementation
  - `factory.py`: auto-detects provider by name, creates instance
- [x] CNJ Painel do Advogado integration (`scraper/cnj_painel.py`)
  - `CNJPainelClient`: authenticated process lookup, intimações listing
  - `PJeClientAutenticado`: PJe tribunal-specific authenticated client
- [x] Backend certificate API endpoints (`server/routes.ts`)
  - `GET /api/certificado/provedores`: list available providers
  - `POST /api/certificado/iniciar-auth`: start OAuth2 PKCE flow
  - `POST /api/certificado/trocar-token`: exchange code for token
  - `GET /api/certificado/status`: check session token status
  - `DELETE /api/certificado/desconectar`: clear session token
  - `GET /api/certificado/callback`: OAuth2 redirect handler
  - `GET /api/scraper-api/status`: check ScraperAPI credits
- [x] Configurações page (`client/src/pages/Configuracoes.tsx`)
  - Certificate section: provider select, CPF field, connect button, status display
  - OAB credentials section: number + state fields for portal authentication
  - ScraperAPI section: credit usage bar and status indicator
- [x] ConsultaProcessual UX improvements
  - Empty movements: shows "consult portal" and "configure certificate" links
  - Empty results: shows portal link + certificate configuration prompt
  - Certificate banner: shows when cert is connected
  - certStatus query: shows certificate state across the page

### BuscaParte Features
- [x] Search by party name (nome)
- [x] Search by CNPJ (company ID)
- [x] Search by OAB (lawyer registration with state selection)

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
| `/busca-parte` | Search by party name/CNPJ/OAB |
| `/monitoramento` | Process monitoring dashboard |
| `/atividades` | Activities/Tasks |
| `/financeiro/*` | Financial management |
| `/documentos/*` | Document management |
| `/gestao/*` | CRM and team management |

## Consulta Processual Features

The process search page (`/consulta-processual`) provides:

### Process Cover Page Layout
- **Header**: Process number with class badge, tribunal name
- **CNJ Number**: Displayed when available (format: NNNNNNN-DD.AAAA.J.TR.OOOO)
- **Actions**: "Monitorar" button to add to watchlist, "Ver no Portal" link to tribunal website
- **Info Section**: Subject, Relator, Origin
- **Parties Section**: List of parties involved (when available)
- **Movements Section**: Chronological list of all case movements

### One-Click Monitoring
From the process details page, users can:
1. Click "Monitorar" to add process to watchlist
2. System captures process number (CNJ format preferred)
3. Automatic tracking begins with configurable intervals

### Known Limitations
- Some tribunal portals (STF, STJ) may block automated access from cloud servers
- When data cannot be extracted, basic info is shown with direct portal link
- Full functionality requires unblocked access to tribunal websites