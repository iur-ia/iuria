"""
TecJustiça MCP Client
Connects to the TecJustiça MCP server via HTTP to fetch process movements.
Uses the Model Context Protocol (MCP) tool call format.
"""
import os
import json
import sys
import requests
from typing import Optional, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base_scraper import ProcessoInfo, Movimentacao, ResultadoBusca

MCP_ENDPOINT = "https://tecjusticamcp-lite-production.up.railway.app/mcp"


def _get_token() -> Optional[str]:
    return os.environ.get("MCP_TECJUSTICA_TOKEN")


def _parse_movimentos(movimentos_raw) -> List[Movimentacao]:
    """Normalize MCP movement data into Movimentacao objects."""
    result = []
    if not movimentos_raw:
        return result

    if isinstance(movimentos_raw, str):
        try:
            movimentos_raw = json.loads(movimentos_raw)
        except Exception:
            return result

    if not isinstance(movimentos_raw, list):
        return result

    for mov in movimentos_raw[:50]:
        if not isinstance(mov, dict):
            continue

        data = (
            mov.get("data")
            or mov.get("dataHora", "")[:10]
            or mov.get("date", "")
            or ""
        )

        if data and len(data) == 10 and "-" in data:
            try:
                from datetime import datetime
                dt = datetime.strptime(data, "%Y-%m-%d")
                data = dt.strftime("%d/%m/%Y")
            except Exception:
                pass

        titulo = (
            mov.get("titulo")
            or mov.get("descricao")
            or mov.get("nome")
            or mov.get("title")
            or mov.get("description")
            or "Movimentação"
        )

        conteudo = (
            mov.get("conteudo")
            or mov.get("complemento")
            or mov.get("content")
            or mov.get("detalhes")
            or None
        )

        if data and titulo:
            result.append(Movimentacao(
                data=data,
                descricao=str(titulo),
                detalhes=str(conteudo) if conteudo else None,
            ))

    return result


def _call_mcp_tool(numero_processo: str, token: str) -> dict:
    """
    Send an MCP tool call to the TecJustiça server.
    Returns parsed JSON response or raises on error.
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "consultar_processo",
            "arguments": {
                "numero_processo": numero_processo,
            },
        },
    }

    response = requests.post(MCP_ENDPOINT, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()


def _extract_processo_from_mcp(mcp_response: dict, numero: str, tribunal: str) -> Optional[ProcessoInfo]:
    """
    Parse MCP JSON-RPC response into ProcessoInfo.
    Returns None if the response contains no meaningful process data,
    so the fallback chain can continue to the next source.
    """
    result = mcp_response.get("result", {})

    content_list = result.get("content", [])
    raw_text = None
    for item in content_list:
        if isinstance(item, dict) and item.get("type") == "text":
            raw_text = item.get("text", "")
            break

    if raw_text is None:
        raw_text = result.get("text") or ""

    data = {}
    if raw_text:
        try:
            data = json.loads(raw_text)
        except Exception:
            data = {}

    if not data and isinstance(result, dict):
        data = result

    movimentos_raw = (
        data.get("movimentos")
        or data.get("movimentacoes")
        or data.get("andamentos")
        or []
    )
    movimentacoes = _parse_movimentos(movimentos_raw)

    numero_retornado = data.get("numero") or data.get("numeroProcesso")
    classe_retornada = data.get("classe") or data.get("tipoProcesso")
    assunto_retornado = data.get("assunto") or data.get("assuntos")
    partes_retornadas = data.get("partes") or []

    has_meaningful_data = bool(
        movimentacoes
        or numero_retornado
        or classe_retornada
        or assunto_retornado
        or partes_retornadas
    )

    if not has_meaningful_data:
        return None

    processo = ProcessoInfo(
        numero=numero_retornado or numero,
        numero_unico=numero_retornado or numero,
        tribunal=data.get("tribunal") or tribunal,
        classe=classe_retornada,
        assunto=assunto_retornado,
        relator=data.get("relator") or None,
        origem=data.get("origem") or data.get("orgaoJulgador") or None,
        partes=partes_retornadas,
        url=data.get("url") or None,
    )
    processo.movimentacoes = movimentacoes

    return processo


def buscar_tecjustica(tribunal: str, numero_processo: str) -> ResultadoBusca:
    """
    Query TecJustiça MCP server for process movements.

    Args:
        tribunal: Tribunal code (e.g. TJSP)
        numero_processo: CNJ process number

    Returns:
        ResultadoBusca with normalized movements
    """
    resultado = ResultadoBusca(
        tribunal=tribunal,
        tipo_busca="numero",
        termo_busca=numero_processo,
    )

    token = _get_token()
    if not token:
        resultado.erro = "MCP_TECJUSTICA_TOKEN não configurado"
        return resultado

    try:
        mcp_response = _call_mcp_tool(numero_processo, token)

        if "error" in mcp_response:
            err = mcp_response["error"]
            resultado.erro = (
                err.get("message", str(err))
                if isinstance(err, dict)
                else str(err)
            )
            return resultado

        processo = _extract_processo_from_mcp(mcp_response, numero_processo, tribunal)
        if processo:
            resultado.processos.append(processo)

    except requests.exceptions.HTTPError as e:
        resultado.erro = f"Erro HTTP TecJustiça: {e.response.status_code}"
    except requests.exceptions.ConnectionError:
        resultado.erro = "Não foi possível conectar ao servidor TecJustiça MCP"
    except requests.exceptions.Timeout:
        resultado.erro = "Timeout na consulta ao TecJustiça MCP"
    except Exception as e:
        resultado.erro = f"Erro ao consultar TecJustiça MCP: {str(e)}"

    return resultado


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"erro": "Uso: python tecjustica_mcp.py <tribunal> <numero>"}))
        sys.exit(1)

    tribunal_arg = sys.argv[1].upper()
    numero_arg = sys.argv[2]
    resultado = buscar_tecjustica(tribunal_arg, numero_arg)
    print(json.dumps(resultado.to_dict(), ensure_ascii=False, indent=2))
