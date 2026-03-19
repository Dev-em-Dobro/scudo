import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export interface StudentAccessEmailParams {
    to: string;
    name: string;
    password: string;
    loginUrl: string;
}

export interface ResetPasswordEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

function createTransport() {
    const host = process.env.RESEND_SMTP_HOST || process.env.SMTP_HOST;
    const portStr = process.env.RESEND_SMTP_PORT ?? process.env.SMTP_PORT;
    const port = portStr ? Number.parseInt(portStr, 10) : 465;
    const user = process.env.RESEND_SMTP_USER || process.env.SMTP_USER;
    const pass = process.env.RESEND_SMTP_PASS || process.env.SMTP_PASS;
    const from = process.env.RESEND_SMTP_FROM_EMAIL || process.env.SMTP_FROM;

    if (!host || !user || !pass) {
        throw new Error(
            "SMTP não configurado. Defina as variáveis: SMTP_HOST, SMTP_USER e SMTP_PASS."
        );
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: false,
    } as SMTPTransport.Options);

    return { transporter, from };
}

function buildStudentAccessEmailHtml(params: {
    name: string;
    email: string;
    password: string;
    loginUrl: string;
}): string {
    const firstName = params.name.split(" ")[0];
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seus dados de acesso - CareerQuest</title>
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
                    <span style="font-size:18px;line-height:1;">🚀</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-weight:700;font-size:17px;color:#ffffff;letter-spacing:-0.02em;">
                      CAREER<span style="color:#10b981;">QUEST</span>
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
                Bem-vindo(a), ${firstName}! 🎉
              </h1>
              <p style="margin:0 0 32px;font-size:14px;color:#94a3b8;line-height:1.7;">
                Sua conta no <strong style="color:#e2e8f0;">CareerQuest</strong> foi criada com sucesso.
                Abaixo estão suas credenciais de acesso à plataforma.
              </p>

              <!-- Credenciais -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#0a0f14;border:1px solid #1f2937;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1f2937;">
                    <p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#6b7280;
                      text-transform:uppercase;letter-spacing:0.08em;">E-mail</p>
                    <p style="margin:0;font-size:14px;color:#e2e8f0;word-break:break-all;">
                      ${params.email}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 5px;font-size:10px;font-weight:700;color:#6b7280;
                      text-transform:uppercase;letter-spacing:0.08em;">Senha temporária</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#10b981;
                      letter-spacing:0.1em;font-family:'Courier New',Courier,monospace;">
                      ${params.password}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA -->
              <a href="${params.loginUrl}"
                style="display:block;text-align:center;background-color:#10b981;color:#ffffff;
                  text-decoration:none;padding:14px 24px;border-radius:10px;font-size:14px;
                  font-weight:600;letter-spacing:0.01em;
                  box-shadow:0 4px 14px rgba(16,185,129,0.3);">
                Acessar a plataforma →
              </a>

              <!-- Aviso de senha -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background-color:#052e1a;border:1px solid #064e2e;border-radius:10px;margin-top:24px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#86efac;line-height:1.6;">
                      🔑 <strong>Recomendamos</strong> que você altere sua senha
                      após o primeiro acesso para garantir a segurança da sua conta.
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
                © ${year} CareerQuest. Todos os direitos reservados.
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

export async function sendStudentAccessEmail(
    params: StudentAccessEmailParams
): Promise<void> {
    const { transporter, from } = createTransport();

    const html = buildStudentAccessEmailHtml({
        name: params.name,
        email: params.to,
        password: params.password,
        loginUrl: params.loginUrl,
    });

    await transporter.sendMail({
        from,
        to: params.to,
        subject: "Seus dados de acesso ao CareerQuest",
        html,
    });
}

function buildResetPasswordEmailHtml(params: {
    name: string;
    resetUrl: string;
}): string {
    const firstName = params.name.split(" ")[0] || "aluno";
    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de senha - CareerQuest</title>
</head>
<body style="margin:0;padding:0;background-color:#070d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070d12;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;">
          <tr>
            <td style="background-color:#111827;border:1px solid #1f2937;border-radius:16px;padding:40px 36px;">
              <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                Redefinição de senha
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.7;">
                Olá, ${firstName}. Recebemos uma solicitação para redefinir a senha da sua conta no CareerQuest.
              </p>

              <a href="${params.resetUrl}" style="display:block;text-align:center;background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.01em;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
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
              <p style="margin:0;font-size:12px;color:#374151;">© ${year} CareerQuest. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendResetPasswordEmail(params: ResetPasswordEmailParams): Promise<void> {
    const { transporter, from } = createTransport();

    const html = buildResetPasswordEmailHtml({
        name: params.name,
        resetUrl: params.resetUrl,
    });

    await transporter.sendMail({
        from,
        to: params.to,
        subject: "Redefina sua senha no CareerQuest",
        html,
    });
}
