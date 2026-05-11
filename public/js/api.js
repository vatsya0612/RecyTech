const RecyTechAPI = (() => {
  const USER_KEY = "recytech_user";
  let auth = null;
  let currentUser = null;
  let readyPromise = null;

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setStoredUser(user) {
    currentUser = user || null;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  function clearSession() {
    setStoredUser(null);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        if (existing.dataset.loaded === "true") resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Could not load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js");

      let config = window.RECYTECH_FIREBASE_CONFIG || null;
      if (!config || !config.apiKey) {
        try {
          const response = await fetch("/api/firebase-config");
          const data = await response.json();
          config = data.config || null;
          window.RECYTECH_FIREBASE_CONFIG = config;
        } catch { }
      }
      if (!config || !config.apiKey) {
        currentUser = getStoredUser();
        return { firebaseReady: false };
      }

      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(config);
      }
      auth = window.firebase.auth();
      auth.languageCode = "en";

      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(async firebaseUser => {
          if (!firebaseUser) {
            setStoredUser(null);
            unsubscribe();
            resolve();
            return;
          }
          try {
            await syncUser();
          } catch { }
          unsubscribe();
          resolve();
        });
      });

      return { firebaseReady: true };
    })();
    return readyPromise;
  }

  function getFirebaseAuth() {
    return auth;
  }

  async function getIdToken() {
    await ready();
    if (!auth?.currentUser) return "";
    return auth.currentUser.getIdToken();
  }

  async function request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };
    const token = await getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }

  async function syncUser(profile = {}) {
    await ready();
    if (!auth?.currentUser) {
      setStoredUser(null);
      return null;
    }
    const data = await request("/api/auth/session", {
      method: "POST",
      body: JSON.stringify(profile)
    });
    setStoredUser(data.user);
    return data.user;
  }

  async function requireAuth() {
    await ready();
    if (!auth?.currentUser) {
      location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`;
      return false;
    }
    return true;
  }

  function getUser() {
    return currentUser || getStoredUser();
  }

  async function signOut() {
    await ready();
    if (auth) await auth.signOut();
    clearSession();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { }
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  async function renderNav() {
    await ready();
    const mount = document.querySelector("[data-nav-actions]");
    if (!mount) return;
    const user = getUser();
    const themeToggle = `<button class="theme-toggle" data-theme-toggle title="Switch to Dark Mode">🌙</button>`;
    if (!user) {
      mount.innerHTML = `${themeToggle}<a class="btn secondary" href="/login.html">Login</a>`;
    } else {
      mount.innerHTML = `
        ${themeToggle}
        <a class="btn secondary" href="/marketplace.html">${user.name.split(" ")[0]}</a>
        ${user.role === "admin" ? '<a class="btn blue" href="/admin.html">Admin</a>' : ""}
        <button class="btn" data-logout>Logout</button>
      `;
      mount.querySelector("[data-logout]")?.addEventListener("click", async () => {
        await signOut();
        location.href = "/";
      });
    }
    // Attach event listener to the newly created theme toggle button
    const themeBtn = mount.querySelector("[data-theme-toggle]");
    if (themeBtn && window.ThemeToggle && window.ThemeToggle.toggle) {
      themeBtn.addEventListener("click", window.ThemeToggle.toggle);
      // Update button text to match current theme
      const savedTheme = localStorage.getItem('recytech-theme') || 'light';
      themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
      themeBtn.title = savedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  return {
    ready,
    request,
    getUser,
    clearSession,
    requireAuth,
    renderNav,
    formatMoney,
    getFirebaseAuth,
    syncUser,
    signOut
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  RecyTechAPI.renderNav();
});
