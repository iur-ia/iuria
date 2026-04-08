---
name: lexos-pesquisa
description: >
  Pesquisa juridica avancada: jurisprudencial, doutrinaria, academica e DEEP-SEARCH. Jus IA (Pesquisa Fundamentada), STF/STJ/TJRJ portais oficiais, sinalização verde/amarelo/vermelho, ProView Thomson Reuters, Dizer o Direito, JusBrasil, Google Scholar, SciELO, CAPES. ZHS (anti-alucinacao por fonte). Use quando precisar pesquisar precedentes, doutrina ou publicacoes academicas para qualquer demanda juridica.
---

# MÓDULO: PESQUISA JURISPRUDENCIAL

# LexOS Pesquisa Jurisprudencial v3

Implementa a Fase 2 (Pesquisa Individualizada) do Prompt LexOS v3.0.
Cobre TODOS os tribunais do Brasil — o usuario escolhe ou busca nacionalmente.

## Modo de Operacao

Recebe UM ARGUMENTO do Mapa de Argumentos e busca precedentes PARA ESSE ARGUMENTO.
O usuario pode especificar tribunal ou deixar a busca nacional.

## Tribunais Superiores

| Tribunal | URL Jurisprudencia | Tipo |
|---|---|---|
| **STF** | https://jurisprudencia.stf.jus.br | Constitucional |
| **STJ** | https://scon.stj.jus.br/SCON/ | Infraconstitucional |
| **TST** | https://jurisprudencia.tst.jus.br | Trabalhista |
| **TSE** | https://www.tse.jus.br/jurisprudencia | Eleitoral |
| **STM** | https://www.stm.jus.br/servicos-stm/jurisprudencia | Militar |

## Tribunais Regionais Federais

| TRF | URL | Jurisdicao |
|---|---|---|
| **TRF1** | https://jurisprudencia.trf1.jus.br | AC,AM,AP,BA,DF,GO,MA,MG,MT,PA,PI,RO,RR,TO |
| **TRF2** | https://jurisprudencia.trf2.jus.br | RJ, ES |
| **TRF3** | https://jurisprudencia.trf3.jus.br | SP, MS |
| **TRF4** | https://jurisprudencia.trf4.jus.br | PR, SC, RS |
| **TRF5** | https://jurisprudencia.trf5.jus.br | AL, CE, PB, PE, RN, SE |
| **TRF6** | https://jurisprudencia.trf6.jus.br | MG |

## Tribunais de Justica Estaduais

| TJ | URL | Estado |
|---|---|---|
| **TJRJ** | https://www4.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx | Rio de Janeiro |
| **TJSP** | https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do | Sao Paulo |
| **TJMG** | https://www5.tjmg.jus.br/jurisprudencia/ | Minas Gerais |
| **TJRS** | https://www.tjrs.jus.br/buscas/jurisprudencia/ | Rio Grande do Sul |
| **TJPR** | https://portal.tjpr.jus.br/jurisprudencia/ | Parana |
| **TJSC** | https://busca.tjsc.jus.br/jurisprudencia/ | Santa Catarina |
| **TJBA** | https://jurisprudencia.tjba.jus.br/ | Bahia |
| **TJPE** | https://www.tjpe.jus.br/jurisprudencia | Pernambuco |
| **TJDF** | https://pesquisajuris.tjdft.jus.br/ | Distrito Federal |
| **TJGO** | https://www.tjgo.jus.br/jurisprudencia | Goias |
| **Outros TJs** | Acessar via Jus IA (cobre todos) | Demais estados |

## Tribunais Regionais do Trabalho

| TRT | Jurisdicao |
|---|---|
| **TRT1** (RJ) | https://www.trt1.jus.br/jurisprudencia |
| **TRT2** (SP Capital) | https://www.trt2.jus.br/jurisprudencia |
| **TRT15** (SP Interior) | https://www.trt15.jus.br/jurisprudencia |
| **Outros TRTs** | Acessar via Jus IA ou TST |

## Tribunais Regionais Eleitorais

| TRE | URL |
|---|---|
| **TRE-RJ** | https://www.tre-rj.jus.br/jurisprudencia |
| **Outros TREs** | Acessar via TSE ou Jus IA |

## Fontes Integradas (cobrem TODOS os tribunais)

### Jus IA (JusBrasil Premium) — PRIMEIRA FONTE OBRIGATORIA

**URL**: https://ia.jusbrasil.com.br

**REGRA ABSOLUTA**: Toda pesquisa via browser DEVE usar o modo "Pesquisa Fundamentada" do Jus IA. NUNCA usar o modo de conversa normal.

**Workflow DETALHADO via browser automation**:

1. Navegar para https://ia.jusbrasil.com.br
2. Verificar login (buscar avatar/perfil no header)
3. Se NAO logado: informar "Preciso acessar o Jus IA. Faca login em https://ia.jusbrasil.com.br"
4. **CLICAR em "Pesquisa Fundamentada"** (botao azul/destacado — este modo busca na base JusBrasil com validacao automatica de citacoes)
5. Digitar o argumento como prompt: "[argumento] — buscar jurisprudencia do [tribunal] sobre [tema]"
6. Aguardar processamento (30-60 segundos)
7. Nos resultados:
   - Localizar cada jurisprudencia retornada
   - Para CADA jurisprudencia encontrada:
     a. **CLICAR no botao "Conferir"** na aba lateral ao lado da citacao
     b. Aguardar a aba lateral abrir mostrando a jurisprudencia completa
     c. VERIFICAR: o numero do processo, relator, tribunal e ementa correspondem ao que foi citado?
     d. Se SIM: **COPIAR A EMENTA COMPLETA** da aba lateral para usar na peca
     e. Se NAO (dados divergem): marcar como [VERMELHO — VERIFICAR OBRIGATORIO]
     f. Copiar tambem o LINK DIRETO da jurisprudencia no JusBrasil
8. Repetir o passo 7 para TODAS as jurisprudencias retornadas
9. Somente usar no dossie as jurisprudencias que foram CONFERIDAS (clicou em "Conferir" e confirmou)

**POR QUE CONFERIR E OBRIGATORIO**: O Jus IA pode resumir ou parafrasear ementas. Ao clicar em "Conferir", voce acessa o texto ORIGINAL da decisao e pode copiar a ementa EXATA para a peca, evitando alucinacao.

### MCP TecJustica LITE
92+ tribunais via MNI. Token configurado no ambiente.

## Workflow

1. Receber argumento + tribunal (ou "nacional")
2. Se tribunal especifico: buscar no portal oficial + Jus IA
3. Se nacional: buscar no Jus IA (cobre todos) + tribunal superior relevante
4. Verificar cada precedente: numero, relator, data, ementa
5. Favoravel: ementa COMPLETA formato CNJ
6. Contra: formato curto
7. Output: DOSSIE DO ARGUMENTO

## Formato CNJ (quando favoravel)

```
TEMA EM CAIXA ALTA. SUBTEMAS SEPARADOS POR PONTO.
1. Contexto.
...
N. Dispositivo.
([Tipo] n. X.XXX.XXX/UF, relator[a] [Titulo] [Nome], [Orgao], julgado em DD/MM/AAAA, DJe de DD/MM/AAAA.)
```


## Hierarquia de Busca por Jurisdicao (OBRIGATORIO)

### Regra Fundamental
Ao receber a demanda, identificar o ESTADO e TRIBUNAL de destino. A pesquisa de jurisprudencia segue esta ordem RIGIDA:

### Nivel 1 — Tribunais Superiores (SEMPRE buscar)
STF e STJ — precedentes vinculantes e sumulas se aplicam a TODO o Brasil.
Estes sao SEMPRE a primeira busca, independente do estado.

### Nivel 2 — Tribunal do Estado de Destino (PRIORIDADE MAXIMA)
Se a acao e no Rio de Janeiro → buscar TJRJ, TRF2, TRT1, TRE-RJ
Se a acao e em Sao Paulo → buscar TJSP, TRF3, TRT2/TRT15
Se a acao e em Minas Gerais → buscar TJMG, TRF6, TRT3
E assim para CADA estado. O tribunal local tem PRIORIDADE sobre qualquer outro TJ.

### Nivel 3 — Tribunais do Sudeste (peso alto)
TJSP, TJRJ, TJMG — sao os maiores e mais citados. Se nao houver jurisprudencia suficiente no tribunal local, buscar aqui.

### Nivel 4 — Tribunais do Sul (peso medio-alto)
TJRS, TJPR, TJSC — boa jurisprudencia, bem fundamentada.

### Nivel 5 — Demais Tribunais (peso menor)
Somente se nao encontrar nos niveis anteriores. Justificar no dossie: "[Materia escassa no TJRJ e Sudeste — precedente do TJBA utilizado por ser leading case sobre o tema]"

### REGRA DE OURO
NUNCA citar jurisprudencia de outro estado antes de esgotar o tribunal local e os superiores.
Excecao: leading case que fixou tese nacional (neste caso, indicar expressamente).

### Exemplo
Acao no TJRJ sobre recuperacao judicial:
1. STJ (2a Secao) — precedentes vinculantes sobre RJ
2. TJRJ (Varas Empresariais) — jurisprudencia local
3. TJSP (Varas Empresariais) — maior volume de RJ no pais
4. TJMG, TJRS — complementar se necessario
5. Outros TJs — somente se materia escassa

## Regra de Recencia e Ordem Cronologica

**ORDEM**: Jurisprudencias SEMPRE apresentadas da MAIS RECENTE para a MAIS ANTIGA.

**PRIORIDADE TEMPORAL**:
1. **Preferencial (ate 3 anos)**: Buscar jurisprudencia dos ultimos 3 anos. Esta e a faixa ideal.
2. **Aceitavel (3 a 5 anos)**: Se nao houver suficiente nos ultimos 3 anos, ampliar para 5 anos.
3. **Excepcional (mais de 5 anos)**: SOMENTE quando a materia for extremamente escassa ou quando se tratar de precedente historico fundamental (ex: leading case que fixou a tese). Neste caso, justificar: "[Precedente historico — materia escassa, nao ha julgados recentes sobre o tema]".

**NO JUS IA**: Ao digitar o prompt de busca, incluir filtro temporal: "[argumento] — jurisprudencia dos ultimos 3 anos do [tribunal]"

**NO DOSSIE**: Listar na ordem:
```
1. [2026] REsp n. ... (mais recente)
2. [2025] REsp n. ...
3. [2024] AgInt no REsp n. ...
4. [2023] REsp n. ... (limite preferencial)
5. [2022] REsp n. ... (aceitavel se necessario)
```

## Regras

1. NUNCA inventar jurisprudencia
2. NUNCA API keys no prompt
3. Toda citacao com link verificavel ou [VERIFICAR]
4. Hierarquia CPC Art. 927
5. Buscar para CADA argumento individualmente


---

# MÓDULO: PESQUISA DOUTRINÁRIA

# LexOS Pesquisa Doutrinaria v3

Esta skill implementa a Fase 2 (Pesquisa Individualizada) do Prompt LexOS v3.0.

## Principio Fundamental

Recebe UM ARGUMENTO ESPECIFICO e busca fundamentacao doutrinaria EXCLUSIVAMENTE para esse argumento. Cada argumento recebe sua propria pesquisa doutrinaria.

## Input

```
{
  argumento: "descricao do argumento juridico",
  gradacao: "ratio_decidendi | obiter_dictum | dissidente | subsidiario",
  area_direito: "Recuperacao Judicial | Empresarial | ...",
  autores_preferidos: ["Didier", "Tartuce", "Streck", ...]
}
```

## Fontes e Workflows (em ordem de prioridade)

### FONTE 1: JusBrasil — Pesquisa de Doutrina

**URL artigos doutrinarios**: https://www.jusbrasil.com.br/artigos
**URL Jus IA para doutrina**: https://ia.jusbrasil.com.br

**Workflow via browser para artigos**:
1. Navegar para https://www.jusbrasil.com.br/artigos
2. Digitar termos do argumento no campo de pesquisa
3. Filtrar por: "Artigos" (nao jurisprudencia)
4. Nos resultados: identificar artigos de autores reconhecidos
5. Coletar: autor, titulo, data, link

**Workflow via Jus IA para fundamentacao doutrinaria**:
1. Navegar para https://ia.jusbrasil.com.br
2. Se nao logado: solicitar login ao usuario
3. Digitar: "Quais sao os principais autores e obras sobre [argumento]? Cite com referencia completa ABNT"
4. Coletar: autores, obras, trechos relevantes

**Quando usar**: Sempre como primeira fonte — ampla cobertura.

### FONTE 2: Buscador Dizer o Direito

**URL**: https://www.buscadordizerodireito.com.br
**IA DOD**: https://iadod.com.br

**Workflow via browser**:
1. Navegar para https://www.buscadordizerodireito.com.br
2. Se nao logado: solicitar login ao usuario (email + senha)
3. Digitar o tema do argumento no campo de busca
4. Resultados: julgados COMENTADOS com explicacao doutrinaria
5. Para cada resultado: coletar o comentario doutrinario (que explica o julgado de forma didatica)

**Workflow IA DOD**:
1. Navegar para https://iadod.com.br
2. Login (se necessario)
3. Digitar pergunta sobre o argumento
4. A IA retorna: entendimento STF/STJ + referencias dos julgados comentados
5. Coletar: explicacao + link para o Buscador

**Quando usar**: Para doutrina jurisprudencial comentada — ideal para compreender e parafrasear julgados.

**REGRA DE CITACAO DIZER O DIREITO (ABSOLUTA)**:
O Dizer o Direito e fonte de PESQUISA e VERIFICACAO, NAO fonte de citacao em nota de rodape.
- O que se encontrar no DOD deve ser PARAFRASEADO no texto
- A jurisprudencia comentada deve ser citada como JURISPRUDENCIA (formato CNJ, portal do tribunal)
- O Dizer o Direito NAO entra em nota de rodape
- Na verificacao interna (CoVe), registrar: "Parafrase extraida do Dizer o Direito — fonte: [URL]"
- Isso serve para rastreabilidade, NAO para citacao na peca
- Mesmo principio para artigos do JusBrasil: citar o AUTOR do artigo, nao o JusBrasil como fonte

### FONTE 3: Thomson Reuters ProView

**URL login**: https://signon.thomsonreuters.com/v2?culture=pt-BR&productid=EREAD
**URL plataforma**: https://proview.thomsonreuters.com

**Workflow via browser**:
1. Navegar para https://proview.thomsonreuters.com
2. Se nao logado: redirecionado para https://signon.thomsonreuters.com
3. Login via OnePass (email + senha) — solicitar ao usuario se nao salvo
4. Na plataforma: buscar por autor OU titulo OU tema
5. Abrir obra relevante
6. Usar busca interna do livro para localizar trecho sobre o argumento
7. Coletar: trecho exato, autor, obra, edicao, editora (RT), ano, PAGINA EXATA

**Formato ABNT**: SOBRENOME, Nome. Titulo da obra. Ed. Cidade: Editora, ano, p. XX.
Exemplo: DIDIER JR., Fredie. Curso de Direito Processual Civil. 20. ed. Salvador: JusPodivm, 2018, p. 245.

**Acervo**: 1.300+ obras da Editora Revista dos Tribunais e Fiscosoft

**Quando usar**: Para citacao doutrinaria com pagina exata — a mais precisa.

### FONTE 4: Clube Minha Biblioteca

**URL login**: https://clube.minhabiblioteca.com.br
**Catalogo Direito**: 2.700+ titulos

**Workflow via browser**:
1. Navegar para https://clube.minhabiblioteca.com.br
2. Clicar em "Assinatura individual" → login (email + senha)
3. Ir em "Minha Conta" → "Minhas Assinaturas" → "Acessar Biblioteca"
4. Se o botao "Acessar Biblioteca" nao aparecer: recarregar a pagina (pode ser bloqueado como popup)
5. No streaming: buscar por titulo, ISBN ou autoria
6. Abrir obra → buscar termos do argumento dentro do livro
7. Coletar: trecho, autor, obra, editora, ano, pagina

**Quando usar**: Complemento ao ProView para obras de outras editoras.

## Formato de Citacao ABNT NBR 6023:2018

**Livro**:
```
SOBRENOME, Nome. Titulo: subtitulo. Edicao. Cidade: Editora, ano. p. XX.
```

**Artigo de periodico**:
```
SOBRENOME, Nome. Titulo do artigo. Nome da Revista, v. X, n. X, p. XX-XX, ano.
```

**Capitulo de livro**:
```
SOBRENOME, Nome (do autor do capitulo). Titulo do capitulo. In: SOBRENOME, Nome (org.). Titulo do livro. Ed. Cidade: Editora, ano. p. XX-XX.
```

## Output: Dossie Doutrinario do Argumento

```
DOSSIE DE PESQUISA DOUTRINARIA
================================
Argumento: [descricao]
Gradacao: [ratio/obiter/dissidente/subsidiario]
Area: [area do direito]

AUTORES ENCONTRADOS:
1. SOBRENOME, Nome. Titulo. Ed. Cidade: Editora, ano, p. XX.
   Trecho relevante: "..."
   Fonte: [ProView / Minha Biblioteca / JusBrasil]
   Relevancia: [ALTA/MEDIA/BAIXA]

2. ...

DOUTRINA JURISPRUDENCIAL (via Dizer o Direito — fonte de pesquisa, NAO de citacao):
1. Julgado comentado: [REsp/RE]
   Parafraseado como: "..."
   Citar na peca como: JURISPRUDENCIA (formato CNJ, portal oficial)
   Rastreabilidade interna: [URL Buscador DOD] — NAO incluir na peca

SINALIZACAO:
- [VERDE]: X citacoes com pagina exata e fonte verificavel
- [AMARELO]: Y citacoes sem pagina exata
- [VERMELHO]: Z citacoes nao confirmadas
```

## Regras Absolutas

1. NUNCA inventar citacao doutrinaria — se nao encontrar: "[VERIFICAR: buscar em [fonte]]"
2. NUNCA incluir API keys ou credenciais
3. Toda citacao DEVE ter referencia ABNT completa com editora, ano e pagina (quando possivel)
4. Buscar para CADA argumento individualmente
5. Priorizar autores Tier 1 da area (conforme lexos-areas-85)
6. Dizer o Direito: NUNCA citar em nota de rodape — parafrasear e citar a jurisprudencia original
7. JusBrasil artigos: citar o AUTOR do artigo, nao o JusBrasil como fonte


---

# MÓDULO: PESQUISA ACADÊMICA

# LexOS Pesquisa Academica v3

Esta skill implementa a Fase 2 (Pesquisa Individualizada) do Prompt LexOS v3.0.

## Principio Fundamental

Recebe UM ARGUMENTO ESPECIFICO e busca fundamentacao academica (papers, teses, dissertacoes) EXCLUSIVAMENTE para esse argumento.

## Fontes e Workflows

### FONTE 1: Google Scholar

**URL**: https://scholar.google.com.br

**Workflow via browser**:
1. Navegar para https://scholar.google.com.br
2. Digitar termos do argumento em portugues
3. Filtrar: "Desde [ano]" para resultados recentes
4. Para cada resultado relevante: coletar titulo, autores, ano, DOI, link
5. Verificar se tem acesso ao texto completo (PDF)

### FONTE 2: SciELO

**URL**: https://www.scielo.br

**Workflow via browser**:
1. Navegar para https://www.scielo.br
2. Busca avancada: termos do argumento
3. Filtrar por area: Direito / Ciencias Sociais Aplicadas
4. Coletar: titulo, autores, revista, volume, DOI

### FONTE 3: CAPES Periodicos

**URL**: https://www.periodicos.capes.gov.br

**Workflow**: acesso via CAFe (instituicional) — se Dr. Morani tiver acesso UERJ

### FONTE 4: Repositorios Universitarios

- **UERJ**: https://www.bdtd.uerj.br
- **USP**: https://www.teses.usp.br
- **UnB**: https://repositorio.unb.br
- **FGV**: https://bibliotecadigital.fgv.br

**Workflow**: busca por termos do argumento em cada repositorio.

## Formato de Citacao

**Artigo com DOI**:
```
SOBRENOME, Nome; SOBRENOME, Nome. Titulo do artigo. Nome da Revista, v. X, n. X, p. XX-XX, ano. DOI: 10.xxxx/xxxxx.
```

**Tese/Dissertacao**:
```
SOBRENOME, Nome. Titulo da tese. Ano. Tese (Doutorado em Direito) - Universidade, Cidade, ano.
```

## Output: Dossie Academico do Argumento

```
DOSSIE DE PESQUISA ACADEMICA
==============================
Argumento: [descricao]

PAPERS/ARTIGOS:
1. AUTOR. Titulo. Revista, v.X, n.X, ano. DOI: [link]
   Relevancia para o argumento: [explicacao]

TESES/DISSERTACOES:
1. AUTOR. Titulo. Tese (Doutorado) - Universidade, ano.
   Relevancia: [explicacao]

SINALIZACAO:
- [VERDE]: X referencias com DOI/link verificavel
- [AMARELO]: Y referencias sem link
```

## Regras

1. NUNCA inventar referencia academica
2. Priorizar publicacoes em Direito Processual Civil, Recuperacao Judicial, Falencias, Eleitoral
3. DOI quando disponivel
4. Buscar para CADA argumento individualmente


---

# MÓDULO: DEEP-SEARCH PROTOCOL

# LEXOS — BASE DE CONHECIMENTO JURÍDICO BRASILEIRO
## Módulos PRIV (Direito Privado) + EMP (Direito Empresarial)
### 17 Áreas | Versão 1.0 | Abril 2026

---

# ═══════════════════════════════════════════════════════════════
# DEEP-SEARCH PROTOCOL
# Protocolo de Pesquisa Jurídica por Abstração Progressiva
# ═══════════════════════════════════════════════════════════════

## 1. ESCADA DE ABSTRAÇÃO (5 níveis acima / 4 níveis abaixo)

Para cada conceito jurídico pesquisado, percorra a escada em ambas as direções antes de fixar a estratégia de busca.

```
NÍVEL +5 (Filosófico/Axiológico)
  └─ Valores constitucionais supremos: dignidade da pessoa humana, solidariedade social,
     função social da propriedade, boa-fé objetiva como mandamento ético universal

NÍVEL +4 (Constitucional)
  └─ Dispositivos CF/88 aplicáveis, direitos fundamentais incidentes,
     princípios explícitos e implícitos, bloco de constitucionalidade (tratados DIDH)

NÍVEL +3 (Macro-sistêmico)
  └─ Área do direito, diploma legislativo estruturante, relação com outros ramos,
     princípios gerais da área (ex: princípio da relatividade contratual)

NÍVEL +2 (Institucional)
  └─ Capítulo/Título do código ou lei, institutos correlatos, diálogo das fontes,
     normas regulamentares (decretos, resoluções BACEN/CVM/SUSEP/CADE)

NÍVEL +1 (Normativo Direto)
  └─ Artigos, parágrafos e incisos aplicáveis; enunciados das Jornadas de Direito Civil;
     súmulas STF/STJ vinculantes e persuasivas; IN's e Portarias

CONCEITO-ALVO ◄────────────────────────────────────────────────►
  Exemplo: "Teoria da Imprevisão" → CC art. 478-480

NÍVEL -1 (Operacional)
  └─ Requisitos legais, pressupostos, elementos constitutivos, prazo decadencial/prescricional,
     legitimidade ativa/passiva, competência funcional

NÍVEL -2 (Procedimental)
  └─ Rito processual (CPC), tutelas de urgência cabíveis, provas admissíveis,
     ônus probatório, perícia necessária, reconvenção/contestação

NÍVEL -3 (Documental)
  └─ Peças elaboráveis (petição inicial, contestação, recurso, parecer, contrato,
     notificação, procuração, declaração, laudo pericial)

NÍVEL -4 (Técnico-operacional)
  └─ Cláusulas contratuais específicas, minutas-padrão, listas de checklist,
     planilhas de cálculo (correção, juros, IRDR), tabelas de prazos
```

---

## 2. EXPANSÃO LEXICAL — METODOLOGIA

Para cada área, o protocolo gera 50+ termos distribuídos em 5 categorias:

| Categoria | Descrição | Exemplos |
|-----------|-----------|---------|
| **Termos Técnicos Primários** | Nomenclatura doutrinária consolidada | *adimplemento substancial, surrectio, suppressio* |
| **Termos Processuais** | Ações, recursos, incidentes | *ação reivindicatória, IRDR, agravo de instrumento* |
| **Termos Regulatórios** | Normas infralegais, órgãos | *Resolução BACEN, Instrução CVM, Nota Técnica CADE* |
| **Termos Jurisprudenciais** | Súmulas, teses, leading cases | *Súmula 297 STJ, Tema 848 STF* |
| **Termos Coloquiais/Clientes** | Como leigos descrevem o problema | *multa abusiva, cláusula leonina, penhora do imóvel* |

**Regra de ouro:** nunca iniciar pesquisa apenas com o termo técnico — sempre expandir para as 5 categorias e cruzar resultados.

---

## 3. MAPA DE FONTES POR TRIBUNAL

```
STF (Supremo Tribunal Federal)
  ├─ Portal: portal.stf.jus.br
  ├─ Pesquisa de jurisprudência: jurisprudencia.stf.jus.br
  ├─ Teses de Repercussão Geral: teses.stf.jus.br
  └─ Foco: constitucionalidade, RE/ARE com RG, ADPF, ADI

STJ (Superior Tribunal de Justiça)
  ├─ Portal: stj.jus.br
  ├─ Pesquisa: scon.stj.jus.br/SCON
  ├─ Jurisprudência em Teses: www.stj.jus.br/sites/portalp/Jurisprudencia/Jurisprudencia-em-teses
  └─ Foco: lei federal, REsp, AREsp, IAC, IRDR relator STJ

TJs Estaduais (por volume de processos privados)
  ├─ TJSP: esaj.tjsp.jus.br — líder em volume, câmaras especializadas
  ├─ TJRJ: tjrj.jus.br — referência em família e sucessões
  ├─ TJMG: tjmg.jus.br — referência em contratos agrários
  ├─ TJRS: tjrs.jus.br — vanguarda em consumidor
  └─ TJPR: tjpr.jus.br — referência em franquia/representação comercial

TRFs (Federal — quando há interesse federal)
  ├─ TRF1: portal.trf1.jus.br (Norte/Centro-Oeste/Minas)
  ├─ TRF2: portal.trf2.jus.br (RJ/ES)
  ├─ TRF3: trf3.jus.br (SP/MS)
  └─ TRF4: trf4.jus.br (Sul — referência em propriedade industrial)

Tribunais Especializados
  ├─ CADE (antitruste): cade.gov.br/jurisprudencia
  ├─ INPI (PI): inpi.gov.br/menu-servicos/jurisprudencia
  ├─ BACEN (bancário): bcb.gov.br/pre/normativos
  └─ CVM (mercado de capitais): cvm.gov.br/legislacao

Doutrina — Fontes Primárias
  ├─ Revista dos Tribunais (RT) — Thomson Reuters
  ├─ Editora Forense — Grupo GEN
  ├─ Saraiva Jur — Grupo SAGAH
  ├─ Fórum — BH
  └─ Jornadas de Direito Civil (CJF/STJ) — enunciados.cjf.jus.br
```

---

## 4. ESTRATÉGIA PROGRESSIVA DE PESQUISA

```
FASE 1 — Mapeamento Normativo (30 min)
  1. Identificar todos os artigos do diploma base aplicáveis
  2. Mapear legislação especial concorrente
  3. Verificar decreto regulamentador e normas infralegais vigentes
  4. Checar alterações legislativas dos últimos 24 meses

FASE 2 — Ancoragem Constitucional (20 min)
  1. Identificar direitos fundamentais incidentes (CF arts. 5°, 7°, 170 etc.)
  2. Verificar repercussão geral no STF (Temas com julgamento definitivo)
  3. Buscar ADPF/ADI relacionadas ao instituto

FASE 3 — Consolidação Jurisprudencial (40 min)
  1. Súmulas STF e STJ — busca por tema
  2. Jurisprudência em Teses STJ — edição relevante
  3. IRDR/IAC nos TJs e TRFs
  4. Leading cases recentes (últimos 5 anos)

FASE 4 — Doutrina (30 min)
  1. Manuais estruturantes (Tier 1 — autores de referência)
  2. Monografias especializadas
  3. Artigos em RT/RDCC/RDC nos últimos 3 anos
  4. Enunciados das Jornadas CJF

FASE 5 — Síntese Operacional (40 min)
  1. Montar timeline de prazos (prescrição/decadência/processuais)
  2. Identificar competência material e territorial
  3. Listar documentos necessários para a causa
  4. Redigir checklist de perguntas ao cliente
```

---

# ═══════════════════════════════════════════════════════════════
# MÓDULO PRIV — DIREITO PRIVADO
# ═══════════════════════════════════════════════════════════════

---

## PRIV-001 — DIREITO CIVIL: PARTE GERAL
### CC arts. 1–232 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Ementa / Relevância |
|---|-------|---------------------|
| 1 | **CC arts. 1–232** (Lei 10.406/2002) | Parte Geral do Código Civil: personalidade, capacidade, domicílio, bens, fatos jurídicos |
| 2 | **CF/88 arts. 1°, III; 5°, X, XXX** | Dignidade da pessoa humana; proteção à personalidade, herança |
| 3 | **Lei 10.741/2003 (Estatuto do Idoso)** | Capacidade, curatela, proteção específica do idoso |
| 4 | **Lei 13.146/2015 (Estatuto da Pessoa com Deficiência — EPD)** | Reforma do regime de capacidades; curatela proporcional; tomada de decisão apoiada |
| 5 | **Lei 13.509/2017** | Alterações na adoção e poder familiar (reflexo na parte geral) |
| 6 | **Lei 9.434/1997** | Remoção de órgãos e tecidos — direitos da personalidade post mortem |
| 7 | **Lei 12.965/2014 (Marco Civil da Internet)** | Proteção de dados pessoais, personalidade digital |
| 8 | **Lei 13.709/2018 (LGPD)** | Proteção de dados como direito da personalidade |
| 9 | **Decreto 8.727/2016** | Uso do nome social — identidade de gênero |
| 10 | **Resolução CFM 1.995/2012** | Diretivas antecipadas de vontade — testamento vital |
| 11 | **CPC/2015 arts. 747–758** | Procedimentos de curatela e interdição |
| 12 | **Enunciados CJF/STJ — I a VIII Jornadas de Direito Civil** | Interpretação doutrinária dos arts. 1–232 CC |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Caio Mário da Silva Pereira** | *Instituições de Direito Civil* — v. I (Introdução/Parte Geral) | Forense | 34ª ed., 2022 |
| **Pablo Stolze Gagliano & Rodolfo Pamplona Filho** | *Novo Curso de Direito Civil* — v. 1 (Parte Geral) | Saraiva Jur | 25ª ed., 2023 |
| **Flávio Tartuce** | *Direito Civil* — v. 1 (Lei de Introdução e Parte Geral) | Forense/Método | 19ª ed., 2024 |
| **Cristiano Chaves de Farias & Nelson Rosenvald** | *Curso de Direito Civil* — v. 1 (Parte Geral e LINDB) | JusPodivm | 18ª ed., 2023 |
| **Maria Helena Diniz** | *Curso de Direito Civil Brasileiro* — v. 1 (Teoria Geral do Direito Civil) | Saraiva | 39ª ed., 2022 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 227** | Pessoa jurídica pode sofrer dano moral | Honra objetiva da PJ |
| 2 | **STJ — Súmula 364** | Pessoa jurídica não pode sofrer dano moral por ato praticado contra seus sócios | Limitação |
| 3 | **STJ — REsp 1.674.398** | Nome social de pessoas trans — obrigação de uso mesmo sem retificação de registro | Identidade |
| 4 | **STF — ARE 1.291.737 RG** | Constitucionalidade da tomada de decisão apoiada (EPD) | Capacidade |
| 5 | **STJ — REsp 1.846.519** | Direitos da personalidade post mortem — legitimidade dos herdeiros | Personalidade |
| 6 | **STJ — Tema 938 (repetitivo)** | Prescrição — termo inicial em caso de incapaz absolutamente incapaz | Prazo |
| 7 | **STF — ADI 4.275** | Retificação de registro civil para transgêneros independe de cirurgia | Personalidade |
| 8 | **STJ — REsp 1.517.973** | Simulação — negócio jurídico nulo vs. anulável | Invalidades |
| 9 | **STJ — Súmula 401** | Prazo prescricional começa na data do ato ou fato violador do direito | Prescrição |
| 10 | **STJ — EREsp 1.280.825** | Teoria da actio nata subjetiva — prescrição só corre quando titular conhece ou deveria conhecer o dano | Prescrição |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto de Uso |
|---|-----------|----------------|
| 1 | **Petição Inicial — Ação de Retificação de Registro Civil** | Nome, sexo, data de nascimento — errors e identidade |
| 2 | **Petição de Tomada de Decisão Apoiada** | EPD — pessoa com deficiência + 2 apoiadores |
| 3 | **Requerimento de Interdição / Curatela** | Incapaz absoluto (menores, doentes mentais graves) |
| 4 | **Declaração de Reconhecimento de Filho** | Registro de paternidade voluntária |
| 5 | **Procuração Pública — Poderes Gerais e Especiais** | Representação civil completa |
| 6 | **Escritura de Emancipação Voluntária** | CC art. 5°, parágrafo único, I |
| 7 | **Testamento Vital / Diretiva Antecipada de Vontade** | Resolução CFM 1.995/2012 |
| 8 | **Parecer Jurídico sobre Validade de Negócio Jurídico** | Análise de vícios (erro, dolo, coação, lesão, estado de perigo) |
| 9 | **Contestação — Alegação de Prescrição** | Matéria de defesa — CC art. 193 |
| 10 | **Instrumento de Cessão de Direitos de Personalidade** | Uso de imagem, voz, obra intelectual |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **3 anos** — prescrição geral de reparação civil | CC art. 206, §3°, V | Contado da violação |
| **4 anos** — anulação por dolo, coação, lesão, estado de perigo | CC art. 178 | Decadencial |
| **2 anos** — anulação por erro ou dolo | CC art. 179 | Decadencial |
| **Imprescritível** — ações relacionadas a direitos da personalidade (CC art. 11) | CC art. 11 | Direitos personalíssimos |
| **Prescrição suspensa** enquanto durar a incapacidade absoluta | CC art. 198, I | |
| **1 ano** — decadência para anulação de atos praticados durante incapacidade relativa, após cessada | CC art. 179 | |
| **Prazo processual geral — contestação** | CPC art. 335 | 15 dias úteis |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência na Área |
|----------|-------------------|
| **STF** | RE com RG sobre direitos da personalidade, capacidade civil, estado de pessoa |
| **STJ** | REsp sobre interpretação do CC arts. 1–232, conflitos entre leis federais |
| **TJs Estaduais** | 1ª instância geral (Varas Cíveis, Varas de Família, Varas de Registros Públicos) |
| **Varas de Registros Públicos** | Retificação de registro civil, emancipação, interdição |
| **Juizado Especial Cível** | Causas até 40 SM sem complexidade de personalidade |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`personalidade jurídica` · `capacidade de fato` · `capacidade de direito` · `emancipação` · `curatela` · `tutela` · `tomada de decisão apoiada` · `direitos da personalidade` · `nome civil` · `nome social` · `pseudônimo` · `direito à imagem` · `direito à honra` · `direito à privacidade` · `domicílio civil` · `residência` · `habitação` · `bens imóveis` · `bens móveis` · `bens fungíveis` · `bens consumíveis` · `bens divisíveis` · `bens principais` · `bens acessórios` · `frutos` · `produtos` · `pertenças` · `fato jurídico` · `ato jurídico` · `negócio jurídico` · `condição` · `termo` · `encargo` · `defeitos do negócio` · `erro substancial` · `dolo essencial` · `coação` · `estado de perigo` · `lesão` · `fraude contra credores` · `simulação` · `nulidade absoluta` · `anulabilidade` · `invalidade` · `ineficácia` · `inexistência` · `prescrição` · `decadência` · `actio nata` · `teoria da cegueira deliberada` · `representação` · `mandato` · `confusão` · `pessoa jurídica` · `desconsideração da personalidade jurídica` · `teoria maior` · `teoria menor` · `LINDB`

---

## PRIV-002 — DIREITO DAS OBRIGAÇÕES
### CC arts. 233–420 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 233–420** | Modalidades obrigacionais, transmissão, extinção, inadimplemento |
| 2 | **CF/88 art. 5°, XXXVI** | Ato jurídico perfeito, direito adquirido — proteção de obrigações constituídas |
| 3 | **CPC/2015 arts. 497–501** | Tutela específica das obrigações de fazer/não fazer/entregar |
| 4 | **Lei 10.931/2004** | Cédula de crédito bancário — obrigações líquidas |
| 5 | **Lei 13.874/2019 (Liberdade Econômica)** | Presunção de boa-fé; extinção de obrigações de fazer por iniciativa privada |
| 6 | **CC arts. 421–422** | Boa-fé objetiva e função social do contrato (interface obrigacional) |
| 7 | **Decreto-lei 911/1969** | Alienação fiduciária — obrigações garantidas |
| 8 | **Lei 4.728/1965** | Mercado de capitais e obrigações ao portador |
| 9 | **Enunciados CJF — Obrigações** | Enunciados 22, 23, 24, 25, 26 da I Jornada; 161, 162 da III Jornada |
| 10 | **CPC arts. 523–527** | Cumprimento de sentença de obrigação de pagar quantia |
| 11 | **CC arts. 389–406** | Inadimplemento absoluto e mora |
| 12 | **Lei 9.492/1997** | Protesto de títulos — efeitos obrigacionais |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Clóvis Beviláqua** | *Teoria Geral das Obrigações* | Forense | Edição fac-similar, 2003 |
| **Caio Mário da Silva Pereira** | *Instituições de Direito Civil* — v. II (Teoria Geral das Obrigações) | Forense | 30ª ed., 2022 |
| **Flávio Tartuce** | *Direito Civil* — v. 2 (Direito das Obrigações e Responsabilidade Civil) | Forense/Método | 19ª ed., 2024 |
| **Carlos Roberto Gonçalves** | *Direito Civil Brasileiro* — v. 2 (Teoria Geral das Obrigações) | Saraiva | 21ª ed., 2023 |
| **Antônio Junqueira de Azevedo** | *Negócio Jurídico — Existência, Validade e Eficácia* | Saraiva | 4ª ed., 2010 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 54** | Termo inicial dos juros moratórios — evento danoso (responsabilidade extracontratual) | Mora |
| 2 | **STJ — Súmula 162** | Na compensação de dívidas, os juros moratórios incidem até a data do efetivo encontro de contas | Compensação |
| 3 | **STJ — Súmula 410** | A prévia intimação do devedor constitui pressuposto para imposição de multa por descumprimento de obrigação | Mora |
| 4 | **STJ — REsp 1.547.749 (repetitivo)** | Adimplemento substancial impede a resolução contratual, mas não o pedido de indenização | Inadimplemento |
| 5 | **STJ — Tema 425** | Juros de mora em obrigação positiva e líquida — a partir da citação (art. 405 CC) | Juros |
| 6 | **STJ — Súmula 380** | A simples propositura da ação de revisão de contrato não inibe a caracterização da mora do autor | Mora |
| 7 | **STJ — REsp 1.630.103** | Teoria do adimplemento substancial — limitações e casos de não aplicação (fiança, contratos de trato sucessivo) | Adimplemento |
| 8 | **STJ — Súmula 477** | A decadência do art. 26 do CDC não é obstáculo à apreciação da ocorrência de vícios redibitórios | Vício |
| 9 | **STF — RE 661.256 RG** | Constituição em mora — notificação vs. protesto | Mora |
| 10 | **STJ — EREsp 1.197.638** | Obrigação de dar coisa incerta — concentração no gênero pelo credor | Obrigação de dar |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Notificação Extrajudicial de Constituição em Mora** | CC art. 397, parágrafo único |
| 2 | **Petição de Consignação em Pagamento** | CC arts. 334–345; CPC arts. 539–549 |
| 3 | **Petição de Ação de Cobrança** | Obrigação de pagar quantia certa |
| 4 | **Petição de Tutela Específica — Obrigação de Fazer** | CPC art. 497 + CC art. 247 |
| 5 | **Instrumento de Novação** | CC arts. 360–367 — reestruturação de dívida |
| 6 | **Instrumento de Compensação de Dívidas** | CC arts. 368–380 |
| 7 | **Instrumento de Remissão de Dívida** | CC arts. 385–388 |
| 8 | **Cálculo de Atualização Monetária + Juros Moratórios** | Planilha — IPCA/SELIC/juros legais |
| 9 | **Instrumento de Cessão de Crédito** | CC arts. 286–298 — notificação ao devedor |
| 10 | **Contestação — Exceção Substancial de Compensação** | CPC art. 343 + CC arts. 368–380 |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **3 anos** — prescrição da pretensão de cobrança de dívida líquida constante em instrumento público ou particular | CC art. 206, §3°, VIII | |
| **5 anos** — prescrição de pretensões relativas a atos de gestão e créditos em geral (regra subsidiária) | CC art. 205 (residual) | |
| **10 anos** — prescrição geral residual (quando não há prazo especial) | CC art. 205 | |
| **Mora *ex re*** — vencimento do termo | CC art. 397 *caput* | Sem necessidade de notificação |
| **Mora *ex persona*** — interpelação judicial/extrajudicial necessária | CC art. 397, parágrafo único | |
| **Prazo para consignação** — réu tem 5 dias para levantar ou contestar | CPC art. 542 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp sobre CC arts. 233–420, teoria geral das obrigações |
| **TJs Estaduais (Varas Cíveis)** | Ações de cobrança, consignação, tutela específica |
| **Juizado Especial Cível** | Causas até 40 SM, obrigações simples |
| **Arbitragem** | Obrigações disponíveis — convenção de arbitragem (Lei 9.307/96) |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`obrigação de dar` · `obrigação de fazer` · `obrigação de não fazer` · `obrigação positiva` · `obrigação negativa` · `obrigação líquida` · `obrigação ilíquida` · `obrigação alternativa` · `obrigação facultativa` · `obrigação solidária` · `obrigação divisível` · `obrigação indivisível` · `mora` · `mora *ex re*` · `mora *ex persona*` · `inadimplemento absoluto` · `adimplemento substancial` · `juros moratórios` · `juros compensatórios` · `correção monetária` · `cláusula penal` · `arras confirmatórias` · `arras penitenciais` · `novação` · `compensação` · `confusão` · `remissão` · `pagamento` · `dação em pagamento` · `sub-rogação` · `cessão de crédito` · `assunção de dívida` · `concentração do débito` · `vencimento antecipado` · `interpelação` · `purga da mora` · `devedor solidário` · `credor solidário` · `obrigação propter rem` · `obrigação natural` · `obrigação civil` · `título de crédito` · `liquidação da obrigação` · `multa cominatória` · `astreintes` · `obrigação de resultado` · `obrigação de meio` · `condição suspensiva` · `condição resolutiva` · `termo inicial` · `termo final` · `encargo modal` · `enriquecimento sem causa`

---

## PRIV-003 — DIREITO DOS CONTRATOS
### CC arts. 421–853 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 421–853** | Teoria geral dos contratos, contratos em espécie |
| 2 | **CF/88 art. 5°, II e XXXVI; art. 170, IV** | Livre iniciativa, autonomia privada, ato jurídico perfeito |
| 3 | **Lei 13.874/2019 (Liberdade Econômica)** | Intervenção mínima; presunção de boa-fé; arts. 421-A CC acrescidos |
| 4 | **CDC — Lei 8.078/1990 arts. 46–54** | Contratos de consumo: cláusulas abusivas, oferta, publicidade |
| 5 | **Lei 9.307/1996 (Arbitragem)** | Cláusula compromissória e compromisso arbitral |
| 6 | **Lei 9.613/1998 (Lavagem de Dinheiro)** | Obrigações de compliance em contratos |
| 7 | **Lei 8.245/1991 (Locação)** | Contrato de locação residencial e comercial |
| 8 | **Lei 6.729/1979 (Lei Ferrari — concessionárias)** | Contratos de concessão comercial |
| 9 | **Lei 8.955/1994 (Franquia)** | Circular de Oferta de Franquia (COF) — substituída pela Lei 13.966/2019 |
| 10 | **Lei 13.966/2019 (Nova Lei de Franquia)** | Atualização da COF, rescisão, direitos e obrigações |
| 11 | **Lei 4.886/1965 (Representação Comercial)** | Contratos de representação — ver EMP-003 |
| 12 | **Enunciados CJF — Contratos** | Enunciados 23, 24, 25, 26 (I JDC); 167–177 (III JDC); 408–432 (V JDC) |
| 13 | **CC arts. 478–480** | Teoria da imprevisão, resolução e revisão por onerosidade excessiva |
| 14 | **CC arts. 157, 171, II** | Lesão e anulação contratual |
| 15 | **MP 2.200-2/2001** | Infraestrutura de chaves públicas brasileira — contratos eletrônicos |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Orlando Gomes** | *Contratos* | Forense | 27ª ed., 2019 (atual. Edvaldo Brito) |
| **Caio Mário da Silva Pereira** | *Instituições de Direito Civil* — v. III (Contratos) | Forense | 23ª ed., 2022 |
| **Flávio Tartuce** | *Direito Civil* — v. 3 (Teoria Geral dos Contratos e Contratos em Espécie) | Forense/Método | 17ª ed., 2022 |
| **Claudia Lima Marques** | *Contratos no Código de Defesa do Consumidor* | RT | 9ª ed., 2019 |
| **Nelson Rosenvald & Cristiano Chaves de Farias** | *Curso de Direito Civil* — v. 4 (Contratos) | JusPodivm | 12ª ed., 2022 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 297** | O Código de Defesa do Consumidor é aplicável às instituições financeiras | Âmbito de aplicação |
| 2 | **STJ — Súmula 381** | Nos contratos bancários, é vedado ao julgador conhecer, de ofício, da abusividade das cláusulas | Abusividade |
| 3 | **STJ — Súmula 322** | Para a repetição de indébito, nos contratos de abertura de crédito em conta corrente, não se exige a prova do erro | Repetição |
| 4 | **STJ — Tema 953 (repetitivo)** | Teoria da imprevisão — requisitos para revisão por onerosidade excessiva em contratos civis | Revisão |
| 5 | **STJ — REsp 1.321.614** | Boa-fé objetiva — dever de informação pré-contratual (culpa in contrahendo) | Boa-fé |
| 6 | **STJ — Súmula 548** | Incumbe ao credor a exclusão do registro da dívida em banco de dados e cadastros de inadimplentes no prazo de 5 dias úteis, contados da data em que o devedor efetuou o pagamento | Inadimplemento |
| 7 | **STJ — REsp 1.803.250** | Abusividade de cláusula de renúncia antecipada ao direito de indenização | Cláusula abusiva |
| 8 | **STF — RE 590.415 RG** | Validade de cláusula de eleição de foro em contrato de adesão bancário | Eleição de foro |
| 9 | **STJ — Súmula 302** | É abusiva a cláusula contratual de plano de saúde que limita no tempo a internação hospitalar do segurado | Planos de saúde |
| 10 | **STJ — Tema 1.061 (repetitivo)** | Revisão contratual — aplicação da Lei de Liberdade Econômica (art. 421-A CC) | Revisão |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Minuta de Contrato de Prestação de Serviços** | CC arts. 593–609; adaptável B2B e B2C |
| 2 | **Minuta de Contrato de Compra e Venda de Imóvel** | CC arts. 481–532 + escritura pública |
| 3 | **Minuta de Contrato de Empreitada** | CC arts. 610–626 |
| 4 | **Notificação de Resilição Unilateral** | CC art. 473 — resilição com prazo razoável |
| 5 | **Petição de Ação de Resolução Contratual por Inadimplemento** | CC art. 475 + CPC |
| 6 | **Petição de Revisão Contratual por Onerosidade Excessiva** | CC arts. 478–480 |
| 7 | **Cláusula Compromissória — Minuta** | Lei 9.307/96 art. 4° |
| 8 | **Distrato / Rescisão Amigável** | CC art. 472 — distrato bilateral |
| 9 | **Parecer sobre Validade de Cláusula Penal** | CC arts. 408–416 |
| 10 | **Ação de Cobrança — Contrato Escrito** | CPC art. 700 — ação monitória opcional |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **10 anos** — prescrição geral de pretensão contratual | CC art. 205 | Regra residual |
| **5 anos** — pretensão de cobrança de aluguéis e rendas periódicas | CC art. 206, §5°, I | |
| **3 anos** — pretensão de reparação civil contratual | CC art. 206, §3°, V | |
| **4 anos** — decadência para anulação por lesão | CC art. 178 | |
| **Prazo razoável para resilição** — sem prazo determinado em lei | CC art. 473, parágrafo único | Proporcional ao investimento |
| **30 dias** — prazo mínimo para COF antes da assinatura (franquia) | Lei 13.966/2019 art. 7° | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp sobre contratos civis e empresariais (lei federal) |
| **TJs Estaduais — Câmaras de Direito Privado** | Ações contratuais de maior valor |
| **Juizados Especiais Cíveis** | Causas até 40 SM, contratos simples |
| **Câmaras Arbitrais** | Contratos empresariais com cláusula compromissória (CAM-CCBC, CAMARB, FIESP, ICC Brasil) |
| **TJDFT** | Competência em DF para contratos com o GDF |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`autonomia privada` · `função social do contrato` · `boa-fé objetiva` · `surrectio` · `suppressio` · `venire contra factum proprium` · `tu quoque` · `exceptio doli` · `contrato preliminar` · `promessa de compra e venda` · `contrato definitivo` · `contrato de adesão` · `cláusula abusiva` · `cláusula leonina` · `contrato paritário` · `contrato bilateral` · `contrato unilateral` · `contrato oneroso` · `contrato gratuito` · `contrato comutativo` · `contrato aleatório` · `contrato formal` · `contrato consensual` · `contrato real` · `contrato intuitu personae` · `resolução` · `resilição` · `rescisão` · `resolução por inadimplemento` · `exceptio non adimpleti contractus` · `teoria da imprevisão` · `cláusula *rebus sic stantibus*` · `onerosidade excessiva` · `hardship` · `lesão` · `estado de perigo` · `culpa in contrahendo` · `dever de informação` · `dever de sigilo` · `dever de lealdade` · `contrato eletrônico` · `contrato de consumo` · `contrato empresarial` · `arras` · `cláusula penal moratória` · `cláusula penal compensatória` · `redução equitativa da pena` · `pacta sunt servanda` · `relatividade dos efeitos` · `eficácia erga omnes` · `sub-rogação contratual` · `cessão de contrato` · `assunção de dívida` · `fiança` · `aval` · `estipulação em favor de terceiro`

---

## PRIV-004 — RESPONSABILIDADE CIVIL
### CC arts. 927–954 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 927–954** | Obrigação de indenizar, responsabilidade subjetiva e objetiva |
| 2 | **CF/88 art. 5°, V e X** | Dano moral, imagem, honra, intimidade — base constitucional |
| 3 | **CDC arts. 12–14, 18–20** | Responsabilidade objetiva do fornecedor pelo fato e vício do produto/serviço |
| 4 | **CTB — Lei 9.503/1997 art. 927** | Responsabilidade civil no trânsito |
| 5 | **Lei 6.938/1981 (PNMA) art. 14, §1°** | Responsabilidade civil ambiental objetiva |
| 6 | **Lei 13.709/2018 (LGPD) arts. 42–45** | Responsabilidade civil por danos decorrentes de tratamento de dados |
| 7 | **Lei 12.965/2014 (Marco Civil) arts. 18–21** | Responsabilidade civil de provedores de internet |
| 8 | **Lei 8.069/1990 (ECA) arts. 227–229** | Responsabilidade civil por dano a criança/adolescente |
| 9 | **Lei 9.784/1999; Lei 8.112/1990** | Responsabilidade civil do servidor público (interface) |
| 10 | **CC art. 186** | Ato ilícito — definição |
| 11 | **CC art. 187** | Abuso de direito — ato ilícito por excesso |
| 12 | **Enunciados CJF** | Enunciados 37–46 (I JDC); 188–198 (III JDC); 444–461 (V JDC) |
| 13 | **Lei 13.146/2015 (EPD) art. 12** | Reparação de danos sofridos por pessoa com deficiência |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Sergio Cavalieri Filho** | *Programa de Responsabilidade Civil* | Atlas/GEN | 15ª ed., 2023 |
| **Rui Stoco** | *Tratado de Responsabilidade Civil* | RT | 11ª ed., 2022 |
| **Carlos Roberto Gonçalves** | *Responsabilidade Civil* | Saraiva | 21ª ed., 2023 |
| **Flávio Tartuce** | *Direito Civil* — v. 2 (Responsabilidade Civil) | Forense/Método | 19ª ed., 2024 |
| **Anderson Schreiber** | *Novos Paradigmas da Responsabilidade Civil* | Atlas | 7ª ed., 2022 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 37** | São cumuláveis as indenizações por dano material e dano moral oriundos do mesmo fato | Cumulação |
| 2 | **STJ — Súmula 227** | Pessoa jurídica pode sofrer dano moral | Dano moral PJ |
| 3 | **STJ — Súmula 370** | Caracteriza dano moral a apresentação antecipada de cheque pré-datado | Dano moral |
| 4 | **STJ — Súmula 385** | Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral quando preexistente legítima inscrição | Negativação |
| 5 | **STJ — Súmula 403** | Independe de prova do prejuízo a indenização pela publicação não autorizada de imagem de pessoa com fins econômicos ou comerciais | Direito de imagem |
| 6 | **STJ — Tema 1.048 (repetitivo)** | Dano moral coletivo — requisitos e legitimidade do MP | Dano coletivo |
| 7 | **STJ — REsp 1.662.690** | Responsabilidade objetiva de plataformas digitais por conteúdo de terceiros gerado após notificação | Marco Civil |
| 8 | **STF — RE 646.721 RG** | Teoria do risco administrativo — responsabilidade objetiva do Estado | Responsabilidade estatal |
| 9 | **STJ — Tema 793 (repetitivo)** | Responsabilidade objetiva de hospital por ato de médico que não é empregado | Médicos |
| 10 | **STJ — REsp 1.192.696** | Perda de uma chance — requisitos para configuração e quantificação | Perda de chance |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Petição Inicial — Ação de Indenização por Dano Moral** | Pessoa física — CC art. 186 + 927 |
| 2 | **Petição Inicial — Ação de Indenização por Dano Material** | Lucros cessantes + danos emergentes |
| 3 | **Petição de Tutela de Urgência — Retirada de Conteúdo** | Marco Civil art. 21 + CPC art. 300 |
| 4 | **Contestação — Excludentes de Ilicitude** | Culpa exclusiva da vítima, fato de terceiro, caso fortuito |
| 5 | **Petição de Ação de Reparação por Perda de uma Chance** | Fundamentação — nexo causal probabilístico |
| 6 | **Petição de Ação Coletiva por Dano Moral Coletivo** | MP/Associação — CDC + LACP |
| 7 | **Laudo Pericial — Quantificação de Danos Materiais** | Engenharia de avaliação + perícia contábil |
| 8 | **Parecer sobre Responsabilidade Civil Médica** | Obrigação de meio vs. resultado; ônus da prova |
| 9 | **Acordo/Termo de Composição de Danos** | Quitação específica — ressalva de futuras pretensões |
| 10 | **Recurso Especial — Quantum Indenitório Ínfimo** | STJ — critérios de razoabilidade e proporcionalidade |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **3 anos** — prescrição da pretensão de reparação civil | CC art. 206, §3°, V | Regra geral |
| **5 anos** — pretensão de reparação de danos nas relações de consumo | CDC art. 27 | Fato do produto/serviço |
| **10 anos** — prescrição por danos decorrentes de ilícitos penais | STJ — jurisprudência pacífica | Início: data do trânsito em julgado criminal |
| **Imprescritível** — danos causados por tortura/regime militar | STF — jurisprudência | |
| **3 anos** — pretensão de ressarcimento de enriquecimento sem causa | CC art. 206, §3°, IV | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — quantificação de dano moral, nexo causal, excludentes |
| **STF** | RE com RG — responsabilidade do Estado, constitucionalidade |
| **TJs Estaduais** | Ações reparatórias em geral (Varas Cíveis, JEC) |
| **Justiça Federal** | Responsabilidade civil do Estado federal (art. 37, §6° CF) |
| **JEC Estadual** | Causas até 40 SM, dano moral simples |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`ato ilícito` · `abuso de direito` · `culpa` · `dolo` · `nexo causal` · `dano` · `dano material` · `dano moral` · `dano estético` · `dano existencial` · `dano ao projeto de vida` · `dano coletivo` · `dano difuso` · `dano reflexo` · `dano em ricochete` · `responsabilidade subjetiva` · `responsabilidade objetiva` · `teoria do risco` · `risco criado` · `risco da atividade` · `risco-proveito` · `culpa in eligendo` · `culpa in vigilando` · `culpa in custodiendo` · `responsabilidade por fato de terceiro` · `responsabilidade dos pais` · `responsabilidade do patrão` · `responsabilidade do Estado` · `responsabilidade médica` · `responsabilidade do advogado` · `responsabilidade do tabelião` · `responsabilidade ambiental` · `responsabilidade digital` · `perda de uma chance` · `teoria da causalidade adequada` · `teoria do dano direto e imediato` · `excludentes de ilicitude` · `caso fortuito` · `força maior` · `culpa exclusiva da vítima` · `fato de terceiro` · `legítima defesa` · `estado de necessidade` · `exercício regular de direito` · `quantum indenitório` · `arbitramento judicial` · `dano in re ipsa` · `presunção de dano` · `punitive damages` · `função punitiva da indenização` · `repetição de indébito em dobro` · `negativação indevida`

---

## PRIV-005 — DIREITOS REAIS
### CC arts. 1.196–1.510 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 1.196–1.510** | Propriedade, posse, direitos reais de gozo e garantia |
| 2 | **CF/88 arts. 5°, XXII–XXIII; 182–186; 191** | Garantia da propriedade, função social, usucapião constitucional |
| 3 | **Lei 6.015/1973 (LRP)** | Registro de imóveis — aquisição derivada da propriedade |
| 4 | **Lei 10.257/2001 (Estatuto da Cidade)** | Parcelamento, edificação, utilização compulsória; IPTU progressivo; usucapião especial urbana |
| 5 | **Lei 4.591/1964 (Condomínio)** | Incorporação imobiliária, condomínio edilício |
| 6 | **Lei 9.785/1999** | Parcelamento do solo urbano — complementa Lei 6.766/1979 |
| 7 | **Lei 6.766/1979 (Parcelamento do Solo)** | Loteamento e desmembramento |
| 8 | **Lei 13.465/2017** | REURB — regularização fundiária urbana; reconhecimento de direito real de laje |
| 9 | **Lei 13.986/2020** | CRA, CPR, CRI — garantias reais do agronegócio |
| 10 | **Decreto-Lei 911/1969** | Alienação fiduciária de bens móveis |
| 11 | **Lei 9.514/1997** | Alienação fiduciária de imóvel — consolidação da propriedade |
| 12 | **Lei 11.977/2009** | Registro Torrens e regularização fundiária (parcialmente revogada pela Lei 13.465/17) |
| 13 | **CC arts. 1.369–1.438** | Superfície, servidões, usufruto, uso, habitação, direito do promitente comprador |
| 14 | **CC arts. 1.419–1.510** | Penhor, hipoteca, anticrese, alienação fiduciária |
| 15 | **Enunciados CJF — Direitos Reais** | Enunciados 82–97 (I JDC); 235–248 (III JDC); 494–506 (V JDC) |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Marco Aurélio Bezerra de Melo** | *Direitos Reais* | Atlas/GEN | 4ª ed., 2021 |
| **Cristiano Chaves de Farias & Nelson Rosenvald** | *Curso de Direito Civil* — v. 5 (Direitos Reais) | JusPodivm | 17ª ed., 2022 |
| **Carlos Roberto Gonçalves** | *Direito Civil Brasileiro* — v. 5 (Direitos Reais) | Saraiva | 20ª ed., 2023 |
| **Caio Mário da Silva Pereira** | *Instituições de Direito Civil* — v. IV (Direitos Reais) | Forense | 28ª ed., 2022 |
| **Benedito Silvério Ribeiro** | *Tratado de Usucapião* | Saraiva | 8ª ed., 2014 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 237** | No usucapião especial urbano, o herdeiro legítimo continua na posse de seu antecessor desde que já resida no imóvel por ocasião da abertura da sucessão | Usucapião |
| 2 | **STJ — Súmula 487** | O parágrafo único do art. 741 do CPC não se aplica à sentença arbitral | |
| 3 | **STJ — Tema 886 (repetitivo)** | Alienação fiduciária — procedimento de busca e apreensão sem necessidade de interpelação prévia após vencimento | Fiduciária |
| 4 | **STF — RE 422.349 RG** | Usucapião especial de imóvel urbano — art. 183 CF — prescinde de título e boa-fé | Usucapião |
| 5 | **STJ — Súmula 84** | É admissível a oposição de embargos de terceiro fundados em alegação de posse advinda do compromisso de compra e venda, ainda que desprovido do registro | Posse |
| 6 | **STJ — REsp 1.179.341** | Direito de laje — natureza jurídica e regime registral | Laje |
| 7 | **STJ — Súmula 308** | A hipoteca firmada entre a construtora e o agente financeiro anterior ou posterior à celebração da promessa de compra e venda não tem eficácia perante os adquirentes | Hipoteca |
| 8 | **STJ — REsp 1.574.859 (repetitivo)** | Condomínio edilício — taxa de condomínio tem natureza propter rem | Condomínio |
| 9 | **STF — ARE 1.294.788 RG** | Função social da propriedade — desapropriação por utilidade pública | Propriedade |
| 10 | **STJ — Súmula 193** | O direito de uso de linha telefônica pode ser adquirido por usucapião | Usucapião móvel |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Petição de Ação de Usucapião Extrajudicial** | Lei 6.015/73 art. 216-A; CPC arts. 1.071 |
| 2 | **Petição de Ação Reivindicatória** | CC art. 1.228 — proprietário sem posse |
| 3 | **Petição de Ação de Reintegração de Posse** | CC art. 1.210; CPC arts. 560–566 |
| 4 | **Petição de Ação de Manutenção de Posse** | Turbação — liminar possessória |
| 5 | **Petição de Interdito Proibitório** | Ameaça à posse — CC art. 1.210, §1° |
| 6 | **Minuta de Contrato de Alienação Fiduciária de Imóvel** | Lei 9.514/97 — garantia real |
| 7 | **Notificação de Consolidação de Propriedade** | Lei 9.514/97 art. 26 — inadimplemento fiduciante |
| 8 | **Petição de Embargos de Terceiro — Posse** | CPC arts. 674–681 |
| 9 | **Escritura de Servidão de Passagem** | CC arts. 1.378–1.389 + Registro |
| 10 | **Memorial de Incorporação Imobiliária** | Lei 4.591/64 art. 32 |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **15 anos** — usucapião ordinária sem justo título | CC art. 1.238 *caput* | |
| **10 anos** — usucapião ordinária com justo título + boa-fé | CC art. 1.242 | |
| **5 anos** — usucapião especial urbana (250 m²) | CC art. 1.240; CF art. 183 | |
| **5 anos** — usucapião especial rural (50 ha) | CC art. 1.239; CF art. 191 | |
| **2 anos** — usucapião por abandono de lar | CC art. 1.240-A | |
| **3 anos** — usucapião de bem móvel com justo título + boa-fé | CC art. 1.260 | |
| **5 anos** — usucapião de bem móvel sem justo título | CC art. 1.261 | |
| **1 ano + 1 dia** — prazo para ações possessórias de força nova | CC art. 558; CPC art. 558 | Rito especial |
| **30 dias** — consolidação fiduciária após purgação da mora não realizada | Lei 9.514/97 art. 26, §5° | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STF** | RE com RG — usucapião constitucional, função social da propriedade |
| **STJ** | REsp — direitos reais, registro, alienação fiduciária |
| **Varas de Registros Públicos** | Usucapião extrajudicial, averbações, retificações de área |
| **Varas Cíveis (TJ)** | Ações possessórias, reivindicatórias, nunciação de obra nova |
| **Vara de Falências e Recuperações** | Patrimônio imobiliário em insolvência |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`propriedade` · `domínio` · `posse` · `detenção` · `posse justa` · `posse injusta` · `posse de boa-fé` · `posse de má-fé` · `posse direta` · `posse indireta` · `composse` · `ação possessória` · `ação petitória` · `usucapião` · `usucapião extrajudicial` · `usucapião tabular` · `usucapião familiar` · `servidão` · `usufruto` · `uso` · `habitação` · `direito real de laje` · `superfície` · `enfiteuse` · `direito do promitente comprador` · `alienação fiduciária` · `hipoteca` · `penhor` · `anticrese` · `CCI` · `CRI` · `LCI` · `registro` · `averbação` · `matrícula` · `princípio da especialidade` · `princípio da continuidade` · `princípio da publicidade registral` · `princípio da fé pública registral` · `condomínio geral` · `condomínio edilício` · `multipropriedade` · `loteamento` · `incorporação imobiliária` · `patrimônio de afetação` · `regularização fundiária` · `REURB-S` · `REURB-E` · `CUB` · `NBS/NBR 14.653` · `função social da propriedade` · `desapropriação` · `tombamento`

---

## PRIV-006 — DIREITO DE FAMÍLIA
### CC arts. 1.511–1.783 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 1.511–1.783** | Casamento, relações de parentesco, poder familiar, tutela, curatela |
| 2 | **CF/88 arts. 226–229** | Proteção da família, pluralidade de entidades familiares, isonomia |
| 3 | **Lei 9.278/1996** | União estável — direitos patrimoniais |
| 4 | **Lei 11.441/2007** | Divórcio, separação e inventário extrajudiciais (cartório) |
| 5 | **Lei 11.698/2008 (Guarda Compartilhada)** | Guarda compartilhada como regra |
| 6 | **Lei 12.318/2010 (Alienação Parental)** | Alienação parental — atos, penalidades |
| 7 | **Lei 13.058/2014** | Reforça guarda compartilhada obrigatória |
| 8 | **Lei 13.146/2015 (EPD)** | Curatela proporcional; tomada de decisão apoiada |
| 9 | **Lei 11.924/2009** | Uso do sobrenome do padrasto/madrasta |
| 10 | **Lei 8.069/1990 (ECA)** | Adoção, poder familiar, guarda na perspectiva da criança |
| 11 | **Lei 13.509/2017** | Aperfeiçoamento da adoção — prazo de habilitação, adoção tardia |
| 12 | **Res. CNJ 175/2013** | Habilitação ao casamento de casais homoafetivos |
| 13 | **Enunciados CJF — Família** | Enunciados 98–115 (I JDC); 256–272 (III JDC); 519–540 (V JDC) |
| 14 | **Lei 5.478/1968 (Alimentos)** | Ação de alimentos — rito especial |
| 15 | **CPC arts. 693–699** | Ações de família — mediação obrigatória, audiência de conciliação |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Flávio Tartuce & José Fernando Simão** | *Direito Civil* — v. 5 (Família) | Forense/Método | 16ª ed., 2023 |
| **Carlos Roberto Gonçalves** | *Direito Civil Brasileiro* — v. 6 (Direito de Família) | Saraiva | 21ª ed., 2024 |
| **Paulo Lôbo** | *Direito Civil — Famílias* | Saraiva | 13ª ed., 2023 |
| **Maria Berenice Dias** | *Manual de Direito das Famílias* | RT | 14ª ed., 2021 |
| **Cristiano Chaves de Farias & Nelson Rosenvald** | *Curso de Direito Civil* — v. 6 (Famílias) | JusPodivm | 14ª ed., 2022 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STF — ADPF 132 / ADI 4.277** | União homoafetiva reconhecida como entidade familiar com os mesmos direitos da união estável | Família |
| 2 | **STJ — Súmula 336** | A mulher que renunciou aos alimentos na separação judicial tem direito à pensão previdenciária por morte do ex-marido | Alimentos |
| 3 | **STJ — Tema 1.169 (repetitivo)** | Guarda compartilhada — critérios para fixação e dispensa | Guarda |
| 4 | **STJ — Súmula 309** | O débito alimentar que autoriza a prisão civil do alimentante é o que compreende as 3 (três) prestações anteriores ao ajuizamento da execução e as que se vencerem no curso do processo | Alimentos |
| 5 | **STJ — Súmula 358** | O cancelamento de pensão alimentícia de filho que atingiu a maioridade está sujeito à decisão judicial, mediante contraditório, ainda que nos próprios autos | Alimentos |
| 6 | **STJ — REsp 1.681.955** | Multiparentalidade — possibilidade jurídica e efeitos registrais | Parentesco |
| 7 | **STF — RE 898.060 RG** | Paternidade socioafetiva reconhecida e produção de efeitos mesmo havendo paternidade biológica | Paternidade |
| 8 | **STJ — Súmula 596** | A obrigação alimentar dos avós tem natureza complementar e subsidiária, somente se configurando no caso de impossibilidade total ou parcial de seu cumprimento pelos pais | Alimentos avós |
| 9 | **STJ — REsp 1.626.467** | Partilha de bens em união estável homoafetiva — regime de comunhão parcial | União estável |
| 10 | **STJ — Tema 939 (repetitivo)** | Separação de corpos — natureza de tutela de urgência familiar | Tutela |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Pacto Antenupcial — Separação Total de Bens** | CC art. 1.640 + escritura pública |
| 2 | **Escritura de Divórcio Consensual Extrajudicial** | Lei 11.441/2007 + Res. CNJ |
| 3 | **Petição Inicial — Ação de Divórcio Litigioso** | CPC arts. 693–699 |
| 4 | **Petição de Regulamentação de Guarda e Visitas** | CC art. 1.589; Lei 11.698/2008 |
| 5 | **Petição de Ação de Alimentos** | Lei 5.478/1968 — rito especial |
| 6 | **Petição de Revisão de Alimentos** | CC art. 1.699 — mudança de condições |
| 7 | **Petição de Exoneração de Alimentos** | CC art. 1.699 c/c Súmula 358 STJ |
| 8 | **Petição de Reconhecimento de União Estável** | CC arts. 1.723–1.727 |
| 9 | **Petição de Reconhecimento de Multiparentalidade** | RE 898.060 STF |
| 10 | **Notificação por Alienação Parental** | Lei 12.318/2010 — medidas protetivas |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **1 ano** — decadência para anular casamento (vícios da vontade) | CC art. 1.560 | |
| **4 anos** — decadência para anular casamento (incapacidade relativa) | CC art. 1.560, II | |
| **2 anos** — prazo para rompimento de noivado gerar responsabilidade | CC art. 1.548 (analogia) | |
| **Sem prazo mínimo** — divórcio direto após EC 66/2010 | CF art. 226, §6° | Sem necessidade de separação prévia |
| **Alimentos** — execução até 3 prestações passadas + em curso | STJ Súmula 309 | Para prisão civil |
| **Prescrição** de ação de alimentos — 2 anos após cessada a qualidade | CC art. 206, §2° | |
| **Habilitação ao casamento** — edital 15 dias | CC art. 1.527 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STF** | RE com RG — uniões homoafetivas, multiparentalidade, constitucionalidade |
| **STJ** | REsp — família, alimentos, guarda, divórcio |
| **Varas de Família (TJ)** | Casamento, divórcio, alimentos, guarda, adoção |
| **Varas da Infância e Juventude** | Adoção, poder familiar, tutela (ECA) |
| **Cartórios de Notas** | Divórcio/separação/inventário extrajudiciais |
| **TJSP — Câmara Especial de Família** | Recurso em causas de família de SP |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`casamento` · `união estável` · `entidade familiar` · `família monoparental` · `família anaparental` · `família pluriparental` · `família recomposta` · `namoro qualificado` · `convivência` · `nubente` · `habilitação matrimonial` · `impedimentos matrimoniais` · `causas suspensivas` · `nulidade do casamento` · `anulabilidade` · `divórcio` · `separação de fato` · `regime de bens` · `comunhão universal` · `comunhão parcial` · `separação de bens` · `participação final nos aquestos` · `pacto antenupcial` · `bem particular` · `bem comum` · `meação` · `alimentos` · `alimentos provisórios` · `alimentos provisionais` · `alimentos definitivos` · `binômio necessidade-possibilidade` · `guarda unilateral` · `guarda compartilhada` · `guarda alternada` · `visitação` · `alienação parental` · `síndrome de alienação parental` · `filiação` · `paternidade biológica` · `paternidade socioafetiva` · `multiparentalidade` · `adoção` · `adoção por casais homoafetivos` · `tutela` · `curatela` · `tomada de decisão apoiada` · `poder familiar` · `destituição do poder familiar` · `parentesco` · `afinidade` · `avós` · `obrigação avoenga`

---

## PRIV-007 — DIREITO DAS SUCESSÕES
### CC arts. 1.784–2.027 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 1.784–2.027** | Sucessão em geral, legítima, testamentária, inventário |
| 2 | **CF/88 arts. 5°, XXX–XXXI** | Direito de herança; sucessão de bens de estrangeiros |
| 3 | **CPC arts. 610–673** | Inventário e partilha — procedimento judicial |
| 4 | **Lei 11.441/2007** | Inventário e partilha extrajudiciais (cartório) |
| 5 | **Lei 9.394/1996 / IN RFB 1.761/2017** | ITCMD — base de cálculo e declaração |
| 6 | **Lei Estadual SP 10.705/2000** | ITCMD-SP — alíquotas progressivas |
| 7 | **Res. CNJ 35/2007** | Procedimento do inventário e partilha extrajudicial |
| 8 | **Lei 6.015/1973 arts. 167, I, nº 24-26** | Registro do formal de partilha e adjudicação |
| 9 | **CC arts. 1.846–1.850** | Herança legítima — quota indisponível (50%) |
| 10 | **CC arts. 1.858–1.967** | Testamento — formas, execução, nulidade |
| 11 | **Enunciados CJF — Sucessões** | Enunciados 116–119 (I JDC); 138–140 (III JDC); 141–145 (III JDC) |
| 12 | **CC art. 1.829** | Ordem da vocação hereditária — cônjuge e companheiro |
| 13 | **STF — RE 878.694 (companheiro = cônjuge na sucessão)** | |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Flávio Tartuce & José Fernando Simão** | *Direito Civil* — v. 6 (Direito das Sucessões) | Forense/Método | 14ª ed., 2023 |
| **Carlos Roberto Gonçalves** | *Direito Civil Brasileiro* — v. 7 (Direito das Sucessões) | Saraiva | 20ª ed., 2023 |
| **Paulo Lôbo** | *Direito Civil — Sucessões* | Saraiva | 9ª ed., 2023 |
| **Zeno Veloso** | *Código Civil Comentado — Sucessões* | Atlas | 2ª ed., 2019 |
| **Giselda Hironaka** | *Comentários ao Código Civil — Direito das Sucessões* | Saraiva | 4ª ed., 2022 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STF — RE 878.694 RG** | Companheiro tem os mesmos direitos sucessórios do cônjuge — inconstitucionalidade do art. 1.790 CC | Sucessão companheiro |
| 2 | **STJ — Súmula 112** | O imposto de transmissão causa mortis é calculado sobre o valor dos bens na data da avaliação | ITCMD |
| 3 | **STJ — REsp 1.811.153** | Pacto sucessório — validade de planejamento sucessório via holding familiar | Planejamento |
| 4 | **STJ — Tema 938 (repetitivo)** | Prazo prescricional para petição de herança | Prescrição |
| 5 | **STJ — Súmula 331** | A doação de ascendente para descendente não é colacionável se houve renúncia ao direito à colação | Colação |
| 6 | **STJ — REsp 1.631.261** | Herdeiro necessário — cálculo da legítima e liberalidades | Legítima |
| 7 | **STJ — Súmula 117** | A ação de anulação do testamento é de competência da vara de família e sucessões | Competência |
| 8 | **STJ — Tema 984 (repetitivo)** | Inventário extrajudicial — ausência de litígio + herdeiros capazes | Inventário |
| 9 | **STF — ARE 1.309.642 RG** | ITCMD — alíquota progressiva — constitucionalidade | Tributário |
| 10 | **STJ — REsp 1.472.945** | Adiantamento da legítima na doação — imputação e colação | Colação |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Escritura de Inventário e Partilha Extrajudicial** | Lei 11.441/07 + Res. CNJ 35/07 |
| 2 | **Petição de Arrolamento de Bens** | CPC art. 664 — até 1.000 SM |
| 3 | **Petição de Abertura de Inventário Judicial** | CPC arts. 611–614 — 2 meses da morte |
| 4 | **Testamento Público** | CC art. 1.864 — lavrado em cartório |
| 5 | **Testamento Particular** | CC art. 1.876 — três testemunhas |
| 6 | **Petição de Ação de Petição de Herança** | CC arts. 1.824–1.828 |
| 7 | **Petição de Sonegados** | CC arts. 1.992–2.003 — herdeiro oculta bens |
| 8 | **Declaração de Renúncia de Herança** | CC art. 1.806 — escritura pública |
| 9 | **Acordo de Partilha Amigável** | CC art. 2.015 — todos capazes + concordância |
| 10 | **Planejamento Sucessório — Holding Familiar** | Estrutura societária + doação de cotas com reserva de usufruto |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **60 dias** — abertura do inventário após o óbito | CPC art. 611 | Penalidade: ITCMD com multa |
| **10 anos** — prescrição da petição de herança | CC art. 205 | |
| **5 anos** — prescrição para anulação de testamento por dolo/coação | CC art. 178 (analogia) | |
| **2 anos** — prazo para habilitação de créditos no inventário judicial | CPC art. 642 | |
| **ITCMD** — prazo estadual variável | Legislações estaduais | SP: 60 dias do trânsito em julgado da homologação |
| **Quota indisponível** — 50% da herança líquida | CC art. 1.846 | Não pode ser objeto de disposição por testamento |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STF** | RE com RG — sucessão de companheiro, ITCMD |
| **STJ** | REsp — petição de herança, testamento, legítima |
| **Varas de Família e Sucessões (TJ)** | Inventário judicial, partilha, testamento |
| **Cartórios de Notas** | Inventário extrajudicial, testamento público |
| **TITs Estaduais (Tribunais de Impostos)** | ITCMD — contencioso administrativo fiscal |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`herança` · `legado` · `legatário` · `herdeiro necessário` · `herdeiro facultativo` · `herdeiro testamentário` · `herdeiro legítimo` · `quota indisponível` · `legítima` · `vocação hereditária` · `ordem de sucessão` · `inventário` · `arrolamento` · `partilha` · `adjudicação` · `formal de partilha` · `petição de herança` · `sonegados` · `colação` · `redução das liberalidades` · `testamento` · `testamento público` · `testamento cerrado` · `testamento particular` · `codicilo` · `testamento vital` · `herdeiro pré-morto` · `direito de representação` · `direito de acrescer` · `substituição testamentária` · `fideicomisso` · `deserdação` · `indignidade` · `reabilitação do indigno` · `incapacidade para suceder` · `ausência` · `morte presumida` · `comoriência` · `sucessão do cônjuge` · `sucessão do companheiro` · `meação` · `renúncia à herança` · `cessão de direitos hereditários` · `planejamento sucessório` · `holding familiar` · `trust` · `doação em vida` · `adiantamento da legítima` · `inventário extrajudicial` · `ITCMD` · `ITBI`

---

## PRIV-008 — DIREITO DO CONSUMIDOR
### CDC — Lei 8.078/1990

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CDC — Lei 8.078/1990** | Código de Defesa do Consumidor — diploma central |
| 2 | **CF/88 art. 5°, XXXII; art. 170, V** | Defesa do consumidor como direito fundamental e princípio da ordem econômica |
| 3 | **Decreto 2.181/1997** | Regulamenta o SNDC e o PROCON |
| 4 | **Lei 8.656/1993** | Relações de consumo no serviço de transporte |
| 5 | **Lei 9.099/1995 (JEC)** | Juizados especiais — rito sumário para causas de consumo |
| 6 | **Lei 12.291/2010** | Obrigatoriedade do CDC nos estabelecimentos |
| 7 | **Decreto 7.962/2013** | Comércio eletrônico — direito de arrependimento 7 dias |
| 8 | **Lei 14.181/2021 (Superendividamento)** | Proteção ao consumidor superendividado; conciliação bancária |
| 9 | **Res. BACEN 4.878/2020** | Ouvidorias de IF — resolução de conflitos no consumo bancário |
| 10 | **Lei 13.709/2018 (LGPD)** | Tratamento de dados pessoais do consumidor |
| 11 | **Portaria MJ 5/2002** | Lista de cláusulas abusivas em contratos de consumo |
| 12 | **Lei 7.347/1985 (LACP)** | Ação civil pública — tutela coletiva de consumidores |
| 13 | **Lei 12.529/2011 (SBDC)** | Práticas anticoncorrenciais que atingem consumidores |
| 14 | **Enunciados CJF** | Enunciados sobre diálogo das fontes CDC/CC |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Claudia Lima Marques** | *Comentários ao Código de Defesa do Consumidor* | RT | 5ª ed., 2021 |
| **Herman Benjamin, Claudia Lima Marques & Leonardo Roscoe Bessa** | *Manual de Direito do Consumidor* | RT | 10ª ed., 2021 |
| **Rizzatto Nunes** | *Curso de Direito do Consumidor* | Saraiva | 15ª ed., 2023 |
| **Leonardo de Medeiros Garcia** | *Direito do Consumidor — Código Comentado e Jurisprudência* | JusPodivm | 19ª ed., 2023 |
| **Antônio Herman de Vasconcellos e Benjamin** | *Das Práticas Comerciais — Comentários ao CDC* | RT | 3ª ed., 2020 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 297** | O CDC é aplicável às instituições financeiras | Abrangência |
| 2 | **STJ — Súmula 479** | As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos praticados por terceiros no âmbito de operações bancárias | Fraude |
| 3 | **STJ — Súmula 548** | Excludente do dano moral por negativação — anotação preexistente legítima | Negativação |
| 4 | **STJ — Súmula 302** | Abusividade de cláusula limitadora de internação em plano de saúde | Plano saúde |
| 5 | **STJ — Tema 1.096 (repetitivo)** | Superendividamento — dever de renegociação das IFs | Superendividamento |
| 6 | **STJ — REsp 1.587.723** | Direito de arrependimento em compra *online* — prazo 7 dias do recebimento | E-commerce |
| 7 | **STJ — Súmula 404** | É dispensável o aviso de recebimento (AR) na carta de comunicação ao consumidor sobre a negativação de seu nome em bancos de dados e cadastros | Negativação |
| 8 | **STJ — Tema 786 (repetitivo)** | Solidariedade da cadeia de fornecimento — vício do produto | Responsabilidade |
| 9 | **STF — RE 661.256 RG** | Prazo prescricional no CDC — art. 27 — início | Prescrição |
| 10 | **STJ — Súmula 381** | Impossibilidade de reconhecimento de ofício de abusividade em contratos bancários | Abusividade |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Petição Inicial no JEC — Dano Moral de Consumo** | CDC art. 6°, VI + Lei 9.099/95 |
| 2 | **Petição de Ação Civil Pública por Direito do Consumidor** | LACP + CDC arts. 81–83 |
| 3 | **Reclamação ao PROCON** | Procedimento administrativo — Decreto 2.181/97 |
| 4 | **Notificação Extrajudicial ao Fornecedor** | CDC art. 18 — prazo 30 dias para saneamento do vício |
| 5 | **Petição de Tutela Específica — Substituição do Produto** | CDC art. 18, §1° + CPC art. 497 |
| 6 | **Petição de Ação de Repetição de Indébito** | CDC art. 42, parágrafo único — cobranças indevidas |
| 7 | **Petição de Revisão de Contrato Bancário** | Juros abusivos, tarifas, capitalização |
| 8 | **Defesa do Fornecedor no JEC** | Contestação — excludentes do CDC arts. 12–14 |
| 9 | **Petição de Habilitação em Conciliação de Superendividamento** | Lei 14.181/2021 art. 104-A |
| 10 | **Parecer sobre Conformidade de Contrato de Adesão com o CDC** | Revisão de cláusulas — art. 51 CDC |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **30 dias** — vício em produto não durável | CDC art. 26, I | Decadência |
| **90 dias** — vício em produto durável | CDC art. 26, II | Decadência |
| **5 anos** — fato do produto/serviço (dano) | CDC art. 27 | Prescrição — início: conhecimento do dano e autoria |
| **7 dias** — direito de arrependimento em contratos fora do estabelecimento | CDC art. 49 | |
| **30 dias** — prazo para fornecedor sanar o vício antes da troca obrigatória | CDC art. 18, §1° | |
| **15 dias** — prazo de contestação no JEC | Lei 9.099/95 art. 30 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — CDC, interpretação de contratos de consumo |
| **STF** | RE com RG — constitucionalidade do CDC, acesso à justiça |
| **JEC (Juizado Especial Cível)** | Causas de consumo até 40 SM — gratuidade |
| **Varas Cíveis (TJ)** | Ações coletivas, ações acima de 40 SM, tutelas específicas |
| **PROCON / SENACON** | Processos administrativos — multas contra fornecedor |
| **TJSP — 3ª Câmara de Direito Privado** | Referência em consumidor SP |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`consumidor` · `fornecedor` · `produto` · `serviço` · `relação de consumo` · `vulnerabilidade` · `hipossuficiência` · `boa-fé nas relações de consumo` · `inversão do ônus da prova` · `responsabilidade objetiva` · `fato do produto` · `vício do produto` · `defeito` · `dano` · `recall` · `publicidade enganosa` · `publicidade abusiva` · `oferta vinculante` · `práticas abusivas` · `cláusula abusiva` · `contrato de adesão` · `direito de arrependimento` · `prazo de reflexão` · `negativação indevida` · `dano moral de consumo` · `superendividamento` · `mínimo existencial` · `tutela coletiva` · `dano difuso` · `dano coletivo` · `ação civil pública` · `ação coletiva` · `liquidação coletiva` · `substituição processual` · `PROCON` · `SENACON` · `SAC` · `ouvidoria` · `mediação de consumo` · `comércio eletrônico` · `marketplace` · `plataforma digital` · `responsabilidade do intermediário` · `lei dos planos de saúde` · `plano de saúde` · `operadora` · `ANS` · `financiamento ao consumidor` · `crédito ao consumidor` · `capitalização de juros` · `anatocismo`

---

## PRIV-009 — DIREITO IMOBILIÁRIO
### Lei 6.015/1973 (LRP) | Lei 8.245/1991 (Locações)

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Lei 6.015/1973 (LRP)** | Lei de Registros Públicos — registro e averbação de imóveis |
| 2 | **Lei 8.245/1991 (Lei de Locação)** | Locação residencial, comercial, built-to-suit |
| 3 | **Lei 4.591/1964** | Incorporação imobiliária e condomínio edilício |
| 4 | **Lei 6.766/1979** | Parcelamento do solo urbano — loteamento |
| 5 | **Lei 9.514/1997** | Alienação fiduciária de imóvel |
| 6 | **Lei 10.257/2001 (Estatuto da Cidade)** | Direito urbanístico, IPTU progressivo, parcelamento compulsório |
| 7 | **Lei 13.465/2017** | REURB, direito real de laje, registro Torrens |
| 8 | **Lei 14.620/2023 (Minha Casa Minha Vida)** | Financiamento habitacional, alienação fiduciária subsidiada |
| 9 | **Decreto-Lei 58/1937** | Loteamentos — compromisso de compra e venda |
| 10 | **Lei 4.728/1965 + Res. BACEN 2.682/1999** | Financiamento imobiliário — SFH/SFI |
| 11 | **Lei 9.532/1997** | Patrimônio de afetação das incorporações |
| 12 | **Lei 10.931/2004** | Patrimônio de afetação — Regime Especial Tributário (RET) |
| 13 | **Provimento CNJ 149/2023** | Padronização dos registros de imóveis — SREI |
| 14 | **CC arts. 1.196–1.368** | Propriedade, servidão, usufruto — base dos direitos reais sobre imóveis |
| 15 | **Normas ABNT NBR 14.653** | Avaliação de imóveis — laudo de avaliação |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Melhim Namem Chalhub** | *Negócio Fiduciário* | Forense | 5ª ed., 2017 |
| **Sylvio Capanema de Souza** | *A Lei do Inquilinato Comentada* | Forense | 12ª ed., 2022 |
| **Marcelo Terra** | *Alienação Fiduciária de Imóvel em Garantia* | IRIB/Sergio Antonio Fabris | 2ª ed., 2015 |
| **Waldirio Bulgarelli** | *Títulos de Crédito Imobiliário* | RT | 4ª ed. |
| **Elvino Silva Filho** | *Questões de Técnica Imobiliária* | IRIB | 3ª ed., 2020 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 308** | A hipoteca firmada pela construtora não tem eficácia contra o adquirente | Hipoteca |
| 2 | **STJ — Tema 886 (repetitivo)** | Busca e apreensão na alienação fiduciária — purgação da mora após liminar | Fiduciária |
| 3 | **STJ — Súmula 76** | A falta de registro do compromisso de compra e venda de imóvel não dispensa a prévia interpelação para constituir em mora o devedor | Mora |
| 4 | **STJ — REsp 1.742.871** | Habite-se como requisito para entrega da unidade | Incorporação |
| 5 | **STJ — Tema 970 (repetitivo)** | Taxa de corretagem — responsabilidade pelo pagamento em contratos de incorporação | Corretagem |
| 6 | **STJ — Súmula 620** | A embargabilidade não é absoluta na execução da dívida condominial | Condomínio |
| 7 | **STJ — Tema 1.072 (repetitivo)** | SFH — correção monetária pelo índice contratado — INCC vs. IPCA | Financiamento |
| 8 | **STJ — REsp 1.351.571** | Locação comercial — renovatória — prazo e requisitos | Locação |
| 9 | **STF — RE 1.307.334 RG** | ITBI — base de cálculo — valor venal vs. valor de transação | ITBI |
| 10 | **STJ — Súmula 478** | Na execução de crédito relativo a cotas condominiais, o indébito deve ser discutido via ação autônoma | Condomínio |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Contrato de Locação Residencial** | Lei 8.245/91 — residencial, prazo mínimo 30 meses para imunidade rescisória |
| 2 | **Contrato de Locação Comercial** | Lei 8.245/91 — comercial, direito de renovação |
| 3 | **Petição de Ação Renovatória de Locação** | Lei 8.245/91 arts. 51–57 |
| 4 | **Petição de Ação de Despejo por Falta de Pagamento** | Lei 8.245/91 art. 9° — liminar em 15 dias |
| 5 | **Compromisso de Compra e Venda de Imóvel** | CC + Decreto-Lei 58/37 |
| 6 | **Escritura de Compra e Venda** | Forma pública obrigatória acima de 30 SM (CC art. 108) |
| 7 | **Contrato de Alienação Fiduciária de Imóvel** | Lei 9.514/97 + pacto adjeto |
| 8 | **Notificação para Consolidação de Propriedade** | Lei 9.514/97 art. 26 — 15 dias para purgação |
| 9 | **Memorial de Incorporação Imobiliária** | Lei 4.591/64 art. 32 |
| 10 | **Requerimento de Averbação no RI** | Lei 6.015/73 — cancelamento de hipoteca, retificação de área |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **30 meses** — prazo mínimo de locação residencial para denúncia imotivada | Lei 8.245/91 art. 46 | |
| **5 anos** — prazo mínimo para renovação judicial de locação comercial | Lei 8.245/91 art. 51 | Ininterrupto |
| **1 ano** — aviso prévio para não renovação em locação comercial | Lei 8.245/91 art. 72 | |
| **15 dias** — prazo para defesa na ação de despejo por falta de pagamento | Lei 8.245/91 art. 67 | |
| **15 dias** — prazo para purgação da mora na consolidação fiduciária | Lei 9.514/97 art. 26, §1° | |
| **30 dias** — prazo para leilão após consolidação | Lei 9.514/97 art. 27 | |
| **6 meses** — prazo para ação renovatória (antes do vencimento do contrato) | Lei 8.245/91 art. 51, §5° | 6 a 1 ano antes do vencimento |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — locação, alienação fiduciária, incorporação imobiliária |
| **STF** | RE — ITBI, constitucionalidade, usucapião constitucional |
| **Varas Cíveis (TJ)** | Despejo, ação renovatória, ação revisional, usucapião |
| **Varas de Registros Públicos** | Retificação, cancelamento, registro |
| **TJSP — 25ª a 36ª Câmaras de Direito Privado** | Recursos em locação e imóveis SP |
| **Cartórios de RI** | Registros e averbações extrajudiciais |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`registro de imóveis` · `matrícula` · `transcrição` · `averbação` · `certidão` · `princípio da continuidade` · `princípio da especialidade objetiva` · `princípio da fé pública registral` · `locação residencial` · `locação comercial` · `locação por temporada` · `locatário` · `locador` · `fiador` · `seguro fiança` · `caução` · `título de capitalização` · `ação de despejo` · `ação renovatória` · `ação revisional` · `cessão de locação` · `sublocação` · `benfeitorias` · `alienação fiduciária de imóvel` · `fiduciante` · `fiduciário` · `consolidação da propriedade` · `leilão extrajudicial` · `resíduo ativo` · `patrimônio de afetação` · `habite-se` · `memorial de incorporação` · `convenção de condomínio` · `regimento interno` · `taxa condominial` · `propter rem` · `usucapião urbana` · `usucapião rural` · `compromisso de compra e venda` · `escritura definitiva` · `ITBI` · `ITCMD` · `IPTU` · `laudêmio` · `terreno de marinha` · `SPU` · `SFH` · `SFI` · `FGTS habitacional` · `CRI` · `LCI` · `CRI securitizado`

---

## PRIV-010 — DIREITO BANCÁRIO
### Lei 4.595/1964 | Res. CMN | Circulares BACEN

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Lei 4.595/1964** | Lei de Reforma Bancária — estrutura do SFN, BACEN, CMN |
| 2 | **CF/88 art. 192** | SFN — regulação constitucional; taxas de juros (EC após ADI 4/STF) |
| 3 | **Res. CMN 4.553/2017** | Segmentação das IFs — prudencial |
| 4 | **Res. CMN 3.694/2009** | Prevenção a riscos nas transações bancárias |
| 5 | **Lei 7.357/1985 (Lei do Cheque)** | Cheque — ordem de pagamento à vista |
| 6 | **Lei 5.474/1968 (Duplicata)** | Duplicata mercantil e de serviços |
| 7 | **Decreto 57.663/1966 (LUG)** | Lei Uniforme de Genebra — letra de câmbio e nota promissória |
| 8 | **Lei 10.931/2004** | Cédula de crédito bancário (CCB) |
| 9 | **Lei 9.492/1997** | Protesto de títulos |
| 10 | **Lei 8.935/1994** | Registros e tabelionatos — autenticidade de documentos bancários |
| 11 | **Res. BACEN 4.878/2020** | Ouvidorias de IFs — atendimento ao consumidor |
| 12 | **Lei 14.181/2021** | Superendividamento do consumidor bancário |
| 13 | **Res. CMN 4.656/2018** | Fintech de crédito — SCD e SEP |
| 14 | **Lei 12.865/2013** | Pagamentos, arranjos de pagamento, fintechs |
| 15 | **Res. BCB 1/2020** | PIX — arranjo de pagamento instantâneo |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Fábio Ulhoa Coelho** | *Manual de Direito Comercial* — Títulos de Crédito / Bancos | Saraiva | 36ª ed., 2024 |
| **Arnoldo Wald** | *Operações Bancárias e o Código Civil* | RT | 2ª ed., 2011 |
| **Eduardo Salomão Neto** | *Direito Bancário* | Atlas | 3ª ed., 2020 |
| **Nelson Abrão** | *Direito Bancário* | Saraiva | 18ª ed., 2022 |
| **Ruy Rosado de Aguiar Jr.** | *Extinção dos Contratos por Incumprimento do Devedor* (jurisprudência STJ) | AIDE | 2ª ed., 2004 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STF — Súmula Vinculante 7** | A norma do §3° do artigo 192 da CF que veda a cobrança de juros acima de 12% ao ano foi revogada pela EC 40/2003 | Juros |
| 2 | **STJ — Súmula 297** | O CDC aplica-se às IFs | Aplicação |
| 3 | **STJ — Súmula 382** | A estipulação de juros remuneratórios superiores a 12% ao ano, por si só, não indica abusividade | Juros |
| 4 | **STJ — Súmula 530** | Nos contratos bancários, na impossibilidade de comprovar a taxa de juros efetivamente contratada, deve-se limitar os juros à taxa média de mercado divulgada pelo BACEN | Juros |
| 5 | **STJ — Tema 953 (repetitivo)** | Capitalização de juros — pactuação expressa e periodicidade | Anatocismo |
| 6 | **STJ — Súmula 479** | IFs respondem objetivamente por fortuito interno — fraudes de terceiros | Fraude |
| 7 | **STJ — Tema 1.085 (repetitivo)** | Tarifa de cadastro — legalidade e cobrança | Tarifas |
| 8 | **STJ — REsp 1.061.530 (repetitivo)** | Revisão de contratos bancários — impossibilidade de revisão de ofício pelo juiz | Revisão |
| 9 | **STJ — Súmula 596** | Não se aplica o Código de Defesa do Consumidor às relações entre bancos e acionistas | Acionistas |
| 10 | **STJ — Tema 1.096 (repetitivo)** | Superendividamento — dever de renegociação e mínimo existencial | Superendividamento |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Petição de Ação Revisional de Contrato Bancário** | Juros abusivos, capitalização, tarifas indevidas |
| 2 | **Petição de Ação de Repetição de Indébito** | Valores cobrados indevidamente — CDC art. 42 |
| 3 | **Petição de Ação de Indenização por Negativação Indevida** | Cobrança pós-pagamento, dano moral bancário |
| 4 | **Contestação de IF — Juros de Mercado** | Uso da taxa média BACEN — Súmula 530 STJ |
| 5 | **Petição de Habilitação no Conclave de Superendividamento** | Lei 14.181/2021 art. 104-A |
| 6 | **Cédula de Crédito Bancário (CCB) — Minuta** | Lei 10.931/2004 — título executivo extrajudicial |
| 7 | **Contrato de Mútuo Bancário** | CC arts. 586–592 + regulação BACEN |
| 8 | **Notificação de Protesto de Título** | Lei 9.492/97 — cheque, duplicata, CCB |
| 9 | **Petição de Ação de Cancelamento de Protesto** | Indevido — dano moral + obrigação de fazer |
| 10 | **Parecer sobre Abusividade de Spread Bancário** | Análise comparativa taxa contratada vs. taxa média BACEN |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **5 anos** — prescrição de ação monitória — cheque sem protesto | CC art. 206, §5°, I; Súmula 503 STJ | |
| **3 anos** — prescrição de execução de CCB | CC art. 206, §3°, VIII | |
| **6 meses** — execução de cheque (após vencimento do prazo de apresentação) | Lei do Cheque art. 59 | |
| **3 anos** — execução de letra de câmbio e nota promissória | LUG arts. 70–71 | |
| **3 anos** — ação de repetição de indébito bancário | CC art. 206, §3°, IV | |
| **15 dias** — prazo de contestação no JEC | Lei 9.099/95 art. 30 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — contratos bancários, tarifas, juros, CDC nas IFs |
| **STF** | RE — estrutura do SFN, constitucionalidade, juros |
| **TJs Estaduais** | Varas cíveis/bancárias — revisões, cobranças, indenizações |
| **JEC** | Causas bancárias até 40 SM |
| **BACEN / BCB** | Supervisão prudencial, sanções administrativas |
| **CADE** | Concorrência no setor bancário |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`sistema financeiro nacional` · `banco central` · `CMN` · `BACEN` · `IF` · `banco comercial` · `banco múltiplo` · `SCD` · `SEP` · `fintech` · `mútuo bancário` · `abertura de crédito` · `conta corrente` · `cheque` · `duplicata` · `nota promissória` · `letra de câmbio` · `CCB` · `título executivo` · `protesto` · `spread bancário` · `juros remuneratórios` · `juros moratórios` · `capitalização de juros` · `anatocismo` · `tarifa bancária` · `tarifa de cadastro` · `tarifa de avaliação` · `tarifa de liquidação antecipada` · `taxa média de mercado` · `taxa SELIC` · `taxa CDI` · `alienação fiduciária de bem móvel` · `penhor cedular` · `avalista` · `fiador` · `garantia fidejussória` · `garantia real` · `superendividamento` · `mínimo existencial` · `renegociação de dívida` · `negativação` · `SPC` · `SERASA` · `cadastro positivo` · `fraud scoring` · `fraude bancária` · `fortuito interno` · `responsabilidade objetiva de IF` · `pagamento instantâneo` · `PIX` · `open banking` · `open finance`

---

## PRIV-011 — DIREITO SECURITÁRIO
### CC arts. 757–802 | Lei 10.406/2002

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **CC arts. 757–802** | Contrato de seguro — disposições gerais, seguro de dano, seguro de pessoa |
| 2 | **Decreto-Lei 73/1966** | Sistema Nacional de Seguros Privados — SUSEP, IRB |
| 3 | **Lei 9.656/1998** | Planos de saúde — seguro-saúde |
| 4 | **Lei 6.194/1974 (DPVAT)** | Seguro obrigatório de veículos — extinto formalmente pela MP 904/2019 |
| 5 | **Lei 14.455/2022** | Criação do SPVAT — substituto do DPVAT |
| 6 | **Res. CNSP 407/2021** | Seguros de dano — regulação geral |
| 7 | **Circular SUSEP 621/2021** | Condições gerais de seguros de responsabilidade civil |
| 8 | **Lei 8.374/1991** | Seguro obrigatório de responsabilidade civil do transportador aéreo |
| 9 | **CF/88 art. 21, XII, *e*; art. 192** | Regulação de seguros privados como serviço financeiro |
| 10 | **Lei 10.406/2002 arts. 757–777** | Seguro de dano — interesse segurável, valor segurado, sinistro |
| 11 | **CC arts. 778–802** | Seguro de pessoa — vida, acidentes pessoais |
| 12 | **Circular SUSEP 277/2004** | Planos de previdência complementar aberta |
| 13 | **Lei 12.618/2012** | FUNPRESP — previdência complementar do servidor público |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Ernesto Tzirulnik, Flávio de Queiroz B. Cavalcanti & Ayrton Pimentel** | *O Contrato de Seguro: de acordo com o novo Código Civil brasileiro* | RT | 3ª ed., 2016 |
| **Sílvio de Salvo Venosa** | *Direito Civil* — v. 2 (Contratos em Espécie) — capítulo sobre seguro | Atlas | 23ª ed., 2023 |
| **José Augusto Delgado** | *Comentários ao Código Civil — Contratos de Seguro* | Saraiva | 2ª ed., 2011 |
| **Pedro Alvim** | *O Contrato de Seguro* | Forense | 3ª ed., 1999 |
| **Ivan de Oliveira Silva** | *Curso de Direito do Seguro* | Saraiva | 5ª ed., 2018 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Súmula 62** | A seguradora não pode opor ao segurado a exceptio non adimpleti contractus em caso de sinistro sofrido antes do cancelamento da apólice | Sinistro |
| 2 | **STJ — Súmula 101** | A ação de indenização do segurado em grupo contra o segurador prescreve em um ano | Prescrição |
| 3 | **STJ — Súmula 616** | A indenização securitária é devida quando ausente a comunicação prévia do segurador ao segurado acerca do cancelamento da apólice, por falta de pagamento do prêmio, por período não inferior a 10 dias | Cancelamento |
| 4 | **STJ — Tema 1.068 (repetitivo)** | Seguro de vida — suicídio nos 2 primeiros anos — excludente de cobertura | Suicídio |
| 5 | **STJ — Súmula 302** | É abusiva a cláusula contratual de plano de saúde que limita no tempo a internação hospitalar do segurado | Plano saúde |
| 6 | **STJ — REsp 1.764.859** | Franquia de seguro de veículo — natureza e deduções | Franquia |
| 7 | **STJ — Súmula 529** | No seguro de responsabilidade civil facultativo, não cabe o ajuizamento de ação pelo terceiro prejudicado diretamente em face da seguradora do apontado causador do dano | Ação direta |
| 8 | **STJ — REsp 1.825.716** | Seguro D&O — cobertura de atos de gestão de diretores | D&O |
| 9 | **STJ — Tema 539 (repetitivo)** | Prazo prescricional de ações relacionadas ao DPVAT | DPVAT |
| 10 | **STJ — Súmula 638** | É abusiva a cláusula contratual de plano de saúde que limita ou exclui o tratamento de doenças com cobertura prevista em lei | Plano saúde |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Petição de Ação de Cobrança de Indenização Securitária** | Negativa de pagamento de sinistro pela seguradora |
| 2 | **Notificação Extrajudicial à Seguradora** | Comunicação de sinistro — CC art. 771 |
| 3 | **Petição de Tutela de Urgência — Tratamento Médico** | Plano de saúde — cobertura negada |
| 4 | **Contestação da Seguradora — Agravamento de Risco** | CC arts. 768–769 — conduta do segurado |
| 5 | **Contrato de Seguro Empresarial** | CC arts. 757–770 + condições gerais SUSEP |
| 6 | **Apólice de Seguro de Vida** | CC arts. 789–802 — capital segurado, beneficiários |
| 7 | **Petição de Ação de Seguro D&O** | Responsabilidade de administradores |
| 8 | **Recurso Administrativo à SUSEP** | Processo administrativo de reclamação de segurado |
| 9 | **Minuta de Cláusula de Arbitragem em Resseguro** | IRB/Mercado ressegurador — LAI |
| 10 | **Parecer sobre Validade de Exclusão de Cobertura** | Análise de condições gerais vs. CDC |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **1 ano** — prescrição de ação de seguro individual | CC art. 206, §1°, II, *b*; Súmula 101 STJ | |
| **3 anos** — prescrição de ação de seguro empresarial | CC art. 206, §3°, IX | |
| **2 anos** — carência para excludente de suicídio | CC art. 798 | STJ Tema 1.068 |
| **72 horas** — dever de comunicar sinistro em seguros de veículos (prazo convencional típico) | Condições Gerais | Varia por apólice |
| **30 dias** — prazo para seguradora pagar indenização após documentação completa | Circular SUSEP | Varia por ramo |
| **10 dias** — prazo mínimo de notificação prévia antes de cancelar por inadimplemento | Súmula 616 STJ | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — seguros em geral, planos de saúde, DPVAT/SPVAT |
| **STF** | RE — ANS, SUSEP, constitucionalidade de exclusões |
| **Varas Cíveis (TJ)** | Ações securitárias em geral |
| **JEC** | Causas securitárias até 40 SM |
| **SUSEP** | Processos administrativos, sanções a seguradoras |
| **ANS** | Planos de saúde — fiscalização e mediação |
| **Câmaras Arbitrais** | Resseguro — contratos internacionais |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`contrato de seguro` · `apólice` · `prêmio` · `sinistro` · `indenização` · `cobertura` · `exclusão de cobertura` · `franquia` · `participação obrigatória` · `cosseguro` · `resseguro` · `retrocessão` · `interesse segurável` · `valor segurado` · `capital segurado` · `beneficiário` · `segurado` · `segurador` · `seguradora` · `agravamento de risco` · `omissão dolosa` · `boa-fé do segurado` · `seguro de dano` · `seguro de pessoa` · `seguro de vida` · `seguro de acidentes pessoais` · `seguro de responsabilidade civil` · `seguro empresarial` · `seguro D&O` · `seguro E&O` · `seguro garantia` · `seguro de crédito` · `seguro rural` · `DPVAT` · `SPVAT` · `plano de saúde` · `operadora de saúde` · `ANS` · `SUSEP` · `IRB Brasil` · `regulação de sinistros` · `cláusula de rateio` · `sub-rogação securitária` · `ação regressiva` · `ação direta do prejudicado` · `previdência complementar aberta` · `PGBL` · `VGBL` · `EAPC` · `fundo de investimento especialmente constituído`

---

# ═══════════════════════════════════════════════════════════════
# MÓDULO EMP — DIREITO EMPRESARIAL
# ═══════════════════════════════════════════════════════════════

---

## EMP-001 — DIREITO SOCIETÁRIO
### Lei 6.404/1976 (LSA) | CC arts. 966–1.195

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Lei 6.404/1976 (LSA)** | Sociedade por ações — SA e SCA |
| 2 | **CC arts. 966–1.195** | Empresário, EIRELI, sociedades simples e limitadas |
| 3 | **Lei 13.874/2019 (Liberdade Econômica)** | Sociedade unipessoal limitada; declaração de direitos econômicos |
| 4 | **Lei 14.195/2021** | Ambiente de negócios — simplificação de abertura e encerramento de empresas |
| 5 | **Lei 6.385/1976** | Mercado de capitais — CVM — emissão pública de valores mobiliários |
| 6 | **Instrução CVM 480/2009** | Registro de emissores — prospecto, deveres de disclosure |
| 7 | **Res. CVM 80/2022** | Consolidação normativa CVM — OPA, insider, mercado |
| 8 | **Lei 10.303/2001** | Reforma da LSA — tag along, Conselho Fiscal |
| 9 | **Lei 12.431/2011** | Debêntures de infraestrutura |
| 10 | **Lei 11.638/2007** | Convergência IFRS — demonstrações financeiras de SA |
| 11 | **Lei 12.846/2013 (Anticorrupção)** | Responsabilidade de PJ por atos lesivos à Administração |
| 12 | **Lei 9.279/1996 art. 195** | Concorrência desleal societária |
| 13 | **CC arts. 1.052–1.087** | Sociedade limitada |
| 14 | **Instrução Normativa DREI** | Registro empresarial — JUCEB, JUCESP |
| 15 | **Lei 11.101/2005 arts. 50–69** | Meios de recuperação — interface societária |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Modesto Carvalhosa** | *Comentários à Lei das Sociedades Anônimas* (4 volumes) | Saraiva | 7ª ed., 2021 |
| **Fábio Ulhoa Coelho** | *Curso de Direito Comercial* — v. 2 (Direito de Empresa) | Saraiva | 23ª ed., 2024 |
| **Alfredo Lamy Filho & José Luiz Bulhões Pedreira** | *A Lei das S.A.* | Renovar | 2ª ed., 2017 |
| **Nelson Eizirik** | *A Lei das S.A. Comentada* (3 volumes) | Quartier Latin | 3ª ed., 2020 |
| **Erasmo Valladão Azevedo e Novaes França** | *Direito Societário Contemporâneo* | Malheiros | 2ª ed., 2019 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — Tema 1.076 (repetitivo)** | Desconsideração da personalidade jurídica — teoria maior — requisitos | DPJ |
| 2 | **STJ — Súmula 435** | Presume-se dissolvida irregularmente a empresa que deixar de funcionar no seu domicílio fiscal | Dissolução irregular |
| 3 | **STJ — REsp 1.736.021** | Direito de retirada do sócio — prazo de 60 dias + apuração de haveres | Retirada |
| 4 | **STJ — REsp 1.825.712** | Acionista minoritário — direito de informação e acesso a documentos sociais | Minoritários |
| 5 | **STJ — Tema 930 (repetitivo)** | Responsabilidade dos sócios na sociedade limitada — redirecionamento fiscal | Responsabilidade |
| 6 | **CVM — PAS 19957.001924/2019** | Deveres fiduciários de administradores — caso Petrobras | Dever fiduciário |
| 7 | **STJ — REsp 1.657.916** | Tag along — cálculo do prêmio de controle em OPA | Tag along |
| 8 | **STJ — Súmula 245** | A notificação destinada a comprovar a mora nas obrigações de dar implica publicidade na junta comercial | Junta |
| 9 | **STF — RE 1.090.540 RG** | Imunidade tributária de sociedade cooperativa | Cooperativa |
| 10 | **STJ — REsp 1.459.227** | Acordo de acionistas — cláusula de não concorrência e sua executividade | Acordo |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Contrato Social de Sociedade Limitada** | CC arts. 1.052–1.087 + IN DREI |
| 2 | **Estatuto Social de Sociedade Anônima Fechada** | LSA arts. 83–119 |
| 3 | **Acordo de Acionistas** | LSA art. 118 — voto, compra preferencial, tag along |
| 4 | **Ata de Assembleia Geral Ordinária** | LSA arts. 131–135 — aprovação de contas |
| 5 | **Ata de Assembleia Geral Extraordinária** | LSA art. 135 — alteração estatutária |
| 6 | **Petição de Ação de Dissolução Parcial de Sociedade** | CPC arts. 599–609 — excludência de sócio |
| 7 | **Termo de Nomeação de Administrador** | LSA arts. 143–160; CC art. 1.061 |
| 8 | **NDA + Acordo de Não Concorrência para M&A** | Due diligence pré-operação |
| 9 | **Laudo de Avaliação de Haveres** | CPC art. 606 — perícia de apuração |
| 10 | **Petição de Ação de Responsabilidade de Administrador** | LSA arts. 158–159; CC art. 1.016 |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **3 anos** — prescrição de ação de responsabilidade civil de administrador | LSA art. 287, II, *b* | |
| **2 anos** — prescrição de ação de nulidade de deliberação assemblear | LSA art. 286 | Anulabilidade |
| **60 dias** — prazo para sócio exercer direito de retirada após alteração estatutária | CC art. 1.077 | |
| **30 dias** — prazo para exercício de direito de preferência em aumento de capital | LSA art. 171 | |
| **1 ano** — prescrição de ação de responsabilidade contra fundadores | LSA art. 287, I | |
| **3 meses** — prazo para convocação de AGO após encerramento do exercício | LSA art. 132 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — SA, LTDA, desconsideração da PJ, M&A |
| **STF** | RE — constitucionalidade, cooperativas, tributação |
| **Varas Empresariais (TJ)** | Ações societárias (dissolução, apuração de haveres, responsabilidade) |
| **CVM** | PAS — insider, OPA, deveres de administradores |
| **Câmaras Arbitrais** | Estatutos com cláusula compromissória (CAM-CCBC, CAMARB) |
| **DREI / Juntas Comerciais** | Registro, alteração, dissolução administrativa |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`empresário individual` · `EIRELI` · `sociedade simples` · `sociedade empresária` · `sociedade limitada` · `sociedade anônima` · `SCA` · `LTDA` · `SA aberta` · `SA fechada` · `capital social` · `integralização` · `sócio` · `acionista` · `acionista controlador` · `acionista minoritário` · `acordo de acionistas` · `tag along` · `drag along` · `direito de preferência` · `direito de retirada` · `recesso` · `apuração de haveres` · `dissolução parcial` · `dissolução total` · `desconsideração da personalidade jurídica` · `teoria maior` · `teoria menor` · `administrador` · `CEO` · `CFO` · `conselho de administração` · `conselho fiscal` · `dever fiduciário` · `business judgment rule` · `responsabilidade de administrador` · `ação derivada` · `ação social` · `debênture` · `ação ordinária` · `ação preferencial` · `partes beneficiárias` · `bônus de subscrição` · `IPO` · `OPA` · `insider trading` · `M&A` · `due diligence` · `lock-up` · `governança corporativa` · `compliance` · `ESG` · `holding`

---

## EMP-002 — RECUPERAÇÃO JUDICIAL E FALÊNCIA
### Lei 11.101/2005 | Lei 14.112/2020

> **Nota:** Esta área foi desenvolvida em módulo próprio e detalhado. O presente registro serve como referência cruzada.

---

### Referência ao Módulo Principal

O módulo **EMP-002 — Recuperação Judicial e Falência** contém desenvolvimento completo e está arquivado separadamente. Abaixo constam apenas os elementos essenciais de interligação com os demais módulos PRIV e EMP.

---

### Conexões com outros módulos

| Módulo | Conexão |
|--------|---------|
| **EMP-001 Societário** | Sócios e administradores com responsabilidade pessoal; desconsideração DPJ |
| **PRIV-003 Contratos** | Rescisão de contratos unilaterais pelo administrador judicial (art. 117 LRE) |
| **PRIV-005 Direitos Reais** | Alienação de ativos do devedor; bens excluídos da massa falida |
| **PRIV-010 Bancário** | Créditos quirografários, créditos com garantia real, AGC |
| **EMP-003 Contratos Empresariais** | Contratos de franquia, representação — rescisão em RJ/Falência |

### Diplomas Centrais (referência rápida)

| Norma | Ementa |
|-------|--------|
| **Lei 11.101/2005** | LRE — Recuperação Judicial, Extrajudicial e Falência |
| **Lei 14.112/2020** | Reforma da LRE — credores financeiros, financiamento DIP, distressed M&A |
| **Res. CNJ 394/2021** | Comunicação de processos de insolvência |
| **Instrução Normativa RFB 1.765/2017** | Parcelamento especial REFIS em RJ |

---

## EMP-003 — CONTRATOS EMPRESARIAIS
### Franquia (Lei 13.966/2019) | Representação Comercial (Lei 4.886/1965) | Agência (CC arts. 710–721)

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Lei 13.966/2019 (Nova Lei de Franquia)** | Circular de oferta de franquia (COF), direitos e obrigações, rescisão |
| 2 | **Lei 8.955/1994 (antiga Lei de Franquia)** | Revogada, mas relevante para contratos firmados anteriormente |
| 3 | **Lei 4.886/1965 (Representação Comercial)** | Agente/representante autônomo, indenização por rescisão imotivada |
| 4 | **Lei 8.420/1992** | Altera a Lei 4.886/65 — indenização e prazo de preaviso |
| 5 | **CC arts. 710–721 (Agência e Distribuição)** | Contrato de agência — exclusividade, remuneração, rescisão |
| 6 | **CC arts. 693–709 (Comissão)** | Comissão mercantil — compra e venda por conta alheia |
| 7 | **CC arts. 681–692 (Mandato)** | Mandato mercantil — procuração e poderes |
| 8 | **Lei 6.729/1979 (Lei Ferrari)** | Contrato de concessão comercial de veículos automotores |
| 9 | **Lei 9.307/1996 (Arbitragem)** | Cláusula compromissória — contratos empresariais |
| 10 | **CC arts. 421–422** | Boa-fé objetiva e função social do contrato empresarial |
| 11 | **CDC arts. 2°, §2°; 29** | Franqueado pessoa jurídica como consumidor em sentido técnico (posição controvertida) |
| 12 | **Lei 12.529/2011** | Contratos de distribuição exclusiva — análise antitruste |
| 13 | **Res. CADE 20/2023** | Atos de concentração horizontal em contratos de distribuição |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Fábio Ulhoa Coelho** | *Curso de Direito Comercial* — v. 1 (Empresa e Estabelecimento) | Saraiva | 23ª ed., 2024 |
| **Waldírio Bulgarelli** | *Contratos Mercantis* | Atlas | 14ª ed., 2001 |
| **Arnoldo Wald** | *Contratos Internacionais do Comércio* | RT | 3ª ed., 2014 |
| **Haroldo Malheiros Duclerc Verçosa** | *Contratos Mercantis e a Teoria Geral dos Contratos* | Quartier Latin | 2ª ed., 2015 |
| **Silvio Luís Ferreira da Rocha** | *A Franquia Empresarial* | RT | 2ª ed., 2002 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — REsp 1.704.872** | Franquia — rescisão por inadimplemento do franqueador — dano moral empresarial | Rescisão |
| 2 | **STJ — Súmula 444** | É vedada a utilização de habeas corpus como substitutivo do recurso ordinário | (referência processual geral) |
| 3 | **TJSP — ApCiv 1096344-67.2020.8.26** | COF — ausência do prazo de 30 dias — nulidade do contrato de franquia | COF |
| 4 | **STJ — REsp 1.587.842** | Representação comercial — dispensa imotivada — indenização mínima legal | Representação |
| 5 | **STJ — REsp 1.786.311** | Agência exclusiva — rescisão unilateral — aviso prévio mínimo de 90 dias | Agência |
| 6 | **CADE — AC 08700.001898/2021** | Distribuição exclusiva — restrições verticais — análise de fechamento de mercado | Distribuição |
| 7 | **STJ — REsp 1.498.484** | Contrato de distribuição — clientela construída pelo distribuidor — indenização | Distribuição |
| 8 | **STJ — REsp 1.412.929** | Representação comercial — prazo prescricional de ação indenizatória | Prescrição |
| 9 | **TJPR — Ap. 0019437-34.2018.8.16.0001** | Franquia — desequilíbrio econômico-financeiro — revisão contratual | Revisão |
| 10 | **STJ — REsp 1.309.841** | Contrato de agência — elemento de exclusividade implícita — CC art. 711 | Exclusividade |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Circular de Oferta de Franquia (COF)** | Lei 13.966/2019 art. 2° — obrigatória 30 dias antes da assinatura |
| 2 | **Contrato de Franquia** | Lei 13.966/2019 — unidade, master, subfranquia |
| 3 | **Contrato de Representação Comercial** | Lei 4.886/65 + Lei 8.420/92 |
| 4 | **Contrato de Agência e Distribuição** | CC arts. 710–721 |
| 5 | **Notificação de Rescisão do Contrato de Representação** | Aviso prévio mínimo 30 dias |
| 6 | **Petição de Ação Indenizatória — Rescisão de Representação** | Lei 4.886/65 art. 27, *j* |
| 7 | **Contrato de Distribuição Exclusiva** | CC + análise antitruste CADE |
| 8 | **NDA Pré-Franquia** | Antes do envio da COF |
| 9 | **Petição de Tutela de Urgência — Bloqueio de Marca pelo Franqueado** | LSA art. 130 + CPC art. 300 |
| 10 | **Parecer sobre Aplicabilidade do CDC ao Franqueado** | Natureza da relação — consumidor vs. empresário |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **30 dias** — prazo mínimo entre entrega da COF e assinatura | Lei 13.966/2019 art. 7° | Nulidade relativa do contrato se não observado |
| **5 anos** — prescrição da pretensão indenizatória em representação | STJ — REsp 1.412.929 | |
| **90 dias** — aviso prévio mínimo para rescisão de contrato de agência sem prazo | CC art. 720 | |
| **30 dias** — aviso prévio para rescisão de representação comercial | Lei 4.886/65 art. 34 | |
| **Contrato indeterminado** — prazo mínimo de 1 ano para estabilidade de representação | Lei 4.886/65 art. 27 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — contratos empresariais (agência, distribuição, franquia) |
| **TJSP / TJPR / TJRJ** | Líderes em volume de causas de franquia |
| **CADE** | Contratos de distribuição exclusiva com potencial antitruste |
| **Câmaras Arbitrais** | CAM-CCBC, CAMARB — contratos com cláusula arbitral |
| **TJSP — 1ª a 3ª Câmaras Reservadas de Direito Empresarial** | Especialização em São Paulo |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`franquia` · `franqueador` · `franqueado` · `circular de oferta de franquia` · `COF` · `master franquia` · `subfranquia` · `royalties` · `taxa de publicidade` · `taxa de franchising` · `know-how` · `transferência de tecnologia` · `contrato de adesão empresarial` · `representação comercial` · `representante autônomo` · `preposição` · `exclusividade territorial` · `agência` · `agente` · `distribuição` · `distribuidor` · `contrato de distribuição exclusiva` · `restrição vertical` · `fechamento de mercado` · `indenização pela rescisão` · `clientela` · `aviamento` · `fundo de comércio` · `comissão` · `mandato mercantil` · `concessão comercial` · `Lei Ferrari` · `concessionária` · `veículo automotor` · `exclusividade de marca` · `cessão de uso de marca` · `licença de software` · `contrato de transferência de tecnologia` · `cláusula de não concorrência` · `cláusula de exclusividade` · `cláusula de manutenção de preços` · `RPM` · `acordo de nível de serviço` · `SLA` · `contrato de fornecimento` · `supply agreement` · `contrato de parceria` · `joint venture` · `NDA` · `sigilo empresarial` · `segredo de negócio`

---

## EMP-004 — PROPRIEDADE INDUSTRIAL
### Lei 9.279/1996 (LPI)

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Lei 9.279/1996 (LPI)** | Patentes, marcas, desenhos industriais, indicações geográficas, concorrência desleal |
| 2 | **CF/88 art. 5°, XXIX** | Proteção constitucional da propriedade industrial |
| 3 | **Acordo TRIPS (Dec. 1.355/1994)** | Padrões mínimos internacionais de PI |
| 4 | **Convenção de Paris (Dec. 635/1992)** | Prioridade unionista, proteção recíproca de marcas e patentes |
| 5 | **PCT — Tratado de Cooperação em Matéria de Patentes (Dec. 81.742/1978)** | Depósito internacional de pedido de patente |
| 6 | **Protocolo de Madri (Dec. 11.090/2022)** | Registro internacional de marcas no Brasil |
| 7 | **Lei 9.456/1997 (Cultivares)** | Proteção de cultivares — variante da PI biológica |
| 8 | **Lei 13.123/2015 (Biodiversidade)** | Acesso ao patrimônio genético — repartição de benefícios |
| 9 | **Resolução INPI 238/2019** | Marcas — procedimento de exame |
| 10 | **Resolução INPI 240/2019** | Patentes de invenção e modelo de utilidade — procedimento |
| 11 | **Lei 9.610/1998 (Direito Autoral)** | Software como obra intelectual + LPI |
| 12 | **Lei 9.609/1998 (Software)** | Proteção de programa de computador |
| 13 | **CC art. 1.228** | Propriedade como base dos direitos de PI |
| 14 | **CPC arts. 294–311** | Tutela de urgência — liminar contra infrator |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Denis Borges Barbosa** | *Uma Introdução à Propriedade Intelectual* | Lumen Juris | 2ª ed., 2003 |
| **João da Gama Cerqueira** | *Tratado da Propriedade Industrial* (2 volumes) | RT | Reimpressão, 2010 |
| **Gama Cerqueira / Denis Barbosa (org.)** | *Tratado Teórico e Prático das Marcas e Patentes* | Lumen Juris | 3ª ed., 2022 |
| **Newton Silveira** | *A Propriedade Intelectual e as Novas Leis Autorais* | Saraiva | 4ª ed., 2014 |
| **Lélio Denícoli Schmidt** | *A Distintividade das Marcas: Secondary Meaning, Genericidade, Descriptividade* | Saraiva | 2ª ed., 2013 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — REsp 1.527.232** | Colidência de marcas — alta-renome vs. distintividade | Marcas |
| 2 | **STJ — Súmula 143** | Prescreve em cinco anos a ação de perdas e danos pelo uso de marca comercial | Prescrição |
| 3 | **STF — RE 1.044.351 RG** | Patente pipeline — constitucionalidade | Patente |
| 4 | **STJ — REsp 1.655.306** | Marca notoriamente conhecida — proteção independe de registro no Brasil | Marcas |
| 5 | **TRF2 — AC 0044481-58.2011** | Nulidade de patente — estado da técnica — prior art | Patente |
| 6 | **STJ — REsp 1.756.311** | Infração de marca — danos materiais — método de cálculo por lucros do infrator | Indenização |
| 7 | **STJ — REsp 1.291.170** | Trade dress — conjunto-imagem — proteção independe de registro | Trade dress |
| 8 | **STJ — Tema 950 (repetitivo)** | Nulidade de marca — competência — INPI litisconsorte necessário | Competência |
| 9 | **STF — ADI 5.529** | Extensão do prazo de patente — declaração de inconstitucionalidade do art. 40 LPI | Prazo patente |
| 10 | **STJ — REsp 1.745.645** | Indicação geográfica — proteção de denominação de origem | IG |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Petição de Depósito de Marca no INPI** | LPI arts. 122–161 — classes de Viena e Nice |
| 2 | **Petição de Oposição a Registro de Marca** | LPI art. 158 — prazo 60 dias da publicação |
| 3 | **Petição de Pedido de Patente de Invenção** | LPI arts. 29–50 — reivindicações, relatório descritivo |
| 4 | **Contrato de Licença de Marca** | LPI art. 139 — registro obrigatório no INPI |
| 5 | **Contrato de Transferência de Tecnologia / Patente** | LPI art. 211 — INPI para efeitos ante terceiros |
| 6 | **Notificação Extrajudicial por Infração de Marca** | Cease and desist — LPI art. 195 (concorrência desleal) |
| 7 | **Petição de Ação de Nulidade de Registro de Marca** | LPI art. 173 — INPI litisconsorte passivo necessário |
| 8 | **Petição de Tutela de Urgência — Apreensão de Produto Contrafeito** | CPC art. 300 + LPI art. 209 |
| 9 | **Petição de Ação de Indenização por Infração de Patente** | LPI arts. 42–45 + art. 208–210 |
| 10 | **Parecer sobre Registrabilidade de Marca** | Análise de impedimentos absolutos e relativos |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **10 anos** — vigência de registro de marca (renovável) | LPI art. 133 | Renovação por período igual |
| **20 anos** — prazo de patente de invenção | LPI art. 40 *caput* | ADI 5.529: mínimo 10 anos após concessão |
| **15 anos** — prazo de modelo de utilidade | LPI art. 40 | Mínimo 7 anos após concessão |
| **5 anos** — prescrição de ação por infração de marca | Súmula 143 STJ | |
| **60 dias** — prazo para oposição a registro de marca | LPI art. 158 | A partir da publicação |
| **60 dias** — prazo para recurso de decisão do INPI | LPI art. 212 | |
| **5 anos** — decadência de ação de nulidade administrativa de patente | LPI art. 74 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | REsp — LPI, marcas, patentes, trade dress |
| **STF** | RE — constitucionalidade da LPI, TRIPS |
| **TRF2 (RJ/ES)** | Ações de nulidade de marcas e patentes — INPI sediado no RJ |
| **TRF3 (SP/MS)** | Ações de infração de marcas e patentes em SP |
| **Varas Federais (PI)** | INPI como réu/litisconsorte — competência federal |
| **INPI** | Processo administrativo de registro, exame, recurso |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`patente de invenção` · `modelo de utilidade` · `desenho industrial` · `marca` · `marca de produto` · `marca de serviço` · `marca coletiva` · `marca de certificação` · `marca mista` · `marca nominativa` · `marca figurativa` · `marca tridimensional` · `trade dress` · `conjunto-imagem` · `indicação geográfica` · `denominação de origem` · `indicação de procedência` · `concorrência desleal` · `segredo de negócio` · `segredo industrial` · `pirataria` · `contrafação` · `prior art` · `estado da técnica` · `novidade absoluta` · `atividade inventiva` · `aplicação industrial` · `licença compulsória` · `pipeline` · `PCT` · `Madrid System` · `INPI` · `TRIPS` · `Convenção de Paris` · `prioridade unionista` · `nulidade de registro` · `caducidade` · `marca notoriamente conhecida` · `marca de alto renome` · `colidência de marcas` · `confusão` · `associação` · `reivindicação de patente` · `relatório descritivo` · `depositante` · `titular` · `licenciante` · `licenciado` · `royalties` · `cessão de marca` · `cessão de patente` · `exaustão de direitos`

---

## EMP-005 — DIREITO CONCORRENCIAL
### Lei 12.529/2011 (SBDC/CADE)

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Lei 12.529/2011** | Sistema Brasileiro de Defesa da Concorrência — CADE, SG, DEE |
| 2 | **CF/88 art. 170, IV** | Livre concorrência como princípio da ordem econômica |
| 3 | **CF/88 art. 173, §4°** | Repressão ao abuso do poder econômico |
| 4 | **Lei 8.884/1994** | Lei Antitruste anterior — relevante para processos em curso |
| 5 | **Lei 12.846/2013 (Anticorrupção)** | Interface com antitruste — cartel em licitação |
| 6 | **Resolução CADE 2/2012** | Programa de Leniência — acordo de leniência |
| 7 | **Resolução CADE 20/2023** | Controle de concentrações — notificações obrigatórias |
| 8 | **Resolução CADE 21/2022** | Análise de atos de concentração em mercados digitais |
| 9 | **Guia de Análise de Atos de Concentração Horizontal (CADE, 2016)** | Critérios analíticos de fusões e aquisições |
| 10 | **Portaria MF/MJ 994/2012** | Critérios de notificação obrigatória ao CADE |
| 11 | **Dec. 8.136/2013** | Regulamenta o SBDC |
| 12 | **Lei 9.279/1996 arts. 195–209** | Concorrência desleal — interface com antitruste |
| 13 | **OCDE — Diretrizes de Concorrência (2023)** | Softlaw — orientação para análise |
| 14 | **Guia de Antitruste Digital CADE (2021)** | Plataformas, dados, mercados bilaterais |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Calixto Salomão Filho** | *Direito Concorrencial* | Malheiros | 2ª ed., 2013 |
| **Gesner Oliveira & João Grandino Rodas** | *Direito e Economia da Concorrência* | Renovar | 2ª ed., 2013 |
| **Paulo Furquim de Azevedo & Fernando de Magalhães Furlan (coord.)** | *Defesa da Concorrência no Brasil — 50 anos* | Singular | 2014 |
| **Vinicius Marques de Carvalho (coord.)** | *A Lei nº 12.529/2011 e a nova política de defesa da concorrência* | Singular | 2015 |
| **Amanda Flávio de Oliveira** | *Direito da Concorrência e Tutela Judicial* | Forense | 2ª ed., 2021 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STF — ADI 5.814** | Constitucionalidade do CADE como tribunal administrativo independente | CADE |
| 2 | **STJ — REsp 1.228.180** | Cartel — dano presumido — facilitação da prova para ação privada de reparação | Cartel |
| 3 | **CADE — Proc. Adm. 08700.005953/2013** | Cartel no setor de transportes coletivos — multa e condenação | Cartel |
| 4 | **CADE — AC 08700.004431/2017 (Bayer/Monsanto)** | Ato de concentração em insumos agrícolas — remédios estruturais | Concentração |
| 5 | **STF — RE 398.041 RG** | Responsabilidade por abuso de posição dominante — princípio da finalidade social | Posição dominante |
| 6 | **CADE — AC 08700.001413/2018 (AmBev/Cervejarias)** | Contrato de exclusividade — fechamento de mercado | Exclusividade |
| 7 | **CADE — Proc. Adm. 08700.004419/2013** | Algoritmos de precificação como facilitadores de cartel | Digital |
| 8 | **STJ — REsp 1.582.754** | Ação privada de reparação por dano concorrencial — legitimidade e dano | Reparação |
| 9 | **CADE — TCC 08700.002052/2021** | Programa de leniência plus — acordo de leniência em investigação de cartel | Leniência |
| 10 | **STF — ADI 4.616** | Sigilo de informações em processo administrativo do CADE | Sigilo |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Formulário de Notificação de Ato de Concentração (FORM-AC)** | Res. CADE 20/2023 — fusões acima dos limiares |
| 2 | **Acordo de Controle de Concentração (ACC)** | CADE — remédios comportamentais e estruturais |
| 3 | **Petição de Requerimento de Leniência** | Res. CADE 2/2012 — delação de cartel |
| 4 | **Termo de Compromisso de Cessação (TCC)** | CADE — encerramento de investigação sem condenação |
| 5 | **Petição de Ação de Reparação por Dano Concorrencial** | STJ — cartel + dano antitrust follow-on |
| 6 | **Parecer Antitruste sobre Contrato de Distribuição Exclusiva** | Análise de restrições verticais |
| 7 | **Defesa em Processo Administrativo do CADE** | Resposta à nota de acusação — CADE |
| 8 | **Estudo de Definição de Mercado Relevante** | Metodologia SSNIP + econometria |
| 9 | **Compliance Antitruste — Manual Interno** | Política interna + treinamento |
| 10 | **Contestação de Multa do CADE no TRF1** | Ação anulatória — TRF1 (sede do CADE em Brasília) |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **30 dias** — prazo para notificação obrigatória ao CADE após fechamento do negócio (ato de concentração) | Lei 12.529/2011 art. 88, §2° | Antes: gun jumping vedado |
| **240 dias** — prazo para CADE julgar ato de concentração (prorrogável 90 dias) | Lei 12.529/2011 art. 88, §2° | |
| **5 anos** — prazo decadencial para início de investigação de infração | Lei 12.529/2011 art. 46 | Ato continuado: conta a partir da cessação |
| **5 anos** — prescrição de ação privada de reparação por dano concorrencial | CC art. 206, §3°, V (analogia) | |
| **30 dias** — prazo para defesa preliminar em processo administrativo CADE | Regimento Interno CADE | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **CADE (Tribunal Administrativo)** | Julgamento de processos administrativos, aprovação de concentrações |
| **TRF1 (DF)** | Controle judicial de decisões do CADE — mandado de segurança, ação anulatória |
| **STJ** | REsp — antitruste, danos concorrenciais |
| **STF** | RE — constitucionalidade do SBDC, livre concorrência |
| **Varas Federais (DF)** | Medidas cautelares urgentes contra decisões do CADE |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`defesa da concorrência` · `antitruste` · `CADE` · `SG` · `DEE` · `SBDC` · `livre concorrência` · `abuso de posição dominante` · `posição dominante` · `poder de mercado` · `cartel` · `cartel hardcore` · `cartel suave` · `fixação de preços` · `divisão de mercados` · `combinação de licitações` · `bid rigging` · `programa de leniência` · `leniência plus` · `delação antitruste` · `TCC` · `ACC` · `ato de concentração` · `fusão` · `aquisição` · `joint venture` · `controle conjunto` · `controle exclusivo` · `limiares de notificação` · `gun jumping` · `mercado relevante` · `mercado de produto` · `mercado geográfico` · `SSNIP test` · `hipothetical monopolist test` · `barreiras à entrada` · `economias de escala` · `efeito de rede` · `plataforma digital` · `mercado bilateral` · `dados como barreira` · `lock-in` · `tying` · `venda casada` · `exclusividade` · `fechamento de mercado` · `leveraging` · `predatory pricing` · `preço predatório` · `margin squeeze` · `essential facilities` · `remédios estruturais` · `remédios comportamentais`

---

## EMP-006 — COMERCIAL INTERNACIONAL
### CISG | Incoterms | LCIA | ICC

---

### 1. LEGISLAÇÃO PRIMÁRIA

| # | Norma | Relevância |
|---|-------|-----------|
| 1 | **Decreto 8.327/2014 (CISG)** | Convenção das Nações Unidas sobre Contratos de Compra e Venda Internacional de Mercadorias |
| 2 | **LINDB — Dec.-Lei 4.657/1942 arts. 7°–17** | Lei aplicável a contratos internacionais — DIP brasileiro |
| 3 | **Lei 9.307/1996 (Arbitragem)** | Arbitragem internacional com sede no Brasil |
| 4 | **Convenção de Nova York (Dec. 4.311/2002)** | Reconhecimento e execução de laudos arbitrais estrangeiros |
| 5 | **Incoterms 2020 (ICC Publication 723)** | Termos comerciais internacionais — riscos, custos, seguros |
| 6 | **UCP 600 (ICC)** | Regras e usos uniformes sobre créditos documentários |
| 7 | **URDG 758 (ICC)** | Garantias bancárias internacionais à primeira demanda |
| 8 | **Lei 4.131/1962 (Capital Estrangeiro)** | Registro de capital estrangeiro no BACEN (CADE) |
| 9 | **Lei 12.546/2011 + Portaria MDIC** | Drawback, regimes aduaneiros especiais |
| 10 | **Decreto 6.759/2009 (Regulamento Aduaneiro)** | Importação, exportação, despacho aduaneiro |
| 11 | **UNCITRAL Model Law on International Commercial Arbitration** | Referência para interpretação de arbitragem internacional |
| 12 | **Convenção de Viena sobre o Direito dos Tratados (Dec. 7.030/2009)** | Interpretação de tratados — pacta sunt servanda internacional |
| 13 | **Resolução BACEN 3.568/2008** | Mercado de câmbio — operações cambiais em contratos internacionais |
| 14 | **Lei 9.826/1999** | Regras para contratos com a Administração Pública Federal em moeda estrangeira |

---

### 2. DOUTRINA TIER 1

| Autor | Obra | Editora | Edição |
|-------|------|---------|--------|
| **Lauro Gama Jr.** | *Contratos Internacionais à Luz dos Princípios do UNIDROIT 2010* | Renovar | 2ª ed., 2016 |
| **Irineu Strenger** | *Contratos Internacionais do Comércio* | LTr | 4ª ed., 2003 |
| **Nádia de Araújo** | *Direito Internacional Privado — Teoria e Prática Brasileira* | Renovar | 7ª ed., 2021 |
| **Arnoldo Wald** | *Contratos Internacionais do Comércio* | RT | 3ª ed., 2014 |
| **Francisco José Cahali** | *Curso de Arbitragem* | RT | 7ª ed., 2022 |

---

### 3. JURISPRUDÊNCIA — TEMAS E SÚMULAS STF/STJ

| # | Tribunal | Enunciado / Tema | Conteúdo |
|---|----------|-----------------|---------|
| 1 | **STJ — SEC 9.412** | Homologação de laudo arbitral estrangeiro — requisitos da Convenção de Nova York | Arbitragem |
| 2 | **STJ — REsp 1.602.076** | CISG — aplicação direta após ratificação pelo Brasil em 2014 | CISG |
| 3 | **STJ — SEC 12.236** | Reconhecimento de sentença estrangeira — competência STJ | Sentença estrangeira |
| 4 | **STJ — REsp 1.783.674** | Cláusula de eleição de foro estrangeiro — validade e limites | Eleição de foro |
| 5 | **STJ — REsp 1.719.785** | Carta rogatória — cooperação jurídica internacional | Cooperação |
| 6 | **TJSP — AC 2102041-50.2019.8.26** | CISG — inadimplemento fundamental — resolução do contrato | CISG |
| 7 | **STJ — SEC 14.408** | Cláusula compromissória em contrato internacional — validade da arbitragem | Arbitragem |
| 8 | **STF — RE 154.607** | Carta rogatória executória — controle do STF (anterior à EC 45/2004) | Cooperação |
| 9 | **STJ — AREsp 1.819.159** | Incoterms — CIF vs. FOB — responsabilidade pelo seguro e frete | Incoterms |
| 10 | **STJ — REsp 1.508.399** | Crédito documentário (carta de crédito) — autonomia e abstração | LC |

---

### 4. DOCUMENTOS ELABORÁVEIS

| # | Documento | Contexto |
|---|-----------|---------|
| 1 | **Contrato Internacional de Compra e Venda de Mercadorias (CISG)** | CISG + Incoterms 2020 — cláusulas essenciais |
| 2 | **Cláusula de Arbitragem Internacional (ICC/LCIA/CAM-CCBC)** | Regras de arbitragem + lei aplicável + sede |
| 3 | **Carta de Crédito Documentária (L/C)** | UCP 600 — instruções ao banco emissor |
| 4 | **Garantia Bancária Internacional à Primeira Demanda** | URDG 758 — performance bond |
| 5 | **Contrato de Distribuição Internacional** | Incoterms + CISG + cláusulas de exclusividade |
| 6 | **NDA Internacional** | Bilíngue — português/inglês — escolha da lei e foro |
| 7 | **Petição de Homologação de Laudo Arbitral Estrangeiro** | STJ — Convenção de Nova York + RISTJ |
| 8 | **Contrato de Joint Venture Internacional** | Lei aplicável, entrada de capital, distribuição de lucros |
| 9 | **Carta Rogatória — Cooperação Jurídica Internacional** | STJ + Autoridade Central (DRCI/MJ) |
| 10 | **Parecer sobre Lei Aplicável e Foro Competente** | DIP — LINDB arts. 9°–11 + cláusula de eleição |

---

### 5. PRAZOS

| Prazo | Fundamento | Observação |
|-------|-----------|------------|
| **2 anos** — prescrição CISG (Convenção de Nova York de Prescrição, não ratificada pelo Brasil — prazo interno subsidiário) | CISG art. 39 (notificação de vício) + analogia | |
| **2 anos** — prazo para denúncia de vício do produto (CISG art. 39) | CISG art. 39 | |
| **4 anos** — prescrição UNCITRAL (referência para contratos que elegem o direito de convenções internacionais) | Convenção de Prescrição 1974 (não vigente no Brasil) | |
| **Prazo do foro eleito** — prevalece sobre LINDB quando há convenção internacional | LINDB art. 9° | Autonomia conflitual limitada no Brasil |
| **15 dias** — prazo de cumprimento de carta rogatória no Brasil | CPC art. 262 | |

---

### 6. TRIBUNAIS COMPETENTES

| Tribunal | Competência |
|----------|------------|
| **STJ** | Homologação de sentença estrangeira (art. 105, I, *i* CF) e laudo arbitral estrangeiro |
| **STF** | Carta rogatória executória (anterior EC 45/2004) — atualmente STJ |
| **TRFs** | Causas envolvendo Estado estrangeiro, empresas públicas federais, IRRF |
| **Câmaras Arbitrais Internacionais** | ICC (Paris), LCIA (Londres), ICSID (Washington), CAM-CCBC (SP) |
| **Varas Federais** | Execução de laudo arbitral homologado pelo STJ |
| **BACEN** | Registro de capital estrangeiro, contratos de câmbio |

---

### EXPANSÃO LEXICAL — 50+ TERMOS

`contrato internacional` · `lei aplicável` · `conflito de leis` · `DIP` · `LINDB` · `autonomia da vontade conflitual` · `eleição de lei` · `eleição de foro` · `arbitragem internacional` · `cláusula compromissória internacional` · `Convenção de Nova York` · `homologação de laudo` · `execução de sentença estrangeira` · `carta rogatória` · `cooperação jurídica internacional` · `CISG` · `inadimplemento fundamental` · `resolução automática` · `Incoterms 2020` · `EXW` · `FCA` · `FOB` · `CFR` · `CIF` · `DDP` · `carta de crédito` · `crédito documentário` · `UCP 600` · `URDG 758` · `performance bond` · `guarantee` · `standby LC` · `forfeiting` · `factoring internacional` · `câmbio` · `hedge cambial` · `NDF` · `swap cambial` · `capital estrangeiro` · `remessa de lucros` · `royalties internacionais` · `preços de transferência` · `treaty shopping` · `tax haven` · `offshoring` · `BEPS` · `Princípios UNIDROIT` · `lex mercatoria` · `hardship internacional` · `force majeure` · `frustration of contract` · `UNCITRAL`

---

# ═══════════════════════════════════════════════════════════════
# APÊNDICES E REFERÊNCIAS RÁPIDAS
# ═══════════════════════════════════════════════════════════════

## APÊNDICE A — QUADRO DE PRAZOS PRESCRICIONAIS CIVIS (CC art. 206)

| Prazo | Pretensão | Fundamento |
|-------|-----------|-----------|
| **1 ano** | Hospedeiro / fornecedor de alimentos; segurado individual | CC art. 206, §1° |
| **2 anos** | Prestações alimentares | CC art. 206, §2° |
| **3 anos** | Reparação civil; enriquecimento sem causa; aluguéis (até 3 meses); juros | CC art. 206, §3° |
| **4 anos** | Tutores contra pupilos | CC art. 206, §4° |
| **5 anos** | Dívidas líquidas em instrumento público ou privado; pensões alimentícias | CC art. 206, §5° |
| **10 anos** | Prazo geral residual (sem prazo especial) | CC art. 205 |

---

## APÊNDICE B — CÂMARAS ARBITRAIS BRASILEIRAS RELEVANTES

| Câmara | Sigla | Sede | Especialidade |
|--------|-------|------|--------------|
| Centro de Arbitragem e Mediação da CCBC | CAM-CCBC | São Paulo | Contratos empresariais, societários, internacionais |
| Câmara de Arbitragem Empresarial Brasil | CAMARB | BH | Contratos empresariais |
| Câmara de Arbitragem da FIESP | FIESP | São Paulo | Contratos industriais e comerciais |
| Câmara FGV | FGV | São Paulo | Financeiro, M&A |
| CIESP | CIESP | São Paulo | Pequenas e médias empresas |
| Câmara de Arbitragem do Mercado (CAM-BM&F) | CAM | São Paulo | Mercado de capitais, derivativos |

---

## APÊNDICE C — JORNADAS DE DIREITO CIVIL — CJF/STJ

| Jornada | Ano | Enunciados | Portal |
|---------|-----|-----------|--------|
| I JDC | 2002 | 1–175 | www.cjf.jus.br |
| II JDC | 2004 | 176–288 | www.cjf.jus.br |
| III JDC | 2004 | 138–289 | www.cjf.jus.br |
| IV JDC | 2006 | 290–432 | www.cjf.jus.br |
| V JDC | 2011 | 433–621 | www.cjf.jus.br |
| VI JDC | 2013 | 531–622 | www.cjf.jus.br |
| VII JDC | 2015 | 570–646 | www.cjf.jus.br |
| VIII JDC | 2018 | 599–692 | www.cjf.jus.br |
| IX JDC | 2022 | 693–750+ | www.cjf.jus.br |

---

## APÊNDICE D — ENDEREÇOS DE PESQUISA JURÍDICA

| Recurso | URL |
|---------|-----|
| STF — Jurisprudência | https://jurisprudencia.stf.jus.br |
| STF — Teses RG | https://teses.stf.jus.br |
| STJ — Pesquisa SCON | https://scon.stj.jus.br/SCON |
| STJ — Jurisprudência em Teses | https://www.stj.jus.br/sites/portalp/Jurisprudencia/Jurisprudencia-em-teses |
| CADE — Jurisprudência | https://www.cade.gov.br/jurisprudencia |
| INPI — Pesquisa de Marcas | https://busca.inpi.gov.br/pePI |
| LegisWeb / Planalto | https://www.planalto.gov.br |
| Enunciados CJF | https://www.cjf.jus.br/enunciados |
| SUSEP — Legislação | https://www.gov.br/susep/pt-br/acesso-a-informacao/legislacao |
| BACEN — Normativos | https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo |
| CVM — Normativos | https://conteudo.cvm.gov.br/legislacao/index.html |
| TJSP — Jurisprudência | https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do |
| TJRJ — Jurisprudência | https://www4.tjrj.jus.br/ejud/ConsultaJurisprudencia.aspx |
| TJMG — Jurisprudência | https://jurisprudencia.tjmg.jus.br/jurisprudencia/pesquisaPalavrasEspelhoAcordao.do |
| JusBrasil | https://www.jusbrasil.com.br |
| Vlex Brasil | https://br.vlex.com |

---

## APÊNDICE E — SIGLAS E ABREVIAÇÕES

| Sigla | Significado |
|-------|-------------|
| CC | Código Civil (Lei 10.406/2002) |
| CDC | Código de Defesa do Consumidor (Lei 8.078/1990) |
| CF | Constituição Federal de 1988 |
| CPC | Código de Processo Civil (Lei 13.105/2015) |
| CPP | Código de Processo Penal |
| CVM | Comissão de Valores Mobiliários |
| BACEN/BCB | Banco Central do Brasil |
| SUSEP | Superintendência de Seguros Privados |
| CADE | Conselho Administrativo de Defesa Econômica |
| INPI | Instituto Nacional da Propriedade Industrial |
| STF | Supremo Tribunal Federal |
| STJ | Superior Tribunal de Justiça |
| TJ | Tribunal de Justiça (estadual) |
| TRF | Tribunal Regional Federal |
| CJF | Conselho da Justiça Federal |
| JDC | Jornada de Direito Civil |
| LSA | Lei das Sociedades Anônimas (Lei 6.404/1976) |
| LRF | Lei de Recuperação Judicial e Falências (Lei 11.101/2005) |
| LPI | Lei de Propriedade Industrial (Lei 9.279/1996) |
| LSBA | Lei do Sistema Brasileiro de Defesa da Concorrência (Lei 12.529/2011) |
| LGPD | Lei Geral de Proteção de Dados (Lei 13.709/2018) |
| RG | Repercussão Geral (STF) |
| IAC | Incidente de Assunção de Competência (STJ) |
| IRDR | Incidente de Resolução de Demandas Repetitivas |
| EDcl | Embargos de Declaração |
| AgRg | Agravo Regimental |
| REsp | Recurso Especial |
| RE | Recurso Extraordinário |
| AI | Agravo de Instrumento |
| APC | Apelação Cível |
| MS | Mandado de Segurança |
| ADI | Ação Direta de Inconstitucionalidade |
| ADPF | Arguição de Descumprimento de Preceito Fundamental |

---

*Arquivo gerado em: 07/04/2026 — Sistema LexOS*
*Cobertura: 17 áreas (PRIV-001 a PRIV-011 + EMP-001 a EMP-006)*
*Total de áreas documentadas: 17 | Versão: 1.0*
