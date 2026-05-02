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

### Web Scraping and Data Acquisition
- **Layered Scraping Strategy**: Utilizes DataJud API (CNJ's public API) as primary, followed by ScraperAPI with Brazilian proxies, Scrapling (stealth Playwright), and legacy Playwright as fallbacks.
- **Tribunal Coverage**: Comprehensive coverage for all 35 Brazilian tribunals, including STF, STJ, TRFs, and various TJs, using parametric scrapers (eSAJ, PJe) and specific implementations.
- **CNJ Parser**: Automatically detects tribunals and formats process numbers (`NNNNNNN-DD.AAAA.J.TR.OOOO`).
- **Digital Certificate Integration**: Supports A3 cloud certificates (Certisign, BirdID, VaultID, SafeSign) for authenticated access to court portals (e.g., CNJ Painel do Advogado, PJe).

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

## External Dependencies

- **Database**: PostgreSQL (`@neondatabase/serverless`)
- **UI Components**: Radix UI, shadcn/ui, Lucide React (icons)
- **Form & Validation**: React Hook Form, Zod, `@hookform/resolvers`
- **Charting**: Recharts
- **Date Utilities**: date-fns
- **Web Scraping**: Playwright (Python), ScraperAPI, Scrapling, DataJud API
- **Document OCR**: PyMuPDF, pdfminer.six, python-docx
- **Digital Certificates**: Certisign, BirdID, VaultID, SafeSign (via custom integrations)