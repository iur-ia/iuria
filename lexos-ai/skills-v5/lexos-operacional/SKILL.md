---
name: lexos-operacional
description: >
  Modulo operacional do escritorio Morani & Santos. Honorarios advocaticios (tabela OAB, art. 85 CPC, exito, contencioso), timesheet e controle de tempo, contratos de prestacao de servicos juridicos, negociacao de acordos e honorarios, jurimetria (probabilidade de exito, analise de portfolio), relatorios juridicos e de producao, monitoramento de DJe/DGen, melhoria continua. Use para gestao, operacao e reportes do escritorio.
---



---

# MÓDULO: HONORARIOS

# LexOS Honorarios — Gestao Financeira Advocaticia

## Quando Usar

- Calcular honorarios para nova demanda
- Gerar contrato de honorarios
- Consultar tabela OAB
- Controlar horas trabalhadas
- Faturar cliente
- Analisar rentabilidade

## Modalidades de Honorarios

### 1. Honorarios Fixos (Ad Exitum Parcial)
Valor fixo por etapa processual:
- Consultoria/Parecer: a partir de R$ 3.000
- Peticao Inicial: a partir de R$ 5.000
- Acompanhamento processual/mes: a partir de R$ 2.000
- Audiencia: a partir de R$ 2.500

### 2. Honorarios de Exito (Ad Exitum)
Percentual sobre proveito economico:
- Recuperacao Judicial: 5-15% do ativo recuperado
- Acao de cobranca: 20-30% do valor recuperado
- Indenizatorio: 20-30% da condenacao
- Administracao Judicial TJRJ: 1,25% do valor do ativo

### 3. Honorarios por Hora (Timesheet)
- Socio Senior: R$ 800-1.500/hora
- Socio: R$ 500-800/hora
- Associado Senior: R$ 300-500/hora
- Associado Junior: R$ 150-300/hora
- Estagiario: R$ 80-150/hora

### 4. Retainer (Avenca Mensal)
Valor fixo mensal para atendimento continuo:
- Pequena empresa: R$ 3.000-8.000/mes
- Media empresa: R$ 8.000-20.000/mes
- Grande empresa: R$ 20.000+/mes

## Contrato de Honorarios Modelo

Estrutura obrigatoria:
1. Qualificacao das partes
2. Objeto (descricao do servico)
3. Modalidade de honorarios
4. Valores e forma de pagamento
5. Despesas processuais (custas, peritos — por conta do cliente)
6. Prazo e condicoes de rescisao
7. Clausula de exito (se aplicavel)
8. Sigilo profissional
9. Foro: Rio de Janeiro/RJ

Referencia: Tabela de Honorarios OAB/RJ (consultar via browser a versao atualizada)
Estatuto da OAB: Lei 8.906/1994, Arts. 22-26

## Exemplo de Uso

Usuario: "Calcule os honorarios para administracao judicial de uma recuperacao judicial com ativo de R$ 50 milhoes"

Calculo: 1,25% de R$ 50.000.000 = R$ 625.000,00 (remuneracao do AJ conforme pratica TJRJ)


---

# MÓDULO: TIMESHEET

# LexOS Timesheet — Controle de Horas

## Quando Usar

- Registrar horas trabalhadas em um processo
- Calcular valor de honorarios por hora
- Gerar relatorio de produtividade
- Preparar faturamento para o cliente

## Registro de Horas

Formato padrao:
```
DATA: DD/MM/AAAA
ADVOGADO: [Nome]
CLIENTE: [Nome]
PROCESSO: [Numero CNJ]
ATIVIDADE: [Descricao]
TEMPO: [HH:MM]
CATEGORIA: [Consultoria/Reuniao/Audiencia/Pesquisa/Redacao/Administrativo]
```

## Tabela de Valores/Hora

| Profissional | Valor/Hora |
|---|---|
| Socio Senior (Dr. Morani) | R$ 1.200,00 |
| Socia (Dra. Jennifer) | R$ 1.000,00 |
| Associado Senior | R$ 500,00 |
| Associado Junior | R$ 250,00 |
| Estagiario | R$ 100,00 |

## Relatorios

### Por Processo
Total horas, valor total, distribuicao por categoria, timeline

### Por Cliente
Total horas, valor total, processos vinculados, inadimplencia

### Por Advogado
Produtividade, horas faturaveis vs administrativas, meta mensal

### Mensal do Escritorio
Horas totais, faturamento, taxa de aproveitamento (faturaveis/total)

## Exemplo de Uso

Usuario: "Registre 3 horas de pesquisa jurisprudencial no processo 0012345-67.2024.8.19.0001 do cliente ABC Ltda"

Resposta: Registrar e confirmar com resumo.


---

# MÓDULO: CONTRATOS DE ESCRITORIO

# LexOS Contratos — Criacao, Revisao e Analise

## Quando Usar

- Criar minutas de contratos
- Revisar contratos recebidos (due diligence contratual)
- Identificar clausulas abusivas (CDC)
- Gerar contratos de honorarios
- Negociar termos contratuais

## Tipos de Contrato Suportados

1. Prestacao de Servico (advocaticio e geral)
2. Compra e Venda (bens moveis e imoveis)
3. Locacao (residencial e comercial — Lei 8.245/91)
4. Contrato Social / Acordo de Socios
5. NDA (Non-Disclosure Agreement)
6. SLA (Service Level Agreement)
7. Consultoria
8. Parceria / Joint Venture
9. Contrato de Honorarios Advocaticios
10. Termos de Uso e Politica de Privacidade
11. Contratos empresariais (fornecimento, distribuicao, franquia)

## Workflow de Criacao

### Intake
Pergunte ao Dr. Morani:
1. Tipo de contrato
2. Partes envolvidas (qualificacao completa: nome, CPF/CNPJ, endereco)
3. Objeto do contrato
4. Valor e forma de pagamento
5. Prazo de vigencia
6. Clausulas especiais desejadas
7. Foro de eleicao

### Estrutura Padrao
1. PREAMBULO (qualificacao das partes)
2. CLAUSULA 1a — DO OBJETO
3. CLAUSULA 2a — DO PRECO E FORMA DE PAGAMENTO
4. CLAUSULA 3a — DO PRAZO
5. CLAUSULA 4a — DAS OBRIGACOES DAS PARTES
6. CLAUSULA 5a — DA CONFIDENCIALIDADE
7. CLAUSULA 6a — DA RESCISAO
8. CLAUSULA 7a — DAS PENALIDADES
9. CLAUSULA 8a — DA FORCA MAIOR
10. CLAUSULA 9a — DO FORO
11. DATA E ASSINATURAS
12. TESTEMUNHAS

## Workflow de Revisao

### Checklist de Analise
Para cada contrato recebido, verifique:
- [ ] Qualificacao completa das partes
- [ ] Objeto claro e determinado
- [ ] Preco e indexador adequados (IPCA, IGPM, etc.)
- [ ] Clausula de rescisao equilibrada
- [ ] Multa proporcional (max 10% como padrao)
- [ ] Clausula de confidencialidade presente
- [ ] Foro adequado (Rio de Janeiro se possivel)
- [ ] Prazo de vigencia e renovacao claros
- [ ] Ausencia de clausulas abusivas (CDC Art. 51)
- [ ] Clausula de mediacao/arbitragem (quando aplicavel)
- [ ] Compliance com LGPD (Lei 13.709/2018)
- [ ] Clausula de forca maior atualizada (pos-pandemia)

### Classificacao de Risco por Clausula
- [VERDE] Clausula padrao, equilibrada
- [AMARELO] Clausula que merece atencao, potencial desequilibrio
- [VERMELHO] Clausula de ALTO RISCO — requer negociacao ou remocao

## Exemplo de Uso

Usuario: "Crie um contrato de honorarios para o caso de recuperacao judicial da empresa XYZ"

Resposta: Gerar contrato com: honorarios iniciais + percentual de exito + retainer mensal, clausula de sigilo, prazo vinculado ao processo, foro RJ, assinatura digital.


---

# MÓDULO: NEGOCIACAO

# LexOS Negociacao — Estrategia e Resolucao de Conflitos

## Quando Usar

- Preparar proposta de acordo
- Avaliar se vale litigar ou acordar
- Preparar para mediacao/conciliacao
- Negociar termos contratuais
- Definir estrategia de negociacao

## Frameworks de Negociacao

### BATNA (Best Alternative to a Negotiated Agreement)
Antes de qualquer negociacao, defina:
1. Qual a MELHOR alternativa se nao houver acordo?
2. Qual o custo dessa alternativa? (honorarios, custas, tempo, risco)
3. Qual o valor minimo aceitavel considerando a BATNA?

### ZOPA (Zone of Possible Agreement)
Identifique a zona de acordo possivel:
- Piso do nosso cliente (valor minimo aceitavel)
- Teto da parte adversa (valor maximo que aceitaria pagar)
- Se ZOPA existe: negociacao possivel
- Se ZOPA nao existe: impasse — considerar arbitragem ou litigio

### Matriz Custo-Beneficio

| Cenario | Probabilidade | Valor | Tempo | Custo |
|---------|--------------|-------|-------|-------|
| Acordo agora | 100% | R$ X | Imediato | Baixo |
| Sentenca favoravel | Y% | R$ Z | M meses | R$ C |
| Sentenca desfavoravel | (100-Y)% | R$ 0 | M meses | R$ C |
| Valor esperado litigio | — | Y% * Z - C | M meses | R$ C |

Decisao: se Valor Acordo > Valor Esperado Litigio → ACORDAR

## Mediacao e Conciliacao (CPC)

Base legal: CPC/2015, Arts. 3 (§2° e §3°), 165-175, 334
- Art. 334: Audiencia de conciliacao obrigatoria antes da contestacao
- Art. 165: Criacao de CEJUSCs
- Principios: independencia, imparcialidade, autonomia da vontade, confidencialidade, oralidade, informalidade

## Exemplo de Uso

Usuario: "O devedor na RJ quer propor acordo de pagamento de R$ 2 milhoes parcelados em 24x. O credito total e R$ 5 milhoes. Devo aceitar?"

Analise: Calcular BATNA (execucao do credito na falencia: recuperacao historica de 10-20% = R$ 500k-1M em 3-5 anos), comparar com proposta (R$ 2M em 24 meses = valor presente ~R$ 1.7M), concluir com recomendacao.


---

# MÓDULO: JURIMETRIA

# LexOS Jurimetria — Analise Preditiva Judicial

## Quando Usar

- Calcular chances de exito de uma demanda
- Analisar decisoes de um juiz/orgao/tribunal sobre tema especifico
- Mapear tendencias jurisprudenciais
- Preparar relatorio de viabilidade para o cliente
- Fundamentar estrategia com dados

## Protocolo de Analise

### Fase 1 — Coleta de Dados
Busque via browser nos portais oficiais:
- STF: jurisprudencia.stf.jus.br
- STJ: sj.stj.jus.br
- TJRJ: www4.tjrj.jus.br/ejuris
- TRE-RJ: tse.jus.br/jurisprudencia
- TST: jurisprudencia.tst.jus.br

Parametros de busca:
1. Tema/assunto (ex: "cram down recuperacao judicial")
2. Orgao julgador especifico (ex: "1a Vara Empresarial TJRJ")
3. Relator/juiz
4. Periodo (ultimos 5 anos como padrao)
5. Classe processual

### Fase 2 — Tabulacao
Para cada decisao encontrada, extraia:
- Numero do processo (formato CNJ)
- Data do julgamento
- Orgao julgador
- Relator
- Resultado: PROCEDENTE / IMPROCEDENTE / PARCIALMENTE PROCEDENTE / EXTINTO SEM MERITO
- Fundamento principal
- Valor envolvido (se disponivel)

### Fase 3 — Analise Estatistica
Calcule e apresente:

| Metrica | Valor |
|---------|-------|
| Total de decisoes analisadas | N |
| Taxa de procedencia | X% |
| Taxa de improcedencia | Y% |
| Taxa parcialmente procedente | Z% |
| Tempo medio (distribuicao → sentenca) | M meses |
| Valor medio das condenacoes | R$ V |
| Desvio padrao dos valores | R$ D |

### Fase 4 — Mapa de Tendencias
- Grafico temporal: evolucao da taxa de procedencia ao longo dos anos
- Top 5 juizes/relatores mais favoraveis ao tema
- Top 5 argumentos com maior taxa de aceitacao
- Contra-argumentos mais eficazes da parte adversa

### Fase 5 — Relatorio de Viabilidade
Formato final para o Dr. Morani:

```
RELATORIO DE VIABILIDADE JURIMETRICA
=====================================
Tema: [tema]
Tribunal: [tribunal]
Periodo: [periodo]
Amostra: [N] decisoes

PROBABILIDADE DE EXITO: [X]% ([classificacao])
- Alta (>70%): Recomendar ajuizamento
- Media (40-70%): Ajuizamento com ressalvas
- Baixa (<40%): Reconsiderar ou negociar

FUNDAMENTACAO RECOMENDADA:
1. [argumento mais eficaz — taxa X%]
2. [segundo argumento — taxa Y%]
3. [terceiro argumento — taxa Z%]

RISCOS IDENTIFICADOS:
1. [contra-argumento mais frequente]
2. [jurisprudencia contraria]

RECOMENDACAO ESTRATEGICA:
[analise conclusiva]
```

## Exemplo de Uso

Usuario: "Qual a chance de exito de um pedido de cram down no TJRJ?"

Resposta esperada: Buscar todas as decisoes sobre cram down (Art. 58, §1o, Lei 11.101/2005) no TJRJ dos ultimos 5 anos, tabular resultados, calcular taxa de aprovacao, identificar varas empresariais mais favoraveis, e entregar relatorio de viabilidade.


---

# MÓDULO: RELATORIOS JURIDICOS

# LexOS Relatorios — Inteligencia Gerencial

## Quando Usar

- Gerar relatorio mensal do escritorio
- Analisar produtividade da equipe
- Verificar saude financeira
- Preparar reuniao de socios
- Identificar gargalos operacionais

## Tipos de Relatorio

### 1. Relatorio Mensal do Escritorio
- Processos ativos vs novos vs encerrados
- Prazos cumpridos vs perdidos
- Honorarios recebidos vs pendentes
- Horas trabalhadas (timesheet)
- Taxa de exito processual

### 2. Relatorio Financeiro
- Receita bruta vs liquida
- Contas a receber (aging: 30/60/90+ dias)
- Contas a pagar
- Fluxo de caixa projetado
- Rentabilidade por cliente/processo

### 3. Relatorio de Produtividade
- Horas por advogado (faturaveis vs administrativas)
- Pecas produzidas por periodo
- Tempo medio de producao por tipo de peca
- Ranking de produtividade

### 4. Relatorio de Prazos
- Prazos proximos (pirâmide de criticidade)
- Historico de cumprimento
- Taxa de atraso
- Processos sem movimentacao

### 5. Relatorio de Jurimetria
- Taxa de exito por area, tribunal, juiz
- Tempo medio de tramitacao
- Valores medios de condenacao
- Tendencias

## Formato

Relatorios gerados em Markdown com:
- Tabelas comparativas
- Indicadores com setas (crescimento/queda)
- Graficos ASCII quando possivel
- Destaque para alertas e anomalias

## Exemplo de Uso

Usuario: "Gere o relatorio mensal de marco/2026 do escritorio"

Resposta: Compilar dados disponiveis e gerar relatorio estruturado.


---

# MÓDULO: RELATORIO DE PRODUCAO

# LexOS Relatorio de Producao v3

Implementa a saida da Fase 8 do Prompt LexOS v3.0.

## Formato

```
RELATORIO DE PRODUCAO — [TIPO DE PECA]
=========================================
Data: DD/MM/AAAA
Cliente: [nome]
Processo: [numero CNJ]
Tipo: [Peticao Inicial / Apelacao / REsp / ...]
Framework: [CRAC / TREAT / IRAC / Alexy / Toulmin]

CONSELHO:
- Tese aprovada: [descricao]
- Votos: Barroso [favoravel/contra] | Gilmar [favoravel/contra] | Streck [resistiu/nao resistiu]
- Celso de Mello: [parecer]

ARGUMENTOS E GRADACAO:
1. [RATIO] [9/10] — [argumento] — Dossie: X precedentes, Y doutrina
2. [OBITER] [7/10] — [argumento] — Dossie: X precedentes
3. [DISSIDENTE] [4/10] — [argumento]
4. [SUBSIDIARIO] [2/10] — [argumento]

VERIFICACAO CoVe2:
- Citacoes totais: N
- [VERDE]: X (Y%)
- [AMARELO]: W (Z%)
- [VERMELHO]: V (K%)
- Taxa verificacao: Y%
- Chain of Logic: [APROVADO / FALHAS]

RED TEAM:
- Vulnerabilidades encontradas: N
- Rebuttals incorporados: M
- Argumentos rebaixados: K

QUALIDADE:
- Score geral: X/10
- Densidade argumentativa: X camadas/paragrafo
- Humanizacao: [aprovada/requer revisao]
```


---

# MÓDULO: SCRAPER DJE

# LexOS Scraper DJe v3

Monitora diarios oficiais de TODO o Brasil. O usuario escolhe quais ativar.

## Diarios Disponiveis

### Diarios da Justica Eletronicos (DJe)

| Tribunal | URL DJe | Anti-bot |
|---|---|---|
| **STF** | https://portal.stf.jus.br/servicos/dje/ | Sem CAPTCHA |
| **STJ** | stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/DJe.aspx | Protecao ativa |
| **TST** | https://dejt.jt.jus.br/ | Sem CAPTCHA |
| **TSE** | https://www.tse.jus.br/servicos-judiciais/diario-da-justica-eletronico | Sem CAPTCHA |
| **TJRJ** | https://www3.tjrj.jus.br/consultadje/ | Sem CAPTCHA, sem Cloudflare |
| **TJSP** | https://dje.tjsp.jus.br/ | Sem CAPTCHA |
| **TJMG** | https://www.tjmg.jus.br/portal-tjmg/jurisprudencia/diario-do-judiciario/ | Sem CAPTCHA |
| **TJRS** | https://www.tjrs.jus.br/novo/servicos/diario-da-justica/ | Sem CAPTCHA |
| **TJPR** | https://portal.tjpr.jus.br/pesquisa_dje/ | Sem CAPTCHA |
| **TJDF** | https://pesquisajuris.tjdft.jus.br/IndexadorDJE/ | Sem CAPTCHA |
| **Outros TJs** | Acessar via MCP TecJustica (92+ tribunais) | Variavel |
| **TRFs** | Cada TRF tem seu DJe proprio | Sem CAPTCHA (maioria) |

### Diarios Oficiais (legislacao/atos administrativos)

| Diario | URL | Cobertura |
|---|---|---|
| **DOU** (Federal) | https://www.in.gov.br | Leis, decretos, portarias federais |
| **DOERJ** (RJ Estado) | https://www.ioerj.com.br | Legislacao estadual RJ |
| **DOM-Rio** (RJ Municipio) | https://doweb.rio.rj.gov.br | Legislacao municipal RJ |
| **Diarios Municipais** | Via Querido Diario API | 5.500+ municipios brasileiros |
| **Diarios Estaduais** | Cada estado tem o seu | Todos os 26 estados + DF |

### Querido Diario API (diarios municipais de todo o Brasil)

**URL API**: https://queridodiario.ok.org.br/api/gazettes
**Cobertura**: 5.570 municipios
**Exemplo**: `?territory_id=3304557&keywords=falencia` (Rio de Janeiro municipio)

Codigos de territorio: https://queridodiario.ok.org.br/api/cities

## Configuracao

O usuario escolhe quais diarios monitorar:
```
[ ] DJe STF
[ ] DJe STJ
[ ] DJe TJRJ
[ ] DJe TJSP
[ ] DJe [outro tribunal]
[ ] DOU (federal)
[ ] DOERJ (RJ estado)
[ ] DOM-Rio (RJ municipio)
[ ] Diarios municipais via Querido Diario
```

## Stack Tecnica

- **Scrapling**: portais sem anti-bot (TJRJ, STF, TJSP, maioria dos TJs)
- **Playwright stealth + SeleniumBase**: portais com Cloudflare (STJ, DOM-Rio)
- **Ro-DOU**: DOU federal (github.com/gestaogovbr/Ro-dou)
- **Querido Diario API**: diarios municipais de todo o Brasil

## Regras

1. Respeitar rate limiting: max 1 request a cada 3-5 segundos
2. Preferir horarios de baixo trafego (madrugada)
3. User-Agent de navegador real
4. NUNCA armazenar credenciais em skills


---

# MÓDULO: MELHORIA CONTINUA

# LexOS Melhoria Continua — Sistema Vivo

## Quando Usar

- Periodicamente (recomendado: mensal)
- Quando uma nova tecnica de prompt engineering surgir
- Quando houver mudanca legislativa relevante (nova lei, EC, resolucao CNJ/OAB)
- Quando uma skill falhar ou produzir resultado insatisfatorio
- Quando o Dr. Morani identificar alucinacao ou falha

## Protocolo de Auditoria

### Fase 1 — Inventario
Listar todas as skills instaladas do LexOS e verificar:
- [ ] Cada skill esta funcional?
- [ ] O conteudo esta atualizado?
- [ ] Ha redundancias entre skills?
- [ ] Alguma skill esta incompleta?

### Fase 2 — Pesquisa de Atualizacoes
Buscar na internet:
1. Novas tecnicas de prompt engineering (2025-2026)
2. Novas resolucoes do CNJ sobre IA
3. Novas resolucoes da OAB sobre IA
4. Atualizacoes legislativas relevantes (especialmente Lei 11.101, CPC, LGPD)
5. Novas ferramentas de legal tech
6. Papers academicos sobre anti-alucinacao em LLMs
7. Melhores praticas de Chain of Verification

### Fase 3 — Gap Analysis
Para cada skill, verificar:
- O que esta faltando vs. estado da arte?
- Quais tecnicas novas poderiam ser incorporadas?
- Ha feedback do Dr. Morani que ainda nao foi implementado?

### Fase 4 — Proposta de Atualizacao
Gerar relatorio com:
1. Skills que precisam de atualizacao (com justificativa)
2. Novas skills que deveriam ser criadas
3. Skills que podem ser fundidas ou removidas
4. Mudancas no prompt definitivo

### Fase 5 — Implementacao
Apos aprovacao do Dr. Morani:
1. Atualizar as skills modificadas
2. Criar novas skills
3. Revalidar todas (agentskills validate)
4. Salvar no perfil

## Checklist de Qualidade das Skills

Para CADA skill, verificar:
- [ ] Frontmatter YAML valido (name + description)?
- [ ] Description sem acentos (evita erros de parse)?
- [ ] Conteudo em PT-BR?
- [ ] Exemplos de uso incluidos?
- [ ] Anti-alucinacao referenciada (quando aplicavel)?
- [ ] Links obrigatorios mencionados (quando aplicavel)?
- [ ] Chain of Verification incluido (quando aplicavel)?
- [ ] Anti-mecanicidade respeitada?

## Registro de Mudancas

Manter log de todas as atualizacoes:
```
[DATA] — [SKILL] — [MUDANCA] — [MOTIVO]
```

## Exemplo de Uso

Usuario: "Faca uma auditoria completa do LexOS e proponha melhorias"

Acao: Executar Fases 1-4 completas, gerar relatorio, aguardar aprovacao para Fase 5.
