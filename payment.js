const paymentForm = document.getElementById("payment-form");
if (paymentForm) {
  const paymentButton = document.getElementById("payment-button");
  const paymentError = document.getElementById("payment-error");
  paymentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    paymentError.hidden = true;
    if (!paymentForm.reportValidity()) return;
    paymentButton.disabled = true;
    paymentButton.textContent = "Preparing secure checkout…";
    try {
      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("payerName").value.trim(),
          email: document.getElementById("payerEmail").value.trim(),
          feeAcknowledged: document.getElementById("paymentConsent").checked
        })
      });
      const result = await response.json();
      if (!response.ok || !result.authorizationUrl) throw new Error(result.error || "We couldn't start checkout.");
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      paymentError.textContent = error.message || "Payment could not be started. Please try again later.";
      paymentError.hidden = false;
      paymentButton.disabled = false;
      paymentButton.innerHTML = 'Continue to secure payment <span aria-hidden="true">→</span>';
    }
  });
}

const copyOpayButton = document.getElementById("copy-opay-account");
if (copyOpayButton) {
  const status = document.getElementById("copy-opay-status");
  copyOpayButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("7064846659");
      status.textContent = "OPay account number copied. Transfer status will remain pending until manually verified.";
    } catch (error) {
      status.textContent = "Account number: 7064846659. Please copy it manually.";
    }
  });
}