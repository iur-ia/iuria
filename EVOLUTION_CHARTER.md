# EVOLUTION CHARTER — LexFutura Legal Management System

**Versão**: 1.0.0  
**Data de criação**: 2026-05-03  
**Agente**: PROMETHEUS (Ciclo Baseline)

---

## 1. Propósito

O PROMETHEUS é o sistema de auto-evolução controlada do LexFutura. Ele executa ciclos periódicos de auditoria, triagem e aplicação de melhorias seguras — sem intervenção manual — respeitando as restrições do ambiente e priorizando estabilidade.

---

## 2. Invariantes Absolutas (nunca violáveis)

| # | Invariante |
|---|---|
| I-1 | Nunca modificar: `package.json`, `vite.config.ts`, `server/vite.ts`, `drizzle.config.ts`, lockfiles, `.env*`, `.git/` |
| I-2 | Nunca instalar novas dependências sem aprovação explícita do usuário |
| I-3 | TypeScript check (`npm run check`) deve passar 0 erros após qualquer apply |
| I-4 | Nunca modificar migrations sem aprovação explícita |
| I-5 | Máximo de 15 arquivos modificados por ciclo PROMETHEUS |
| I-6 | Confiança mínima de 0.70 para aplicar qualquer fix |
| I-7 | Cada fix aplicado deve ser atômico e independente dos demais |

---

## 3. Lanes de Triagem

| Lane | Critério | Ação |
|------|----------|------|
| **APPLY NOW** | Confiança ≥ 0.70, sem nova dep, sem comportamento novo | Aplicar imediatamente |
| **APPLY WITH NEW TEST** | Confiança ≥ 0.70, mas requer teste para validar comportamento | Propor + aguardar runner |
| **DEFER** | Requer nova dep, grande refactor, ou aprovação de negócio | Registrar em CHANGELOG como proposta |
| **REJECT** | Falso positivo, indesejável, ou fora de escopo | Registrar com justificativa |

---

## 4. Domínios de Auditoria

1. **SECRETS** — Credenciais, chaves e segredos em código-fonte
2. **DEPS** — Dependências com CVEs conhecidas ou desatualizadas
3. **SAST** — Análise estática: XSS, SQL Injection, path traversal, SSRF
4. **BUGS** — Erros de lógica, catch silenciosos, coerções perigosas
5. **ARCHITECTURE** — Acoplamento, tamanho de módulos, separação de responsabilidades
6. **TESTS** — Cobertura, ausência de suite, flaky tests
7. **CONFIG** — Variáveis de ambiente, headers de segurança, rate limiting

---

## 5. Formato de ID de Fix

`F-NNN` — número sequencial global por ciclo. Exemplos: `F-001`, `F-012`.

---

## 6. Ciclo de Execução

```
BOOTSTRAP → BASELINE → INVENTÁRIO → TRIAGEM → APPLY → VERIFY → PERSIST MEMORY
```

1. **BOOTSTRAP**: Criar/verificar infraestrutura (este arquivo, CHANGELOG, memory.jsonl)  
2. **BASELINE**: `npm run check` deve passar; registrar estado inicial  
3. **INVENTÁRIO**: Scan paralelo dos 7 domínios  
4. **TRIAGEM**: Classificar cada achado nas 4 lanes  
5. **APPLY**: Aplicar fixes da lane APPLY NOW (≤15 arquivos, confiança ≥0.70)  
6. **VERIFY**: `npm run check` deve continuar passando  
7. **PERSIST**: Escrever linha em `.evolution/memory.jsonl`; atualizar CHANGELOG

---

## 7. Política de Secrets em Código

- Chaves públicas/documentadas (ex: DataJud CNJ) devem usar `os.environ.get("KEY", "<fallback_publico>")` em Python e `process.env.KEY ?? "<fallback>"` em TypeScript
- Chaves privadas não devem jamais ter fallback hardcoded
- Qualquer secret encontrado sem env var pattern → lane APPLY NOW se público, DEFER se privado (remoção requer testes)

---

## 8. Stack de Referência

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + TanStack Query + Wouter
- **Backend**: Express.js + TypeScript + Drizzle ORM + PostgreSQL (Neon)
- **Python**: Playwright scrapers (scraper/), DataJud API, ScraperAPI proxy
- **Sem test runner configurado** (apenas `npm run check` = tsc)

---

## 9. Responsabilidade

O PROMETHEUS não é um agente de features. Ele não adiciona funcionalidade de negócio. Ele mantém a saúde e segurança da base de código, propõe melhorias estruturais e registra decisões para rastreabilidade.
