function listingCard(listing) {
  return `
    <article class="card">
      <img class="listing-img" src="${listing.image}" alt="${listing.title}">
      <div class="card-body">
        <div class="listing-meta">
          <span class="status ${listing.status}">${listing.status}</span>
          <span class="chip">${listing.category}</span>
          <span class="chip">${listing.condition}</span>
        </div>
        <h3>${listing.title}</h3>
        <p class="muted">${listing.city}${listing.state ? `, ${listing.state}` : ""}</p>
        <div class="price">${RecyTechAPI.formatMoney(listing.price)}</div>
        <p class="muted">${listing.description.slice(0, 110)}${listing.description.length > 110 ? "..." : ""}</p>
        <a class="btn secondary" href="/product.html?id=${listing.id}">View listing</a>
      </div>
    </article>
  `;
}

async function loadFeaturedListings() {
  const mount = document.querySelector("[data-featured-listings]");
  if (!mount) return;
  try {
    const data = await RecyTechAPI.request("/api/listings");
    mount.innerHTML = data.listings.slice(0, 3).map(listingCard).join("");
  } catch (error) {
    mount.innerHTML = `<div class="alert error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFeaturedListings);

