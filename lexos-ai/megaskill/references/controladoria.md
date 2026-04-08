---
name: lexos-controladoria-processual
description: >
  Modulo de controladoria processual do LexOS v3.0. Verificacao de publicacoes
  (DJe, DGen, intimacao pessoal), analise de tempestividade (da nossa parte e
  da parte contraria), prescricao e decadencia por materia, preclusao como arma
  de defesa, intempestividade recursal do adversario. Modo auditoria integrado
  ao workflow. Emite Relatorio de Controladoria com alertas e oportunidades.
  Use em TODA demanda para verificar prazos, publicacoes e oportunidades.
metadata:
  version: '3.0'
  author: Dr. Thiago Gomes Morani
---

# LexOS Controladoria Processual v3

Modo de auditoria e controladoria do escritorio Morani & Santos. TODA demanda passa por este modulo.

## Funcao

Verificar, auditar e identificar oportunidades processuais relacionadas a prazos, publicacoes, prescricao, decadencia e preclusao — tanto a favor quanto contra o cliente.

## Workflow de Controladoria

### Etapa 1 — Coleta de Dados
1. Receber numero do processo, tribunal, partes
2. Via MCP TecJustica ou browser: consultar TODOS os andamentos
3. Identificar: sentenca, acordao, decisoes interlocutorias, intimacoes, publicacoes
4. Coletar datas EXATAS de cada ato processual

### Etapa 2 — Verificacao de Publicacoes
- **DJe** (Diario da Justica Eletronico): publicacao padrao — prazo conta do 1° dia util seguinte (art. 224 §2° CPC)
- **DGen** (Diario Geral — alguns tribunais): verificar se intimacao foi por DJe ou DGen
- **Intimacao pessoal** (art. 183 §1° CPC): Fazenda Publica, MP, Defensoria — carga ou remessa dos autos
- **Intimacao por AR**: data de juntada do AR aos autos (art. 231 II CPC)
- **Intimacao eletronica** (art. 270 CPC): 10 dias apos envio, se nao consultada antes
- **Publicacao em nome de advogado errado**: nulidade (art. 272 §2° CPC) — oportunidade de arguir

### Etapa 3 — Analise de Tempestividade

#### Da Nossa Parte
- Calcular prazo de CADA recurso/peticao com lexos-prazos
- Dias uteis (art. 219 CPC), suspensoes (art. 220-222), feriados locais
- Margem de seguranca: SEMPRE 2 dias antes do vencimento
- Verificar se prazo em dobro se aplica (Fazenda, MP, Defensoria — art. 183 CPC)

#### Da Parte Contraria (OPORTUNIDADE)
Para CADA ato da parte adversaria, verificar:
1. Data da publicacao/intimacao
2. Inicio do prazo (1° dia util seguinte)
3. Contagem em dias uteis (excluindo feriados e suspensoes)
4. Data final do prazo
5. Data do protocolo do ato
6. **SE INTEMPESTIVO**: registrar como OPORTUNIDADE — arguir intempestividade como preliminar

### Etapa 4 — Prescricao e Decadencia

#### Verificacao Proativa
Em TODA nova demanda, verificar:
| Materia | Prazo | Base Legal |
|---|---|---|
| Responsabilidade civil | 3 anos | CC art. 206 §3° V |
| Enriquecimento sem causa | 3 anos | CC art. 206 §3° IV |
| Cobranca divida liquida (titulo) | 5 anos | CC art. 206 §5° I |
| Contra Fazenda Publica | 5 anos | Decreto 20.910/32 |
| Improbidade | 8 anos do fato | Lei 14.230/2021 art. 23 |
| Tributaria | 5 anos (constituicao) + 5 anos (cobranca) | CTN arts. 150 §4° + 174 |
| Trabalhista | 2 anos (ajuizamento) + 5 anos (creditos) | CF art. 7° XXIX |
| Consumidor | 5 anos | CDC art. 27 |
| Falencia | 2 anos (reabilitacao) | LREF art. 158 |
| Regra geral | 10 anos | CC art. 205 |

#### Como Arma de Defesa
- Verificar se a pretensao do autor esta prescrita
- Verificar prescricao intercorrente (art. 921 §4° CPC)
- Verificar decadencia legal (juiz reconhece de oficio — art. 210 CC)
- Se encontrar: arguir como PRELIMINAR DE MERITO

### Etapa 5 — Preclusao como Arma

Verificar se a parte contraria:
- Perdeu prazo para contestar (revelia — art. 344 CPC)
- Perdeu prazo para recorrer (transito em julgado parcial)
- Praticou ato incompativel com conduta anterior (preclusao logica)
- Ja praticou o ato e tenta complementar (preclusao consumativa)

Se SIM: arguir preclusao como defesa.

## Output: Relatorio de Controladoria

```
RELATORIO DE CONTROLADORIA PROCESSUAL — LexOS v3.0
Processo: [numero] | Tribunal: [tribunal]
Partes: [autor] x [reu] | Cliente: [nome]
Data da analise: [data]
============================================================

1. PUBLICACOES VERIFICADAS:
   - [data]: [ato] publicado em [DJe/DGen/AR]
   - Prazo: [inicio] a [fim] ([X] dias uteis)
   - Status: [tempestivo / intempestivo / pendente]

2. TEMPESTIVIDADE DOS ATOS DA PARTE CONTRARIA:
   - [ato]: protocolado em [data] — prazo vencia em [data]
   - Status: [TEMPESTIVO / *** INTEMPESTIVO — OPORTUNIDADE ***]

3. PRESCRICAO / DECADENCIA:
   - Pretensao: [tipo] — prazo prescricional: [X anos]
   - Termo inicial: [data] — vencimento: [data]
   - Status: [vigente / *** PRESCRITO — ARGUIR ***]

4. PRECLUSOES IDENTIFICADAS:
   - [parte] perdeu prazo para [ato] em [data]
   - Tipo: [temporal/consumativa/logica]
   - Acao recomendada: [arguir/monitorar]

5. ALERTAS:
   🔴 [alertas criticos — prazos iminentes do cliente]
   🟡 [alertas de atencao]
   🟢 [oportunidades identificadas contra parte adversa]

PROXIMAS ACOES RECOMENDADAS:
1. [acao prioritaria]
2. [acao secundaria]
============================================================
```

## Integracao no Workflow

- **Fase 0a (Triagem)**: controladoria verifica prescricao/decadencia ANTES do Conselho
- **Fase 2 (Pesquisa)**: verificar tempestividade de atos relevantes
- **Fase 3 (Redacao)**: incluir arguicao de intempestividade/prescricao se identificada
- **Fase 5 (Red Team)**: Streck verifica se perdemos algum prazo ou oportunidade

## Regras

1. TODA demanda nova passa por controladoria antes de qualquer outra acao
2. Verificar AMBOS os lados: nossos prazos E prazos da parte contraria
3. Intempestividade da parte adversa e OPORTUNIDADE — nunca ignorar
4. Prescricao/decadencia: verificar antes de ajuizar qualquer acao
5. Relatório de controladoria OBRIGATORIO em processos de alta complexidade
