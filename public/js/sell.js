function estimateLocal(form) {
  const base = {
    Laptop: 6500,
    Mobile: 2800,
    Desktop: 5200,
    Monitor: 2400,
    "Motherboard/PCB": 1300,
    RAM: 900,
    Battery: 700,
    Charger: 450,
    Keyboard: 350,
    "Bulk Scrap": 12000,
    Other: 1000
  };
  const multiplier = {
    Working: 1,
    Repairable: .62,
    "For Parts": .4,
    Scrap: .22
  };
  const category = form.category.value;
  const condition = form.condition.value;
  const quantity = Number(form.quantity.value || 1);
  const age = Number(form.ageYears.value || 3);
  return Math.max(100, Math.round((base[category] || 1000) * (multiplier[condition] || .45) * Math.max(.55, 1 - age * .04) * quantity));
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image"));
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await RecyTechAPI.requireAuth())) return;
  const form = document.querySelector("[data-sell-form]");
  const estimate = document.querySelector("[data-estimate]");
  const photoInput = form?.elements.photo;
  const photoPreview = document.querySelector("[data-photo-preview]");
  const updateEstimate = () => {
    estimate.textContent = RecyTechAPI.formatMoney(estimateLocal(form));
  };
  form?.addEventListener("input", updateEstimate);
  updateEstimate();

  photoInput?.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) {
      photoPreview.src = "/assets/device-placeholder.svg";
      return;
    }
    if (!file.type.startsWith("image/")) {
      photoInput.value = "";
      photoPreview.src = "/assets/device-placeholder.svg";
      document.querySelector("[data-sell-alert]").innerHTML = `<div class="alert error">Please upload a valid image file.</div>`;
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      photoInput.value = "";
      photoPreview.src = "/assets/device-placeholder.svg";
      document.querySelector("[data-sell-alert]").innerHTML = `<div class="alert error">Image must be smaller than 3 MB.</div>`;
      return;
    }
    photoPreview.src = await readImageAsDataUrl(file);
  });

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const alert = document.querySelector("[data-sell-alert]");
    const payload = Object.fromEntries(new FormData(form).entries());
    const photo = photoInput.files[0];
    if (!photo) {
      alert.innerHTML = `<div class="alert error">Please upload a product photo before posting.</div>`;
      return;
    }
    payload.price = Number(payload.price || estimateLocal(form));
    payload.quantity = Number(payload.quantity || 1);
    payload.ageYears = Number(payload.ageYears || 3);
    payload.image = await readImageAsDataUrl(photo);
    delete payload.photo;
    payload.materialTags = String(payload.materialTags || "")
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);
    try {
      const data = await RecyTechAPI.request("/api/listings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      alert.innerHTML = `<div class="alert">Your listing is live. Buyers can now contact you. Redirecting...</div>`;
      setTimeout(() => location.href = `/product.html?id=${data.listing.id}`, 800);
    } catch (error) {
      alert.innerHTML = `<div class="alert error">${error.message}</div>`;
    }
  });
});
