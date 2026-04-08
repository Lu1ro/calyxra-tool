// pages/api/webhooks/meta/deletion-status.js
// Status page for Meta data deletion confirmation
// Meta shows this URL to the user after they request data deletion

export default function handler(req, res) {
    const { code } = req.query;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Data Deletion Status — Calyxra</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px;">
            <h1>Data Deletion Request</h1>
            <p>Your data deletion request has been processed.</p>
            <p><strong>Confirmation code:</strong> ${code || 'N/A'}</p>
            <p>All data associated with your Meta account has been removed from Calyxra.</p>
            <p>If you have questions, contact <a href="mailto:admin@calyxra.com">admin@calyxra.com</a></p>
        </body>
        </html>
    `);
}
