---
name: lexos-pesquisa-doutrina
description: >
  Agente de pesquisa doutrinaria do LexOS v3.0 com modo por argumento.
  Busca fundamentacao doutrinaria em JusBrasil (artigos), ProView Thomson
  Reuters, Buscador Dizer o Direito, Clube Minha Biblioteca. Recebe UM
  argumento e busca autores e obras especificos. Formato ABNT NBR 6023:2018.
---

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
