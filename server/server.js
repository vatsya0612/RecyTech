const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { seedDatabase } = require("./seed");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "recytech-data") : path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) seedDatabase(DB_PATH);
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (!Array.isArray(db.pendingOtps)) db.pendingOtps = [];
  if (!Array.isArray(db.sessions)) db.sessions = [];
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.listings)) db.listings = [];
  if (!Array.isArray(db.inquiries)) db.inquiries = [];
  return db;
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 6_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function createOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(":");
  const actual = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function validateRegistration(body) {
  const required = ["name", "email", "password", "role", "city", "phone"];
  if (required.some(field => !String(body[field] || "").trim())) {
    return "All fields are required";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return "Please enter a valid email address";
  }
  if (String(body.password).length < 6) {
    return "Password must be at least 6 characters";
  }
  return "";
}

function getSmtpConfig() {
  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER
  };
  return Object.values(config).every(Boolean) ? config : null;
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let data = "";
    const onData = chunk => {
      data += chunk.toString();
      const lines = data.trimEnd().split(/\r?\n/);
      const last = lines[lines.length - 1] || "";
      if (/^\d{3} /.test(last)) {
        socket.off("data", onData);
        socket.off("error", onError);
        resolve(data);
      }
    };
    const onError = error => {
      socket.off("data", onData);
      reject(error);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendSmtpCommand(socket, command) {
  if (command) socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const code = Number(response.slice(0, 3));
  if (code >= 400) throw new Error(response.trim());
  return response;
}

async function sendOtpEmail(to, otp) {
  const smtp = getSmtpConfig();
  if (!smtp) return { sent: false, reason: "SMTP is not configured" };

  const net = require("net");
  const tls = require("tls");
  let socket;

  if (smtp.port === 465) {
    socket = tls.connect({
      host: smtp.host,
      port: smtp.port,
      servername: smtp.host
    });

    await new Promise((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
  } else {
    socket = net.connect({
      host: smtp.host,
      port: smtp.port
    });

    await new Promise((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
  }

  const message = [
    `From: RecyTech <${smtp.from}>`,
    `To: ${to}`,
    "Subject: Your RecyTech verification OTP",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    `Your RecyTech OTP is ${otp}. It expires in 10 minutes.`,
    "",
    "If you did not request this, you can ignore this email."
  ].join("\r\n");

  await sendSmtpCommand(socket);
  await sendSmtpCommand(socket, "EHLO recytech.local");
  if (smtp.port !== 465) {
    await sendSmtpCommand(socket, "STARTTLS");
    socket = tls.connect({
      socket,
      servername: smtp.host
    });
    await new Promise((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    await sendSmtpCommand(socket, "EHLO recytech.local");
  }
  await sendSmtpCommand(socket, "AUTH LOGIN");
  await sendSmtpCommand(socket, Buffer.from(smtp.user).toString("base64"));
  await sendSmtpCommand(socket, Buffer.from(smtp.pass).toString("base64"));
  await sendSmtpCommand(socket, `MAIL FROM:<${smtp.from}>`);
  await sendSmtpCommand(socket, `RCPT TO:<${to}>`);
  await sendSmtpCommand(socket, "DATA");
  await sendSmtpCommand(socket, `${message}\r\n.`);
  await sendSmtpCommand(socket, "QUIT");
  socket.end();
  return { sent: true };
}

function getAuthUser(req, db) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const session = db.sessions.find(item => item.token === token);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  return db.users.find(user => user.id === session.userId) || null;
}

function requireUser(req, res, db) {
  const user = getAuthUser(req, db);
  if (!user) {
    sendError(res, 401, "Please sign in to continue");
    return null;
  }
  return user;
}

function requireAdmin(req, res, db) {
  const user = requireUser(req, res, db);
  if (!user) return null;
  if (user.role !== "admin") {
    sendError(res, 403, "Admin access required");
    return null;
  }
  return user;
}

function getListingView(listing, db) {
  const seller = db.users.find(user => user.id === listing.sellerId);
  return {
    ...listing,
    seller: seller
      ? {
          id: seller.id,
          name: seller.name,
          city: seller.city,
          role: seller.role,
          phone: seller.phone
        }
      : null
  };
}

function estimateValue(payload) {
  const categoryBase = {
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
  const conditionMultiplier = {
    Working: 1,
    Repairable: 0.62,
    "For Parts": 0.4,
    Scrap: 0.22
  };
  const base = categoryBase[payload.category] || categoryBase.Other;
  const multiplier = conditionMultiplier[payload.condition] || 0.45;
  const quantity = Number(payload.quantity || 1);
  const agePenalty = Math.max(0.55, 1 - Number(payload.ageYears || 3) * 0.04);
  return Math.max(100, Math.round(base * multiplier * agePenalty * quantity));
}

function filterListings(listings, query) {
  return listings.filter(listing => {
    if (query.status && listing.status !== query.status) return false;
    if (query.category && listing.category !== query.category) return false;
    if (query.city && !listing.city.toLowerCase().includes(query.city.toLowerCase())) return false;
    if (query.condition && listing.condition !== query.condition) return false;
    if (query.q) {
      const haystack = `${listing.title} ${listing.brand} ${listing.category} ${listing.city} ${listing.description}`.toLowerCase();
      if (!haystack.includes(query.q.toLowerCase())) return false;
    }
    return true;
  });
}

async function handleApi(req, res, pathname, query) {
  const db = readDb();

  if (req.method === "POST" && pathname === "/api/auth/register") {
    return sendError(res, 410, "Use OTP verification to create an account");
  }

  if (req.method === "POST" && pathname === "/api/auth/request-otp") {
    const body = await parseBody(req);
    const validationError = validateRegistration(body);
    if (validationError) return sendError(res, 400, validationError);

    const email = body.email.trim().toLowerCase();
    if (db.users.some(user => user.email.toLowerCase() === email)) {
      return sendError(res, 409, "Email is already registered");
    }

    const otp = createOtp();
    const pendingId = createId("otp");
    db.pendingOtps = db.pendingOtps.filter(item => item.email !== email && new Date(item.expiresAt) > new Date());
    db.pendingOtps.push({
      id: pendingId,
      email,
      otpHash: hashOtp(otp),
      attempts: 0,
      user: {
        name: body.name.trim(),
        email,
        passwordHash: hashPassword(body.password),
        role: ["buyer", "seller", "recycler"].includes(body.role) ? body.role : "buyer",
        city: body.city.trim(),
        phone: body.phone.trim()
      },
      expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
      createdAt: new Date().toISOString()
    });
    writeDb(db);

    let emailResult;
    try {
      emailResult = await sendOtpEmail(email, otp);
    } catch (error) {
      emailResult = { sent: false, reason: error.message };
    }

    return sendJson(res, 200, {
      pendingId,
      email,
      emailSent: emailResult.sent,
      message: emailResult.sent ? "OTP sent to your email" : "OTP generated. Configure SMTP to send email automatically.",
      devOtp: process.env.VERCEL ? (emailResult.sent ? undefined : otp) : otp
    });
  }

  if (req.method === "POST" && pathname === "/api/auth/verify-otp") {
    const body = await parseBody(req);
    const pending = db.pendingOtps.find(item => item.id === body.pendingId);
    if (!pending) return sendError(res, 404, "OTP request not found. Please request a new OTP.");
    if (new Date(pending.expiresAt) < new Date()) {
      db.pendingOtps = db.pendingOtps.filter(item => item.id !== pending.id);
      writeDb(db);
      return sendError(res, 400, "OTP expired. Please request a new OTP.");
    }
    if (pending.attempts >= 5) {
      db.pendingOtps = db.pendingOtps.filter(item => item.id !== pending.id);
      writeDb(db);
      return sendError(res, 429, "Too many wrong attempts. Please request a new OTP.");
    }
    if (hashOtp(body.otp) !== pending.otpHash) {
      pending.attempts += 1;
      writeDb(db);
      return sendError(res, 400, "Invalid OTP");
    }
    if (db.users.some(user => user.email.toLowerCase() === pending.email)) {
      db.pendingOtps = db.pendingOtps.filter(item => item.id !== pending.id);
      writeDb(db);
      return sendError(res, 409, "Email is already registered");
    }

    const user = {
      id: createId("usr"),
      ...pending.user,
      emailVerified: true,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    db.pendingOtps = db.pendingOtps.filter(item => item.id !== pending.id);
    const token = createId("tok");
    db.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() });
    writeDb(db);
    return sendJson(res, 201, { token, user: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const user = db.users.find(item => item.email.toLowerCase() === String(body.email || "").toLowerCase());
    if (!user || !verifyPassword(String(body.password || ""), user.passwordHash)) {
      return sendError(res, 401, "Invalid email or password");
    }
    const token = createId("tok");
    db.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() });
    writeDb(db);
    return sendJson(res, 200, { token, user: publicUser(user) });
  }

  if (req.method === "GET" && pathname === "/api/auth/me") {
    const user = requireUser(req, res, db);
    if (!user) return;
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const nextDb = { ...db, sessions: db.sessions.filter(session => session.token !== token) };
    writeDb(nextDb);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && pathname === "/api/listings") {
    const visible = query.mine ? db.listings : db.listings.filter(item => item.status === "Approved" || item.status === "Sold");
    const sorted = filterListings(visible, query).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJson(res, 200, { listings: sorted.map(item => getListingView(item, db)) });
  }

  if (req.method === "GET" && pathname.startsWith("/api/listings/")) {
    const id = pathname.split("/").pop();
    const listing = db.listings.find(item => item.id === id);
    if (!listing) return sendError(res, 404, "Listing not found");
    return sendJson(res, 200, { listing: getListingView(listing, db) });
  }

  if (req.method === "POST" && pathname === "/api/listings") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const body = await parseBody(req);
    const required = ["title", "category", "condition", "city", "description", "image"];
    if (required.some(field => !String(body[field] || "").trim())) {
      return sendError(res, 400, "Title, category, condition, city, and description are required");
    }
    const listing = {
      id: createId("lst"),
      sellerId: user.id,
      title: body.title.trim(),
      brand: String(body.brand || "Mixed").trim(),
      category: body.category,
      condition: body.condition,
      city: body.city.trim(),
      state: String(body.state || "").trim(),
      price: Number(body.price || estimateValue(body)),
      estimatedValue: estimateValue(body),
      quantity: Number(body.quantity || 1),
      ageYears: Number(body.ageYears || 3),
      image: String(body.image || "/assets/device-placeholder.svg").trim(),
      description: body.description.trim(),
      status: "Approved",
      materialTags: Array.isArray(body.materialTags) ? body.materialTags.slice(0, 8) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.listings.push(listing);
    writeDb(db);
    return sendJson(res, 201, { listing: getListingView(listing, db) });
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/listings/")) {
    const user = requireUser(req, res, db);
    if (!user) return;
    const id = pathname.split("/").pop();
    const listing = db.listings.find(item => item.id === id);
    if (!listing) return sendError(res, 404, "Listing not found");
    if (listing.sellerId !== user.id && user.role !== "admin") return sendError(res, 403, "You cannot edit this listing");
    const body = await parseBody(req);
    const allowed = ["title", "brand", "category", "condition", "city", "state", "price", "quantity", "ageYears", "image", "description", "materialTags", "status"];
    allowed.forEach(field => {
      if (body[field] !== undefined) listing[field] = body[field];
    });
    if (user.role !== "admin" && body.status && !["Sold", "Paused"].includes(body.status)) listing.status = "Pending";
    listing.estimatedValue = estimateValue(listing);
    listing.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { listing: getListingView(listing, db) });
  }

  if (req.method === "GET" && pathname === "/api/dashboard") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const myListings = db.listings.filter(item => item.sellerId === user.id);
    const myInquiries = db.inquiries.filter(item => item.buyerId === user.id || myListings.some(listing => listing.id === item.listingId));
    return sendJson(res, 200, {
      listings: myListings.map(item => getListingView(item, db)),
      inquiries: myInquiries.map(inquiry => ({
        ...inquiry,
        listing: db.listings.find(item => item.id === inquiry.listingId) || null,
        buyer: publicUser(db.users.find(item => item.id === inquiry.buyerId) || {})
      })),
      stats: {
        activeListings: myListings.filter(item => item.status === "Approved").length,
        pendingListings: myListings.filter(item => item.status === "Pending").length,
        soldListings: myListings.filter(item => item.status === "Sold").length,
        inquiries: myInquiries.length
      }
    });
  }

  if (req.method === "POST" && pathname === "/api/inquiries") {
    const user = requireUser(req, res, db);
    if (!user) return;
    const body = await parseBody(req);
    const listing = db.listings.find(item => item.id === body.listingId);
    if (!listing) return sendError(res, 404, "Listing not found");
    if (listing.sellerId === user.id) return sendError(res, 400, "You cannot inquire on your own listing");
    const inquiry = {
      id: createId("inq"),
      listingId: listing.id,
      buyerId: user.id,
      message: String(body.message || "I am interested in this e-waste listing.").trim(),
      offerPrice: Number(body.offerPrice || listing.price),
      status: "Open",
      createdAt: new Date().toISOString()
    };
    db.inquiries.push(inquiry);
    writeDb(db);
    return sendJson(res, 201, { inquiry });
  }

  if (req.method === "GET" && pathname === "/api/admin") {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    return sendJson(res, 200, {
      users: db.users.map(publicUser),
      listings: db.listings.map(item => getListingView(item, db)),
      inquiries: db.inquiries,
      stats: {
        users: db.users.length,
        listings: db.listings.length,
        pending: db.listings.filter(item => item.status === "Pending").length,
        approved: db.listings.filter(item => item.status === "Approved").length,
        sold: db.listings.filter(item => item.status === "Sold").length
      }
    });
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/admin/listings/")) {
    const admin = requireAdmin(req, res, db);
    if (!admin) return;
    const id = pathname.split("/").pop();
    const listing = db.listings.find(item => item.id === id);
    if (!listing) return sendError(res, 404, "Listing not found");
    const body = await parseBody(req);
    if (!["Pending", "Approved", "Rejected", "Sold", "Paused"].includes(body.status)) {
      return sendError(res, 400, "Invalid status");
    }
    listing.status = body.status;
    listing.reviewNote = String(body.reviewNote || "").trim();
    listing.updatedAt = new Date().toISOString();
    writeDb(db);
    return sendJson(res, 200, { listing: getListingView(listing, db) });
  }

  sendError(res, 404, "API route not found");
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, pathname);
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(normalized) || fs.statSync(normalized).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

async function requestHandler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = Object.fromEntries(url.searchParams.entries());
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname, query);
      return;
    }
    serveStatic(req, res, decodeURIComponent(url.pathname));
  } catch (error) {
    sendError(res, 500, error.message || "Server error");
  }
}

ensureDb();
if (require.main === module) {
  const server = http.createServer(requestHandler);
  server.listen(PORT, () => {
    console.log(`RecyTech running at http://localhost:${PORT}`);
  });
}

module.exports = {
  handleApi,
  requestHandler
};
