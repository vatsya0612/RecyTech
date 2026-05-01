function showAuthAlert(selector, message, type = "") {
  const mount = document.querySelector(selector);
  if (!mount) return;
  mount.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

function getNextUrl() {
  return new URLSearchParams(location.search).get("next") || "/marketplace.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("[data-login-form]");
  const registerForm = document.querySelector("[data-register-form]");
  const otpForm = document.querySelector("[data-otp-form]");

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    try {
      const data = await RecyTechAPI.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      RecyTechAPI.setSession(data);
      location.href = getNextUrl();
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  });

  registerForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(registerForm).entries());
    try {
      const data = await RecyTechAPI.request("/api/auth/request-otp", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      registerForm.hidden = true;
      otpForm.hidden = false;
      otpForm.elements.pendingId.value = data.pendingId;
      const otpHint = data.devOtp ? ` Test OTP: ${data.devOtp}.` : "";
      document.querySelector("[data-otp-copy]").textContent = data.emailSent
        ? `Enter the 6-digit OTP sent to ${data.email}.`
        : `Enter the OTP for ${data.email}.${otpHint}`;
      showAuthAlert(
        "[data-otp-alert]",
        data.emailSent ? "OTP sent successfully. Please check your inbox." : "Test OTP generated successfully."
      );
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  });

  otpForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(otpForm).entries());
    try {
      const data = await RecyTechAPI.request("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      RecyTechAPI.setSession(data);
      location.href = getNextUrl();
    } catch (error) {
      showAuthAlert("[data-otp-alert]", error.message, "error");
    }
  });

  document.querySelector("[data-edit-email]")?.addEventListener("click", () => {
    otpForm.hidden = true;
    registerForm.hidden = false;
  });
});
