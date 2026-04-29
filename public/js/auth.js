function setAuthMode(mode) {
  const isRegister = mode === "register";
  document.querySelector("[data-register-fields]").style.display = isRegister ? "grid" : "none";
  document.querySelector("[data-auth-title]").textContent = isRegister ? "Create your RecyTech account" : "Welcome back";
  document.querySelector("[data-auth-submit]").textContent = isRegister ? "Create account" : "Login";
  document.querySelector("[name=mode]").value = mode;
  document.querySelector("[data-switch]").textContent = isRegister ? "Already registered? Login" : "New here? Create account";
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  setAuthMode(params.get("mode") === "register" ? "register" : "login");

  document.querySelector("[data-switch]")?.addEventListener("click", () => {
    const mode = document.querySelector("[name=mode]").value === "login" ? "register" : "login";
    setAuthMode(mode);
  });

  document.querySelector("[data-auth-form]")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = form.get("mode");
    const payload = Object.fromEntries(form.entries());
    const alert = document.querySelector("[data-auth-alert]");
    alert.innerHTML = "";
    try {
      const data = await RecyTechAPI.request(mode === "register" ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      RecyTechAPI.setSession(data);
      const next = new URLSearchParams(location.search).get("next") || "/dashboard.html";
      location.href = next;
    } catch (error) {
      alert.innerHTML = `<div class="alert error">${error.message}</div>`;
    }
  });
});

