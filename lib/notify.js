// lib/notify.js
// Notification delivery — email (Resend) + Slack webhooks

/**
 * Send alert email via Resend API
 */
async function sendEmailAlert(to, alerts, storeName) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.log('[Notify] Resend not configured, skipping email');
        return null;
    }

    const criticals = alerts.filter(a => a.severity === 'critical');
    const highs = alerts.filter(a => a.severity === 'high');
    const mediums = alerts.filter(a => a.severity === 'medium');

    const subject = criticals.length > 0
        ? `🚨 CRITICAL: ${criticals[0].title} — ${storeName}`
        : `⚠️ Alert: ${alerts[0].title} — ${storeName}`;

    const htmlBody = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #00b894; padding: 20px 24px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #fff; margin: 0; font-size: 18px;">⚡ Calyxra Alert</h1>
                <p style="color: #bbf7d0; margin: 4px 0 0; font-size: 13px;">Automated monitoring for ${storeName}</p>
            </div>
            <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
                ${criticals.map(a => `
                    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
                        <strong style="color: #dc2626;">🔴 CRITICAL: ${a.title}</strong>
                        <p style="margin: 6px 0 0; color: #374151; font-size: 13px; white-space: pre-line;">${a.message}</p>
                    </div>
                `).join('')}
                ${highs.map(a => `
                    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
                        <strong style="color: #92400e;">🟡 HIGH: ${a.title}</strong>
                        <p style="margin: 6px 0 0; color: #374151; font-size: 13px; white-space: pre-line;">${a.message}</p>
                    </div>
                `).join('')}
                ${mediums.map(a => `
                    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
                        <strong style="color: #1e40af;">ℹ️ ${a.title}</strong>
                        <p style="margin: 6px 0 0; color: #374151; font-size: 13px; white-space: pre-line;">${a.message}</p>
                    </div>
                `).join('')}
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                    <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background: #00b894; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">View Dashboard →</a>
                </div>
            </div>
            <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 12px;">Calyxra Revenue Reconciliation • Automated alert</p>
        </div>
    `;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.ALERT_FROM_EMAIL || 'alerts@calyxra.com',
                to,
                subject,
                html: htmlBody,
            }),
        });
        const data = await res.json();
        console.log('[Notify] Email sent:', data.id || data);
        return data;
    } catch (err) {
        console.error('[Notify] Email failed:', err.message);
        return null;
    }
}

/**
 * Send alert to Slack via webhook
 */
async function sendSlackAlert(alerts, storeName) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('[Notify] Slack not configured, skipping');
        return null;
    }

    const severityEmoji = { critical: '🚨', high: '⚠️', medium: 'ℹ️' };

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `⚡ Calyxra Alert — ${storeName}` },
        },
        ...alerts.map(a => ({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${severityEmoji[a.severity] || '📌'} *${a.title}*\n${a.message}`,
            },
        })),
        {
            type: 'actions',
            elements: [{
                type: 'button',
                text: { type: 'plain_text', text: '📊 View Dashboard' },
                url: `${process.env.NEXTAUTH_URL}/dashboard`,
            }],
        },
    ];

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
        });
        console.log('[Notify] Slack sent:', res.status);
        return res.ok;
    } catch (err) {
        console.error('[Notify] Slack failed:', err.message);
        return null;
    }
}

module.exports = { sendEmailAlert, sendSlackAlert };
