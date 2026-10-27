const MAX_BODY_BYTES = 16_000;

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

  const siteUrl = process.env.SITE_URL;
  const requestOrigin = req.headers?.origin;
  if (siteUrl && requestOrigin) {
    try {
      if (new URL(requestOrigin).origin !== new URL(siteUrl).origin) {
        return send(res, 403, { error: 'This request origin is not allowed.' });
      }
    } catch {
      return send(res, 403, { error: 'This request origin is not allowed.' });
    }
  }

  let raw;
  try {
    raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return send(res, 413, { error: 'Submission is too large.' });
  } catch {
    return send(res, 400, { error: 'Invalid submission.' });
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return send(res, 400, { error: 'Invalid submission.' }); }

  if (String(body.companyWebsite || '').trim()) return send(res, 200, { ok: true });

  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const status = String(body.status || '').trim();
  const allowedStatuses = ['Student', 'Graduate', 'Job seeker', 'Working professional', 'Tech enthusiast', 'Other'];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (fullName.length < 2 || fullName.length > 120) return send(res, 400, { error: 'Enter your full name.' });
  if (!emailPattern.test(email) || email.length > 180) return send(res, 400, { error: 'Enter a valid email address.' });
  if (phone.length < 7 || phone.length > 40) return send(res, 400, { error: 'Enter a valid phone or WhatsApp number.' });
  if (!allowedStatuses.includes(status)) return send(res, 400, { error: 'Choose the option that best describes you.' });
  if (body.certificateFeeAcknowledged !== true || body.contactConsent !== true) {
    return send(res, 400, { error: 'Please confirm the fee information and contact consent.' });
  }

  const webhook = process.env.MAKE_REGISTRATION_WEBHOOK_URL;
  if (!webhook) return send(res, 503, { error: 'Applications are temporarily unavailable. Please contact PillarsConnect for assistance.' });

  let webhookUrl;
  try { webhookUrl = new URL(webhook); }
  catch { return send(res, 500, { error: 'The registration endpoint is not configured correctly.' }); }
  if (webhookUrl.protocol !== 'https:') return send(res, 500, { error: 'The registration endpoint must use HTTPS.' });

  const submission = {
    submittedAt: new Date().toISOString(),
    formType: 'scholarship_application',
    source: 'cybersecurity-scholarship-website',
    status: 'submitted',
    fullName,
    email,
    phone,
    applicantCategory: status,
    experience: String(body.experience || '').slice(0, 100),
    preferredLearningFormat: String(body.preferredLearningFormat || '').slice(0, 80),
    certificateFeeAcknowledged: true,
    contactConsent: true,
    scholarship: 'PillarsConnect Cisco Networking Academy Cybersecurity Scholarship',
    normalCoursePriceNGN: 300000,
    compulsoryCertificateFeeNGN: 10000,
    paymentStatus: 'not_due'
  };

  try {
    const upstream = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(submission),
      signal: AbortSignal.timeout(10_000)
    });
    if (!upstream.ok) return send(res, 502, { error: 'Your application could not be recorded. Please try again shortly.' });
    return send(res, 201, { ok: true, message: 'Application received.' });
  } catch {
    return send(res, 502, { error: 'We could not reach the registration service. Please try again shortly.' });
  }
};