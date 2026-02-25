import nodemailer from 'nodemailer';

// Lazy initialize transporter to avoid build errors
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    });
  }
  return transporter;
}

const FROM_EMAIL = process.env.ZOHO_EMAIL || 'engenharia@helsenia.com.br';
const FROM_NAME = process.env.FROM_NAME || 'LubIA - Helsen IA';

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail({ to, userName, resetLink }: SendPasswordResetEmailParams) {
  try {
    const info = await getTransporter().sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: 'Redefinição de Senha - LubIA',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinição de Senha</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #27272a;">
                        <h1 style="margin: 0; color: #f4f4f5; font-size: 24px; font-weight: 600;">
                          🔐 Redefinição de Senha
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                          Olá <strong style="color: #f4f4f5;">${userName}</strong>,
                        </p>
                        <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                          Recebemos uma solicitação para redefinir a senha da sua conta no LubIA.
                          Clique no botão abaixo para criar uma nova senha:
                        </p>

                        <!-- Button -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <a href="${resetLink}"
                                 style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                Redefinir Senha
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 30px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Este link expira em <strong style="color: #a1a1aa;">1 hora</strong>.
                        </p>
                        <p style="margin: 10px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Se você não solicitou a redefinição de senha, ignore este e-mail.
                          Sua senha permanecerá a mesma.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; border-top: 1px solid #27272a; text-align: center;">
                        <p style="margin: 0; color: #52525b; font-size: 12px;">
                          LubIA - Sistema de Gestão de Oficinas
                        </p>
                        <p style="margin: 5px 0 0; color: #52525b; font-size: 12px;">
                          Powered by Helsen IA
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log('[EMAIL] Enviado com sucesso:', info.messageId);
    return { success: true, id: info.messageId };
  } catch (error: any) {
    console.error('[EMAIL] Erro ao enviar:', error?.message);
    return { success: false, error: error?.message || 'Erro ao enviar email' };
  }
}
