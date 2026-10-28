# PillarsConnect Cybersecurity Scholarship Website

Responsive scholarship landing page for the PillarsConnect Ltd × Cisco Networking Academy cybersecurity learning opportunity.

## Offer details

- Final scholarship round before the course returns to its regular price of **₦300,000**.
- Scholarship covers eligible course tuition.
- Full scholarship including certificate: **₦5,000 total**.
- Applicants should pay only after PillarsConnect instructs them to proceed with registration.
- OPay transfers stay pending until a person at PillarsConnect independently verifies receipt of the funds.

## Deployment

Deploy this repository to Vercel so the `api/` serverless functions run. Set `SITE_URL`, `PAYSTACK_SECRET_KEY`, `MAKE_REGISTRATION_WEBHOOK_URL`, and `MAKE_PAYMENT_WEBHOOK_URL` in Vercel Project Settings → Environment Variables. Use Paystack test keys first; do not commit secrets to GitHub.

The browser must never mark a Paystack payment as paid on its own: the server verifies the reference, successful status, exact ₦5,000 amount, NGN currency, and payment purpose with Paystack. Configure the Make payment scenario to deduplicate events using `paymentReference` / `eventId`.

## OPay transfer

- Account number: `7064846659`
- Account name: `Timilehin Adeyemi`
- Amount: `₦5,000`
- Receipt submission: https://wa.me/2347064846659

A WhatsApp receipt is not proof that a transfer has cleared. Keep manual transfers pending until they are independently confirmed.

## Required before launch

1. Add the four environment variables in Vercel.
2. Configure the registration Make webhook to record applications in Google Sheets.
3. Configure a separate payment Make webhook to record verified Paystack events and deduplicate by reference.
4. Test application submission, payment initialization, server verification, and payment recording end-to-end with Paystack test keys.
5. Add the official PillarsConnect logo asset when available. The page should use a text-only wordmark until then.

**Integrations are not live until configured and tested.**