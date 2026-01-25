# Product Requirements Document (PRD)
## LexFutura CRM — Sistema de Gestão Jurídica de Próxima Geração

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Status:** Rascunho para Validação

---

## 1. Visão Geral

### 1.1 Descrição
O **LexFutura CRM** é uma plataforma de gestão jurídica que combina CRM, automação de processos, scraping tribunalício e IA generativa para produção de documentos. Diferencia-se pela UI futurista (glassmorphism, modo escuro) e pela capacidade de aprender o estilo de escrita do advogado.

### 1.2 Problema
- Sistemas jurídicos atuais têm interfaces ultrapassadas
- Advogados perdem horas em tarefas repetitivas
- Monitoramento manual de processos em múltiplos tribunais
- Produção de documentos é lenta e trabalhosa
- Não existe personalização de estilo na geração por IA

### 1.3 Proposta de Valor
1. **UI Transformadora** — Design moderno com glassmorphism e modo escuro
2. **IA com Persona** — Aprende o estilo do advogado e replica na geração
3. **Automação Completa** — Scraping de tribunais + alertas automáticos
4. **Plataforma Única** — Frontend, backend, banco e deploy integrados

---

## 2. Público-Alvo

| Segmento | Características | Necessidade Principal |
|----------|-----------------|----------------------|
| Escritórios PME (5-50 advogados) | Sem TI dedicada, orçamento limitado | Sistema completo e acessível |
| Departamentos Jurídicos | Volume alto, equipe enxuta | Visibilidade e relatórios |
| Advogados Autônomos | Múltiplos clientes, competição | Ferramentas profissionais de baixo custo |

---

## 3. Funcionalidades

### 3.1 Gestão de Processos
- Cadastro completo (número, partes, tribunal, vara, status)
- Organização por pastas/tags customizáveis
- Painel de processos importantes
- **Kanban de tarefas** com drag-and-drop
- Filtros por advogado, cliente, área, prazo

### 3.2 Módulo de IA Documental
- **Extração de Persona**: análise de documentos históricos para identificar estilo
- **Geração de Peças**: petições, contestações, recursos com a voz do advogado
- **Gems/Artefatos**: templates configuráveis por área do direito
- **Formatação Automática**: aplica cabeçalho/rodapé do escritório
- Integração com OpenAI GPT-4 e GLM-4.7 (gratuito)

### 3.3 Integração Tribunalícia (Scraping)
- **Tribunais suportados**: TJSP, TRFs, STF, STJ, TST, TRTs
- Monitoramento automático de andamentos (a cada 6h)
- Captura de capas de processos
- Alertas por email/push/Slack
- Suporte a certificado digital para tribunais restritos

### 3.4 CRM Jurídico
- Cadastro de clientes (PF/PJ)
- Histórico de interações
- Importação de planilhas Excel
- Segmentação por área/porte/potencial

### 3.5 Interface Futurista
- **Modo escuro** padrão
- **Glassmorphism** (efeito vidro/blur)
- Dashboard personalizável com widgets
- Animações sutis e responsividade
- Kanban visual para tarefas

---

## 4. User Stories Principais

### Gestão
> **Como** advogado, **quero** ver processos com prazo próximo no dashboard **para** não perder compromissos.

### IA
> **Como** advogado, **quero** que o sistema aprenda meu estilo **para** gerar documentos com minha voz.

### Scraping
> **Como** advogado, **quero** receber alertas de decisões **para** agir rapidamente.

### CRM
> **Como** gestor, **quero** importar clientes de Excel **para** migrar do sistema antigo.

---

## 5. Arquitetura Técnica

### 5.1 Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | Python 3.10+, Flask, SQLAlchemy |
| Banco | PostgreSQL (produção), SQLite (dev) |
| Frontend | Bootstrap 5, CSS (glassmorphism) |
| Real-time | Flask-SocketIO |
| IA | OpenAI GPT-4 / GLM-4.7 |
| Scraping | Requests, BeautifulSoup, Selenium |
| Deploy | Railway (fullstack integrado) |

### 5.2 Modelo de Dados

```
User (id, email, password_hash, name, role)
Client (id, name, document, type, email, phone, address)
Lawsuit (id, number, court, status, client_id, lawyer_id)
Progress (id, lawsuit_id, date, description, type)
Task (id, title, status, due_date, lawsuit_id, user_id)
Persona (id, user_id, name, style_data, created_at)
Gem (id, name, area, template, instructions, persona_id)
DocumentTemplate (id, name, file_path, user_id)
```

### 5.3 Estrutura de Arquivos

```
lexfutura-crm/
├── config.py
├── run.py
├── requirements.txt
├── Dockerfile
├── Procfile
├── app/
│   ├── __init__.py
│   ├── models.py
│   ├── routes.py
│   ├── ai_service.py
│   ├── document_service.py
│   ├── scraping_service.py
│   ├── static/
│   │   └── css/
│   │       ├── glassmorphism.css
│   │       └── kanban.css
│   └── templates/
│       ├── base.html
│       ├── dashboard.html
│       ├── ai-studio.html
│       ├── kanban.html
│       └── ...
```

---

## 6. Requisitos Não Funcionais

| Requisito | Meta |
|-----------|------|
| Disponibilidade | 99,5% mensal |
| Tempo de resposta | < 2 segundos |
| Usuários concorrentes | 500 |
| Geração de documento IA | < 2 minutos |
| Taxa de sucesso scraping | > 95% |
| Conformidade | LGPD |

---

## 7. Roadmap

| Versão | Prazo | Entregas |
|--------|-------|----------|
| **1.0** | Mês 1-2 | Auth, CRUD processos/clientes, Kanban, Dashboard |
| **2.0** | Mês 3-4 | IA (persona, geração, Gems), AI Studio |
| **3.0** | Mês 5-6 | Scraping (TJSP, TRFs, STF), alertas |
| **4.0** | Mês 7-8 | Integrações (calendário, Slack), mobile, marketplace |

---

## 8. Métricas de Sucesso

| Métrica | Meta (6 meses) |
|---------|----------------|
| Processos cadastrados | 10.000 |
| NPS | > 40 |
| Retenção mensal | > 85% |
| Docs gerados por IA aceitos | > 70% |

---

## 9. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Custo de APIs de IA | Suporte a GLM-4.7 gratuito, cache agressivo |
| Tribunais mudam sistemas | Arquitetura modular, equipe de manutenção |
| Concorrência de grandes players | Foco em UX diferenciada e comunidade |
| LGPD | Privacidade por design, auditoria |

---

## 10. Deploy (Railway - Plataforma Única)

### Arquivos necessários:

**Procfile:**
```
web: gunicorn run:app
```

**runtime.txt:**
```
python-3.10.13
```

**Variáveis de ambiente (Railway):**
```
DATABASE_URL=postgresql://...
SECRET_KEY=sua-chave-secreta
OPENAI_API_KEY=sk-...
```

### Passos:
1. Push código para GitHub
2. Conectar repo no Railway
3. Adicionar PostgreSQL com 1 clique
4. Configurar variáveis de ambiente
5. Deploy automático → URL pública

---

## 11. Conclusão

O **LexFutura CRM** resolve as maiores dores da advocacia moderna através de uma combinação única de:

- ✅ Interface futurista que torna o trabalho agradável
- ✅ IA que aprende e replica o estilo do advogado
- ✅ Automação completa de monitoramento tribunalício
- ✅ Plataforma única sem fragmentação de ferramentas

O sistema está pronto para desenvolvimento seguindo este PRD, com deploy integrado no Railway para simplicidade operacional.
