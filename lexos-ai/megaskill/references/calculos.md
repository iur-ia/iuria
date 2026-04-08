---
name: lexos-calculos-judiciais
description: >
  Modulo de calculos judiciais do LexOS v3.0. Atualizacao monetaria (IPCA-E,
  INPC, IGP-M, SELIC, TR descartada STF), juros de mora (art 406 CC, SELIC,
  1 porcento a.m.), indices por tribunal (STF Tema 810, STJ Tema 905, TJRJ,
  TJSP, Justica Trabalho ADC 58), honorarios sobre valor atualizado, RPV e
  precatorios, multas processuais. Decisao STJ deposito NAO elide juros.
  Gera tabelas discriminadas de calculo com formula e fontes normativas.
metadata:
  version: '3.0'
  author: Dr. Thiago Gomes Morani
---

# LexOS Calculos Judiciais v3

## Atualizacao Monetaria

### Indices Aplicaveis
| Indice | Fonte | Aplicacao | Base |
|---|---|---|---|
| **IPCA-E** | IBGE | Padrao STF pos Tema 810 (Fazenda) e geral pos ADIs 4.357/4.425 | Deslocou a TR |
| **INPC** | IBGE | Previdenciario, trabalhista | Lei 8.213/91, art. 41-A |
| **IGP-M** | FGV | Contratos com previsao expressa | Convencional |
| **SELIC** | BACEN | Fazenda Publica (inclui juros + correcao) — NAO cumular com juros | Tema 810/STF |
| **TR** | BACEN | DESCARTADA pelo STF (ADIs 4.357 e 4.425) | Inconstitucional para correcao de precatorios |

### Regra Fundamental
- TR NAO pode ser usada para correcao monetaria de dividas judiciais — STF declarou inconstitucional
- SELIC ja embute juros — se usar SELIC, NAO acrescentar juros de mora separadamente
- IPCA-E + juros de 1% a.m. e a formula padrao para condenacoes entre particulares

## Juros de Mora

### Regra Geral (art. 406 CC)
- Taxa legal: SELIC (quando lei especifica nao determinar outra)
- Termo inicial:
  - Obrigacao contratual: citacao valida (art. 405 CC)
  - Responsabilidade extracontratual: data do evento danoso (Sumula 54 STJ)
  - Fazenda Publica: citacao (Tema 810 STF)

### Decisao STJ — Deposito Judicial NAO Elide Juros
O deposito judicial NAO suspende a incidencia de juros moratorios. Os juros continuam correndo mesmo apos deposito. O credor so recebe juros ate o efetivo pagamento/levantamento.
- Fundamento: o deposito nao equivale a pagamento — pagamento extingue a obrigacao, deposito nao
- Impacto pratico: na liquidacao, calcular juros ate o levantamento, nao ate o deposito

### Fazenda Publica — Regime Especifico
| Fase | Indice | Base |
|---|---|---|
| Ate citacao | Sem juros, sem correcao | — |
| Citacao ate sentenca | SELIC | Tema 810 STF |
| Sentenca ate precatorio | SELIC | Tema 810 STF |
| Precatorio ate pagamento | IPCA-E | EC 113/2021 (taxa SELIC unificada) |

## Indices por Tribunal

| Tribunal | Correcao monetaria | Juros mora | Tabela/Base |
|---|---|---|---|
| **STF/STJ (Fazenda)** | IPCA-E → SELIC | SELIC (nao cumular) | Tema 810/STF, Tema 905/STJ |
| **TJRJ** | IPCA-E | 1% a.m. | Tabela CGJ-RJ |
| **TJSP** | Tabela Pratica TJSP | 1% a.m. | Comunicado 2.138 |
| **TJMG** | IPCA-E | 1% a.m. | — |
| **TJRS** | IGP-M (contratos) / IPCA-E (geral) | 1% a.m. | — |
| **Justica do Trabalho** | IPCA-E → SELIC | SELIC (nao cumular) | ADC 58/STF (fase judicial: SELIC) |
| **Justica Federal** | IPCA-E → SELIC | SELIC (Fazenda) / 1% a.m. (particular) | Manual de Calculos CJF |

## Honorarios Advocaticios

### Base de Calculo
- Sobre o valor ATUALIZADO da condenacao (art. 85 §2° CPC)
- Minimo 10%, maximo 20% (regra)
- Fazenda Publica: art. 85 §3° (tabela escalonada)
- Sucumbencia reciproca: art. 86 CPC
- Majoracao em grau recursal: art. 85 §11° CPC

### Tabela Fazenda (art. 85 §3°)
| Faixa | Percentual |
|---|---|
| Ate 200 SM | 10-20% |
| 200-2.000 SM | 8-10% |
| 2.000-20.000 SM | 5-8% |
| 20.000-100.000 SM | 3-5% |
| Acima de 100.000 SM | 1-3% |

## RPV e Precatorios

### Limite RPV
- Federal: 60 salarios minimos (art. 100 §3° CF)
- Estadual/Municipal: pode ser menor (lei propria)

### Precatorios
- Atualizacao: IPCA-E (EC 113/2021 unificou com SELIC)
- Juros compensatorios: ate a expedicao do precatorio
- Sequestro: possivel em caso de pretericao da ordem cronologica
- Cessao de credito: permitida (art. 100 §13° CF)

## Multas Processuais

| Multa | Base | Valor |
|---|---|---|
| Cumprimento de sentenca (art. 523 §1°) | Nao pagamento em 15 dias | 10% + honorarios 10% |
| Litigancia de ma-fe (art. 81) | Conduta processual indevida | 1-10% do valor da causa |
| Embargos protelatórios (art. 1.026 §2°) | Embargos manifestamente protelatórios | Ate 2% do valor atualizado |
| Ato atentatorio dignidade justica (art. 77 §2°) | Descumprimento de ordens | Ate 20% do valor da causa |

## Geracao de Tabela de Calculo

### Estrutura Padrao
```
TABELA DISCRIMINADA DE CALCULO
Processo: [numero] | Credor: [nome] | Devedor: [nome]
================================================================
VALOR PRINCIPAL: R$ [valor]
DATA BASE: [data do debito]
DATA CALCULO: [data atual]

ATUALIZACAO MONETARIA:
  Indice: [IPCA-E / SELIC / INPC]
  Periodo: [data base] a [data calculo]
  Fator acumulado: [fator]
  Valor corrigido: R$ [valor]

JUROS DE MORA:
  Taxa: [1% a.m. / SELIC]
  Termo inicial: [citacao / evento danoso]
  Periodo: [inicio] a [fim]
  Valor juros: R$ [valor]

SUBTOTAL: R$ [corrigido + juros]

HONORARIOS ADVOCATICIOS:
  Base: R$ [subtotal]
  Percentual: [X%]
  Valor: R$ [valor]

MULTA ART. 523 §1° (se aplicavel):
  10% sobre R$ [subtotal]: R$ [valor]

TOTAL DEVIDO: R$ [TOTAL]
================================================================
FONTES NORMATIVAS:
- [Indice]: [base legal / jurisprudencia]
- [Juros]: [base legal]
- [Honorarios]: [CPC art. 85 §X°]
```

## Regras

1. SEMPRE citar a fonte normativa de cada indice utilizado
2. SEMPRE verificar jurisprudencia ATUALIZADA do STF/STJ sobre indices
3. Se Fazenda Publica: SELIC (nao cumular correcao + juros)
4. Se entre particulares: IPCA-E + 1% a.m. (padrao)
5. Deposito judicial NAO elide juros — calcular ate efetivo pagamento
6. TR esta DESCARTADA — nunca usar para correcao monetaria judicial
