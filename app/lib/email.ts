import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { join } from "node:path";

export interface StudentAccessEmailParams {
  to: string;
  name: string;
  loginUrl: string;
}

export interface ResetPasswordEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

interface MailConfig {
  transporter: nodemailer.Transporter;
  from: string;
  replyTo?: string;
}

function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeHeaderValue(value: string): string {
  return value.replaceAll(/[\r\n]/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeName(name: string): string {
  const cleanName = sanitizeHeaderValue(name);
  return cleanName.length > 0 ? cleanName : "aluno";
}

function normalizeAbsoluteUrl(url: string): string {
  const sanitized = sanitizeHeaderValue(url);
  const parsedUrl = new URL(sanitized);

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("URL de e-mail inválida. Use apenas links http/https.");
  }

  return parsedUrl.toString();
}

function extractEmailAddress(address: string): string {
  const match = /<([^>]+)>/.exec(address);
  return normalizeEmailAddress(match ? match[1] : address);
}

function getEmailDomain(address: string): string | null {
  const email = extractEmailAddress(address);
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1 || atIndex === email.length - 1) {
    return null;
  }

  return email.slice(atIndex + 1);
}

function createTransport(): MailConfig {
  const host = process.env.RESEND_SMTP_HOST || process.env.SMTP_HOST;
  const portStr = process.env.RESEND_SMTP_PORT ?? process.env.SMTP_PORT;
  const port = portStr ? Number.parseInt(portStr, 10) : 465;
  const user = process.env.RESEND_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.RESEND_SMTP_PASS || process.env.SMTP_PASS;
  const from = process.env.RESEND_SMTP_FROM_EMAIL || process.env.SMTP_FROM;
  const replyToValue = process.env.RESEND_SMTP_REPLY_TO || process.env.SMTP_REPLY_TO;
  const expectedDomain = process.env.EMAIL_DELIVERY_DOMAIN?.trim().toLowerCase();

  if (!host || !user || !pass || !from) {
    throw new Error(
      "SMTP não configurado. Defina as variáveis: SMTP_HOST, SMTP_USER, SMTP_PASS e SMTP_FROM."
    );
  }

  const normalizedFrom = sanitizeHeaderValue(from);
  const normalizedReplyTo = replyToValue ? sanitizeHeaderValue(replyToValue) : undefined;

  if (expectedDomain) {
    const fromDomain = getEmailDomain(normalizedFrom);

    if (!fromDomain || fromDomain !== expectedDomain) {
      throw new Error(
        `SMTP_FROM deve usar o domínio autenticado (${expectedDomain}) para melhorar entregabilidade.`
      );
    }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: false,
  } as SMTPTransport.Options);

  return {
    transporter,
    from: normalizedFrom,
    replyTo: normalizedReplyTo,
  };
}

function buildTransactionalHeaders(): Record<string, string> {
  const unsubscribeMail =
    process.env.RESEND_LIST_UNSUBSCRIBE_EMAIL || process.env.SMTP_LIST_UNSUBSCRIBE_EMAIL;

  const headers: Record<string, string> = {
    "X-Auto-Response-Suppress": "OOF, AutoReply",
    "Auto-Submitted": "auto-generated",
  };

  if (unsubscribeMail) {
    const normalizedUnsubscribeMail = normalizeEmailAddress(unsubscribeMail);
    headers["List-Unsubscribe"] = `<mailto:${normalizedUnsubscribeMail}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  return headers;
}

const ACCOUNT_RECOVERY_LOGO_CID = "scudo-logo";
const ACCOUNT_RECOVERY_TITLE_CID = "scudo-title";

function buildResetPasswordInlineAssets() {
  return [
    {
      filename: "scudo-logo.png",
      path: join(process.cwd(), "app", "assets", "scudo-logo.png"),
      cid: ACCOUNT_RECOVERY_LOGO_CID,
    },
    {
      filename: "scudo-titulo.png",
      path: join(process.cwd(), "app", "assets", "scudo-titulo.png"),
      cid: ACCOUNT_RECOVERY_TITLE_CID,
    },
  ];
}

function buildStudentAccessEmailHtml(params: {
  name: string;
  email: string;
  loginUrl: string;
}): string {
  const firstName = normalizeName(params.name).split(" ")[0];
  const safeFirstName = escapeHtml(firstName);
  const safeEmail = escapeHtml(params.email);
  const safeLoginUrl = escapeHtml(params.loginUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seus dados de acesso - Scudo</title>
</head>
<body style="margin:0;padding:0;background-color:#070d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#070d12;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;">

          <!-- Logotipo -->
          <tr>
            <td style="padding-bottom:36px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="background-color:#10b981;border-radius:10px;padding:9px 10px;
                    box-shadow:0 4px 14px rgba(16,185,129,0.35);">
                    <span style="font-size:18px;line-height:1;">🛡️</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-weight:700;font-size:17px;color:#ffffff;letter-spacing:-0.02em;">
                      SCU<span style="color:#10b981;">DO</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:40px 36px;">

              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                Bem-vindo(a), ${safeFirstName}! 🎉
              </h1>
              <p style="margin:0 0 32px;font-size:14px;color:#94a3b8;line-height:1.7;">
                Sua conta no <strong style="color:#e2e8f0;">Scudo</strong> foi criada com sucesso.
                Para acessar a plataforma com segurança, redefina sua senha no primeiro acesso.
              </p>

              <!-- Credenciais -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#0a0f14;border:1px solid #1f2937;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1f2937;">
                    <p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#6b7280;
                      text-transform:uppercase;letter-spacing:0.08em;">E-mail</p>
                    <p style="margin:0;font-size:14px;color:#e2e8f0;word-break:break-all;">
                      ${safeEmail}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA -->
              <a href="${safeLoginUrl}"
                style="display:block;text-align:center;background-color:#10b981;color:#ffffff;
                  text-decoration:none;padding:14px 24px;border-radius:10px;font-size:14px;
                  font-weight:600;letter-spacing:0.01em;
                  box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                Redefinir senha e acessar →
              </a>

              <!-- Aviso de senha -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#052e1a;border:1px solid #064e2e;border-radius:10px;margin-top:24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#86efac;line-height:1.6;">
                      🔒 <strong>Segurança:</strong> use o link acima para definir sua senha de acesso.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider + footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#374151;">
                © ${year} Scudo. Todos os direitos reservados.
              </p>
              <p style="margin:0;font-size:11px;color:#1f2937;">
                Se você não solicitou este acesso, ignore este e-mail com segurança.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildStudentAccessEmailText(params: {
  name: string;
  email: string;
  loginUrl: string;
}): string {
  const firstName = normalizeName(params.name).split(" ")[0] || "aluno";

  return [
    `Olá, ${firstName}.`,
    "",
    "Sua conta no Scudo foi criada com sucesso.",
    "Defina sua senha com segurança no link abaixo:",
    "",
    `E-mail: ${params.email}`,
    `Definir senha e acessar: ${params.loginUrl}`,
    "",
    "Se você não solicitou este acesso, ignore este e-mail.",
  ].join("\n");
}

export async function sendStudentAccessEmail(
  params: StudentAccessEmailParams
): Promise<void> {
  const { transporter, from, replyTo } = createTransport();
  const normalizedRecipient = normalizeEmailAddress(params.to);
  const normalizedLoginUrl = normalizeAbsoluteUrl(params.loginUrl);

  const html = buildStudentAccessEmailHtml({
    name: params.name,
    email: normalizedRecipient,
    loginUrl: normalizedLoginUrl,
  });
  const text = buildStudentAccessEmailText({
    name: params.name,
    email: normalizedRecipient,
    loginUrl: normalizedLoginUrl,
  });

  await transporter.sendMail({
    from,
    to: normalizedRecipient,
    replyTo,
    subject: "Seus dados de acesso ao Scudo",
    html,
    text,
    headers: buildTransactionalHeaders(),
  });
}

function buildResetPasswordEmailHtml(params: {
  name: string;
  resetUrl: string;
}): string {
  const firstName = normalizeName(params.name).split(" ")[0] || "aluno";
  const safeFirstName = escapeHtml(firstName);
  const safeResetUrl = escapeHtml(params.resetUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de senha - Scudo</title>
</head>
<body style="margin:0;padding:0;background-color:#070d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070d12;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="cid:${ACCOUNT_RECOVERY_LOGO_CID}" alt="" width="56" height="56" style="display:block;width:56px;height:56px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <img src="cid:${ACCOUNT_RECOVERY_TITLE_CID}" alt="Scudo" width="200" height="50" style="display:block;width:200px;height:50px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:40px 36px;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                Redefinição de senha
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.7;">
                Olá, ${safeFirstName}. Recebemos uma solicitação para redefinir a senha da sua conta no Scudo.
              </p>

              <a href="${safeResetUrl}" style="display:block;text-align:center;background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                Redefinir minha senha
              </a>

              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Este link expira automaticamente em pouco tempo por segurança.
                Se você não solicitou esta redefinição, ignore este e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#374151;">© ${year} Scudo. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildResetPasswordEmailText(params: {
  name: string;
  resetUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] || "aluno";

  return [
    `Olá, ${firstName}.`,
    "",
    "Recebemos uma solicitação para redefinir sua senha no Scudo.",
    "",
    `Use este link para continuar: ${params.resetUrl}`,
    "",
    "Se você não solicitou esta redefinição, ignore este e-mail.",
  ].join("\n");
}

export async function sendResetPasswordEmail(params: ResetPasswordEmailParams): Promise<void> {
  const { transporter, from, replyTo } = createTransport();
  const normalizedRecipient = normalizeEmailAddress(params.to);
  const normalizedResetUrl = normalizeAbsoluteUrl(params.resetUrl);
  const inlineAssets = buildResetPasswordInlineAssets();

  const html = buildResetPasswordEmailHtml({
    name: params.name,
    resetUrl: normalizedResetUrl,
  });
  const text = buildResetPasswordEmailText({
    name: params.name,
    resetUrl: normalizedResetUrl,
  });

  await transporter.sendMail({
    from,
    to: normalizedRecipient,
    replyTo,
    subject: "Redefina sua senha no Scudo",
    html,
    text,
    headers: buildTransactionalHeaders(),
    attachments: inlineAssets,
  });
}
