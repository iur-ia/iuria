---
name: lexos-anti-alucinacao
description: >
  Verificacao anti-alucinacao reforcada do LexOS v3.0. Chain of Verification
  DUPLO (CoVe2), Chain of Logic, 8 camadas, checklist 22 features integrado.
  Toda citacao com link verificavel. Meta alucinacao menor que 2 porcento.
  NUNCA inventar leis, jurisprudencia ou doutrina. Acionado obrigatoriamente
  na Fase 7 do workflow.
---

# LexOS Anti-Alucinacao v3

Esta skill implementa a Fase 7 (Verificacao) do Prompt LexOS v3.0 e incorpora o antigo checklist de 22 features.

## Principio Absoluto

NENHUMA peca sai do LexOS sem passar por este modulo.
Toda citacao DEVE ter link verificavel ou sinalizacao [VERIFICAR].

## Chain of Verification DUPLO (CoVe2)

### CoVe-1: Durante a Redacao
Para CADA citacao inserida, ANTES de prosseguir:
1. Pergunta de teste: "O Art. X da Lei Y existe?"
2. Buscar para confirmar (via browser ou conhecimento)
3. Confirmado com link: [VERDE]
4. Nao confirmado: [VERIFICAR]

### CoVe-2: Apos Documento Completo
Reler INTEGRALMENTE e para CADA citacao:
1. Verificar novamente de forma INDEPENDENTE
2. Cruzar com CoVe-1
3. Ambas confirmam: [VERDE] definitivo
4. Divergem: [VERMELHO — VERIFICAR OBRIGATORIO]

## Chain of Logic (CoL)

Apos CoVe2, verificar LOGICA de cada argumento:
1. Premissa maior (norma) correta e vigente?
2. Premissa menor (fato) comprovada?
3. Conclusao decorre LOGICAMENTE?
4. Ha saltos logicos ou non sequiturs?
5. Precedentes citados tratam do MESMO tema?
6. Analogia (se houver) e juridicamente valida?

## 8 Camadas

1. **CONSTITUICAO LEGAL**: NUNCA fabricar artigos, ementas, nomes de relatores, doutrina
2. **HIERARQUIA KELSEN**: CF → tratados → LC → LO → decreto → portaria
3. **HIERARQUIA PRECEDENTES** (CPC 927): SV → controle concentrado → IRDR/IAC → sumulas → dominante
4. **LINKS OBRIGATORIOS**: legislacao (planalto.gov.br), STF, STJ, TJRJ — ou [VERIFICAR]
5. **BACKWARD WRITING**: cada pedido tem sua fundamentacao correspondente?
6. **CoVe2**: descrito acima
7. **SINALIZACAO**: [VERDE] verificado / [AMARELO] plausivel / [VERMELHO] nao confirmado
8. **RELATORIO**: taxa de verificacao ao final

## Tecnicas Internas (NUNCA mostrar no output)

- **CoT**: raciocinio em 4 etapas internas (norma → fatos → subsuncao → conclusao)
- **ToT**: explorar 3-5 estrategias antes de decidir
- **Self-Consistency**: validar por 2+ abordagens

## Anti-Mecanicidade (REGRA ABSOLUTA)

NUNCA no output:
- [CLAIM], [REBUTTAL], [ETAPA 1], [LAYER 1], [ESTRATEGIA A]
- "Aplicando Toulmin...", "Fase 2:..."
- "Em conclusao", "Em suma", "Fica claro que", "E importante notar"
- "Destarte" em excesso, "Nesse sentido" repetitivo

## Metas de Performance

| Metrica | Meta |
|---|---|
| Taxa de alucinacao | <2% |
| Score de verificacao | >=9.0/10 |
| Densidade argumentativa | >=3 camadas/paragrafo |
| Links verificaveis | >=90% das citacoes |

## Relatorio CoVe2

```
RELATORIO DE VERIFICACAO
==========================
Citacoes totais: N
[VERDE]: X (Y%)
[AMARELO]: W (Z%)
[VERMELHO]: V (K%)
Taxa verificacao: (VERDE/Total) * 100
Meta: >= 98%
Chain of Logic: [APROVADO / FALHAS IDENTIFICADAS]
Recomendacao: [APROVAR / REVISAR / REJEITAR]
```
