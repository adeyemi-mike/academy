function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.json(body);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { status: 'error', message: 'Method not allowed.' });
  }

  const reference = String(req.query?.reference || '').trim();
  if (!reference || reference.length > 120 || !/^[A-Za-z0-9_=-]+$/.test(reference)) {
    return send(res, 400, { status: 'error', message: 'A valid payment reference is required.' });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return send(res, 503, { status: 'error', message: 'Payment verification is not configured yet. Keep your payment reference and contact PillarsConnect.' });

  try {
    const verifyResponse = await fetch(\`https://api.paystack.co/transaction/verify/\${encodeURIComponent(reference)}\`, {
      headers: { Authorization: \`Bearer \${secretKey}\`, Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000)
    });
    const result = await verifyResponse.json();
    const txn = result?.data;
    const metadata = txn?.metadata || {};
    const valid = verifyResponse.ok && result.status === true && txn?.status === 'success' &&
      Number(txn.amount) === 500000 && txn.currency === 'NGN' &&
      metadata.purpose === 'full_scholarship_with_certificate' &&
      String(txn.reference) === reference;

    if (!valid) return send(res, 200, { status: 'not_confirmed', message: 'Paystack has not confirmed a successful payment of the exact ₦5,000 full scholarship fee for this scholarship.' });

    const paymentEvent = {
      eventId: reference,
      eventType: 'verified_scholarship_certificate_fee_payment',
      paymentStatus: 'paid',
      paymentReference: reference,
      paystackTransactionId: txn.id,
      amountNGN: txn.amount / 100,
      currency: txn.currency,
      paidAt: txn.paid_at || txn.paidAt || txn.transaction_date || new Date().toISOString(),
      payerEmail: txn.customer?.email || '',
      payerName: metadata.payer_name || '',
      normalCoursePriceNGN: 300000,
      scholarship: 'PillarsConnect Cisco Networking Academy Cybersecurity Scholarship'
    };

    const webhook = process.env.MAKE_PAYMENT_WEBHOOK_URL;
    if (!webhook) {
      return send(res, 200, { status: 'verified_recording_pending', message: 'Paystack confirms your ₦10,000 payment. The payment has not yet been recorded in the registration tracker. Keep your reference and contact PillarsConnect.' });
    }

    let webhookUrl;
    try { webhookUrl = new URL(webhook); }
    catch { return send(res, 200, { status: 'verified_recording_pending', message: 'Paystack confirms your payment, but registration recording is not configured correctly. Keep your reference and contact PillarsConnect.' }); }
    if (webhookUrl.protocol !== 'https:') {
      return send(res, 200, { status: 'verified_recording_pending', message: 'Paystack confirms your payment, but registration recording is not configured securely. Keep your reference and contact PillarsConnect.' });
    }

    try {
      const recordResponse = await fetch(webhookUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(paymentEvent),
        signal: AbortSignal.timeout(10_000)
      });
      if (!recordResponse.ok) throw new Error('Payment record webhook failed');
    } catch {
      return send(res, 200, { status: 'verified_recording_pending', message: 'Paystack confirms your payment, but the registration tracker could not be updated. Keep your reference and contact PillarsConnect.' });
    }

    return send(res, 200, { status: 'success', message: 'Your ₦5,000 payment has been verified and sent to the registration tracking workflow.' });
  } catch {
    return send(res, 502, { status: 'error', message: 'We could not check the payment with Paystack. If you were charged, keep your reference and contact PillarsConnect.' });
  }
};