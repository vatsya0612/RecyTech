const RecyTechAPI = (() => {
  const TOKEN_KEY = "recytech_token";
  const USER_KEY = "recytech_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function requireAuth() {
    if (!getToken()) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return false;
    }
    return true;
  }

  function renderNav() {
    const user = getUser();
    const mount = document.querySelector("[data-nav-actions]");
    if (!mount) return;
    if (!user) {
      mount.innerHTML = `
        <a class="btn secondary" href="/login.html">Login</a>
        <a class="btn green" href="/login.html?mode=register">Join</a>
      `;
      return;
    }
    mount.innerHTML = `
      <a class="btn secondary" href="/dashboard.html">${user.name.split(" ")[0]}</a>
      ${user.role === "admin" ? '<a class="btn blue" href="/admin.html">Admin</a>' : ""}
      <button class="btn" data-logout>Logout</button>
    `;
    mount.querySelector("[data-logout]")?.addEventListener("click", async () => {
      try {
        await request("/api/auth/logout", { method: "POST" });
      } catch {}
      clearSession();
      location.href = "/";
    });
  }

  return {
    request,
    getToken,
    getUser,
    setSession,
    clearSession,
    requireAuth,
    renderNav,
    formatMoney
  };
})();

document.addEventListener("DOMContentLoaded", RecyTechAPI.renderNav);

