async function loadDashboard() {
  if (!RecyTechAPI.requireAuth()) return;
  const user = RecyTechAPI.getUser();
  document.querySelector("[data-user-name]").textContent = user.name;
  document.querySelector("[data-user-meta]").textContent = `${user.role} · ${user.city} · ${user.email}`;
  try {
    const data = await RecyTechAPI.request("/api/dashboard");
    document.querySelector("[data-stats]").innerHTML = `
      <div class="metric" style="background:#e7f5ff;color:var(--ink)"><strong>${data.stats.activeListings}</strong><span>Approved</span></div>
      <div class="metric" style="background:#fff3bf;color:var(--ink)"><strong>${data.stats.pendingListings}</strong><span>Pending</span></div>
      <div class="metric" style="background:#d0ebff;color:var(--ink)"><strong>${data.stats.soldListings}</strong><span>Sold</span></div>
      <div class="metric" style="background:#d3f9d8;color:var(--ink)"><strong>${data.stats.inquiries}</strong><span>Inquiries</span></div>
    `;
    document.querySelector("[data-my-listings]").innerHTML = data.listings.length
      ? data.listings.map(listingCard).join("")
      : `<div class="alert">You have not created any listings yet.</div>`;
    document.querySelector("[data-inquiries]").innerHTML = data.inquiries.length
      ? data.inquiries.map(item => `
          <tr>
            <td>${item.listing?.title || "Listing"}</td>
            <td>${item.buyer?.name || "Buyer"}</td>
            <td>${RecyTechAPI.formatMoney(item.offerPrice)}</td>
            <td>${item.message}</td>
            <td><span class="status ${item.status}">${item.status}</span></td>
          </tr>
        `).join("")
      : `<tr><td colspan="5">No inquiries yet.</td></tr>`;
  } catch (error) {
    document.querySelector("[data-dashboard-alert]").innerHTML = `<div class="alert error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);

