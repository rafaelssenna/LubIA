const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '';
const ZOHO_ACCOUNT_ID = process.env.ZOHO_ACCOUNT_ID || '';
const ZOHO_EMAIL = process.env.ZOHO_EMAIL || 'engenharia@helsenia.com.br';

let cachedAccessToken = '';
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    grant_type: 'refresh_token',
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
  });

  const response = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?${params.toString()}`,
    { method: 'POST' }
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(`Zoho OAuth error: ${data.error}`);
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedAccessToken;
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const token = await getAccessToken();

  const response = await fetch(
    `https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: ZOHO_EMAIL,
        toAddress: options.to,
        subject: options.subject,
        content: options.html,
        mailFormat: 'html',
      }),
    }
  );

  const data = await response.json();
  return data.status?.code === 200;
}

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetCode: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetCode,
}: SendPasswordResetEmailParams) {
  try {
    const success = await sendEmail({
      to,
      subject: `Código de recuperação: ${resetCode}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #18181b; border-radius: 16px; border: 1px solid #27272a;">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 16px 16px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                          LoopIA
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #f4f4f5; font-size: 20px;">
                          Olá, ${userName}!
                        </h2>
                        <p style="margin: 0 0 30px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                          Use o código abaixo para redefinir sua senha:
                        </p>

                        <!-- Code -->
                        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #16a34a;">
                            ${resetCode}
                          </span>
                        </div>

                        <p style="margin: 24px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Este código expira em <strong style="color: #a1a1aa;">1 hora</strong>.
                        </p>
                        <p style="margin: 10px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Se você não solicitou a redefinição de senha, ignore este e-mail.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; border-top: 1px solid #27272a; text-align: center;">
                        <p style="margin: 0; color: #52525b; font-size: 12px;">
                          LoopIA - Sistema de Gestão de Oficinas
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

    if (success) {
      console.log('[EMAIL] Código enviado com sucesso para:', to);
      return { success: true, id: 'zoho-api' };
    } else {
      console.error('[EMAIL] Falha ao enviar para:', to);
      return { success: false, error: 'Falha ao enviar email via Zoho API' };
    }
  } catch (error: any) {
    console.error('[EMAIL] Erro ao enviar:', error?.message);
    return { success: false, error: error?.message || 'Erro ao enviar email' };
  }
}
