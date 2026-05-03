# EVOLUTION CHANGELOG

Registro cronológico de todos os ciclos PROMETHEUS — fixes aplicados, propostas adiadas e decisões de rejeição.

---

## Ciclo 001 — 2026-05-03 (Baseline)

**Agente**: PROMETHEUS  
**Baseline TypeScript**: ✅ 0 erros  
**Arquivos modificados**: 2 (`scraper/datajud.py`, `server/routes.ts`)  
**Arquivos criados (infra)**: 3 (`EVOLUTION_CHARTER.md`, `EVOLUTION_CHANGELOG.md`, `.evolution/memory.jsonl`)

### Achados

| ID | Domínio | Severidade | Título | Lane | Confiança |
|----|---------|-----------|--------|------|-----------|
| F-001 | SECRETS | MÉDIO | DataJud API key hardcoded em scraper/datajud.py | APPLY NOW | 0.85 |
| F-002 | SAST | INFO | dangerouslySetInnerHTML em AcervoJudicial + Oficios | ACCEPT AS-IS | — |
| F-003 | CONFIG | ALTO | Sem middleware `helmet` (security headers ausentes) | DEFER | — |
| F-004 | CONFIG | ALTO | Sem rate limiting nos endpoints da API | DEFER | — |
| F-005 | ARCHITECTURE | INFO | server/routes.ts monolítico (3609 linhas, 125 endpoints) | DEFER | — |
| F-006 | BUGS | BAIXO | 3 blocos `catch(e)` silenciosos em JSON.parse (linhas ~779, 846, 885) | APPLY NOW | 0.90 |
| F-007 | BUGS | BAIXO | `parseInt` sem upper-bound em `?limit=` e `?horas=` (DoS parcial) | APPLY NOW | 0.80 |
| F-008 | TESTS | INFO | Sem suite de testes automatizados configurada | DEFER | — |
| F-009 | CONFIG | INFO | CORS não configurado explicitamente | DEFER | — |
| F-010 | CONFIG | BAIXO | Logging não estruturado (31× console.error sem contexto) | DEFER | — |

### Fixes Aplicados

#### F-001 — DataJud key hardcoded → env var com fallback público

**Arquivo**: `scraper/datajud.py`  
**Linha**: 15  
**Antes**:
```python
DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="
```
**Depois**:
```python
DATAJUD_API_KEY = os.environ.get(
    "DATAJUD_API_KEY",
    "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==",
)
```
**Nota**: Chave é pública (CNJ wiki). Fallback mantido para não quebrar deploys sem env var.

---

#### F-006 — Logging em catch(e) silenciosos

**Arquivo**: `server/routes.ts`  
**Linhas**: ~779, ~846, ~885 (JSON.parse de respostas Python)  
**Mudança**: Adicionado `console.error("[PROMETHEUS][F-006] JSON parse error in <contexto>:", e)` antes de cada `res.status(500).json(...)` em catch blocks que anteriormente engoliam o erro silenciosamente.

---

#### F-007 — Clamp em parseInt de parâmetros de query

**Arquivo**: `server/routes.ts`  
**Mudança**:
- `/api/consultas-processuais?limit=`: `parseInt(...) || 50` → `Math.min(Math.max(1, parseInt(...) || 50), 500)`
- `/api/prazos-criticos?horas=`: `parseInt(...) || 72` → `Math.min(Math.max(1, parseInt(...) || 72), 8760)`

---

### Achados Aceitos (sem mudança necessária)

#### F-002 — dangerouslySetInnerHTML (XSS)

`AcervoJudicial.tsx:355` e `Oficios.tsx:73,149,410` renderizam HTML do servidor via `dangerouslySetInnerHTML`. **Mitigado**: o servidor aplica `sanitize-html` com `allowedSchemes: ["data"]` antes de persistir/retornar o HTML (routes.ts:3211-3215, 3323-3327). Risco residual aceito.

---

### Propostas Adiadas (DEFER)

#### F-003 — Adicionar `helmet` para security headers

**Justificativa do adiamento**: Requer instalação de nova dependência (`helmet`). Recomenda-se adicionar ao próximo ciclo com aprovação do usuário.  
**Implementação sugerida**:
```typescript
import helmet from "helmet";
app.use(helmet({ contentSecurityPolicy: false })); // CSP false para não quebrar Vite embed
```

---

#### F-004 — Rate limiting nos endpoints da API

**Justificativa do adiamento**: Requer instalação de `express-rate-limit`. Endpoints mais críticos: `/api/consulta-processual`, `/api/pesquisa/*`, `/api/pdf-generate`.  
**Implementação sugerida**:
```typescript
import rateLimit from "express-rate-limit";
const apiLimiter = rateLimit({ windowMs: 60_000, max: 100 });
app.use("/api/", apiLimiter);
const scrapingLimiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use("/api/pesquisa/", scrapingLimiter);
```

---

#### F-005 — Refatorar server/routes.ts (monolítico)

**Justificativa do adiamento**: Arquivo com 3609 linhas e 125 endpoints. Refactor seguro requer planejamento por domínio (clientes, processos, financeiro, scraping, documentos, dashboard). Proposta: dividir em `server/routes/` com `index.ts` re-exportando.

---

#### F-008 — Configurar suite de testes automatizados

**Justificativa do adiamento**: Projeto sem `vitest`/`jest` configurado. Recomenda-se `vitest` para backend e `@testing-library/react` para frontend. Requer aprovação para alterar `package.json`.

---

#### F-009 — CORS explícito

**Justificativa do adiamento**: App é SPA servida pelo mesmo Express (mesmo origin). CORS não é crítico aqui. Para deploys separados, adicionar `cors` package com whitelist.

---

#### F-010 — Logging estruturado

**Justificativa do adiamento**: Substituir `console.error/log` por biblioteca estruturada (`pino`, `winston`). Requer nova dep e refactor de 31+ chamadas.

---

### Verificação Pós-Apply

- `npm run check`: ✅ 0 erros TypeScript  
- Comportamento: Zero mudanças funcionais — todos os fixes são observabilidade + defesa

---

*Próximo ciclo recomendado*: Ciclo 002 — após aprovação das propostas F-003 (helmet) e F-004 (rate limiting).
