---
name: lexos-insolvencia
description: >
  Modulo de Tutela das Insolvencias do LexOS v3.0. Cobre insolvencia civil
  (CPC 730-790), recuperacao judicial (Lei 11101/2005 + Lei 14112/2020) e
  falencia. Perspectiva de TODAS as partes: advogado da recuperanda/falida,
  advogado do credor, administrador judicial. Provimentos CNJ, prazos LREF
  completos, remuneracao AJ TJRJ 1.25 porcento. Core business Morani e Santos.
  Substitui e expande lexos-recuperacao-judicial.
metadata:
  version: '3.0'
  author: Dr. Thiago Gomes Morani
---

# LexOS Tutela das Insolvencias v3

Core business do escritorio Morani & Santos. Este modulo cobre TODO o universo da insolvencia empresarial e civil.

## Insolvencia Civil (CPC Arts. 730-790)

- Execucao contra devedor insolvente (pessoa fisica nao empresaria)
- Declaracao judicial de insolvencia: credor ou proprio devedor
- Efeitos: arrecadacao de bens, vencimento antecipado das dividas, concurso de credores
- Ordem de pagamento: creditos trabalhistas, alimentares, com garantia real, privilegiados, quirografarios
- Procedimento: citacao, nomeacao de administrador, habilitacao de creditos

## Recuperacao Judicial

### Legitimidade (art. 48 LREF)
- Empresario/sociedade empresaria com 2+ anos de atividade regular
- NAO estar em falencia (salvo extintas as obrigacoes)
- NAO ter obtido RJ nos ultimos 5 anos
- NAO ter sido condenado por crime falimentar

### Creditos Sujeitos (art. 49)
- INCLUIDOS: todos os creditos existentes na data do pedido
- EXCLUIDOS: proprietario fiduciario, arrendador mercantil, vendedor com reserva de dominio, promitente vendedor (art. 49 §3°)
- Credito fiscal: NAO sujeito a RJ (art. 6° §7° — mas stay period aplica-se)
- Credito trabalhista: sujeito, mas com superprivilegios

### Classes de Credores (art. 41)
| Classe | Credores | Votacao na AGC |
|---|---|---|
| I | Trabalhistas + acidentes de trabalho (ate 150 SM) | Por cabeca |
| II | Garantia real | Pelo valor do credito |
| III | Quirografarios, ME/EPP, fornecedores essenciais | Pelo valor do credito |
| IV | ME/EPP (apos Lei 14.112/2020 — separados) | Por cabeca |

### Stay Period (art. 6° §4°)
- 180 dias improrrogaveis (contados do deferimento)
- Suspende TODAS as acoes e execucoes contra o devedor
- Excecoes: acoes que demandam quantia iliquida (art. 6° §1°), creditos excluidos do art. 49 §3°

### Plano de Recuperacao (arts. 53-69)
- Prazo para apresentacao: 60 dias apos deferimento (art. 53)
- Conteudo obrigatorio: demonstracao financeira, discriminacao dos creditos, prazo de pagamento
- Meios de recuperacao (art. 50): concessao de prazos, cisao/fusao/incorporacao/transformacao, cessao de quotas/acoes, substituicao de administradores, aumento de capital, trespasse, usufruto, administracao compartilhada, venda parcial, reducao salarial, dacao em pagamento

### AGC — Assembleia Geral de Credores (arts. 35-46)
- Convocacao pelo juiz (art. 36)
- Quorum de instalacao: mais de metade dos creditos de cada classe
- Aprovacao do plano: maioria simples por classe (art. 45)
- Presidida pelo administrador judicial

### Cram Down (art. 58 §1°)
- Aprovacao judicial MESMO com rejeicao de uma classe
- Requisitos (apos Lei 14.112/2020): (i) aprovacao por mais da metade dos creditos presentes, independente de classes; (ii) aprovacao por 2 das 4 classes; (iii) na classe rejeitante, mais de 1/3 dos creditos presentes

### Convolacao em Falencia (art. 73)
- Nao apresentacao do plano no prazo
- Rejeicao do plano sem cram down
- Descumprimento de obrigacao do plano

## Falencia

### Pedido de Falencia (arts. 94-99)
- Fundamentos (art. 94): impontualidade (I), execucao frustrada (II), atos de falencia (III — liquidacao precipitada, negocio simulado, transferencia sem autorizacao, etc.)
- Valor minimo: 40 SM para pedido por impontualidade (art. 94 §1°)
- Defesa do devedor: 10 dias (art. 98) — pode apresentar plano de RJ como defesa

### Sentenca de Falencia (art. 99)
- Conteudo: termo legal (retroage ate 90 dias), fixacao de prazo para habilitacoes, nomeacao do AJ
- Efeitos: inabilitacao do falido, arrecadacao, vencimento antecipado

### Realizacao do Ativo
- Preferencialmente por alienacao da empresa (art. 140) — preserva valor de going concern
- Subsidiariamente: alienacao de bens isolados, leilao

## Perspectivas por Parte

### Advogado da Recuperanda/Falida
- Elaborar plano de recuperacao viavel
- Negociar com credores
- Defender contra pedidos de falencia
- Impugnar creditos indevidos
- Monitorar stay period e prazos

### Advogado do Credor
- Habilitar credito (15 dias apos publicacao — art. 7° §1°)
- Impugnar plano de recuperacao
- Pedir falencia (art. 94)
- Requerer substituicao do AJ
- Votar na AGC

### Administrador Judicial (arts. 21-25)
- Funcoes: fiscalizacao, relatorios mensais, verificacao de creditos, presidir AGC, prestar contas
- Remuneracao: fixada pelo juiz — **TJRJ: padrao 1,25% do passivo**
- Responsabilidade: civil e criminal por atos praticados
- Destituicao: pelo juiz, de oficio ou a requerimento
- Provimentos CNJ: Recomendacao 72/2020 (cadastro nacional de AJ), Provimento 12/2020

## Prazos LREF Completos

| Ato | Prazo | Base Legal |
|---|---|---|
| Plano de recuperacao | 60 dias do deferimento | Art. 53 |
| Habilitacao de credito | 15 dias da publicacao do edital | Art. 7° §1° |
| Stay period | 180 dias improrrogaveis | Art. 6° §4° |
| Contestacao pedido falencia | 10 dias | Art. 98 |
| Impugnacao credito | 10 dias | Art. 8° |
| Objecao ao plano | Ate AGC | Art. 55 |
| Recurso contra sentenca falencia | 15 dias (agravo) | Art. 100 |
| Relatorios mensais do AJ | Mensais | Art. 22 II d |
| Prestacao de contas AJ | 30 dias apos encerramento | Art. 154 |

## Doutrina
- TOMAZETTE, Marlon. *Curso de Direito Empresarial* (vols. 2 e 3)
- COELHO, Fabio Ulhoa. *Comentarios a Lei de Falencias*
- AYOUB, Luiz Roberto; CAVALLI, Cassio. *A Construcao Jurisprudencial da RJ*
- BEZERRA FILHO, Manoel Justino. *Lei de Recuperacao de Empresas e Falencia*
- SACRAMONE, Marcelo Barbosa. *Comentarios a Lei de Recuperacao*

## Integracao AED (OBRIGATORIA)
- Eficiencia alocativa: preservacao vs liquidacao — art. 47 LREF
- Custos de transacao: AGC como mecanismo coasiano de negociacao coletiva
- Going concern value: empresa em funcionamento vale mais que ativos liquidados
- Assimetria informacional: devedor detem informacoes que credores nao tem (Williamson)
