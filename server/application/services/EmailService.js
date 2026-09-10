import { BrevoClient } from '@getbrevo/brevo';
import dotenv from 'dotenv';
import { getAppUrl } from '../../../shared/config/appConfig.js';
import { createT } from '../../../shared/i18n/index.js';
dotenv.config({ path: './server/.env' });

const t = createT('en');

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderName = process.env.BREVO_SENDER_NAME || 'Timeboard';
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'invitation@timeboard.pt';
    this.appUrl = getAppUrl();
    
    if (this.apiKey) {
      this.client = new BrevoClient({ apiKey: this.apiKey });
    } else {
      console.warn('[EmailService] BREVO_API_KEY is not defined. Emails will only be logged.');
    }
  }

  getClient() {
    if (!this.client && process.env.BREVO_API_KEY) {
      this.apiKey = process.env.BREVO_API_KEY;
      this.client = new BrevoClient({ apiKey: this.apiKey });
    }
    return this.client;
  }

  /**
   * Send Timeboard Invitation Email
   */
  async sendTimeboardInvitation({ toEmail, toName, timeboardName, timeboardId, inviterName, role, acceptUrl }) {
    const client = this.getClient();
    const finalAcceptUrl = acceptUrl || `${this.appUrl}/?inviteTimeboardId=${encodeURIComponent(timeboardId)}&email=${encodeURIComponent(toEmail)}`;

    const roleLabel = role === 'admin' ? t('backend.email.roleAdmin') : t('backend.email.roleContributor');
    const cleanInviterName = inviterName || t('backend.email.defaultInviter');
    const cleanTbName = timeboardName || t('backend.email.timeboardLabel');

    const subject = t('backend.email.invitationSubject', { name: cleanTbName });
    const textContent = t('backend.email.invitationTextGreeting', { name: toName || '' }) + '\n\n' +
      t('backend.email.invitationTextBody', {
        inviter: cleanInviterName,
        name: cleanTbName,
        role: roleLabel,
        url: finalAcceptUrl
      });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #111827; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
                
                <!-- Header Brand -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%);">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                      <span style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">timeboard</span>
                      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #6366f1; margin-top: 4px;"></span>
                    </div>
                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; font-weight: 500;">${t('backend.email.brandSubtitle')}</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
                      ${t('backend.email.greeting', { name: toName ? toName : '' })}
                    </h1>
                    
                    <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                      <strong style="color: #ffffff;">${cleanInviterName}</strong> ${t('backend.email.invitationHtmlBody')} <strong style="color: #818cf8;">"${cleanTbName}"</strong>.
                    </p>

                    <!-- Details Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <div style="color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">${t('backend.email.timeboardLabel')}</div>
                          <div style="color: #ffffff; font-size: 16px; font-weight: 700;">${cleanTbName}</div>
                          
                          <div style="margin-top: 12px; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">${t('backend.email.accessPermissionLabel')}</div>
                          <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #c7d2fe; font-size: 13px; font-weight: 600;">
                            ${roleLabel}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Action Button -->
                    <div style="text-align: center; margin-bottom: 28px;">
                      <a href="${finalAcceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); text-align: center;">
                        ${t('backend.email.acceptButton')}
                      </a>
                    </div>

                    <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                      ${t('backend.email.fallbackInstruction')}<br>
                      <a href="${finalAcceptUrl}" style="color: #818cf8; word-break: break-all; text-decoration: underline;">${finalAcceptUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #0d131f; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} Timeboard. ${t('backend.email.copyright')}
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (!client) {
      console.log(`[EmailService] Simulated Invitation Email to ${toEmail}:\nURL: ${finalAcceptUrl}`);
      return { success: true, simulated: true, url: finalAcceptUrl };
    }

    try {
      const response = await client.transactionalEmails.sendTransacEmail({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: toEmail, name: toName || toEmail.split('@')[0] }],
        subject: subject,
        textContent: textContent,
        htmlContent: htmlContent
      });

      console.log(`[EmailService] Invitation email sent to ${toEmail}. Message ID:`, response?.messageId);
      return { success: true, messageId: response?.messageId, url: finalAcceptUrl };
    } catch (err) {
      console.error('[EmailService] Failed to send invitation email:', err?.response?.body || err.message);
      throw new Error(t('backend.email.emailSendError', { error: err.message }));
    }
  }
}

export const emailService = new EmailService();
