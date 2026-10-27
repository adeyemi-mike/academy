(() => {
  const form = document.getElementById('interest-form');
  if (!form) return;

  const button = document.getElementById('submit-button');
  const errorBox = document.getElementById('form-error');
  const successBox = document.getElementById('success-panel');
  const defaultButtonMarkup = 'Submit scholarship application <span aria-hidden="true">→</span>';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    successBox.hidden = true;
    if (!form.reportValidity()) return;

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      status: document.getElementById('status').value,
      experience: document.getElementById('experience').value,
      preferredLearningFormat: document.getElementById('learning').value,
      certificateFeeAcknowledged: document.getElementById('feeConsent').checked,
      contactConsent: document.getElementById('contactConsent').checked,
      companyWebsite: document.getElementById('companyWebsite').value,
      source: 'cybersecurity-scholarship-website'
    };

    button.disabled = true;
    button.textContent = 'Submitting application…';

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not submit your application. Please try again later.');
      form.querySelectorAll('input, select, button').forEach((field) => { field.disabled = true; });
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      errorBox.textContent = error.message || 'We could not submit your application. Please try again later.';
      errorBox.hidden = false;
    } finally {
      if (!successBox.hidden) return;
      button.disabled = false;
      button.innerHTML = defaultButtonMarkup;
    }
  });
})();