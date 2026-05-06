function showAuthAlert(selector, message, type = "") {
  const mount = document.querySelector(selector);
  if (!mount) return;
  mount.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

function getNextUrl() {
  return new URLSearchParams(location.search).get("next") || "/marketplace.html";
}

async function syncFirebaseProfile(profile = {}) {
  const user = await RecyTechAPI.syncUser(profile);
  if (!user) throw new Error("Could not load your RecyTech profile");
  return user;
}

document.addEventListener("DOMContentLoaded", async () => {
  await RecyTechAPI.ready();
  const auth = RecyTechAPI.getFirebaseAuth();
  const loginForm = document.querySelector("[data-login-form]");
  const registerForm = document.querySelector("[data-register-form]");
  const googleLoginButton = document.querySelector("[data-google-login]");
  const googleSignupButton = document.querySelector("[data-google-signup]");

  function requireFirebase() {
    if (auth) return true;
    const message = "Firebase is not configured yet. Add your Firebase web app config in /js/firebase-config.js.";
    showAuthAlert("[data-auth-alert]", message, "error");
    return false;
  }

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!requireFirebase()) return;
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    try {
      await auth.signInWithEmailAndPassword(payload.email, payload.password);
      await syncFirebaseProfile();
      location.href = getNextUrl();
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  });

  registerForm?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!requireFirebase()) return;
    const payload = Object.fromEntries(new FormData(registerForm).entries());
    try {
      const credential = await auth.createUserWithEmailAndPassword(payload.email, payload.password);
      if (payload.name) {
        await credential.user.updateProfile({ displayName: payload.name });
      }
      await credential.user.sendEmailVerification();
      await syncFirebaseProfile({
        name: payload.name,
        role: payload.role,
        city: payload.city,
        phone: payload.phone
      });
      showAuthAlert("[data-auth-alert]", "Account created. Firebase verification email has been sent to your inbox.");
      setTimeout(() => {
        location.href = getNextUrl();
      }, 1000);
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  });

  async function signInWithGoogle(profile = {}) {
    if (!requireFirebase()) return;
    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      await syncFirebaseProfile(profile);
      location.href = getNextUrl();
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  }

  googleLoginButton?.addEventListener("click", () => signInWithGoogle());
  googleSignupButton?.addEventListener("click", () => {
    const form = registerForm ? new FormData(registerForm) : null;
    signInWithGoogle({
      name: form?.get("name") || "",
      role: form?.get("role") || "buyer",
      city: form?.get("city") || "",
      phone: form?.get("phone") || ""
    });
  });
});
