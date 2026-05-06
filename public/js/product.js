async function loadProduct() {
  const mount = document.querySelector("[data-product]");
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    mount.innerHTML = `<div class="alert error">Listing id is missing.</div>`;
    return;
  }
  try {
    const { listing } = await RecyTechAPI.request(`/api/listings/${id}`);
    mount.innerHTML = `
      <div class="panel">
        <img class="listing-img" style="height:320px;border-radius:8px" src="${listing.image}" alt="${listing.title}">
      </div>
      <div class="panel">
        <div class="listing-meta">
          <span class="status ${listing.status}">${listing.status}</span>
          <span class="chip">${listing.category}</span>
          <span class="chip">${listing.condition}</span>
        </div>
        <h1>${listing.title}</h1>
        <p class="muted">${listing.brand} · ${listing.city}${listing.state ? `, ${listing.state}` : ""}</p>
        <div class="price">${RecyTechAPI.formatMoney(listing.price)}</div>
        <p>${listing.description}</p>
        <div class="chips">${listing.materialTags.map(tag => `<span class="chip">${tag}</span>`).join("")}</div>
        <hr style="border:0;border-top:1px solid var(--line);margin:22px 0">
        <h3>Seller</h3>
        <p><strong>${listing.seller?.name || "Seller"}</strong><br><span class="muted">${listing.seller?.city || ""} · ${listing.seller?.phone || ""}</span></p>
        <form data-inquiry-form>
          <div class="form-field">
            <label>Your offer</label>
            <input class="input" name="offerPrice" type="number" value="${listing.price}">
          </div>
          <div class="form-field" style="margin-top:12px">
            <label>Message</label>
            <textarea class="textarea" name="message">I am interested in this listing. Please share pickup and component details.</textarea>
          </div>
          <button class="btn green" style="margin-top:12px">Contact seller</button>
        </form>
        <div data-inquiry-alert></div>
      </div>
    `;
    document.querySelector("[data-inquiry-form]").addEventListener("submit", async event => {
      event.preventDefault();
      if (!(await RecyTechAPI.requireAuth())) return;
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      payload.listingId = id;
      try {
        await RecyTechAPI.request("/api/inquiries", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        document.querySelector("[data-inquiry-alert]").innerHTML = `<div class="alert">Inquiry sent to seller.</div>`;
      } catch (error) {
        document.querySelector("[data-inquiry-alert]").innerHTML = `<div class="alert error">${error.message}</div>`;
      }
    });
  } catch (error) {
    mount.innerHTML = `<div class="alert error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadProduct);
