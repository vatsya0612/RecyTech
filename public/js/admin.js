async function updateStatus(id, status) {
  await RecyTechAPI.request(`/api/admin/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  await loadAdmin();
}

async function loadAdmin() {
  if (!RecyTechAPI.requireAuth()) return;
  const user = RecyTechAPI.getUser();
  if (user.role !== "admin") {
    document.querySelector("[data-admin]").innerHTML = `<div class="alert error">Admin access required. Login with admin@recytech.in.</div>`;
    return;
  }
  try {
    const data = await RecyTechAPI.request("/api/admin");
    document.querySelector("[data-admin-stats]").innerHTML = `
      <div class="metric" style="background:#e7f5ff;color:var(--ink)"><strong>${data.stats.users}</strong><span>Users</span></div>
      <div class="metric" style="background:#f1f3f5;color:var(--ink)"><strong>${data.stats.listings}</strong><span>Listings</span></div>
      <div class="metric" style="background:#fff3bf;color:var(--ink)"><strong>${data.stats.pending}</strong><span>Pending</span></div>
      <div class="metric" style="background:#d3f9d8;color:var(--ink)"><strong>${data.stats.approved}</strong><span>Approved</span></div>
    `;
    document.querySelector("[data-admin-listings]").innerHTML = data.listings.map(listing => `
      <tr>
        <td><strong>${listing.title}</strong><br><span class="muted">${listing.category} · ${listing.city}</span></td>
        <td>${listing.seller?.name || "Seller"}</td>
        <td>${RecyTechAPI.formatMoney(listing.price)}</td>
        <td><span class="status ${listing.status}">${listing.status}</span></td>
        <td class="form-row">
          <button class="btn green" onclick="updateStatus('${listing.id}','Approved')">Approve</button>
          <button class="btn danger" onclick="updateStatus('${listing.id}','Rejected')">Reject</button>
          <button class="btn secondary" onclick="updateStatus('${listing.id}','Sold')">Sold</button>
        </td>
      </tr>
    `).join("");
  } catch (error) {
    document.querySelector("[data-admin]").innerHTML = `<div class="alert error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadAdmin);

