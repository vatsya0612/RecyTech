const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function seedDatabase(dbPath = path.join(__dirname, "..", "data", "db.json")) {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const users = [
    {
      id: "usr_admin",
      name: "RecyTech Admin",
      email: "admin@recytech.in",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      city: "Delhi",
      phone: "+91 90000 10001",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr_seller",
      name: "Aditya Electronics",
      email: "seller@recytech.in",
      passwordHash: hashPassword("seller123"),
      role: "seller",
      city: "Jaipur",
      phone: "+91 90000 10002",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr_buyer",
      name: "Nehra Laptop Repair",
      email: "buyer@recytech.in",
      passwordHash: hashPassword("buyer123"),
      role: "buyer",
      city: "Gurugram",
      phone: "+91 90000 10003",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr_recycler",
      name: "GreenLoop Recycling",
      email: "recycler@recytech.in",
      passwordHash: hashPassword("recycler123"),
      role: "recycler",
      city: "Bengaluru",
      phone: "+91 90000 10004",
      createdAt: new Date().toISOString()
    }
  ];

  const listings = [
    {
      id: "lst_laptop_dell",
      sellerId: "usr_seller",
      title: "Dell Inspiron 15 for spares",
      brand: "Dell",
      category: "Laptop",
      condition: "For Parts",
      city: "Jaipur",
      state: "Rajasthan",
      price: 5200,
      estimatedValue: 4980,
      quantity: 1,
      ageYears: 5,
      image: "/assets/laptop.svg",
      description: "Dead display, motherboard powers on. Keyboard, body, RAM slot, hinges and charger port can be reused by repair shops.",
      status: "Approved",
      materialTags: ["RAM slot", "Hinges", "Keyboard", "Charging IC"],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: "lst_mobile_boards",
      sellerId: "usr_recycler",
      title: "Mixed mobile motherboards lot",
      brand: "Samsung, Redmi, Vivo",
      category: "Motherboard/PCB",
      condition: "Repairable",
      city: "Bengaluru",
      state: "Karnataka",
      price: 8800,
      estimatedValue: 9100,
      quantity: 30,
      ageYears: 3,
      image: "/assets/pcb.svg",
      description: "Bulk PCB lot from verified collection drive. Useful for IC extraction, training labs and board-level repair practice.",
      status: "Approved",
      materialTags: ["IC", "Connectors", "PCB", "Copper"],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: "lst_monitor_lg",
      sellerId: "usr_seller",
      title: "LG 22 inch monitor with panel issue",
      brand: "LG",
      category: "Monitor",
      condition: "Repairable",
      city: "Delhi",
      state: "Delhi",
      price: 1600,
      estimatedValue: 1520,
      quantity: 1,
      ageYears: 4,
      image: "/assets/monitor.svg",
      description: "Backlight works, panel has lines. Stand, power board and casing are available for reuse.",
      status: "Approved",
      materialTags: ["Power board", "Stand", "Backlight"],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "lst_pending_pc",
      sellerId: "usr_seller",
      title: "Old assembled desktop tower",
      brand: "Assembled",
      category: "Desktop",
      condition: "Working",
      city: "Noida",
      state: "Uttar Pradesh",
      price: 7400,
      estimatedValue: 7300,
      quantity: 1,
      ageYears: 6,
      image: "/assets/desktop.svg",
      description: "Core i3 tower, working SMPS, cabinet, 500GB HDD. Pending admin quality check.",
      status: "Pending",
      materialTags: ["SMPS", "HDD", "Cabinet"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const db = {
    users,
    sessions: [],
    pendingOtps: [],
    listings,
    inquiries: [
      {
        id: "inq_demo",
        listingId: "lst_laptop_dell",
        buyerId: "usr_buyer",
        message: "I repair Dell laptops in Gurugram. Can pick up if the keyboard and charging section are usable.",
        offerPrice: 4800,
        status: "Open",
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  };

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  return db;
}

if (require.main === module) {
  seedDatabase();
  console.log("Seeded RecyTech database.");
}

module.exports = { seedDatabase };
