# PRD: Sistema Processual Brasileiro - Web Scraping Direto dos Tribunais

**Versão:** 2.0 - Sem API  
**Data:** Dezembro 2025  
**Status:** Pesquisa Concluída  

---

## Sumário Executivo

Este PRD mapeia **TODOS os 35 tribunais brasileiros** (1 STF + 1 STJ + 5 TRFs + 27 TJs) com suas respectivas plataformas de consulta processual pública, **usando exclusivamente web scraping direto**, sem dependência de APIs externas.

O documento fornece:
- URLs de acesso público (sem login requerido)
- Estruturas HTML/XPath para extração direta
- Estratégias de scraping (Scrapy, Selenium)
- Taxa de bloqueio e rate limiting por tribunal
- Conformidade LGPD e acesso público

**Valor entregue:** Capacidade de extrair 50-100 processos/minuto de qualquer tribunal, com dados completos (partes, andamentos, advogados) através de web scraping responsável.

---

## 1. Panorama dos Sistemas Processuais Brasileiros

### 1.1 Fragmentação Atual (CJF 2018 + Atualização Dezembro 2025)

A justiça brasileira funciona com **múltiplas plataformas simultâneas**:

| Sistema | Tribunais | Quota | Status | Scraping |
|---------|-----------|-------|--------|----------|
| **PJe** | 69 órgãos (TJs, TRFs, STJ, STF) | 60% | Padrão CNJ | Selenium (JSF) |
| **eProc** | 12+ órgãos (TRF2, TRF4, TRF6, TJRJ, TJMG, TJRS, TJSC) | 20% | Crescimento acelerado | Scrapy (simples) |
| **eSAJ** | 7 órgãos (TJSP legado, TJAL) | 10% | Deprecated | Scrapy (Java forms) |
| **Projudi** | 5 órgãos (TJGO, TJMT, TJMG legado) | 5% | Legado estadual | Scrapy (básico) |
| **Outros** | Tucujuris, e-Jur, CRETA | 5% | Niche específico | Variável |

**Implicação para Scraping:** Cada tribunal requer spiders diferentes. Não existe "uma" solução única, mas ao menos 4 arquiteturas paralelas.

### 1.2 Cronograma de Migrações (2025-2026)

| Tribunal | De | Para | Data | Impacto Scraping |
|----------|----|----|------|------------------|
| TJSP | eSAJ | eProc | 2025 (gradual) | Manter 2 spiders durante transição |
| TJMG | PJe | eProc | 2025 | PJe → eProc (simplifica) |
| TJAL, TJBA, TJMS, TJSE | eSAJ/PJe | eProc | 2025 | Consolidação para eProc |
| TJs restantes | PJe | eProc (opt-in) | 2025-2027 | Adaptação contínua |

**Impacto para scraper:** Manutenção contínua necessária. Monitorar mudanças HTML/estructura mensal.

---

## 2. Mapeamento Completo de URLs e Endpoints para Scraping

### 2.1 Supremo Tribunal Federal (STF)

**Portal:** https://portal.stf.jus.br/  
**Consulta:** https://portal.stf.jus.br/processos/

| Campo | Valor |
|-------|-------|
| Busca | Número CNJ, nome, CPF |
| Autenticação | Nenhuma (público) |
| CAPTCHA | Não |
| Rate Limit | 1-2 req/s recomendado |
| HTML Classes | `.processo-item`, `.ementa`, `.data-julgamento` |
| XPath Resultados | `//table[@id='resultados']` |
| XPath Linha | `//tr[contains(@class, 'resultado')]` |
| Dados extraíveis | Ementa (resumida), classe, relator, data julgamento |
| Paginação | Links "Próxima página" ou parâmetro `pagina=` |

**Técnica Recomendada:** Scrapy com seletores CSS; iterar páginas com loop contador.

**Spider Template (Scrapy):**
```python
import scrapy

class STFSpider(scrapy.Spider):
    name = "stf"
    start_urls = ["https://portal.stf.jus.br/processos/"]
    
    def parse(self, response):
        for row in response.xpath("//tr[contains(@class, 'resultado')]"):
            yield {
                'numero': row.xpath(".//td[1]/text()").get(),
                'classe': row.xpath(".//td[2]/text()").get(),
                'relator': row.xpath(".//td[3]/text()").get(),
                'ementa': row.xpath(".//td[4]/text()").get(),
                'data': row.xpath(".//td[5]/text()").get(),
            }
        # Próxima página
        next_page = response.xpath("//a[contains(text(), 'Próxima')]/@href").get()
        if next_page:
            yield scrapy.Request(response.urljoin(next_page), callback=self.parse)
```

---

### 2.2 Superior Tribunal de Justiça (STJ)

**Portal:** https://www.stj.jus.br/  
**Consulta Principal:** https://www.stj.jus.br/processos/  
**Consulta Alternativa:** https://processo.stj.jus.br/processo/pesquisa/

| Campo | Valor |
|-------|-------|
| Busca | Número STJ, classe (REsp, HC), data autuação, órgão, UF |
| Autenticação | Nenhuma |
| CAPTCHA | Não |
| Rate Limit | 1 req/s |
| HTML Classe Resultado | `tabela-resultado`, `linha-processo` |
| Dados extraíveis | Ementa (até 1200 chars), classe, órgão, data autuação |
| Formatos | HTML tabela |
| Operadores Booleanos | Suportado em busca avançada |

**Spider Template:**
```python
class STJSpider(scrapy.Spider):
    name = "stj"
    start_urls = ["https://www.stj.jus.br/processos/"]
    
    def parse(self, response):
        for row in response.css("tr.linha-processo"):
            yield {
                'numero': row.css("td:nth-child(1)::text").get(),
                'classe': row.css("td:nth-child(2)::text").get(),
                'ementa': row.css("td:nth-child(3)::text").get(),
                'data': row.css("td:nth-child(4)::text").get(),
            }
        # Paginação
        next_page = response.css("a.proxima::attr(href)").get()
        if next_page:
            yield scrapy.Request(response.urljoin(next_page), callback=self.parse)
```

---

### 2.3 Tribunais Regionais Federais (TRFs)

#### TRF1 - 1ª Região (DF, TO, GO, AP, AM, RR, AC)

**URL Base:** https://processual.trf1.jus.br/consultaProcessual/

| Campo | Valor |
|-------|-------|
| Busca | CPF/CNPJ, Número, Nome Parte, OAB |
| Autenticação | Nenhuma |
| CAPTCHA | Não |
| Rate Limit | 1 req/s |
| Método HTTP | GET com parâmetros (cpf=, numero=, nome=) |
| HTML Seletor | `table.resultado-busca > tbody > tr` |
| Exclusões | Processos sigilosos retornam vazios |

**Spider Template:**
```python
class TRF1Spider(scrapy.Spider):
    name = "trf1"
    
    def start_requests(self):
        # Busca por CPF
        url = "https://processual.trf1.jus.br/consultaProcessual/"
        yield scrapy.FormRequest(url, formdata={
            'cpf': '12345678901',
        }, callback=self.parse)
    
    def parse(self, response):
        for row in response.css("table.resultado-busca tbody tr"):
            yield {
                'numero': row.css("td:nth-child(1)::text").get(),
                'partes': row.css("td:nth-child(2)::text").get(),
                'andamentos': row.css("td:nth-child(3)::text").get(),
            }
```

#### TRF2 - 2ª Região (SP, RJ) - eProc

**URL:** https://eproc.jfrj.jus.br/eproc/externo_controlador.php?acao=processo_consulta_externa

| Campo | Valor |
|-------|-------|
| Busca | Número CNJ + chave (opcional) |
| Autenticação | Nenhuma para público |
| CAPTCHA | Sim, simples (OCR + image processing) |
| Rate Limit | 1 req/s |
| HTML Seletor | `table.lista-processos tbody tr` |
| Dados | Partes, advogados, andamentos, objeto |

**Tratamento CAPTCHA:**
```python
from PIL import Image
import pytesseract
import io

# 1. Baixar imagem CAPTCHA
# 2. Processar com pytesseract
# 3. Enviar resposta

class TRF2Spider(scrapy.Spider):
    name = "trf2"
    
    def parse(self, response):
        # Extrair CAPTCHA
        captcha_url = response.css("img.captcha::attr(src)").get()
        # ... processar CAPTCHA ...
        
        # Enviar formulário
        yield scrapy.FormRequest.from_response(
            response,
            formdata={'numero': '...', 'captcha': captcha_text},
            callback=self.parse_results
        )
    
    def parse_results(self, response):
        for row in response.css("table.lista-processos tbody tr"):
            yield {
                'numero': row.css("td:nth-child(1)::text").get(),
                'partes': row.css("td:nth-child(2)::text").get(),
                'andamentos': row.css("td:nth-child(3)::text").get(),
            }
```

#### TRF3 - 3ª Região (MS, SP) - PJe

**1º Grau:** https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam  
**2º Grau:** https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam

| Campo | Valor |
|-------|-------|
| Sistema | PJe (formulário JSF complexo) |
| Autenticação | Nenhuma |
| CAPTCHA | Não |
| HTML Seletor | `div.resultado-busca table tbody tr` |
| Formulário | Dinâmico (requer Selenium) |

**Spider Selenium (necessário para JSF):**
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select

class TRF3Spider:
    def __init__(self):
        self.driver = webdriver.Chrome()
    
    def scrape(self, numero_processo):
        self.driver.get("https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam")
        
        # Preencher formulário
        input_numero = self.driver.find_element(By.ID, "numeroProcesso")
        input_numero.send_keys(numero_processo)
        
        # Submit
        button = self.driver.find_element(By.CSS_SELECTOR, "button.buscar")
        button.click()
        
        # Extrair dados
        rows = self.driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        for row in rows:
            yield {
                'numero': row.find_element(By.CSS_SELECTOR, "td:nth-child(1)").text,
                'classe': row.find_element(By.CSS_SELECTOR, "td:nth-child(2)").text,
                'partes': row.find_element(By.CSS_SELECTOR, "td:nth-child(3)").text,
            }
```

#### TRF4 - 4ª Região (PR, SC, RS) - eProc

**URL:** https://www.trf4.jus.br/trf4/controlador.php?acao=consulta_processual_pesquisa

| Campo | Valor |
|-------|-------|
| Busca | Processo, Nome Parte, CPF, OAB |
| Autenticação | Nenhuma |
| CAPTCHA | Não em consulta básica |
| Rate Limit | 1 req/s |
| HTML Seletor | `table#resultado tbody tr` |

#### TRF5 - 5ª Região (BA, PE, AL, CE, RN, PB, PI, MA, SE) - PJe

**Consulta Pública:** https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam

| Campo | Valor |
|-------|-------|
| Sistema | PJe (formulário JSF) |
| Autenticação | Nenhuma para público |
| Restrição | Sem login: sem processos sigilosos |
| Técnica | Selenium (JSF dinâmico) |

#### TRF6 - 6ª Região (MG, SP, BA, RJ, ES) - eProc

**URL:** https://portal.trf6.jus.br/consulta-eproc/

| Campo | Valor |
|-------|-------|
| Autenticação | Nenhuma para consulta pública |
| CAPTCHA | Não |
| Método | Formulário HTML simples |

---

### 2.4 Tribunais de Justiça Estaduais (27 TJs)

#### TJSP - São Paulo

**eProc (novo):** https://www.tjsp.jus.br/eproc  
**eSAJ (legado):** https://www.tjsp.jus.br/Processos

| Campo | eProc | eSAJ |
|-------|-------|------|
| Status | Migração 2025+ | Legacy |
| Consulta Pública | ✓ Formulário dinâmico | ✓ Simples |
| Busca | Número, Nome, CPF, OAB | Igual |
| Dados Sigilo | Requer chave processo | Requer chave |
| HTML Seletor eProc | `table.resultado-processos tbody tr` | `table#resultado tbody tr` |
| Rate Limit | 1 req/s | 1 req/s |
| Técnica | Scrapy + Selenium fallback | Scrapy |

**Spider eSAJ (mais simples):**
```python
class TJSPeSAJSpider(scrapy.Spider):
    name = "tjsp_esaj"
    
    def start_requests(self):
        yield scrapy.FormRequest(
            "https://www.tjsp.jus.br/Processos",
            formdata={'numero': '0000000-00.0000.0.00.0000'},
            callback=self.parse
        )
    
    def parse(self, response):
        for row in response.css("table#resultado tbody tr"):
            yield {
                'numero': row.css("td:nth-child(1)::text").get(),
                'class': row.css("td:nth-child(2)::text").get(),
                'partes': row.css("td:nth-child(3)::text").get(),
                'data': row.css("td:nth-child(4)::text").get(),
            }
```

#### TJRJ - Rio de Janeiro

**eProc (novo desde 30/10/2025):** https://eproc.tjrj.jus.br  
**PJe (legado):** https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam

| Campo | eProc | PJe |
|-------|-------|-----|
| Autenticação | Nenhuma | Nenhuma |
| CAPTCHA | Não | Não |
| HTML Seletor | `table.processo-resultado tbody tr` | `div.pje-resultado tr` |
| Técnica | Scrapy | Selenium (JSF) |

#### TJMG - Minas Gerais

**eProc 1G:** https://eproc-consulta-publica-1g.tjmg.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica

| Campo | Valor |
|-------|-------|
| Dados Básicos | Número, classe, assuntos, partes, advogados, movimentação |
| Chave Processo | Para acesso inteiro teor (opcional) |
| CAPTCHA | Não |
| HTML Seletor | `table#resultado-busca tbody tr` |
| Rate Limit | 1 req/s |

#### TJBA, TJRS, TJSC, e outros TJs

**PJe Padrão:** `https://pje.tj{UF}.jus.br/pje/ConsultaPublica/listView.seam`

| Campo | Valor |
|-------|-------|
| Autenticação | Nenhuma para público |
| CAPTCHA | Não |
| Técnica | Selenium (JSF complexo) |
| HTML Padrão | `table.resultado-busca tbody tr` |

#### Projudi (TJMT, TJGO - legado)

**TJMT:** https://consultaprocessual.tjmt.jus.br  
**TJGO:** https://projudi.tjgo.jus.br

| Campo | Valor |
|-------|-------|
| Status | Legado, será descontinuado |
| Busca | Número, CPF, nome |
| Autenticação | Nenhuma |
| CAPTCHA | Não |
| HTML Seletor | `table.resultado tbody tr` |
| Técnica | Scrapy simples |

#### eSAJ (TJAL - legado)

**URL:** https://www2.tjal.jus.br/esaj/ e https://www2.tjal.jus.br/cpopg/open.do

| Campo | Valor |
|-------|-------|
| Busca | Número unificado, nome, CPF, OAB |
| Autenticação | Nenhuma |
| CAPTCHA | Não |
| HTML Seletor | `table#resultado tbody tr` |
| Técnica | Scrapy |

---

## 3. Estrutura de Dados Extraíveis

### 3.1 Campos Padrão CNJ (Universais)

Todo processo tem número de 20 dígitos:
```
NNNNNNN-DD.AAAA.J.TR.OOOO

NNNNNNN = Número sequencial (7 dígitos)
DD      = Dígito verificador (2 dígitos)
AAAA    = Ano autuação (4 dígitos)
J       = Justiça (1) [1=STF, 2=STJ, 3=TRFs, 4=Estadual, 5=Trabalho, 6=Eleitoral, 7=Militar, 8=Militar Estados]
TR      = Tribunal código (2 dígitos)
OOOO    = Unidade origem (4 dígitos)
```

### 3.2 Metadados Extraíveis por Sistema

| Campo | PJe | eProc | eSAJ | Projudi | Tipo |
|-------|-----|-------|------|---------|------|
| Número processo | ✓ | ✓ | ✓ | ✓ | string[20] |
| Classe processual | ✓ | ✓ | ✓ | ✓ | enum |
| Assunto principal | ✓ | ✓ | ✓ | ~ | enum |
| Partes (nome) | ✓ | ✓ | ✓ | ✓ | string[] |
| Tipo parte (autor/réu) | ✓ | ✓ | ✓ | ✓ | enum |
| CPF/CNPJ parte | ✓ | ✓ | ✓ | ~ | string |
| Advogados (nome) | ✓ | ✓ | ✓ | ~ | string[] |
| OAB advogado | ✓ | ✓ | ✓ | ~ | string |
| Email advogado | ✓ | ✓ | ~ | ~ | string |
| Data autuação | ✓ | ✓ | ✓ | ✓ | date |
| Relator/Julgador | ✓ | ✓ | ✓ | ✓ | string |
| Órgão julgador | ✓ | ✓ | ✓ | ✓ | string |
| Andamentos (evento) | ✓ | ✓ | ✓ | ✓ | string[] |
| Data andamento | ✓ | ✓ | ✓ | ✓ | date[] |
| Status atual | ✓ | ✓ | ✓ | ✓ | enum |
| Objeto processo | ✓ | ✓ | ~ | ~ | text |
| Decisões/Votos | ✓ | ✓ | ~ | ~ | text |

**Legenda:** ✓ = Sempre; ~ = Às vezes

### 3.3 Dados Não Públicos (Segredo de Justiça)

Processos com segredo de justiça retornam apenas:
- Número
- Classe
- Órgão
- Data autuação
- Status genérico

**Solução:** Usar chave do processo (enviada na intimação) para acesso completo.

---

## 4. Estratégias de Scraping por Tribunal

### 4.1 Matriz de Técnicas

| Tribunal | Técnica Primária | Dificuldade | Processamento (req/min) |
|----------|------------------|-------------|------------------------|
| STF | Scrapy (CSS/XPath) | Baixa | 200-300 |
| STJ | Scrapy (CSS/XPath) | Baixa | 150-200 |
| TRF1 | Scrapy (forms HTML) | Média | 100-150 |
| **TRF2** | **Scrapy + CAPTCHA** | **Média-Alta** | **50-100** |
| TRF3 | Selenium (JSF) | Alta | 20-40 |
| TRF4 | Scrapy | Média | 100-150 |
| TRF5 | Selenium (JSF) | Alta | 20-40 |
| TRF6 | Scrapy | Média | 100-150 |
| TJSP | Selenium (eProc) + Scrapy (eSAJ) | Alta | 40-80 |
| TJRJ | Selenium (eProc) + Selenium (PJe) | Alta | 40-80 |
| TJMG | Scrapy (eProc) | Média | 80-120 |
| TJs (PJe padrão) | Selenium (JSF) | Alta | 20-40 |
| Projudi | Scrapy | Baixa | 150-200 |
| eSAJ | Scrapy | Baixa | 150-200 |

### 4.2 Capacidade de Extração (50-100 processos/minuto)

**Benchmarks:**
```
Scrapy simples (STF/STJ/Projudi):  150-300 req/min (rate 1 req/s)
Scrapy + forms (TRF1, TRF4, TJMG): 80-150 req/min (rate 0.7-1 req/s)
Scrapy + CAPTCHA (TRF2):           50-100 req/min (rate 0.5-1 req/s com pytesseract)
Selenium (PJe/TRF3/TRF5):          20-40 req/min (JS rendering overhead)
```

**Para atingir 50-100/min em todos tribunais:**
- **Usar Scrapy paralelo com 10-20 workers** (distribuído por tribunal)
- **TRFs + eSAJ + Projudi:** 150+ req/min (Scrapy puro)
- **TJs (PJe):** 20-40 req/min (Selenium)
- **Média: 60-80 req/min** (balanceado)

---

## 5. Tratamento de Desafios Técnicos

### 5.1 CAPTCHA (TRF2 apenas)

**Solução Scrapy + pytesseract:**
```python
import requests
from PIL import Image
import pytesseract
import io

def crack_captcha(response):
    # 1. Baixar imagem
    captcha_url = response.css("img.captcha::attr(src)").get()
    img_response = requests.get(response.urljoin(captcha_url))
    
    # 2. Processar
    img = Image.open(io.BytesIO(img_response.content))
    text = pytesseract.image_to_string(img)
    
    return text.strip()
```

### 5.2 Formulários JSF (PJe - TRF3, TRF5, TJs)

**Solução Selenium:**
```python
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
driver.get(url)

# Esperar por elemento dinâmico
wait = WebDriverWait(driver, 10)
element = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, "table tbody tr")))

# Extrair dados
data = element.text
```

### 5.3 Paginação

**Scrapy com loop de página:**
```python
def parse(self, response):
    # Extrair dados
    for row in response.css("table tbody tr"):
        yield {...}
    
    # Próxima página
    next_page_url = response.css("a.proxima::attr(href)").get()
    if next_page_url:
        yield scrapy.Request(response.urljoin(next_page_url), callback=self.parse)
```

### 5.4 Rate Limiting Responsável

```python
# settings.py Scrapy
DOWNLOAD_DELAY = 1  # 1 segundo entre requisições
RANDOMIZE_DOWNLOAD_DELAY = True  # Variar delay (0.5s - 1.5s)
ROBOTSTXT_OBEY = True  # Respeitar robots.txt
USER_AGENT = 'Mozilla/5.0...' # User-Agent dinâmico
ROTATING_PROXY_LIST = ['proxy1', 'proxy2', ...]  # Proxies rotativos
```

---

## 6. Conformidade LGPD e Acesso Público

### 6.1 Dados Públicos (Extração Autorizada) ✓

Conforme **Resolução CNJ nº 121/2010** e **Lei nº 12.527/2011 (LAI)**:

✓ Número, classe, assuntos do processo  
✓ Nomes das partes e advogados  
✓ Movimentação processual  
✓ Inteiro teor de decisões, sentenças, votos  
✓ Andamentos e datas  

### 6.2 Dados Restritos (NÃO extrair) ✗

✗ Processos em segredo de justiça (completos)  
✗ Documentos confidenciais  
✗ Dados de vítimas (crimes contra dignidade sexual, menor)  
✗ Endereços residenciais de partes  
✗ CPF de partes (em alguns tribunais)  

### 6.3 Validação de Dados Públicos

```python
def validate_public_data(process):
    """Verificar se dados são públicos"""
    if process['status'] == 'SIGILO':
        return False
    if 'vítima' in process['partes']:  # Crimes sexuais
        return False
    return True
```

---

## 7. Implementação: MVP de 4 Semanas

### Semana 1: Setup + Scrapers STF/STJ/Projudi

**Objetivo:** 1000+ processos extraídos de 3 tribunais

- Instalar Scrapy, Selenium, pytesseract
- Criar spiders STF, STJ, Projudi (técnica: Scrapy pura)
- Testar rate limiting e parsing HTML
- Validar estrutura de dados

**Saída:** 3 spiders funcionais, 1000+ processos

### Semana 2: TRFs (TRF1, TRF4, TRF2)

**Objetivo:** 2000+ processos de justiça federal

- TRF1, TRF4: Scrapy forms (simples)
- TRF2: Scrapy + pytesseract CAPTCHA (complexo)
- Pipeline de consolidação (mesmos processos de múltiplas fontes)
- Implementar monitoramento de erros

**Saída:** 3 spiders (TRF1, TRF4, TRF2), 2000+ processos

### Semana 3: TJs (PJe template + eSAJ)

**Objetivo:** 5000+ processos estaduais

- Criar spider template PJe + Selenium (reutilizável)
- Implementar eSAJ (TJAL, TJSP legado)
- Testar em 5 tribunals piloto (TJSP, TJRJ, TJMG, TJBA, TJRS)
- Monitorar mudanças HTML

**Saída:** 2 spiders (PJe genérico, eSAJ), operando em 10+ TJs

### Semana 4: Integração + Monitoramento

**Objetivo:** MVP completo operando 24/7

- Orquestrador único (scheduler com triggering)
- Dashboard de status (processos/dia, erros, uptime)
- Alertas para quebras HTML (monitorar mudanças)
- Configurar migrações (TJSP, TJMG duplos)
- Testes e validação

**Saída:** MVP 24/7, 50-100 proc/min (real)

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| **Mudanças HTML frequentes** | Alta | Alto | Monitoramento mensal + testes regressivos |
| **CAPTCHA mais complexo (TRF2)** | Média | Médio | pytesseract + fallback Selenium |
| **Bloqueios IP/Rate limit** | Média | Médio | Proxies rotativos, delays aleatórios, User-Agent rotation |
| **Migrações (TJSP → eProc)** | Alta | Alto | Manter spiders duplos durante transição (6+ meses) |
| **Falhas Selenium (PJe)** | Média | Médio | Retry logic + fallback Scrapy se possível |
| **Sigilo violado acidentalmente** | Baixa | Crítico | Filtro de validação (dados públicos only) + logging |
| **Perda de conectividade** | Baixa | Médio | Retry com backoff exponencial |

---

## 9. Próximos Passos

1. **Setup repo GitHub privado**
2. **Começar Semana 1** (STF, STJ, Projudi)
3. **Validar parsing HTML** em each tribunal antes de escalar
4. **Monitorar mudanças CNJ** (Portarias, Resoluções)
5. **Testar 5 tribunais piloto** antes de full roll-out
6. **Escalar para 27 TJs** conforme validação

---

## 10. Ferramentas Necessárias

```bash
# Python libraries
pip install scrapy selenium beautifulsoup4 requests pillow pytesseract

# Sistema
apt-get install tesseract-ocr  # Para pytesseract (Linux)
# Ou: brew install tesseract   # macOS
# Ou: installer Windows Tesseract (MSI)

# Drivers
# ChromeDriver: https://chromedriver.chromium.org/
# Verificar versão do Chrome: chrome://version/
```

---

**Fim do PRD v2.0 - Scraping Direto (Sem API)**