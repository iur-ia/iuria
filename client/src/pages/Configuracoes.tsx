import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Shield, CheckCircle, XCircle, AlertCircle, ExternalLink, Loader2,
  Key, Globe, RefreshCw, LogOut, Fingerprint, Wifi, WifiOff, Info,
  Scale, Bell, Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StatusPJe {
  autenticado: boolean;
  valido?: boolean;
  nome_titular?: string;
  cpf_titular?: string;
  expires_at?: number;
  mensagem?: string;
}

interface StatusCertificado {
  configurado: boolean;
  valido?: boolean;
  provedor?: string;
  nome_titular?: string;
  cpf_titular?: string;
  email_titular?: string;
  expires_at?: number;
  mensagem?: string;
}

interface Provedor {
  id: string;
  nome: string;
  descricao: string;
  website: string;
  instrucoes: string;
}

interface StatusScraperAPI {
  configurada: boolean;
  online?: boolean;
  requestCount?: number;
  requestLimit?: number;
  creditosRestantes?: number;
  percentualUsado?: number;
  mensagem?: string;
}

function formatarCPF(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarExpiry(expiresAt: number) {
  const d = new Date(expiresAt * 1000);
  return d.toLocaleString("pt-BR");
}

export default function Configuracoes() {
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const [provedorSelecionado, setProvedorSelecionado] = useState<string>("");
  const [cpfCertificado, setCpfCertificado] = useState<string>("");
  const [cpfPje, setCpfPje] = useState<string>("");
  const [oabNumero, setOabNumero] = useState<string>("");
  const [oabEstado, setOabEstado] = useState<string>("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [pendingCodeVerifier, setPendingCodeVerifier] = useState<string | null>(null);
  const [pendingProvedor, setPendingProvedor] = useState<string | null>(null);

  const { data: statusCert, refetch: refetchCert, isLoading: loadingCert } = useQuery<StatusCertificado>({
    queryKey: ["/api/certificado/status"],
    refetchInterval: 60000,
  });

  const { data: provedoresData, isLoading: loadingProvedores } = useQuery<{ provedores: Provedor[] }>({
    queryKey: ["/api/certificado/provedores"],
  });

  const { data: statusPje, refetch: refetchPje, isLoading: loadingPje } = useQuery<StatusPJe>({
    queryKey: ["/api/pje/status"],
    refetchInterval: 120000,
  });

  const { data: statusScraper, refetch: refetchScraper, isLoading: loadingScraper } = useQuery<StatusScraperAPI>({
    queryKey: ["/api/scraper-api/status"],
  });

  const iniciarAuthMutation = useMutation({
    mutationFn: async (data: { provedor: string; cpf?: string }) => {
      const res = await apiRequest("POST", "/api/certificado/iniciar-auth", {
        provedor: data.provedor,
        cpf: data.cpf || undefined,
        redirectUri: `${window.location.origin}/api/certificado/callback`,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url_autorizacao) {
        sessionStorage.setItem("cert_code_verifier", data.code_verifier);
        sessionStorage.setItem("cert_provedor", provedorSelecionado);
        window.open(data.url_autorizacao, "_blank", "width=600,height=700,noopener");
        toast({
          title: "Autorização aberta",
          description: `Aprove a solicitação no app ${provedorSelecionado}. Após aprovar, cole o código aqui.`,
        });
      } else {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível gerar URL de autorização",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar autenticação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const trocarTokenMutation = useMutation({
    mutationFn: async (data: { provedor: string; code: string; codeVerifier: string }) => {
      const res = await apiRequest("POST", "/api/certificado/trocar-token", {
        provedor: data.provedor,
        code: data.code,
        codeVerifier: data.codeVerifier,
        redirectUri: `${window.location.origin}/api/certificado/callback`,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.sucesso) {
        toast({
          title: "Certificado conectado!",
          description: `Bem-vindo, ${data.nome_titular || "advogado"}. Seu certificado está ativo.`,
        });
        setPendingCode(null);
        setPendingCodeVerifier(null);
        setPendingProvedor(null);
        sessionStorage.removeItem("cert_code_verifier");
        sessionStorage.removeItem("cert_provedor");
        refetchCert();
      } else {
        toast({
          title: "Falha na autenticação",
          description: data.error || "Não foi possível validar o código",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao validar código",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const desconectarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/certificado/desconectar", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Certificado desconectado", description: "Sessão do certificado encerrada." });
      refetchCert();
    },
  });

  // ---- PJe SSO mutations ----
  // O token é trocado server-side no /api/pje/callback — frontend só inicia o fluxo
  const iniciarAuthPjeMutation = useMutation({
    mutationFn: async (cpf?: string) => {
      const url = cpf
        ? `/api/pje/iniciar-auth?cpf=${encodeURIComponent(cpf)}`
        : "/api/pje/iniciar-auth";
      const res = await fetch(url);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url_autorizacao) {
        // Redirecionar na mesma aba — sessão do servidor é mantida
        // (popup noopener quebraria o cookie de sessão em alguns browsers)
        window.location.href = data.url_autorizacao;
      } else {
        toast({ title: "Erro", description: data.error || "Não foi possível gerar URL PJe", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Erro ao iniciar auth PJe", description: error.message, variant: "destructive" });
    },
  });

  const desconectarPjeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/pje/desconectar", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "PJe desconectado", description: "Sessão SSO PJe encerrada." });
      refetchPje();
    },
  });

  const sincronizarIntimacoesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pje/sincronizar-intimacoes", {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Intimações sincronizadas!", description: data.mensagem || "Monitoramento atualizado." });
    },
    onError: () => {
      toast({ title: "Erro ao sincronizar", description: "Verifique sua conexão PJe.", variant: "destructive" });
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const certCode = params.get("cert_code");
    const certError = params.get("cert_error");
    // PJe: token já foi trocado server-side no callback — frontend recebe apenas flag de resultado
    const pjeSucesso = params.get("pje_sucesso");
    const pjeNome = params.get("pje_nome");
    const pjeError = params.get("pje_error");

    if (certCode) {
      const savedVerifier = sessionStorage.getItem("cert_code_verifier");
      const savedProvedor = sessionStorage.getItem("cert_provedor");
      if (savedVerifier && savedProvedor) {
        setPendingCode(certCode);
        setPendingCodeVerifier(savedVerifier);
        setPendingProvedor(savedProvedor);
      }
      window.history.replaceState({}, "", "/configuracoes");
    }

    if (certError) {
      toast({
        title: "Erro na autenticação",
        description: decodeURIComponent(certError),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/configuracoes");
    }

    if (pjeSucesso === "1") {
      // Token já está na sessão do servidor — basta atualizar o status
      const nome = pjeNome ? decodeURIComponent(pjeNome) : "advogado";
      toast({
        title: "PJe Nacional conectado!",
        description: `Bem-vindo, ${nome}. Acesso SSO ativo em todos os tribunais PJe.`,
      });
      refetchPje();
      queryClient.invalidateQueries({ queryKey: ["/api/pje/status"] });
      window.history.replaceState({}, "", "/configuracoes");
    }

    if (pjeError) {
      toast({
        title: "Erro na autenticação PJe",
        description: decodeURIComponent(pjeError),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/configuracoes");
    }
  }, []);

  useEffect(() => {
    if (pendingCode && pendingCodeVerifier && pendingProvedor) {
      trocarTokenMutation.mutate({
        provedor: pendingProvedor,
        code: pendingCode,
        codeVerifier: pendingCodeVerifier,
      });
    }
  }, [pendingCode]);

  const provedorInfo = provedoresData?.provedores.find(p => p.id === provedorSelecionado);

  const estados = [
    "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
    "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Configure integrações e credenciais para acesso aos sistemas judiciais
        </p>
      </div>

      {/* === CERTIFICADO DIGITAL A3 === */}
      <Card data-testid="card-certificado-digital">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Certificado Digital A3 em Nuvem
          </CardTitle>
          <CardDescription>
            Conecte seu certificado ICP-Brasil A3 em nuvem para acessar processos sigilosos,
            intimações pessoais e o CNJ Painel do Advogado. Compatível com todos os provedores credenciados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status atual */}
          {loadingCert ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verificando status...</span>
            </div>
          ) : statusCert?.configurado ? (
            <div className={`flex items-start justify-between gap-4 p-4 rounded-md ${
              statusCert.valido
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-yellow-500/10 border border-yellow-500/20"
            }`} data-testid="status-certificado-conectado">
              <div className="flex items-start gap-3">
                {statusCert.valido ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {statusCert.valido ? "Certificado conectado" : "Token expirado"}
                  </p>
                  {statusCert.nome_titular && (
                    <p className="text-sm text-muted-foreground">
                      Titular: <span className="font-medium">{statusCert.nome_titular}</span>
                    </p>
                  )}
                  {statusCert.cpf_titular && (
                    <p className="text-sm text-muted-foreground">
                      CPF: {formatarCPF(statusCert.cpf_titular)}
                    </p>
                  )}
                  {statusCert.expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Expira em: {formatarExpiry(statusCert.expires_at)}
                    </p>
                  )}
                  {statusCert.provedor && (
                    <Badge variant="outline" className="text-xs">
                      {statusCert.provedor}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => desconectarMutation.mutate()}
                disabled={desconectarMutation.isPending}
                data-testid="button-desconectar-certificado"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md border" data-testid="status-certificado-desconectado">
              <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Nenhum certificado configurado</p>
                <p className="text-sm text-muted-foreground">
                  Conecte seu certificado A3 em nuvem para acessar dados completos dos processos
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Formulário de conexão */}
          {(!statusCert?.configurado || !statusCert?.valido) && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Conectar certificado</h3>

              <div className="space-y-2">
                <Label htmlFor="select-provedor">Provedor do certificado</Label>
                <Select
                  value={provedorSelecionado}
                  onValueChange={setProvedorSelecionado}
                >
                  <SelectTrigger id="select-provedor" data-testid="select-provedor-certificado">
                    <SelectValue placeholder="Selecione seu provedor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="certisign">Certisign</SelectItem>
                    <SelectItem value="birdid">BirdID (Soluti)</SelectItem>
                    <SelectItem value="vaultid">VaultID (Dinamo)</SelectItem>
                    <SelectItem value="safesign">SafeSign (Safeweb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {provedorInfo && (
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-md text-sm">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-300">{provedorInfo.nome}</p>
                      <p className="text-muted-foreground mt-0.5">{provedorInfo.instrucoes}</p>
                      <a
                        href={provedorInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {provedorInfo.website}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="input-cpf-cert">CPF do titular <span className="text-muted-foreground text-xs">(opcional — agiliza login no app)</span></Label>
                <Input
                  id="input-cpf-cert"
                  data-testid="input-cpf-certificado"
                  placeholder="000.000.000-00"
                  value={cpfCertificado}
                  onChange={(e) => setCpfCertificado(e.target.value)}
                  maxLength={14}
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  O processo usa OAuth2 com PKCE — seu certificado e senha nunca saem do seu dispositivo.
                  Você aprovará a autenticação diretamente no app do provedor.
                </p>
              </div>

              <Button
                onClick={() => iniciarAuthMutation.mutate({ provedor: provedorSelecionado, cpf: cpfCertificado })}
                disabled={!provedorSelecionado || iniciarAuthMutation.isPending || trocarTokenMutation.isPending}
                data-testid="button-conectar-certificado"
                className="w-full"
              >
                {iniciarAuthMutation.isPending || trocarTokenMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {trocarTokenMutation.isPending ? "Validando autorização..." : "Abrindo autorização..."}
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Conectar Certificado Digital
                  </>
                )}
              </Button>

              {iniciarAuthMutation.isSuccess && !trocarTokenMutation.isPending && !statusCert?.configurado && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                    Aguardando aprovação no app
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Uma aba foi aberta com a página de autorização. Após aprovar no app {provedorSelecionado},
                    a página de callback encerrará automaticamente e você será autenticado aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Como funciona */}
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Como funciona</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
              <li>Selecione o provedor do seu certificado A3 em nuvem</li>
              <li>Clique em "Conectar" — uma aba abrirá com a página de autorização</li>
              <li>Você receberá uma notificação push no app do provedor no seu celular</li>
              <li>Aprove no app — a autenticação é concluída automaticamente</li>
              <li>O sistema poderá acessar processos sigilosos e intimações em seu nome</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* === PJe SSO NACIONAL === */}
      <Card data-testid="card-pje-nacional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            PJe Nacional — SSO CNJ
          </CardTitle>
          <CardDescription>
            Autentique-se no sistema SSO do CNJ para acessar processos e intimações em todos
            os tribunais PJe do país. Usa seu certificado ICP-Brasil ou conta Gov.br.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Status atual */}
          {loadingPje ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verificando status PJe...</span>
            </div>
          ) : statusPje?.autenticado ? (
            <div className={`flex items-start justify-between gap-4 p-4 rounded-md ${
              statusPje.valido
                ? "bg-purple-500/10 border border-purple-500/20"
                : "bg-yellow-500/10 border border-yellow-500/20"
            }`} data-testid="status-pje-conectado">
              <div className="flex items-start gap-3">
                {statusPje.valido ? (
                  <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-medium text-sm">
                    {statusPje.valido ? "Conectado ao PJe Nacional" : "Sessão PJe expirada"}
                  </p>
                  {statusPje.nome_titular && (
                    <p className="text-sm text-muted-foreground">
                      Titular: <span className="font-medium">{statusPje.nome_titular}</span>
                    </p>
                  )}
                  {statusPje.cpf_titular && (
                    <p className="text-sm text-muted-foreground">
                      CPF: {formatarCPF(statusPje.cpf_titular)}
                    </p>
                  )}
                  {statusPje.expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Expira em: {formatarExpiry(statusPje.expires_at)}
                    </p>
                  )}
                  <Badge variant="outline" className="text-xs">SSO CNJ — jusbr</Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => desconectarPjeMutation.mutate()}
                disabled={desconectarPjeMutation.isPending}
                data-testid="button-desconectar-pje"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-md border" data-testid="status-pje-desconectado">
              <XCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Não conectado ao PJe Nacional</p>
                <p className="text-sm text-muted-foreground">
                  Conecte para acessar processos sigilosos e baixar intimações de todos os tribunais PJe
                </p>
              </div>
            </div>
          )}

          {/* Ações quando conectado */}
          {statusPje?.autenticado && statusPje?.valido && (
            <div className="space-y-3">
              <Separator />
              <h3 className="text-sm font-medium">Ações disponíveis</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sincronizarIntimacoesMutation.mutate()}
                  disabled={sincronizarIntimacoesMutation.isPending}
                  data-testid="button-sincronizar-intimacoes"
                >
                  {sincronizarIntimacoesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Intimações
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchPje()}
                  data-testid="button-atualizar-pje-status"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar status
                </Button>
              </div>
              {sincronizarIntimacoesMutation.isSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md text-sm text-green-700 dark:text-green-300" data-testid="resultado-sincronizacao">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {sincronizarIntimacoesMutation.data?.mensagem}
                </div>
              )}
            </div>
          )}

          {/* Formulário de conexão */}
          {(!statusPje?.autenticado || !statusPje?.valido) && (
            <div className="space-y-4">
              <Separator />
              <h3 className="text-sm font-medium">Conectar ao SSO PJe Nacional</h3>

              <div className="space-y-2">
                <Label htmlFor="input-cpf-pje">
                  CPF do advogado <span className="text-muted-foreground text-xs">(opcional — pré-preenche o login)</span>
                </Label>
                <Input
                  id="input-cpf-pje"
                  data-testid="input-cpf-pje"
                  placeholder="000.000.000-00"
                  value={cpfPje}
                  onChange={(e) => setCpfPje(e.target.value)}
                  maxLength={14}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  O SSO CNJ usa OAuth2 com PKCE — suas credenciais são validadas diretamente pelo Keycloak do CNJ.
                  Você pode autenticar com certificado ICP-Brasil, Gov.br, ou login direto PJe.
                </p>
              </div>

              <Button
                onClick={() => iniciarAuthPjeMutation.mutate(cpfPje || undefined)}
                disabled={iniciarAuthPjeMutation.isPending}
                data-testid="button-conectar-pje"
                className="w-full"
              >
                {iniciarAuthPjeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirecionando para SSO CNJ...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Conectar ao PJe Nacional
                  </>
                )}
              </Button>

              {iniciarAuthPjeMutation.isSuccess && !statusPje?.autenticado && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Redirecionando para o Portal SSO CNJ...
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Você será redirecionado para autenticar com certificado ICP-Brasil ou Gov.br.
                    Após confirmar, o sistema retorna aqui automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}

          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">O que o SSO PJe Nacional acessa</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Processos em segredo de justiça nos quais você é advogado constituído</li>
              <li>Intimações eletrônicas em todos os tribunais PJe do país</li>
              <li>Documentos sigilosos com acesso autorizado ao advogado</li>
              <li>Dados em tempo real via MNI (Modelo Nacional de Interoperabilidade)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* === CREDENCIAIS OAB (ALTERNATIVO) === */}
      <Card data-testid="card-credenciais-oab">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Credenciais OAB
            <Badge variant="outline" className="text-xs font-normal">Alternativo ao certificado</Badge>
          </CardTitle>
          <CardDescription>
            Alguns sistemas permitem login com número OAB e senha cadastrada no portal.
            Menos seguro que o certificado digital, mas pode funcionar para consultas básicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="input-oab-numero">Número OAB</Label>
              <Input
                id="input-oab-numero"
                data-testid="input-oab-numero"
                placeholder="123456"
                value={oabNumero}
                onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-oab-estado">Estado</Label>
              <Select value={oabEstado} onValueChange={setOabEstado}>
                <SelectTrigger id="select-oab-estado" data-testid="select-oab-estado">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Credenciais OAB são usadas para consultas em sistemas que aceitam esse tipo de login
              (ex: TJRJ consulta pública com filtro por advogado). O número é armazenado localmente apenas
              nesta sessão.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              if (oabNumero && oabEstado) {
                sessionStorage.setItem("oab_numero", oabNumero);
                sessionStorage.setItem("oab_estado", oabEstado);
                toast({ title: "OAB salvo", description: `OAB ${oabNumero}/${oabEstado} configurado na sessão.` });
              }
            }}
            disabled={!oabNumero || !oabEstado}
            data-testid="button-salvar-oab"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Salvar OAB na sessão
          </Button>
        </CardContent>
      </Card>

      {/* === SCRAPER API === */}
      <Card data-testid="card-scraper-api">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            ScraperAPI — Proxies Brasileiros
          </CardTitle>
          <CardDescription>
            A ScraperAPI fornece proxies residenciais brasileiros para acessar portais de tribunais
            que bloqueiam IPs de servidores de nuvem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingScraper ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verificando status...</span>
            </div>
          ) : statusScraper ? (
            <div className="space-y-3">
              <div className={`flex items-center gap-3 p-4 rounded-md border ${
                statusScraper.online
                  ? "bg-green-500/10 border-green-500/20"
                  : statusScraper.configurada
                    ? "bg-yellow-500/10 border-yellow-500/20"
                    : "bg-muted/50"
              }`} data-testid="status-scraper-api">
                {statusScraper.online ? (
                  <Wifi className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <WifiOff className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {statusScraper.online ? "ScraperAPI Online" : statusScraper.configurada ? "Offline / Erro de conexão" : "Não configurada"}
                  </p>
                  {statusScraper.mensagem && (
                    <p className="text-xs text-muted-foreground">{statusScraper.mensagem}</p>
                  )}
                </div>
                {statusScraper.configurada && (
                  <Badge variant="outline" className="text-xs">SCRAPER_API_KEY configurada</Badge>
                )}
              </div>

              {statusScraper.online && statusScraper.requestLimit && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Créditos usados</span>
                    <span className="font-medium">
                      {statusScraper.requestCount?.toLocaleString("pt-BR")} / {statusScraper.requestLimit?.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (statusScraper.percentualUsado || 0) > 80 ? "bg-destructive" :
                        (statusScraper.percentualUsado || 0) > 60 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${statusScraper.percentualUsado || 0}%` }}
                      data-testid="barra-creditos-scraper"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {statusScraper.creditosRestantes?.toLocaleString("pt-BR")} créditos restantes
                    ({statusScraper.percentualUsado}% usado)
                  </p>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchScraper()}
                data-testid="button-atualizar-scraper-status"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar status
              </Button>
            </div>
          ) : null}

          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              A chave de API está configurada como variável de ambiente segura (SCRAPER_API_KEY).
              Para alterar, acesse as configurações de Secrets do projeto.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* === COBERTURA DE TRIBUNAIS === */}
      <Card data-testid="card-cobertura-tribunais">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Cobertura por Tipo de Acesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-md bg-blue-500/5 border border-blue-500/20">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">Sem autenticação — DataJud CNJ</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  100% dos tribunais. Dados públicos com possível atraso de 1-2 dias.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md bg-green-500/5 border border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Com ScraperAPI — Tempo real</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  STF, STJ, TRF2, TJRJ, TJSP e outros portais públicos com IP brasileiro.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md bg-purple-500/5 border border-purple-500/20">
              <Fingerprint className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-purple-700 dark:text-purple-300">Com Certificado A3 — Acesso completo</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Processos sigilosos, intimações pessoais, PJe autenticado, CNJ Painel do Advogado.
                  Requer certificado digital ICP-Brasil A3 em nuvem.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
