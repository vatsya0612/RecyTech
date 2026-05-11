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

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("[data-login-form]");
  const registerForm = document.querySelector("[data-register-form]");
  const googleLoginButton = document.querySelector("[data-google-login]");
  const googleSignupButton = document.querySelector("[data-google-signup]");

  async function getAuth() {
    await RecyTechAPI.ready();
    return RecyTechAPI.getFirebaseAuth();
  }

  function requireFirebase(auth) {
    if (auth) return true;
    const message = "Firebase is not configured yet. Add your Firebase web app config in /js/firebase-config.js.";
    showAuthAlert("[data-auth-alert]", message, "error");
    return false;
  }

  // Handle verification error from redirect
  const params = new URLSearchParams(location.search);
  if (params.get("error") === "verify") {
    showAuthAlert("[data-auth-alert]", "Please verify your email address before logging in.", "error");
  }

  loginForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const auth = await getAuth();
    if (!requireFirebase(auth)) return;
    const payload = Object.fromEntries(new FormData(loginForm).entries());
    try {
      const credential = await auth.signInWithEmailAndPassword(payload.email, payload.password);
      
      // Check if email is verified
      if (!credential.user.emailVerified) {
        await credential.user.sendEmailVerification();
        await auth.signOut();
        showAuthAlert("[data-auth-alert]", "Please verify your email address. A new verification link has been sent to your inbox.", "error");
        return;
      }

      await syncFirebaseProfile();
      location.href = getNextUrl();
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  });

  registerForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const auth = await getAuth();
    if (!requireFirebase(auth)) return;
    const payload = Object.fromEntries(new FormData(registerForm).entries());
    try {
      const credential = await auth.createUserWithEmailAndPassword(payload.email, payload.password);
      if (payload.name) {
        await credential.user.updateProfile({ displayName: payload.name });
      }
      await credential.user.sendEmailVerification();
      
      // Sync profile but we won't log them in yet
      await syncFirebaseProfile({
        name: payload.name,
        role: payload.role,
        city: payload.city,
        phone: payload.phone
      });

      // Sign out immediately so they have to verify first
      await auth.signOut();

      showAuthAlert("[data-auth-alert]", "Account created successfully! A verification email has been sent to " + payload.email + ". Please verify your email before logging in.");
      
      // Clear the form
      registerForm.reset();
    } catch (error) {
      showAuthAlert("[data-auth-alert]", error.message, "error");
    }
  });

  async function signInWithGoogle(profile = {}) {
    const auth = await getAuth();
    if (!requireFirebase(auth)) return;
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
