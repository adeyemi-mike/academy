function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const siteUrl = process.env.SITE_URL;
  if (!secretKey || !siteUrl) return send(res, 503, { error: 'Secure checkout is not configured yet. Please contact PillarsConnect.' });

  let origin;
  try { origin = new URL(siteUrl); }
  catch { return send(res, 500, { error: 'The website URL is not configured correctly.' }); }
  if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') return send(res, 500, { error: 'The website URL must use HTTPS.' });

  const requestOrigin = req.headers?.origin;
  if (requestOrigin) {
    try {
      if (new URL(requestOrigin).origin !== origin.origin) return send(res, 403, { error: 'This request origin is not allowed.' });
    } catch {
      return send(res, 403, { error: 'This request origin is not allowed.' });
    }
  }

  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 120) return send(res, 400, { error: 'Enter your full name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) return send(res, 400, { error: 'Enter a valid email address.' });
  if (body.feeAcknowledged !== true) return send(res, 400, { error: 'Please acknowledge the compulsory certificate/registration fee.' });

  try {
    const paymentResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: \`Bearer \${secretKey}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount: 1000000,
        currency: 'NGN',
        callback_url: \`\${origin.origin}/payment.html\`,
        metadata: {
          purpose: 'scholarship_certificate_registration_fee',
          payer_name: name,
          course_normal_price_ngn: 300000,
          scholarship: 'PillarsConnect Cisco Networking Academy Cybersecurity Scholarship',
          custom_fields: [
            { display_name: 'Payer name', variable_name: 'payer_name', value: name },
            { display_name: 'Payment purpose', variable_name: 'payment_purpose', value: 'Cybersecurity scholarship certificate/registration fee' }
          ]
        }
      }),
      signal: AbortSignal.timeout(12_000)
    });
    const result = await paymentResponse.json();
    if (!paymentResponse.ok || result.status !== true || !result.data?.authorization_url || !result.data?.reference) {
      return send(res, 502, { error: 'Paystack could not start checkout. Please try again later.' });
    }
    return send(res, 200, { authorizationUrl: result.data.authorization_url, reference: result.data.reference });
  } catch {
    return send(res, 502, { error: 'Secure checkout is temporarily unavailable. Please try again later.' });
  }
};