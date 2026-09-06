const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");

dotenv.config();

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "FLEX";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHANGE_ADMIN_PASSWORD";
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_BEFORE_HOSTING";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5500";

const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "https://flexhubpredictions.github.io",
  "https://flexhubpredictions.com",
  "https://www.flexhubpredictions.com",
  FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ success: true, message: "FLEX HUB PREDICTIONS backend is running." });
});

app.get("/api/status", (req, res) => {
  res.json({ success: true, message: "FLEX HUB PREDICTIONS API is online.", serverTime: new Date().toISOString() });
});

function createToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

function requireUser(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ message: "Please login first." });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "user") return res.status(401).json({ message: "Invalid user token." });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please login again." });
  }
}

function requireAdmin(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ message: "Admin login required." });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "admin") return res.status(401).json({ message: "Invalid admin token." });
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Admin session expired. Please login again." });
  }
}

async function requireVip(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ message: "VIP access required." });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "vip") return res.status(401).json({ message: "Invalid VIP token." });

    const { rows } = await db.query(
      "SELECT * FROM vip_subscriptions WHERE id = $1",
      [decoded.subscriptionId]
    );
    const subscription = rows[0];

    if (!subscription) return res.status(401).json({ message: "VIP subscription not found." });

    if (subscription.status !== "active") {
      return res.status(401).json({ message: "VIP subscription is not active." });
    }

    if (subscription.expires_at && new Date(subscription.expires_at) <= new Date()) {
      await db.query(
        "UPDATE vip_subscriptions SET status = 'expired' WHERE id = $1",
        [subscription.id]
      );
      return res.status(401).json({ message: "Your VIP access has expired." });
    }

    req.vip = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "VIP session expired." });
  }
}

app.post("/api/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: "Please complete all registration fields." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must contain at least 6 characters." });
    }
    const cleanName = name.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const usernameResult = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [cleanUsername]
    );
    if (usernameResult.rows[0]) {
      return res.status(409).json({ message: "Username is already taken." });
    }

    const emailResult = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [cleanEmail]
    );
    if (emailResult.rows[0]) {
      return res.status(409).json({ message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await db.query(
      `INSERT INTO users (name, username, email, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, username, email, created_at`,
      [cleanName, cleanUsername, cleanEmail, hashedPassword]
    );

    const user = insertResult.rows[0];
    const token = createToken({ id: user.id, username: user.username, type: "user" });

    res.status(201).json({ message: "Account created successfully.", user, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Unable to create account." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Enter your username/email and password." });
    }

    const cleanIdentifier = identifier.trim();
    const result = await db.query(
      `SELECT * FROM users
       WHERE username = $1 OR email = $2`,
      [cleanIdentifier, cleanIdentifier.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user) return res.status(401).json({ message: "Invalid login details." });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return res.status(401).json({ message: "Invalid login details." });

    const token = createToken({ id: user.id, username: user.username, type: "user" });

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Unable to login." });
  }
});

app.get("/api/user/me", requireUser, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, username, email, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User account not found." });
    res.json({ user });
  } catch (error) {
    console.error("Current user error:", error);
    res.status(500).json({ message: "Unable to load user account." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Enter admin username and password." });
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    const token = createToken({ username: ADMIN_USERNAME, type: "admin" }, "2h");
    res.json({
      message: "Admin login successful.",
      token,
      admin: { username: ADMIN_USERNAME }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Unable to login as admin." });
  }
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ admin: { username: req.admin.username } });
});

app.post("/api/admin/vip-subscriptions", requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    const plans = { "1_week": 7, "2_weeks": 14, "1_month": 30 };
    if (!plans[plan]) return res.status(400).json({ message: "Invalid VIP plan." });

    let code;
    do {
      code = "FLEX-" + crypto.randomBytes(5).toString("hex").toUpperCase();
      const check = await db.query("SELECT id FROM vip_subscriptions WHERE code = $1", [code]);
      if (check.rows.length === 0) break;
    } while (true);

    const durationDays = plans[plan];
    const result = await db.query(
      `INSERT INTO vip_subscriptions (code, plan, duration_days, status)
       VALUES ($1, $2, $3, 'unused')
       RETURNING id`,
      [code, plan, durationDays]
    );

    res.status(201).json({
      message: "VIP code generated successfully.",
      subscription: {
        id: result.rows[0].id,
        code,
        plan,
        durationDays,
        status: "unused"
      }
    });
  } catch (error) {
    console.error("VIP generation error:", error);
    res.status(500).json({ message: "Unable to generate VIP code." });
  }
});

app.get("/api/admin/vip-subscriptions", requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT vs.id, vs.code, vs.plan, vs.duration_days, vs.status,
              vs.activated_at, vs.expires_at, vs.created_at, u.username
       FROM vip_subscriptions vs
       LEFT JOIN users u ON vs.user_id = u.id
       ORDER BY vs.id DESC`
    );
    res.json({ subscriptions: result.rows });
  } catch (error) {
    console.error("VIP subscription history error:", error);
    res.status(500).json({ message: "Unable to load VIP subscriptions." });
  }
});

app.post("/api/vip/access", requireUser, async (req, res) => {
  try {
    const { accessCode } = req.body;
    if (!accessCode) return res.status(400).json({ message: "Enter your VIP access code." });

    const result = await db.query(
      "SELECT * FROM vip_subscriptions WHERE code = $1",
      [accessCode.trim().toUpperCase()]
    );
    const subscription = result.rows[0];

    if (!subscription) return res.status(404).json({ message: "Invalid VIP access code." });
    if (subscription.status !== "unused") {
      return res.status(400).json({ message: "This VIP code has already been used." });
    }

    const activatedAt = new Date();
    const expiresAt = new Date(
      activatedAt.getTime() +
      subscription.duration_days * 24 * 60 * 60 * 1000
    );

    await db.query(
      `UPDATE vip_subscriptions
       SET status = 'active', user_id = $1, activated_at = $2, expires_at = $3
       WHERE id = $4`,
      [req.user.id, activatedAt.toISOString(), expiresAt.toISOString(), subscription.id]
    );

    const vipToken = createToken(
      { id: req.user.id, subscriptionId: subscription.id, type: "vip" },
      `${subscription.duration_days}d`
    );

    res.json({
      message: "VIP access activated.",
      token: vipToken,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        durationDays: subscription.duration_days,
        activatedAt: activatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: "active"
      }
    });
  } catch (error) {
    console.error("VIP access error:", error);
    res.status(500).json({ message: "Unable to activate VIP access." });
  }
});

app.get("/api/vip/status", requireUser, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, plan, duration_days, status, activated_at, expires_at
       FROM vip_subscriptions
       WHERE user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [req.user.id]
    );
    const subscription = result.rows[0];

    if (!subscription) {
      return res.json({
        active: false, status: "locked", plan: null, expiresAt: null, remainingDays: 0
      });
    }

    if (
      subscription.status === "active" &&
      subscription.expires_at &&
      new Date(subscription.expires_at) <= new Date()
    ) {
      await db.query(
        "UPDATE vip_subscriptions SET status = 'expired' WHERE id = $1",
        [subscription.id]
      );
      subscription.status = "expired";
    }
    let remainingDays = 0;
    if (subscription.status === "active" && subscription.expires_at) {
      remainingDays = Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
        )
      );
    }

    res.json({
      active: subscription.status === "active",
      status: subscription.status,
      plan: subscription.plan,
      expiresAt: subscription.expires_at,
      remainingDays
    });
  } catch (error) {
    console.error("VIP status error:", error);
    res.status(500).json({ message: "Unable to load VIP status." });
  }
});

app.get("/api/predictions", async (req, res) => {
  try {
    let result;
    if (req.query.results === "true") {
      result = await db.query(
        `SELECT * FROM predictions
         WHERE category = 'regular' AND status != 'pending'
         ORDER BY match_date DESC, match_time DESC`
      );
    } else {
      result = await db.query(
        `SELECT * FROM predictions
         WHERE category = 'regular'
         ORDER BY match_date ASC, match_time ASC`
      );
    }
    res.json({ predictions: result.rows });
  } catch (error) {
    console.error("Regular predictions error:", error);
    res.status(500).json({ message: "Unable to load predictions." });
  }
});

app.get("/api/predictions/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM predictions
       WHERE id = $1 AND category = 'regular'`,
      [req.params.id]
    );
    const prediction = result.rows[0];
    if (!prediction) return res.status(404).json({ message: "Prediction not found." });
    res.json({ prediction });
  } catch (error) {
    console.error("Single prediction error:", error);
    res.status(500).json({ message: "Unable to load prediction." });
  }
});

app.get("/api/vip/predictions", requireVip, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM predictions
       WHERE category = 'vip'
       ORDER BY match_date ASC, match_time ASC`
    );
    res.json({ predictions: result.rows });
  } catch (error) {
    console.error("VIP predictions error:", error);
    res.status(500).json({ message: "Unable to load VIP predictions." });
  }
});

app.get("/api/admin/predictions", requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM predictions
       ORDER BY match_date DESC, match_time DESC`
    );
    res.json({ predictions: result.rows });
  } catch (error) {
    console.error("Admin predictions error:", error);
    res.status(500).json({ message: "Unable to load predictions." });
  }
});

app.get("/api/admin/vip-predictions", requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM predictions
       WHERE category = 'vip'
       ORDER BY match_date DESC, match_time DESC`
    );
    res.json({ predictions: result.rows });
  } catch (error) {
    console.error("Admin VIP predictions error:", error);
    res.status(500).json({ message: "Unable to load VIP predictions." });
  }
});

app.post("/api/predictions", requireAdmin, async (req, res) => {
  try {
    const {
      league, home_team, away_team, match_date, match_time,
      prediction, analysis, category, status
    } = req.body;

    if (!league || !home_team || !away_team || !match_date || !match_time || !prediction) {
      return res.status(400).json({ message: "Please complete all required prediction fields." });
    }

    const finalCategory = ["regular", "vip"].includes(category) ? category : "regular";
    const finalStatus = ["pending", "won", "lost", "void"].includes(status) ? status : "pending";

    const result = await db.query(
      `INSERT INTO predictions
       (league, home_team, away_team, match_date, match_time, prediction, analysis, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        league.trim(), home_team.trim(), away_team.trim(),
        match_date, match_time, prediction.trim(),
        analysis ? analysis.trim() : "", finalCategory, finalStatus
      ]
    );

    res.status(201).json({
      message: "Prediction added successfully.",
      prediction: result.rows[0]
    });
  } catch (error) {
    console.error("Create prediction error:", error);
    res.status(500).json({ message: "Unable to create prediction." });
  }
});
app.put("/api/predictions/:id", requireAdmin, async (req, res) => {
  try {
    const {
      league, home_team, away_team, match_date, match_time,
      prediction, analysis, category, status
    } = req.body;

    if (!league || !home_team || !away_team || !match_date || !match_time || !prediction) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }

    const finalCategory = ["regular", "vip"].includes(category) ? category : "regular";
    const finalStatus = ["pending", "won", "lost", "void"].includes(status) ? status : "pending";

    const result = await db.query(
      `UPDATE predictions SET
         league = $1, home_team = $2, away_team = $3, match_date = $4,
         match_time = $5, prediction = $6, analysis = $7,
         category = $8, status = $9
       WHERE id = $10
       RETURNING *`,
      [
        league.trim(), home_team.trim(), away_team.trim(),
        match_date, match_time, prediction.trim(),
        analysis ? analysis.trim() : "", finalCategory, finalStatus, req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Prediction not found." });
    }

    res.json({
      message: "Prediction updated successfully.",
      prediction: result.rows[0]
    });
  } catch (error) {
    console.error("Update prediction error:", error);
    res.status(500).json({ message: "Unable to update prediction." });
  }
});

app.delete("/api/predictions/:id", requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM predictions WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Prediction not found." });
    }
    res.json({ message: "Prediction deleted successfully." });
  } catch (error) {
    console.error("Delete prediction error:", error);
    res.status(500).json({ message: "Unable to delete prediction." });
  }
});

app.patch("/api/predictions/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "won", "lost", "void"].includes(status)) {
      return res.status(400).json({ message: "Invalid result status." });
    }

    const result = await db.query(
      "UPDATE predictions SET status = $1 WHERE id = $2 RETURNING id",
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Prediction not found." });
    }
    res.json({ message: "Prediction status updated." });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ message: "Unable to update prediction status." });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ message: "Internal server error." });
});

async function startServer() {
  try {
    await db.init();
    app.listen(PORT, HOST, () => {
      console.log("==========================================");
      console.log("     FLEX HUB PREDICTIONS BACKEND");
      console.log("==========================================");
      console.log(`Server running on ${HOST}:${PORT}`);
      console.log("PostgreSQL database connected.");
      console.log("==========================================");
    });
  } catch (error) {
    console.error("Database startup error:", error);
    process.exit(1);
  }
}

startServer();
