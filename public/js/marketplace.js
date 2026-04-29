const state = {
  listings: []
};

function getFilters() {
  return {
    q: document.querySelector("[name=q]")?.value.trim() || "",
    category: document.querySelector("[name=category]")?.value || "",
    city: document.querySelector("[name=city]")?.value.trim() || "",
    condition: document.querySelector("[name=condition]")?.value || ""
  };
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

function renderListings(listings) {
  const mount = document.querySelector("[data-listings]");
  const count = document.querySelector("[data-count]");
  if (count) count.textContent = `${listings.length} listings`;
  if (!listings.length) {
    mount.innerHTML = `<div class="panel"><h2>No listings found</h2><p class="muted">Try another city, category, or condition.</p></div>`;
    return;
  }
  mount.innerHTML = listings.map(listingCard).join("");
}

async function loadListings() {
  const mount = document.querySelector("[data-listings]");
  mount.innerHTML = `<div class="panel">Loading marketplace...</div>`;
  try {
    const query = buildQuery(getFilters());
    const data = await RecyTechAPI.request(`/api/listings${query ? `?${query}` : ""}`);
    state.listings = data.listings;
    renderListings(state.listings);
  } catch (error) {
    mount.innerHTML = `<div class="alert error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("[data-filters]")?.addEventListener("submit", event => {
    event.preventDefault();
    loadListings();
  });
  document.querySelector("[data-reset]")?.addEventListener("click", () => {
    document.querySelector("[data-filters]").reset();
    loadListings();
  });
  loadListings();
});

