# LexFutura - Sistema de Gestão Jurídica

## Visão Geral

Sistema de gestão jurídica para escritórios de advocacia brasileiros com funcionalidades de:
- **Consulta Processual**: Web scraping de tribunais para busca de processos
- **Gestão de Processos**: Cadastro e acompanhamento de processos
- **Controle de Prazos**: Monitoramento de DJE/DJEM para alertas automáticos
- **CRM Jurídico**: Gestão de clientes e relacionamentos

---

## Arquitetura de Web Scraping

### Tecnologia
- **Framework**: Playwright (Python) - escolhido por performance e estabilidade
- **Chamada**: Node.js backend executa Python scraper via child_process
- **Armazenamento**: PostgreSQL para histórico de consultas

### Detecção Automática de Tribunal

O sistema detecta automaticamente o tribunal pelo número do processo usando o padrão CNJ:

**Formato CNJ**: `NNNNNNN-DD.AAAA.J.TR.OOOO`
- **NNNNNNN**: Número sequencial (7 dígitos)
- **DD**: Dígito verificador (2 dígitos)
- **AAAA**: Ano de ajuizamento (4 dígitos)
- **J**: Segmento do Judiciário (1 dígito)
- **TR**: Tribunal (2 dígitos)
- **OOOO**: Origem/Vara (4 dígitos)

**Segmentos (J)**:
| Código | Segmento |
|--------|----------|
| 1 | STF |
| 2 | CNJ |
| 3 | STJ |
| 4 | Justiça Federal |
| 5 | Justiça do Trabalho |
| 6 | Justiça Eleitoral |
| 7 | Justiça Militar da União |
| 8 | Justiça Estadual |
| 9 | Justiça Militar Estadual |

---

## Mapeamento Completo dos Tribunais (35 tribunais)

### Tribunais Superiores

| Tribunal | Sigla | Formato Número | URL Consulta | Status |
|----------|-------|----------------|--------------|--------|
| Supremo Tribunal Federal | STF | `ADI 1`, `HC 123456`, `RE 1234567` | portal.stf.jus.br/processos | ✅ Implementado |
| Superior Tribunal de Justiça | STJ | `REsp 1234567`, `HC 654321`, `RHC 12345` | processo.stj.jus.br/processo/pesquisa | 🔄 Próximo |

### Justiça Federal (TRFs)

| Tribunal | Código CNJ | Formato | URL Consulta | Sistema | Status |
|----------|------------|---------|--------------|---------|--------|
| TRF 1ª Região | 4.01 | `0000000-00.0000.4.01.0000` | processual.trf1.jus.br | PJe | ⏳ Fase 3 |
| TRF 2ª Região | 4.02 | `0000000-00.0000.4.02.0000` | eproc.jfrj.jus.br | eProc | 🔄 Próximo |
| TRF 3ª Região | 4.03 | `0000000-00.0000.4.03.0000` | pje1g.trf3.jus.br | PJe | ⏳ Fase 3 |
| TRF 4ª Região | 4.04 | `0000000-00.0000.4.04.0000` | trf4.jus.br | eProc | ⏳ Fase 3 |
| TRF 5ª Região | 4.05 | `0000000-00.0000.4.05.0000` | pje.trf5.jus.br | PJe | ⏳ Fase 3 |
| TRF 6ª Região | 4.06 | `0000000-00.0000.4.06.0000` | portal.trf6.jus.br | eProc | ⏳ Fase 3 |

### Justiça Estadual (27 TJs)

| Tribunal | Código CNJ | Formato | URL Consulta | Sistema | Status |
|----------|------------|---------|--------------|---------|--------|
| TJAC - Acre | 8.01 | `0000000-00.0000.8.01.0000` | esaj.tjac.jus.br | eSAJ | ⏳ Futuro |
| TJAL - Alagoas | 8.02 | `0000000-00.0000.8.02.0000` | pje.tjal.jus.br | PJe | ⏳ Futuro |
| TJAP - Amapá | 8.03 | `0000000-00.0000.8.03.0000` | tucujuris.tjap.jus.br | Tucujuris | ⏳ Futuro |
| TJAM - Amazonas | 8.04 | `0000000-00.0000.8.04.0000` | consultasaj.tjam.jus.br | eSAJ | ⏳ Futuro |
| TJBA - Bahia | 8.05 | `0000000-00.0000.8.05.0000` | esaj.tjba.jus.br | eSAJ/PJe | ⏳ Futuro |
| TJCE - Ceará | 8.06 | `0000000-00.0000.8.06.0000` | esaj.tjce.jus.br | eSAJ | ⏳ Futuro |
| TJDFT - Distrito Federal | 8.07 | `0000000-00.0000.8.07.0000` | pje.tjdft.jus.br | PJe | ⏳ Futuro |
| TJES - Espírito Santo | 8.08 | `0000000-00.0000.8.08.0000` | aplicativos.tjes.jus.br | PJe | ⏳ Futuro |
| TJGO - Goiás | 8.09 | `0000000-00.0000.8.09.0000` | projudi.tjgo.jus.br | Projudi | ⏳ Futuro |
| TJMA - Maranhão | 8.10 | `0000000-00.0000.8.10.0000` | pje.tjma.jus.br | PJe | ⏳ Futuro |
| TJMT - Mato Grosso | 8.11 | `0000000-00.0000.8.11.0000` | pje.tjmt.jus.br | PJe | ⏳ Futuro |
| TJMS - Mato Grosso do Sul | 8.12 | `0000000-00.0000.8.12.0000` | esaj.tjms.jus.br | eSAJ | ⏳ Futuro |
| TJMG - Minas Gerais | 8.13 | `0000000-00.0000.8.13.0000` | pje.tjmg.jus.br | eProc/PJe | ⏳ Futuro |
| TJPA - Pará | 8.14 | `0000000-00.0000.8.14.0000` | consultas.tjpa.jus.br | PJe | ⏳ Futuro |
| TJPB - Paraíba | 8.15 | `0000000-00.0000.8.15.0000` | pje.tjpb.jus.br | PJe | ⏳ Futuro |
| TJPR - Paraná | 8.16 | `0000000-00.0000.8.16.0000` | projudi.tjpr.jus.br | Projudi/PJe | ⏳ Futuro |
| TJPE - Pernambuco | 8.17 | `0000000-00.0000.8.17.0000` | pje.tjpe.jus.br | PJe | ⏳ Futuro |
| TJPI - Piauí | 8.18 | `0000000-00.0000.8.18.0000` | pje.tjpi.jus.br | PJe | ⏳ Futuro |
| TJRJ - Rio de Janeiro | 8.19 | `0000000-00.0000.8.19.0000` | eproc.tjrj.jus.br | eProc | 🔄 Próximo |
| TJRN - Rio Grande do Norte | 8.20 | `0000000-00.0000.8.20.0000` | pje.tjrn.jus.br | PJe | ⏳ Futuro |
| TJRS - Rio Grande do Sul | 8.21 | `0000000-00.0000.8.21.0000` | www.tjrs.jus.br | Themis | ⏳ Futuro |
| TJRO - Rondônia | 8.22 | `0000000-00.0000.8.22.0000` | pje.tjro.jus.br | PJe | ⏳ Futuro |
| TJRR - Roraima | 8.23 | `0000000-00.0000.8.23.0000` | pje.tjrr.jus.br | PJe | ⏳ Futuro |
| TJSC - Santa Catarina | 8.24 | `0000000-00.0000.8.24.0000` | esaj.tjsc.jus.br | eProc | ⏳ Futuro |
| TJSP - São Paulo | 8.26 | `0000000-00.0000.8.26.0000` | esaj.tjsp.jus.br | eSAJ/eProc | ⏳ Fase 3 |
| TJSE - Sergipe | 8.25 | `0000000-00.0000.8.25.0000` | pje.tjse.jus.br | PJe | ⏳ Futuro |
| TJTO - Tocantins | 8.27 | `0000000-00.0000.8.27.0000` | eproc.tjto.jus.br | eProc | ⏳ Futuro |

---

## Classes Processuais por Tribunal

### STF - Supremo Tribunal Federal
```
AC, ACO, ADC, ADI, ADO, ADPF, AI, AImp, AO, AOE, AP, AR, ARE, AS, CC, Cm, 
EI, EL, EP, Ext, HC, HD, IF, Inq, MI, MS, PADM, Pet, PPE, PSV, RC, Rcl, 
RE, RHC, RHD, RMI, RMS, RvC, SE, SIRDR, SL, SS, STA, STP, TPA
```

### STJ - Superior Tribunal de Justiça
```
AgInt, AgRg, AREsp, CC, Ctr, EAg, EAREsp, EDecl, EDv, EREsp, ExSusp, HC, 
HD, HDE, IF, MC, MI, MS, PC, Pet, PSR, Rcl, REsp, RHC, RMS, RO, RPV, 
SE, SEC, SL, SS, STA, STP
```

### Justiça Federal (TRFs) - Formato CNJ
```
Ação Civil Pública, Ação de Improbidade, Ação Ordinária, Ação Penal, 
Agravo de Instrumento, Apelação, Embargos, Execução Fiscal, 
Habeas Corpus, Mandado de Segurança, Recurso em Sentido Estrito
```

### Justiça Estadual (TJs) - Formato CNJ
```
Procedimento Comum Cível, Procedimento Sumário, Execução de Título Extrajudicial,
Ação de Alimentos, Inventário, Divórcio, Usucapião, Despejo, 
Ação Penal, Habeas Corpus, Mandado de Segurança
```

---

## Roadmap de Implementação

### FASE 1 - Fundação (Atual)
- [x] STF - Scraper funcionando
- [ ] Detecção automática de tribunal
- [ ] Tela de detalhes com abas (Info, Partes, Andamentos, Decisões)
- [ ] Separar andamentos de decisões no STF

### FASE 2 - Tribunais Prioritários
- [ ] STJ - Superior Tribunal de Justiça
- [ ] TRF2 - Tribunal Regional Federal 2ª Região
- [ ] TJRJ - Tribunal de Justiça do Rio de Janeiro

### FASE 3 - Expansão Federal
- [ ] TRF1, TRF3, TRF4, TRF5, TRF6
- [ ] TJSP - Tribunal de Justiça de São Paulo

### FASE 4 - Expansão Estadual
- [ ] Demais 25 TJs estaduais

### FASE 5 - Monitoramento
- [ ] Módulo DJE/DJEM
- [ ] Cruzamento processo + publicação
- [ ] Alertas automáticos de prazos

---

## Estrutura de Tela do Processo

### Abas de Detalhes
1. **Informações** - Capa do processo (número, classe, relator, origem, assunto)
2. **Partes** - Requerentes, requeridos, advogados
3. **Andamentos** - Movimentações processuais
4. **Decisões** - Despachos e decisões (separado dos andamentos)
5. **Petições** - Petições protocoladas (quando disponível)

### Busca por Parte (Aba Separada)
- Busca por Nome (pessoa física)
- Busca por CNPJ (pessoa jurídica)
- Busca em múltiplos tribunais simultaneamente

---

## Conformidade e Segurança

### LGPD
- Dados processuais públicos (sem restrição)
- Processos sigilosos não são acessados
- Sem armazenamento de dados pessoais sensíveis

### Rate Limiting
- 1-2 requisições por segundo por tribunal
- Respeito aos termos de uso dos portais
- Delays entre requisições para evitar bloqueios

### Secrets
- Todas as API keys armazenadas em variáveis de ambiente
- Nenhum secret exposto no código frontend
- Sessões gerenciadas via connect-pg-simple

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Scraping | Python 3, Playwright |
| Banco | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| Deploy | Replit |

---

## Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0 | Jan/2025 | Implementação inicial STF |
| 1.1 | Jan/2025 | Correção case-sensitivity STF |
| 2.0 | (Planejado) | STJ, TRF2, TJRJ |
