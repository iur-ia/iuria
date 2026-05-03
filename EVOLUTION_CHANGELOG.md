# EVOLUTION CHANGELOG

Registro cronológico de todos os ciclos PROMETHEUS — fixes aplicados, propostas adiadas e decisões de rejeição.

---

## Ciclo 001 — 2026-05-03 (Baseline — Modo PROPOSE_ONLY)

**Agente**: PROMETHEUS  
**Modo**: PROPOSE_ONLY (criação de branch bloqueada pelo sandbox — sem modificações em arquivos de código)  
**Baseline TypeScript**: ✅ 0 erros (`npm run check`)  
**Baseline de Testes**: N/A (sem test runner configurado)  
**Arquivos de código modificados**: 0  
**Arquivos de infraestrutura criados**: 3 (`EVOLUTION_CHARTER.md`, `EVOLUTION_CHANGELOG.md`, `.evolution/memory.jsonl`)

### Por que PROPOSE_ONLY?

A criação da branch `auto-evolution/2026-05-03` foi bloqueada pelo sandbox do Replit como operação destrutiva. Per a especificação do PROMETHEUS: *se git indisponível → operar em propose-only (não aplicar nada)*. Todos os achados foram movidos para `improvements_proposed` com esforço/ROI/rationale; nenhum arquivo de código foi alterado.

---

### Achados do Inventário

| ID | Domínio | Severidade | Título | Lane | Confiança |
|----|---------|-----------|--------|------|-----------|
| F-001 | SECRETS | MÉDIO | DataJud API key hardcoded em scraper/datajud.py | DEFER | 0.85 |
| F-002 | SAST | INFO | dangerouslySetInnerHTML sem sanitização client-side | REJECT | 0.20 |
| F-003 | CONFIG | ALTO | Sem middleware `helmet` (security headers ausentes) | DEFER | 0.95 |
| F-004 | CONFIG | ALTO | Sem rate limiting nos endpoints da API | DEFER | 0.95 |
| F-005 | ARCHITECTURE | INFO | server/routes.ts monolítico (3609 linhas, 125 endpoints) | DEFER | 0.99 |
| F-006 | BUGS | BAIXO | 3 blocos `catch(e)` silenciosos em JSON.parse (~779, ~846, ~885) | DEFER | 0.90 |
| F-007 | BUGS | BAIXO | `parseInt` sem upper-bound em `?limit=` e `?horas=` | DEFER | 0.80 |
| F-008 | TESTS | INFO | Sem suite de testes automatizados configurada | DEFER | 0.99 |
| F-009 | CONFIG | INFO | CORS não configurado explicitamente | DEFER | 0.70 |
| F-010 | CONFIG | BAIXO | Logging não estruturado (31× console.error) | DEFER | 0.85 |

**Total**: 10 achados — 1 REJECT (F-002, falso positivo mitigado), 9 DEFER (todos propostos como `improvements_proposed`)

---

### Achado Rejeitado

#### F-002 — dangerouslySetInnerHTML (falso positivo)

`AcervoJudicial.tsx:355` e `Oficios.tsx:73,149,410` renderizam HTML via `dangerouslySetInnerHTML`. **Mitigado**: o servidor aplica `sanitize-html` com `allowedSchemes: ["data"]` antes de persistir/retornar o HTML (routes.ts:3211-3215 e 3323-3327). Confidence de risco real: 0.20. Reprocessamento client-side seria redundante. **REJECT**.

---

### Propostas Adiadas (DEFER → improvements_proposed)

#### F-001 — DataJud key: adotar env-var com fallback público

```diff
--- a/scraper/datajud.py
+++ b/scraper/datajud.py
@@ -15 +15,4 @@
-DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="
+DATAJUD_API_KEY = os.environ.get(
+    "DATAJUD_API_KEY",
+    "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==",
+)
```
**Esforço**: 0.1h | **ROI**: MÉDIO | **Bloqueio**: nenhum (só modo PROPOSE_ONLY) | **Prioridade Ciclo 002**: ★★★

---

#### F-003 — Adicionar `helmet` para security headers

```diff
--- a/server/index.ts
+++ b/server/index.ts
@@ -1,0 +1,1 @@
+import helmet from "helmet";
@@ -17,0 +18,1 @@
+app.use(helmet({ contentSecurityPolicy: false }));
```
**Esforço**: 1h | **ROI**: ALTO | **Bloqueio**: `npm install helmet` (aprovação do usuário) | **Prioridade Ciclo 002**: ★★★

---

#### F-004 — Rate limiting nos endpoints de scraping

```diff
--- a/server/index.ts
+++ b/server/index.ts
@@ -1,0 +1,1 @@
+import rateLimit from "express-rate-limit";
@@ -18,0 +19,6 @@
+const apiLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true });
+const scrapingLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true });
+app.use("/api/", apiLimiter);
+app.use("/api/pesquisa/", scrapingLimiter);
+app.use("/api/consulta-processual", scrapingLimiter);
```
**Esforço**: 2h | **ROI**: ALTO | **Bloqueio**: `npm install express-rate-limit` (aprovação do usuário) | **Prioridade Ciclo 002**: ★★★

---

#### F-005 — Refatorar server/routes.ts (monolítico)

Dividir em `server/routes/` por domínio: `clientes.ts`, `equipe.ts`, `processos.ts`, `atividades.ts`, `documentos.ts`, `financeiro.ts`, `scraping.ts`, `dashboard.ts`, `acervo.ts`, `comunicacoes.ts`, `deadlines.ts`.  
**Esforço**: 8h | **ROI**: MÉDIO | **Bloqueio**: grande refactor; recomenda-se ter suite de testes primeiro (F-008) | **Prioridade Ciclo 003+**: ★★

---

#### F-006 — Logging em catch(e) silenciosos

```diff
--- a/server/routes.ts
+++ b/server/routes.ts
@@ -779,0 +780,1 @@
+          console.error("[PROMETHEUS][F-006] JSON parse error in detect-tribunal:", e);
@@ -846,0 +848,1 @@
+          console.error("[PROMETHEUS][F-006] JSON parse error in tecjustica-mcp:", e);
@@ -885,0 +888,1 @@
+          console.error("[PROMETHEUS][F-006] JSON parse error in datajud-direct:", e);
```
**Esforço**: 0.2h | **ROI**: BAIXO-MÉDIO | **Bloqueio**: nenhum (só modo PROPOSE_ONLY) | **Prioridade Ciclo 002**: ★★★

---

#### F-007 — Clamp em parseInt de parâmetros de query

```diff
--- a/server/routes.ts
+++ b/server/routes.ts
@@ -897 +897 @@
-      const limit = parseInt(req.query.limit as string) || 50;
+      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 500);
@@ -2725 +2725 @@
-      const horas = parseInt(req.query.horas as string) || 72;
+      const horas = Math.min(Math.max(1, parseInt(req.query.horas as string) || 72), 8760);
```
**Esforço**: 0.2h | **ROI**: BAIXO-MÉDIO (hardening comportamental intencional) | **Bloqueio**: nenhum (só modo PROPOSE_ONLY) | **Prioridade Ciclo 002**: ★★★

---

#### F-008 — Configurar vitest como test runner

Instalar `vitest` + `supertest`; criar `vitest.config.ts` e `server/routes.test.ts` com smoke-tests GET nos endpoints principais.  
**Esforço**: 4h | **ROI**: ALTO (desbloqueia lane APPLY_WITH_NEW_TEST) | **Bloqueio**: `package.json` (aprovação do usuário) | **Prioridade Ciclo 002**: ★★★

---

#### F-009 — CORS explícito

```diff
+app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? false }));
```
**Esforço**: 1h | **ROI**: BAIXO-MÉDIO | **Bloqueio**: dep `cors` ou implementação manual | **Prioridade Ciclo 003**: ★

---

#### F-010 — Logging estruturado (pino)

Substituir 31 chamadas `console.error/log` por `pino` com campos estruturados `{requestId, path, method, durationMs}`.  
**Esforço**: 3h | **ROI**: MÉDIO | **Bloqueio**: dep `pino` + `pino-pretty` | **Prioridade Ciclo 003**: ★★

---

### Próximo Ciclo Recomendado

**Ciclo 002** — após aprovação das dependências F-003 (`helmet`) e F-004 (`express-rate-limit`):

1. Obter permissão do usuário para instalar `helmet` e `express-rate-limit`
2. Criar branch `auto-evolution/<data>` em ambiente sem restrição de destructive-ops  
3. Aplicar F-001, F-006, F-007 (sem nova dep, confiança ≥ 0.80) em APPLY_NOW  
4. Aplicar F-003, F-004 (com nova dep aprovada) em APPLY_NOW  
5. Propor F-008 (vitest) para aprovação do usuário

---

*Ciclo 001 concluído — modo PROPOSE_ONLY — zero mudanças em arquivos de código.*
