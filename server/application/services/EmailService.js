import { BrevoClient } from '@getbrevo/brevo';
import { BRAND, EMAIL_SENDERS, LEGAL_ENTITY } from '../../../shared/config/businessConfig.js';
import { EmailTheme } from '../../../shared/config/emailTheme.js';
import dotenv from 'dotenv';
import { getAppUrl } from '../../../shared/config/appConfig.js';
import { PersonRole } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';
dotenv.config({ path: './server/.env' });

const t = createT('en');

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderName = process.env.BREVO_SENDER_NAME || 'Timeboard';
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || EMAIL_SENDERS.invitation;
    this.noticeSenderEmail = process.env.BREVO_NOTICE_SENDER_EMAIL || EMAIL_SENDERS.notice;
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
  async sendTimeboardInvitation({ toEmail, toName, timeboardName, timeboardId, inviterName, role, acceptUrl, inviteCode = '', isCondominium = false }) {
    const client = this.getClient();
    // Condominiums are the CondoFlow product (a Timeboard product); other timeboards keep the platform brand
    const brandName = isCondominium ? BRAND.product : BRAND.platform;
    const brandSubtitle = isCondominium
      ? t('backend.email.condoBrandSubtitle', { platform: BRAND.platform })
      : t('backend.email.brandSubtitle');
    const finalAcceptUrl = acceptUrl || `${this.appUrl}/?inviteTimeboardId=${encodeURIComponent(timeboardId)}&email=${encodeURIComponent(toEmail)}`;

    const roleLabel = role === PersonRole.ADMIN
      ? t('backend.email.roleAdmin')
      : role === PersonRole.INDIVIDUAL
      ? t('backend.email.roleIndividual')
      : t('backend.email.roleContributor');
    const cleanInviterName = inviterName || t('backend.email.defaultInviter');
    const cleanTbName = timeboardName || t('backend.email.timeboardLabel');

    const subject = t('backend.email.invitationSubject', { name: cleanTbName });
    const textContent = t('backend.email.invitationTextGreeting', { name: toName || '' }) + '\n\n' +
      t('backend.email.invitationTextBody', {
        inviter: cleanInviterName,
        name: cleanTbName,
        role: roleLabel,
        url: finalAcceptUrl
      }) +
      (inviteCode ? '\n\n' + t('backend.email.inviteCodeText', { code: inviteCode }) : '');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${EmailTheme.pageBackground}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${EmailTheme.pageBackground}; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: ${EmailTheme.cardBackground}; border: 1px solid ${EmailTheme.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px ${EmailTheme.shadow};">
                
                <!-- Header Brand -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid ${EmailTheme.borderSoft}; background: linear-gradient(180deg, ${EmailTheme.accentGlow} 0%, transparent 100%);">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                      <span style="font-size: 26px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: -0.5px;">${brandName.toLowerCase()}</span>
                      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${EmailTheme.accent}; margin-top: 4px;"></span>
                    </div>
                    <p style="margin: 6px 0 0 0; color: ${EmailTheme.muted}; font-size: 13px; font-weight: 500;">${brandSubtitle}</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <h1 style="color: ${EmailTheme.title}; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
                      ${t('backend.email.greeting', { name: toName ? toName : '' })}
                    </h1>
                    
                    <p style="color: ${EmailTheme.text}; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                      <strong style="color: ${EmailTheme.title};">${cleanInviterName}</strong> ${t('backend.email.invitationHtmlBody')} <strong style="color: ${EmailTheme.accentLight};">"${cleanTbName}"</strong>.
                    </p>

                    <!-- Details Card -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${EmailTheme.panel}; border: 1px solid ${EmailTheme.borderSoft}; border-radius: 12px; margin-bottom: 28px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <div style="color: ${EmailTheme.muted}; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">${t('backend.email.timeboardLabel')}</div>
                          <div style="color: ${EmailTheme.title}; font-size: 16px; font-weight: 700;">${cleanTbName}</div>
                          
                          <div style="margin-top: 12px; color: ${EmailTheme.muted}; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">${t('backend.email.accessPermissionLabel')}</div>
                          <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: ${EmailTheme.accentTintStrong}; border: 1px solid ${EmailTheme.accentBorderStrong}; color: ${EmailTheme.accentSoft}; font-size: 13px; font-weight: 600;">
                            ${roleLabel}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Action Button -->
                    <div style="text-align: center; margin-bottom: 28px;">
                      <a href="${finalAcceptUrl}" style="display: inline-block; background: linear-gradient(135deg, ${EmailTheme.accentDark} 0%, ${EmailTheme.accentDeep} 100%); color: ${EmailTheme.title}; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px ${EmailTheme.buttonShadow}; text-align: center;">
                        ${t('backend.email.acceptButton')}
                      </a>
                    </div>

                    ${inviteCode ? `
                    <!-- Invitation code for the mobile app -->
                    <div style="text-align: center; margin-bottom: 28px; padding: 16px; border-radius: 10px; background-color: ${EmailTheme.accentTint}; border: 1px solid ${EmailTheme.accentBorder};">
                      <div style="color: ${EmailTheme.muted}; font-size: 12px; margin-bottom: 6px;">${t('backend.email.inviteCodeLabel')}</div>
                      <div style="color: ${EmailTheme.title}; font-size: 26px; font-weight: 800; letter-spacing: 4px; font-family: 'SF Mono', Menlo, Consolas, monospace;">${inviteCode}</div>
                      <div style="color: ${EmailTheme.muted}; font-size: 12px; margin-top: 6px;">${t('backend.email.inviteCodeHint')}</div>
                    </div>` : ''}

                    <p style="color: ${EmailTheme.faint}; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                      ${t('backend.email.fallbackInstruction')}<br>
                      <a href="${finalAcceptUrl}" style="color: ${EmailTheme.accentLight}; word-break: break-all; text-decoration: underline;">${finalAcceptUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: ${EmailTheme.footerBackground}; border-top: 1px solid ${EmailTheme.borderFaint}; text-align: center;">
                    <p style="color: ${EmailTheme.faint}; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} ${brandName}. ${t('backend.email.copyright')}
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
        sender: { name: isCondominium ? BRAND.product : this.senderName, email: this.senderEmail },
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

  /**
   * Upgrade request of an account (before online payments): sent to the provider (LEGAL_ENTITY), who sets the
   * license by hand (npm run plan:set). Reply-to is the requester.
   */
  async sendUpgradeRequest({ requesterName, requesterEmail, productName, currentPlan, requestedPlan, message = '' }) {
    const client = this.getClient();
    const tp = createT('pt');
    const subject = tp('backend.upgradeRequest.subject', { product: productName, plan: requestedPlan, name: requesterName || requesterEmail });
    const textContent = tp('backend.upgradeRequest.body', {
      name: requesterName || '',
      email: requesterEmail,
      product: productName,
      current: currentPlan,
      requested: requestedPlan,
      message: message || '—'
    });
    if (!client) {
      console.log(`[EmailService] Simulated upgrade request to ${LEGAL_ENTITY.email}:\n${textContent}`);
      return { success: true, simulated: true };
    }
    try {
      const response = await client.transactionalEmails.sendTransacEmail({
        sender: { name: BRAND.platform, email: this.senderEmail },
        to: [{ email: LEGAL_ENTITY.email, name: LEGAL_ENTITY.name }],
        replyTo: { email: requesterEmail, name: requesterName || requesterEmail },
        subject,
        textContent
      });
      return { success: true, messageId: response?.messageId };
    } catch (err) {
      console.error('[EmailService] Failed to send upgrade request:', err?.response?.body || err.message);
      throw new Error(t('backend.email.emailSendError', { error: err.message }));
    }
  }

  /**
   * Notice to the owner of a condominium unit (receipt, overdue fees), CondoFlow-branded. Returns false when the
   * e-mail service is not configured (simulated), so the caller can keep it for later.
   */
  async sendCondoNotification({ toEmail, toName, subject, title, paragraphs = [], details = [], ctaUrl = null, ctaLabel = '', language = 'pt' }) {
    const client = this.getClient();
    const tl = createT(language);
    const escape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const detailRows = details.map(({ label, value }) => `
                          <div style="margin-top: 10px; color: ${EmailTheme.muted}; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">${escape(label)}</div>
                          <div style="color: ${EmailTheme.title}; font-size: 16px; font-weight: 700;">${escape(value)}</div>`).join('');
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="${language}">
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escape(subject)}</title></head>
      <body style="margin: 0; padding: 0; background-color: ${EmailTheme.pageBackground}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${EmailTheme.pageBackground}; padding: 40px 16px;">
          <tr><td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: ${EmailTheme.cardBackground}; border: 1px solid ${EmailTheme.border}; border-radius: 16px; overflow: hidden;">
              <tr><td style="padding: 28px 32px 18px 32px; text-align: center; border-bottom: 1px solid ${EmailTheme.borderSoft};">
                <span style="font-size: 26px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: -0.5px;">${BRAND.product.toLowerCase()}</span>
                <p style="margin: 6px 0 0 0; color: ${EmailTheme.muted}; font-size: 13px;">${escape(tl('backend.email.condoBrandSubtitle', { platform: BRAND.platform }))}</p>
              </td></tr>
              <tr><td style="padding: 32px;">
                <h1 style="color: ${EmailTheme.title}; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">${escape(title)}</h1>
                ${paragraphs.map((text) => `<p style="color: ${EmailTheme.text}; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">${escape(text)}</p>`).join('')}
                ${details.length ? `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${EmailTheme.panel}; border: 1px solid ${EmailTheme.borderSoft}; border-radius: 12px; margin: 8px 0 24px 0;">
                  <tr><td style="padding: 6px 20px 16px 20px;">${detailRows}</td></tr>
                </table>` : ''}
                ${ctaUrl ? `
                <div style="text-align: center; margin-bottom: 20px;">
                  <a href="${escape(ctaUrl)}" style="display: inline-block; background-color: ${EmailTheme.condo}; color: ${EmailTheme.title}; font-weight: 700; font-size: 15px; text-decoration: none; padding: 14px 32px; border-radius: 10px;">${escape(ctaLabel)}</a>
                </div>` : ''}
              </td></tr>
              <tr><td style="padding: 20px 32px; background-color: ${EmailTheme.footerBackground}; border-top: 1px solid ${EmailTheme.borderFaint}; text-align: center;">
                <p style="color: ${EmailTheme.faint}; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${BRAND.product}. ${escape(tl('backend.notify.footer'))}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>`;
    const textContent = [title, ...paragraphs, ...details.map(({ label, value }) => `${label}: ${value}`), ctaUrl ? `${ctaLabel}: ${ctaUrl}` : ''].filter(Boolean).join('\n\n');

    if (!client) {
      console.log(`[EmailService] Simulated notification to ${toEmail}: ${subject}`);
      return false;
    }
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: BRAND.product, email: this.noticeSenderEmail },
      to: [{ email: toEmail, name: toName || toEmail.split('@')[0] }],
      subject,
      textContent,
      htmlContent
    });
    return true;
  }
}

export const emailService = new EmailService();
