# Sistema de Gestão Jurídica (Legal Management System)

## Overview

A comprehensive legal management system for Brazilian law firms, inspired by Projuris ADV. It provides tools for managing legal cases (processos), court notifications (intimações), case movements, tasks, documents, and finances. The system aims to offer a full-stack web application with advanced features like automated web scraping for court data, OCR for document processing, and digital certificate integration for enhanced access to court portals. The project's ambition is to cover 100% of Brazilian tribunals and streamline legal operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
- **Frontend**: React 18 with TypeScript, Vite, Wouter for routing, TanStack React Query for state management, shadcn/ui and Tailwind CSS for UI.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL via Neon serverless, Drizzle ORM with Zod validation.
- **Data Layer**: Abstract `IStorage` interface for swappable storage implementations.

### Design System
Adheres to Material Design 3 principles, customized for legal contexts, featuring color-coded status indicators, professional typography (Inter, JetBrains Mono), and responsive layouts.

### Web Scraping and Data Acquisition — TypeScript Engine (server/scraping/)
- **Primary Layer**: DataJud API (CNJ's official public API) — covers 100% of Brazilian tribunals, free, no auth needed.
- **Proxy Layer**: ScraperAPI (`SCRAPER_API_KEY`) — bypasses anti-bot for e-SAJ portals (TJSP, TJBA, TJSC, TJCE, TJPE, TJMA, TJMS, TJAL, TJRN), uses cheerio for HTML parsing.
- **Specialty APIs**: BrasilAPI (`brasilapi.com.br/api/cnpj/v1/{cnpj}`) for CNPJ, ReceitaWS as fallback.
- **Jurisprudência**: STJ SCON scraping, STF Jurisprudência API, TRF1–6 via DataJud, doutrina via CNJ Biblioteca / LexML / Senado.
- **Module structure**:
  - `server/scraping/types.ts` — shared interfaces, TribunalInfo map, `identificarTribunalCNJ()`
  - `server/scraping/utils.ts` — `fetchUrl()` (ScraperAPI-aware), `htmlToMarkdown()`, `withRetry()`, `makeLogger()`
  - `server/scraping/cnpjScraper.ts` — BrasilAPI + ReceitaWS fallback
  - `server/scraping/stjScraper.ts` — STJ SCON + DataJud STJ
  - `server/scraping/stfScraper.ts` — STF Jurisprudência API + DataJud STF
  - `server/scraping/trfScraper.ts` — TRF1–6 via DataJud
  - `server/scraping/esajScraper.ts` — e-SAJ portals via DataJud + ScraperAPI fallback
  - `server/scraping/doutrinaScraper.ts` — CNJ Biblioteca, LexML, Senado, STF portal
  - `server/scraping/orchestrator.ts` — routes by CNJ number segment/TR code, exports `pesquisarProcesso`, `pesquisarJurisprudencia`, `pesquisarDoutrina`, `pesquisarCnpj`
- **CNJ Number Parsing**: `NNNNNNN-DD.AAAA.J.TR.OOOO` — J=segmento (1=STF, 3=STJ, 4=Federal, 8=Estadual), TR=tribunal code
- **Python scraper** (`scraper/`): legacy Playwright-based Python scraper still used by `/api/consulta-processual`

### OCR → Markdown Pipeline
- **Purpose**: Extracts text from legal documents and converts it into Markdown for AI consumption.
- **Tools**: PyMuPDF, pdfminer.six (for PDFs), python-docx (for DOCX).
- **Output**: Structured Markdown content with intelligent formatting (e.g., headings, bold for articles) stored in the database.

### Process Monitoring System
Enables users to track legal processes with configurable check intervals, automatically detecting new movements and providing visual alerts and unread counters.

### Key Features
- **Process Management**: Displays process cover pages, movements, parties, subjects, and direct links to tribunal portals.
- **Search**: Advanced search capabilities by process number, party name, CNPJ, and OAB.
- **Document Management**: Upload, extraction, and Markdown rendering of legal documents.
- **Financial Management**: Dedicated section for financial tracking.
- **CRM/Team Management**: Sections for managing clients and internal teams.
- **Acervo (Digital Dossier)**: Internal dossier module for judicial and administrative processes. Includes Kanban for administrative processes (criação→instrução→decisão→arquivamento), timeline of andamentos, document attachments, and "Salvar no Acervo" button in ConsultaProcessual. Tables: `acervo_processos`, `acervo_andamentos`, `acervo_documentos`, `acervo_tramitacoes`.
- **Processos a Acompanhar**: Watchlist feature for monitoring processes; table `processos_acompanhados`.
- **Pesquisa Jurídica** (`/pesquisa-juridica`): 4-tab deep search UI — Processos (CNJ number → tribunal scraping), Jurisprudência (STF/STJ/TRFs, with tribunal filter), Doutrina (CNJ/LexML/Senado), Empresas (CNPJ lookup). Each tab shows source badge, duration, "Enviar ao LexOS" button that injects markdownContent into sessionStorage for the IA chat.
- **Fallback Scraping na Consulta Processual**: When DataJud returns 0 results, "Tentar via Scraping Direto" button appears and calls `/api/pesquisa/processo/:numero`, showing result with "via Scraping Direto" badge.
- **Engine Automática de Prazos Legais**: Automated deadline engine that generates tasks from processual events. Includes configurable rules (`deadline_rules` table), extended `atividades` with `risco`/`deadlineRuleId`/`fundamentoLegal`/`eventoGatilho` fields, 8 pre-configured rules for cível and trabalhista, a "Regras de Prazos" management page, a "Prazos Críticos" panel (72h window), email alert job (48h/24h via nodemailer), and a manual engine trigger UI. Server modules: `server/deadlineEngine.ts`, `server/emailAlerts.ts`.
- **Dashboard de KPIs Operacionais** (`/`): Real-time operational dashboard replacing the static placeholder. Pulls live data from all DB tables via `GET /api/dashboard/kpis?periodo=semana|mes|trimestre`. Shows: 6 operational KPI cards (processos ativos, tarefas atrasadas, prazos 7d, sem movimentação +30d, risco crítico/alto, acompanhados com novos andamentos), 4 financial KPI cards (a receber, recebido no período, a pagar no período, honorários ativos), Mapa de Risco (atividades CRITICO/ALTO ordenadas por data), Recharts BarChart (processos por área), Recharts PieChart (distribuição de risco), Resumo Operacional com barras de progresso. Period filter (7/30/90 dias) persists in sessionStorage. Print/PDF export via window.print(). All cards are clickable with drill-down to the corresponding list page.

## API Endpoints — Pesquisa Jurídica
- `GET /api/pesquisa/processo/:numero` — orchestrates tribunal detection → DataJud → portal scraping
- `GET /api/pesquisa/jurisprudencia?q=&tribunal=` — STF/STJ/TRFs (tribunal=TODOS searches all)
- `GET /api/pesquisa/doutrina?q=` — CNJ Biblioteca, LexML, Senado, STF portal
- `GET /api/pesquisa/cnpj/:cnpj` — BrasilAPI + ReceitaWS fallback
All return `{ source, sourceLabel, data, markdownContent, durationMs, logs, error? }`.

## External Dependencies

- **Database**: PostgreSQL (`@neondatabase/serverless`)
- **UI Components**: Radix UI, shadcn/ui, Lucide React (icons)
- **Form & Validation**: React Hook Form, Zod, `@hookform/resolvers`
- **Charting**: Recharts
- **Date Utilities**: date-fns
- **Web Scraping (TypeScript)**: cheerio (HTML parsing), ScraperAPI (proxy), DataJud API, BrasilAPI
- **Web Scraping (Python)**: Playwright, ScraperAPI, Scrapling (legacy `scraper/` dir)
- **Document OCR**: PyMuPDF, pdfminer.six, python-docx
- **Digital Certificates**: Certisign, BirdID, VaultID, SafeSign (via custom integrations)
