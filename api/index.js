const { handleApi } = require("../server/server");

module.exports = async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "recytech.vercel.app"}`);
  let pathname = url.pathname;

  if (pathname === "/api/index") {
    pathname = "/api";
  }

  await handleApi(req, res, pathname, Object.fromEntries(url.searchParams.entries()));
};
