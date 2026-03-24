#!/usr/bin/env bash
# Comprehensive API Test Suite - iuria LexFutura
# Tests all endpoints including new MCP Techjustica integration
set -e

BASE="http://localhost:5000"
PASS=0
FAIL=0
ERRORS=""

test_endpoint() {
  local method="$1"
  local path="$2"
  local body="$3"
  local expected_status="$4"
  local description="$5"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -o /tmp/test_body -w "%{http_code}" "$BASE$path" 2>/dev/null)
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -o /tmp/test_body -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$body" "$BASE$path" 2>/dev/null)
  elif [ "$method" = "PATCH" ]; then
    response=$(curl -s -o /tmp/test_body -w "%{http_code}" -X PATCH -H "Content-Type: application/json" -d "$body" "$BASE$path" 2>/dev/null)
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -o /tmp/test_body -w "%{http_code}" -X DELETE "$BASE$path" 2>/dev/null)
  fi
  
  body_content=$(cat /tmp/test_body 2>/dev/null || echo "")
  
  if [ "$response" = "$expected_status" ]; then
    echo "  PASS [$method $path] $description (HTTP $response)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL [$method $path] $description (Expected $expected_status, Got $response)"
    ERRORS="$ERRORS\n  - $method $path: expected $expected_status got $response"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo "  iuria LexFutura - Full API Test Suite"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# Auth
echo "=== AUTHENTICATION ==="
test_endpoint "GET" "/api/auth/me" "" "200" "Get current user"
test_endpoint "POST" "/api/auth/login" '{"username":"admin","password":"admin123"}' "200" "Login with valid credentials"
test_endpoint "POST" "/api/auth/login" '{"username":"bad","password":"bad"}' "401" "Login with invalid credentials"
test_endpoint "POST" "/api/auth/logout" '{}' "200" "Logout"

# Dashboard
echo ""
echo "=== DASHBOARD ==="
test_endpoint "GET" "/api/dashboard" "" "200" "Get dashboard stats"

# Clientes
echo ""
echo "=== CLIENTES ==="
test_endpoint "GET" "/api/clientes" "" "200" "List clientes"
test_endpoint "POST" "/api/clientes" '{"nome":"Test Cliente MCP","email":"test@mcp.com","tipo":"Pessoa Fisica"}' "201" "Create cliente"

# Equipe
echo ""
echo "=== EQUIPE ==="
test_endpoint "GET" "/api/equipe" "" "200" "List equipe"

# Processos
echo ""
echo "=== PROCESSOS ==="
test_endpoint "GET" "/api/processos" "" "200" "List processos"
test_endpoint "POST" "/api/processos" '{"numero":"0000001-00.2026.8.19.0001","titulo":"Teste MCP Integration","status":"Ativo","tribunal":"TJRJ","tipo":"Civel","clienteId":"test"}' "201" "Create processo"

# Atividades
echo ""
echo "=== ATIVIDADES ==="
test_endpoint "GET" "/api/atividades" "" "200" "List atividades"

# Documentos
echo ""
echo "=== DOCUMENTOS ==="
test_endpoint "GET" "/api/documentos" "" "200" "List documentos"

# Contas
echo ""
echo "=== FINANCEIRO ==="
test_endpoint "GET" "/api/contas-receber" "" "200" "List contas a receber"
test_endpoint "GET" "/api/contas-pagar" "" "200" "List contas a pagar"
test_endpoint "GET" "/api/honorarios" "" "200" "List honorarios"
test_endpoint "GET" "/api/relatorios/financeiro" "" "200" "Financial report"

# Templates
echo ""
echo "=== TEMPLATES ==="
test_endpoint "GET" "/api/templates" "" "200" "List templates"

# Tribunais
echo ""
echo "=== TRIBUNAIS ==="
test_endpoint "GET" "/api/tribunais" "" "200" "List tribunais (DB)"
test_endpoint "GET" "/api/tribunais/mapeamento" "" "200" "Tribunal mapping summary"
test_endpoint "GET" "/api/tribunais/mapeamento/STF" "" "200" "STF tribunal details"
test_endpoint "GET" "/api/tribunais/mapeamento/TJSP" "" "200" "TJSP tribunal details"
test_endpoint "GET" "/api/tribunais/mapeamento/TRF1" "" "200" "TRF1 tribunal details"

# Prazos
echo ""
echo "=== PRAZOS ==="
test_endpoint "GET" "/api/prazos" "" "200" "List prazos"
test_endpoint "GET" "/api/prazos/vencendo" "" "200" "Prazos vencendo"

# Alertas
echo ""
echo "=== ALERTAS ==="
test_endpoint "GET" "/api/alertas" "" "200" "List alertas"
test_endpoint "GET" "/api/alertas/nao-lidos" "" "200" "Alertas nao lidos"

# Monitoramento
echo ""
echo "=== MONITORAMENTO ==="
test_endpoint "GET" "/api/monitoramentos" "" "200" "List monitoramentos"
test_endpoint "GET" "/api/monitoramento/metricas" "" "200" "Monitoring metrics"
test_endpoint "GET" "/api/monitoramentos/contador/novos" "" "200" "New movements counter"
MONITOR_BODY='{"numeroProcesso":"0000001-00.2026.8.19.0001.test","tribunal":"TJRJ","frequenciaMinutos":60}'
test_endpoint "POST" "/api/monitoramentos" "$MONITOR_BODY" "200" "Create monitoring"

# Certificados
echo ""
echo "=== CERTIFICADOS ==="
test_endpoint "GET" "/api/certificados" "" "200" "List certificados"
test_endpoint "POST" "/api/certificados" '{"nome":"Test Cert","tipo":"A1","titular":"Test User","validoAte":"2027-01-01"}' "201" "Create certificado"

# Pecas
echo ""
echo "=== PECAS PROCESSUAIS ==="
test_endpoint "GET" "/api/pecas" "" "200" "List pecas"

# Publicacoes DJe
echo ""
echo "=== PUBLICACOES DJE ==="
test_endpoint "GET" "/api/publicacoes-dje" "" "200" "List publicacoes"

# MNI
echo ""
echo "=== MNI (SOAP) ==="
test_endpoint "GET" "/api/mni/status" "" "200" "MNI status"

# Scraper Advanced
echo ""
echo "=== SCRAPER ADVANCED ==="
test_endpoint "GET" "/api/scraper/capabilities" "" "200" "Scraper capabilities"
test_endpoint "GET" "/api/scraper/implementation-plan" "" "200" "Implementation plan"
test_endpoint "GET" "/api/scraper/healthcheck" "" "200" "Healthcheck"
test_endpoint "GET" "/api/scraper/resilient-metrics" "" "200" "Resilient metrics"
test_endpoint "POST" "/api/scraper/parse-andamento" '{"texto":"Sentenca proferida em audiencia"}' "200" "Parse andamento NLP"

# MCP Techjustica (NEW)
echo ""
echo "=== MCP TECHJUSTICA ==="
test_endpoint "GET" "/api/mcp/config" "" "200" "MCP configuration"
test_endpoint "GET" "/api/mcp/status" "" "200" "MCP server status"
test_endpoint "GET" "/api/mcp/tribunais" "" "200" "MCP supported courts"
test_endpoint "GET" "/api/mcp/metrics" "" "200" "MCP client metrics"
test_endpoint "POST" "/api/mcp/consultar" '{"tribunal":"STF","numeroProcesso":"ADI 1"}' "200" "MCP consult STF"
test_endpoint "POST" "/api/mcp/movimentacoes" '{"tribunal":"TJSP","numeroProcesso":"0000001-00.2024.8.26.0100"}' "200" "MCP movements"
test_endpoint "POST" "/api/mcp/buscar-parte" '{"tribunal":"STF","nomeParte":"Uniao Federal"}' "200" "MCP search by party"
test_endpoint "POST" "/api/mcp/buscar-oab" '{"numeroOAB":"12345","estadoOAB":"SP"}' "200" "MCP search by OAB"

# Consulta Processual (with MCP fallback)
echo ""
echo "=== CONSULTA PROCESSUAL ==="
test_endpoint "GET" "/api/consultas-processuais" "" "200" "Consultation history"
test_endpoint "POST" "/api/consulta-processual" '{"tribunal":"STF","tipoBusca":"numero","termoBusca":"ADI 1"}' "200" "Process consultation with MCP+scraper"

# Feriados
echo ""
echo "=== FERIADOS ==="
test_endpoint "GET" "/api/feriados" "" "200" "List feriados"
test_endpoint "GET" "/api/feriados/lista?ano=2026&estado=RJ" "" "200" "Feriados 2026 RJ"

# Cleanup test monitoramento
echo ""
echo "=== CLEANUP ==="
MONITOR_ID=$(curl -s "$BASE/api/monitoramentos" | python3 -c "import json,sys; data=json.load(sys.stdin); [print(m['id']) for m in data if '0000001-00.2026.8.19.0001.test' in m.get('numeroProcesso','')]" 2>/dev/null | head -1)
if [ -n "$MONITOR_ID" ]; then
  test_endpoint "DELETE" "/api/monitoramentos/$MONITOR_ID" "" "200" "Delete test monitoramento"
fi

echo ""
echo "============================================"
echo "  RESULTS"
echo "============================================"
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
echo "  TOTAL:  $((PASS + FAIL))"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "  FAILURES:"
  echo -e "$ERRORS"
  echo ""
fi

echo "  API Health: $([ $FAIL -eq 0 ] && echo 'ALL PASS' || echo 'ISSUES DETECTED')"
echo "============================================"

# Output JSON summary
echo ""
echo "JSON_SUMMARY:"
echo "{\"passed\":$PASS,\"failed\":$FAIL,\"total\":$((PASS+FAIL)),\"health\":\"$([ $FAIL -eq 0 ] && echo 'healthy' || echo 'degraded')\"}"
