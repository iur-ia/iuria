---
name: lexos-formatacao
description: >
  Agente de formatacao juridica para o LexOS do Dr. Thiago Morani.
  Aplica ABNT NBR 10520:2023 e NBR 6023:2018. Notas de rodape NA PAGINA.
  Citacao de jurisprudencia no formato CNJ com ementa completa quando
  favoravel. Hierarquia de titulos, Visual Law, formatacao Word e PDF.
---

# LexOS Formatacao — Padrao Morani & Santos

## Quando Usar

Ultima etapa do workflow LexOS antes da entrega ao Dr. Morani.
Aplica formatacao ABNT, citacao CNJ e Visual Law.

## Citacao de Jurisprudencia — Formato CNJ com Ementa (OBRIGATORIO)

Quando o julgado FAVORECE a tese, a citacao DEVE incluir a ementa completa no formato oficial CNJ/STJ:

```
PROCESSUAL CIVIL. RECURSO ESPECIAL. [TEMAS EM CAIXA ALTA SEPARADOS POR PONTO].
1. [Contexto da acao e do recurso].
2. [Proposito recursal — o que se discute].
3. [Ponto de direito 1].
4. [Ponto de direito 2].
...
N. Recurso especial conhecido [em parte] e [provido/desprovido].
([Tipo] n. [Numero]/[UF], relator[a] [Titulo] [Nome], [Turma/Secao], julgado em [DD/MM/AAAA], [DJe/DJEN] de [DD/MM/AAAA].)
```

### Exemplo Real (REsp STJ)

```
PROCESSUAL CIVIL. RECURSO ESPECIAL. ACAO DECLARATORIA DE NULIDADE.
NEGATIVA DE PRESTACAO JURISDICIONAL NAO VERIFICADA. ESCRITURA PUBLICA
DE CESSAO DE DIREITOS POSSESSORIOS. SENTENCA DECLARATORIA DE USUCAPIAO
EM PROCESSO ANTERIOR. VICIO TRANSRESCISORIO. INSTRUMENTALIDADE DAS FORMAS.
RECURSO PROVIDO.
1. Acao declaratoria de nulidade, da qual se extrai o presente recurso
especial, interposto em 9/2/2022.
2. O proposito recursal e decidir se a pretensao da querela nullitatis
deve ser requerida em acao declaratoria especifica e autonoma.
[...]
11. Recurso especial conhecido em parte e, nessa extensao, provido.
(REsp n. 2.095.463/PR, relatora Ministra Nancy Andrighi, Terceira
Turma, julgado em 18/3/2025, DJEN de 21/3/2025.)
```

### Regras de Uso da Ementa

1. **Quando o julgado FAVORECE a tese**: transcrever a ementa COMPLETA
2. **Quando o julgado e CONTRA ou neutro**: citar apenas no formato curto:
   `(STJ, REsp n. X.XXX.XXX/UF, Rel. Min. [Nome], [Turma], j. DD/MM/AAAA)`
3. **Topicos numerados da ementa**: cada ponto de direito relevante deve ser numerado
4. **Caixa alta nos temas**: a linha de abertura da ementa sempre em CAIXA ALTA com os temas separados por ponto
5. **Dispositivo final**: sempre incluir "Recurso [tipo] conhecido/provido/desprovido"
6. **Parenteses de fechamento**: SEMPRE no formato `([Tipo] n. [Numero]/[UF], relator[a] [Titulo] [Nome], [Orgao], julgado em [data], [publicacao] de [data].)`

### Hierarquia de Citacao (CPC Art. 927)

Ordem de prioridade na citacao:
1. Sumulas Vinculantes do STF
2. Decisoes em controle concentrado (ADI, ADC, ADPF)
3. IRDR e IAC
4. Sumulas do STF e STJ (nao vinculantes)
5. Orientacao do plenario/orgao especial
6. Jurisprudencia dominante dos tribunais superiores
7. Decisoes de TRFs/TJs (persuasiva)

## Notas de Rodape — NA PAGINA (OBRIGATORIO)

Toda citacao doutrinaria, jurisprudencial ou legal deve ter nota de rodape NA MESMA PAGINA onde aparece. NUNCA ao final do documento.

Formato ABNT NBR 10520:2023:
```
Segundo Didier Jr.¹, o processo civil brasileiro adotou...

---
¹ DIDIER JR., Fredie. Curso de Direito Processual Civil.
20. ed. Salvador: JusPodivm, 2018, p. 245.
```

Formato para doutrina (ABNT NBR 6023:2018):
```
SOBRENOME, Nome. Titulo da obra. Ed. Cidade: Editora, ano, p. XX.
```

Formato para artigo cientifico:
```
SOBRENOME, Nome. Titulo do artigo. Nome da Revista, v. X, n. X,
p. XX-XX, ano. DOI: [se disponivel].
```

## Fontes de Pesquisa vs. Fontes de Citacao (REGRA ABSOLUTA)

**O que ENTRA em nota de rodape**:
- Jurisprudencia: citacao CNJ com numero, relator, data, tribunal, ementa
- Doutrina: autor, obra, editora, ano, pagina (ABNT)
- Legislacao: lei, artigo, link Planalto

**O que NAO ENTRA em nota de rodape**:
- Dizer o Direito: e fonte de PESQUISA, nao de citacao. Parafrasear o conteudo e citar a jurisprudencia original. Registrar internamente (CoVe) de onde veio a parafrase.
- JusBrasil (como plataforma): citar o AUTOR do artigo, nao "JusBrasil". Se for jurisprudencia encontrada no JusBrasil, citar o tribunal com formato CNJ.
- IA DOD: idem Dizer o Direito — fonte de compreensao, nao de citacao.

## Hierarquia de Titulos

```
1. TITULO PRINCIPAL (caixa alta, negrito)
1.1. Subtitulo (negrito)
1.1.1. Sub-subtitulo (negrito italico)
```

## Visual Law (sugestoes em colchetes)

Quando cabivel, sugerir elementos visuais:
- [VISUAL LAW: Linha do tempo cronologica dos fatos]
- [VISUAL LAW: Tabela comparativa de precedentes]
- [VISUAL LAW: Fluxograma do procedimento]
- [VISUAL LAW: Quadro-resumo dos pedidos]

## Formatacao para Word/PDF

- Fonte: Times New Roman 12pt (corpo) / Arial 12pt (alternativa)
- Espacamento: 1,5 entre linhas
- Margens: superior 3cm, inferior 2cm, esquerda 3cm, direita 2cm
- Notas de rodape: fonte 10pt, espacamento simples
- Paragrafos: recuo primeira linha 2cm
- Citacoes longas (+3 linhas): recuo 4cm, fonte 10pt, sem aspas

## Exemplo de Uso

Usuario: "Formate esta peticao para protocolo"

Acao: Aplicar hierarquia de titulos, verificar notas de rodape na pagina, conferir citacoes no formato CNJ com ementa (favoraveis) ou curto (desfavoraveis), sugerir Visual Law, verificar margens ABNT.
