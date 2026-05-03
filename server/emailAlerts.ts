import { storage } from "./storage";

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const config = getEmailConfig();
  if (!config) {
    console.log(`[email-alerts] SMTP não configurado. Email simulado para ${params.to}: ${params.subject}`);
    return true;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });

    await transporter.sendMail({
      from: config.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return true;
  } catch (err) {
    console.error("[email-alerts] Erro ao enviar email:", err);
    return false;
  }
}

function gerarHtmlAlerta(params: {
  titulo: string;
  data: string;
  risco: string;
  processo?: string | null;
  fundamentoLegal?: string | null;
  horasRestantes: number;
}): string {
  const riscoColor = {
    CRITICO: "#dc2626",
    ALTO: "#ea580c",
    MEDIO: "#ca8a04",
    BAIXO: "#16a34a",
  }[params.risco] || "#6b7280";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${riscoColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Alerta de Prazo — ${params.risco}</h2>
        <p style="margin: 4px 0 0;">Vencimento em ${params.horasRestantes}h</p>
      </div>
      <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h3 style="color: #111827; margin-top: 0;">${params.titulo}</h3>
        ${params.processo ? `<p style="color: #6b7280;"><strong>Processo:</strong> ${params.processo}</p>` : ""}
        <p style="color: #6b7280;"><strong>Prazo:</strong> ${new Date(params.data + "T12:00:00").toLocaleDateString("pt-BR")}</p>
        ${params.fundamentoLegal ? `<p style="color: #6b7280;"><strong>Fundamento:</strong> ${params.fundamentoLegal}</p>` : ""}
        <div style="margin-top: 16px; padding: 12px; background: ${riscoColor}20; border-radius: 4px; border-left: 4px solid ${riscoColor};">
          <strong style="color: ${riscoColor};">Este prazo vence em ${params.horasRestantes} horas!</strong>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">iuria — Sistema de Gestão Jurídica</p>
      </div>
    </div>
  `;
}

export async function verificarEEnviarAlertas(): Promise<void> {
  try {
    const agora = new Date();
    const tarefasCriticas = await storage.getAtividadesPrazosCriticos(72);

    for (const tarefa of tarefasCriticas) {
      // Skip already concluded tasks
      if (!tarefa.risco || !tarefa.data || tarefa.status === "Concluído") continue;

      const vencimento = new Date(tarefa.data + "T23:59:59");
      const diffMs = vencimento.getTime() - agora.getTime();
      const diffHoras = diffMs / (1000 * 60 * 60);

      if (diffHoras < 0) continue;

      const alerta48h = diffHoras <= 48 && diffHoras > 24;
      const alerta24h = diffHoras <= 24;

      if (!alerta48h && !alerta24h) continue;

      const tipoAlerta = alerta24h ? "24h" : "48h";
      const horasRestantes = alerta24h ? 24 : 48;

      const jaEnviado = await storage.getDeadlineAlert(tarefa.id, tipoAlerta);
      if (jaEnviado) continue;

      let emailResponsavel: string | undefined;
      if (tarefa.responsavelId) {
        const responsavel = await storage.getMembro(tarefa.responsavelId);
        emailResponsavel = responsavel?.email;
      }

      let enviado = false;
      if (emailResponsavel) {
        let processoNumero: string | null = null;
        if (tarefa.processoId) {
          const processo = await storage.getProcesso(tarefa.processoId);
          processoNumero = processo?.numero || null;
        }

        const html = gerarHtmlAlerta({
          titulo: tarefa.titulo,
          data: tarefa.data,
          risco: tarefa.risco,
          processo: processoNumero,
          fundamentoLegal: tarefa.fundamentoLegal,
          horasRestantes,
        });

        enviado = await enviarEmail({
          to: emailResponsavel,
          subject: `[iuria] Prazo ${tarefa.risco} vence em ${horasRestantes}h — ${tarefa.titulo}`,
          html,
        });
      } else {
        // No recipient — log and record so we don't retry indefinitely
        console.log(`[email-alerts] Sem e-mail para tarefa ${tarefa.id} — alerta ${tipoAlerta} registrado sem envio`);
        enviado = true;
      }

      // Only persist the alert record when send succeeded (or was intentionally skipped)
      if (enviado) {
        await storage.createDeadlineAlert({ atividadeId: tarefa.id, tipoAlerta });
      }
    }
  } catch (err) {
    console.error("[email-alerts] Erro na verificação de alertas:", err);
  }
}

export function iniciarJobAlertas(): void {
  const INTERVALO_MS = 30 * 60 * 1000;
  verificarEEnviarAlertas();
  setInterval(verificarEEnviarAlertas, INTERVALO_MS);
  console.log("[email-alerts] Job de alertas iniciado (intervalo: 30min)");
}
