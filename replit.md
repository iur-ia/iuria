# iuria — Sistema Operacional Jurídico

## Overview

iuria is a legal operating system for Brazilian law firms, offering a full-stack web application for managing legal cases, court notifications, tasks, documents, and finances. Key capabilities include automated web scraping for court data, OCR for document processing, and digital certificate integration. The project aims to cover 100% of Brazilian tribunals and streamline legal operations, inspired by Projuris ADV.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technologies
- **Frontend**: React 18 with TypeScript, Vite, Wouter, TanStack React Query, shadcn/ui, Tailwind CSS.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM and Zod validation.
- **Data Layer**: Abstract `IStorage` interface for swappable storage implementations.

### Design System (v4 — Editorial Graphite × Coral (Anthropic-inspired), dark-mode-native)
The design avoids typical legal-tech aesthetics, using editorial typography (Inter, Fraunces, JetBrains Mono) and a single coral accent color (#C96442). It features a dark-mode-native interface with subtle depth treatments, a film-grain SVG overlay, and architectural lighting emulation. Icons are handled by Phosphor-icons with a duotone weight. The brand identity is typographically driven with a unique "iuria" wordmark.

### Web Scraping and Data Acquisition
The system uses a TypeScript engine for data acquisition.
- **Primary Source**: DataJud API (CNJ's official public API) for broad tribunal coverage.
- **Proxy Layer**: ScraperAPI for bypassing anti-bot measures on e-SAJ portals, using cheerio for HTML parsing.
- **Specialty APIs**: BrasilAPI (with ReceitaWS fallback) for CNPJ data.
- **Jurisprudence**: STJ SCON, STF Jurisprudência API, TRF1–6 via DataJud.
- **Legacy Scraper**: A Playwright-based Python scraper is used as a fallback for `/api/consulta-processual`.

### OCR → Markdown Pipeline
This system extracts text from legal documents (PDFs, DOCX) using PyMuPDF, pdfminer.six, and python-docx, converting it into structured Markdown for AI consumption.

### Process Monitoring System
Users can track legal processes with configurable check intervals, automatic detection of new movements, and visual alerts.

### Key Features
- **Process Management**: Displays case details, movements, parties, and links to tribunal portals.
- **Search**: Advanced search by process number, party, CNPJ, and OAB.
- **Document Management**: Upload, extraction, and Markdown rendering of legal documents.
- **Financial Management**: Dedicated section for financial tracking.
- **CRM/Team Management**: Tools for managing clients and internal teams.
- **Acervo (Digital Dossier)**: Internal module for judicial and administrative processes, including Kanban boards, timelines, document attachments, and integration with process search.
- **Processos a Acompanhar**: Watchlist feature for monitoring specific processes.
- **Pesquisa Jurídica**: A multi-tab UI for deep search across Processes, Jurisprudence, Doctrines, and Companies, with options to send content to AI chat.
- **Engine Automática de Prazos Legais**: Automated deadline engine generating tasks from process events, with configurable rules, risk assessment, and email alerts.
- **Editor de Petições estilo Word com IA**: A 3-column petition editor featuring templates, a rich text editor (TipTap), and an AI chat for content generation, editing, and revision (Anthropic Claude or OpenAI GPT).
- **Comunicações e Ofícios Automáticos**: Automated generation of official documents (ofícios, notifications) using configurable templates with dynamic placeholders.
- **Dashboard de KPIs Operacionais**: A real-time dashboard displaying operational and financial KPIs, including revenue vs. goals, honoraries by client, composite risk map, and various charts. Global filters and CSV export are supported.

## External Dependencies

- **Database**: PostgreSQL (`@neondatabase/serverless`)
- **UI Components**: Radix UI, shadcn/ui
- **Icons**: Phosphor React
- **Form & Validation**: React Hook Form, Zod
- **Charting**: Recharts
- **Date Utilities**: date-fns
- **Web Scraping (TypeScript)**: cheerio, ScraperAPI, DataJud API, BrasilAPI
- **Web Scraping (Python)**: Playwright, ScraperAPI, Scrapling
- **Document OCR**: PyMuPDF, pdfminer.six, python-docx
- **Digital Certificates**: Certisign, BirdID, VaultID, SafeSign (via custom integrations)