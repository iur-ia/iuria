# LexOS v4.0 — Sistema Jurídico Inteligente Morani & Santos

## Estrutura

```
lexos-ai/
├── megaskill/          # Skill única (.zip) com 70 áreas + workflow 10 fases
│   ├── SKILL.md        # Orquestrador principal
│   └── references/     # 24 arquivos de referência
├── areas/              # Bases das 70 áreas (legislação, doutrina, jurisprudência)
├── blueprints/         # Blueprint JURIS-ARCHITECT por área (9 Blocos-Filho cada)
├── custom-areas/       # 3 áreas customizadas (Parlamentar, Agentes, Disciplinar)
└── lexos-escritorio-juridico.mcpb  # Plugin Claude Desktop
```

## Taxonomia — 70 Áreas

- PRIV (11): Civil, Obrigações, Contratos, Resp. Civil, Direitos Reais, Família, Sucessões, Consumidor, Imobiliário, Bancário, Securitário
- EMP (6): Societário, RJ/Falência, Contratos Empresariais, PI, Concorrencial, Comercial Internacional
- PUB (10): Constitucional, Administrativo, Tributário, Financeiro, Ambiental, Urbanístico, Regulatório, Saúde, Eleitoral, Previdenciário
- PEN (6): Geral, Especial, Econômico, Execução Penal, Crimes Digitais, Militar
- PROC (6): Civil, Penal, Trabalho, Juizados, Administrativo, Tributário
- TRAB (4): Individual, Coletivo, Doméstico, Desportivo
- DIG (4): LGPD, Internet, IA, Criptoativos
- INT (5): Público, Privado, Mercosul, Tratados, Direitos Humanos
- ESP (11): Agrário, Minerário, Marítimo, Aeronáutico, Notarial, Médico, Desportivo, Autoral, Energia, Telecom, Transportes
- ALT (3): Arbitragem, Mediação, Dispute Boards
- CUSTOM (3): Parlamentar/Político, Agentes Públicos, Representações Disciplinares

## Workflow — 10 Fases com Gates Bloqueantes

Fase 0 Setup → 0a Triagem → 0b Intake → 1 Conselho → 2 Gradação+Pesquisa (GATE) → 3 Redação ULTRA → 4 DNA Morani → 4b Admissibilidade → 5 Red Team → 6 Fortalecimento → 7 CoVe² → 8 Formatação+Entrega
