const config = require('../config');

const LAYOUT_MARKER = '<!--poshive-email-layout-->';

/**
 * Strip HTML to a readable plain-text alternative for multipart emails.
 */
function htmlToPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const text = String(label).replace(/<[^>]+>/g, '').trim();
      return text ? `${text} (${href})` : href;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isAlreadyWrapped(html) {
  const s = String(html || '');
  return s.includes(LAYOUT_MARKER) || /<html[\s>]/i.test(s);
}

/**
 * Wrap email body fragments in a branded, email-client-safe HTML document.
 * Uses brand name (app name) in the header; optional business/branch names in the subtitle.
 */
function wrapEmailHtml(bodyHtml, options = {}) {
  if (!bodyHtml) return bodyHtml;
  if (isAlreadyWrapped(bodyHtml)) return bodyHtml;

  const brandName = options.brandName || config.app.name || 'PosHive';
  const brandUrl = options.brandUrl || config.app.url || 'https://poshive.store';
  const businessName = options.businessName || null;
  const branchName = options.branchName || null;
  const preheader = options.preheader || htmlToPlainText(bodyHtml).slice(0, 120);
  const year = new Date().getFullYear();

  const subtitleParts = [];
  if (businessName && String(businessName) !== String(brandName)) subtitleParts.push(escapeHtml(businessName));
  if (branchName) subtitleParts.push(escapeHtml(branchName));
  const subtitle = subtitleParts.length
    ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.4;color:#94a3b8;">${subtitleParts.join(' · ')}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(brandName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;-webkit-text-size-adjust:100%;">
  ${LAYOUT_MARKER}
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background-color:#0f172a;padding:28px 32px;text-align:left;">
              <a href="${escapeAttr(brandUrl)}" style="text-decoration:none;color:#ffffff;">
                <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">
                  ${escapeHtml(brandName)}
                </span>
              </a>
              ${subtitle}
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#14b8a6,#0d9488);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#334155;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
              <p style="margin:0 0 6px;">Sent by <strong style="color:#64748b;">${escapeHtml(brandName)}</strong></p>
              <p style="margin:0;">
                <a href="${escapeAttr(brandUrl)}" style="color:#0d9488;text-decoration:none;">${escapeHtml(brandUrl.replace(/^https?:\/\//, ''))}</a>
                &nbsp;·&nbsp; © ${year}
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

/** Branded SMTP / connection test body (content only — wrap separately). */
function buildSmtpTestContent(brandName = config.app.name) {
  const sentAt = new Date().toUTCString();
  return `
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">SMTP connection test</h1>
    <p style="margin:0 0 14px;">This is a test email from <strong>${escapeHtml(brandName)}</strong>.</p>
    <p style="margin:0 0 14px;">If you received this, your SMTP configuration is working correctly and HTML email delivery is enabled.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr>
        <td style="padding:14px 16px;font-size:13px;color:#64748b;">
          <strong style="color:#334155;">Sent at</strong><br />${escapeHtml(sentAt)}
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#94a3b8;">You can safely ignore this message.</p>
  `.trim();
}

module.exports = {
  LAYOUT_MARKER,
  wrapEmailHtml,
  htmlToPlainText,
  isAlreadyWrapped,
  buildSmtpTestContent,
};
