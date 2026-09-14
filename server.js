// ============================================================
// FLEX HUB PREDICTIONS
// PRODUCTION BACKEND SERVER
// PostgreSQL + Express
// ============================================================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const db = require("./database");

const app = express();

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret-in-render";

const ADMIN_USERNAME =
  process.env.ADMIN_USERNAME || "admin";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://flexhubpredictions.github.io";

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://flexhubpredictions.github.io",
  "https://flex-hub-prediction.onrender.com",
  FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an origin
      // such as Postman or server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true
  })
);

// ============================================================
// BODY PARSING
// ============================================================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// BASIC REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  next();
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function cleanString(value) {
  return String(value || "").trim();
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (
    value === "true" ||
    value === "1" ||
    value === 1
  ) {
    return true;
  }

  return false;
}

function createUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      type: "user"
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function createAdminToken() {
  return jwt.sign(
    {
      username: ADMIN_USERNAME,
      type: "admin"
    },
    JWT_SECRET,
    {
      expiresIn: "12h"
    }
  );
}

// ============================================================
// DATABASE ACTIVITY LOG
// ============================================================

async function logActivity(actor, action, details = "") {
  try {
    const userId = actor?.id ?? null;
    const name = actor?.name ?? "";
    const username = actor?.username ?? "";

    await db.query(
      `
      INSERT INTO activity_logs
      (
        user_id,
        name,
        username,
        action,
        details
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        userId,
        name,
        username,
        action,
        details
      ]
    );
  } catch (error) {
    console.error(
      "Activity log error:",
      error.message
    );
  }
}

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function requireUser(req, res, next) {
  try {
    const authorization =
      req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const token =
      authorization.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing."
      });
    }

    const decoded =
      jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "user") {
      return res.status(401).json({
        success: false,
        message: "Invalid user token."
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
}

function requireAdmin(req, res, next) {
  try {
    const authorization =
      req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required."
      });
    }

    const token =
      authorization.substring(7).trim();

    const decoded =
      jwt.verify(token, JWT_SECRET);

    if (decoded.type !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access denied."
      });
    }

    req.admin = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token."
    });
  }
}

// ============================================================
// STATUS
// ============================================================

app.get("/api/status", async (req, res) => {
  try {
    await db.query("SELECT 1");

    return res.json({
      success: true,
      status: "online",
      message: "FLEX HUB PREDICTIONS backend is running.",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(
      "Status database error:",
      error
    );

    return res.status(500).json({
      success: false,
      status: "error",
      message: "Backend is running but database connection failed.",
      database: "disconnected"
    });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      success: true,
      status: "healthy",
      database: "connected"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

// ============================================================
// REGISTER USER
// ============================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = cleanString(req.body.name);
    const username =
      normalizeUsername(req.body.username);
    const email =
      normalizeEmail(req.body.email);
    const password =
      String(req.body.password || "");

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be completed."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const existing =
      await db.query(
        `
        SELECT id, username, email
        FROM users
        WHERE LOWER(username) = LOWER($1)
           OR LOWER(email) = LOWER($2)
        LIMIT 1
        `,
        [username, email]
      );

    if (existing.rows.length > 0) {
      const found = existing.rows[0];

      if (
        found.username.toLowerCase() ===
        username.toLowerCase()
      ) {
        return res.status(409).json({
          success: false,
          message: "Username already exists."
        });
      }

      return res.status(409).json({
        success: false,
        message: "Email already exists."
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const result =
      await db.query(
        `
        INSERT INTO users
        (
          name,
          username,
          email,
          password,
          is_active
        )
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING
          id,
          name,
          username,
          email,
          is_active,
          created_at,
          regular_access_expires_at,
          last_payment_reference
        `,
        [
          name,
          username,
          email,
          hashedPassword
        ]
      );

    const user = result.rows[0];

    await logActivity(
      user,
      "REGISTER",
      "New user account created."
    );

    const token =
      createUserToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        ...user,
        status: user.is_active
          ? "active"
          : "inactive"
      }
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
});

// ============================================================
// LOGIN USER
// ============================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const identifier =
      cleanString(
        req.body.identifier ||
        req.body.username ||
        req.body.email
      );

    const password =
      String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required."
      });
    }

    const result =
      await db.query(
        `
        SELECT
          id,
          name,
          username,
          email,
          password,
          is_active,
          created_at,
          regular_access_expires_at,
          last_payment_reference
        FROM users
        WHERE LOWER(username) = LOWER($1)
           OR LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [identifier]
      );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials."
      });
    }

    const user = result.rows[0];

    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials."
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled."
      });
    }

    const token =
      createUserToken(user);

    await logActivity(
      user,
      "LOGIN",
      "User logged in successfully."
    );

    delete user.password;

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        ...user,
        status: user.is_active
          ? "active"
          : "inactive"
      }
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
});

// ============================================================
// GET CURRENT USER
// ============================================================

app.get(
  "/api/user/me",
  requireUser,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            name,
            username,
            email,
            is_active,
            created_at,
            regular_access_expires_at,
            last_payment_reference
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User account not found."
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: "This account has been disabled."
        });
      }

      return res.json({
        success: true,
        user: {
          ...user,
          status: user.is_active
            ? "active"
            : "inactive"
        }
      });
    } catch (error) {
      console.error(
        "User profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to load user profile."
      });
    }
  }
);

// ============================================================
// LOGOUT
// ============================================================

app.post(
  "/api/auth/logout",
  requireUser,
  async (req, res) => {
    try {
      await logActivity(
        req.user,
        "LOGOUT",
        "User logged out."
      );

      return res.json({
        success: true,
        message: "Logged out successfully."
      });
    } catch (error) {
      return res.json({
        success: true,
        message: "Logged out successfully."
      });
    }
  }
);

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post("/api/admin/login", async (req, res) => {
  try {
    const username =
      cleanString(req.body.username);

    const password =
      String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Admin username and password are required."
      });
    }

    if (
      username !== ADMIN_USERNAME ||
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials."
      });
    }

    const token =
      createAdminToken();

    return res.json({
      success: true,
      message: "Admin login successful.",
      token,
      admin: {
        username: ADMIN_USERNAME,
        type: "admin"
      }
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Admin login failed."
    });
  }
});

// ============================================================
// ADMIN PROFILE
// ============================================================

app.get(
  "/api/admin/me",
  requireAdmin,
  async (req, res) => {
    return res.json({
      success: true,
      admin: {
        username: req.admin.username,
        type: "admin"
      }
    });
  }
);

// ============================================================
// REGULAR ACCESS
// ============================================================

app.get(
  "/api/user/access",
  requireUser,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            is_active,
            regular_access_expires_at
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      const user = result.rows[0];

      let regularAccessActive = true;

      if (
        user.regular_access_expires_at &&
        new Date(
          user.regular_access_expires_at
        ) <= new Date()
      ) {
        regularAccessActive = false;
      }

      return res.json({
        success: true,
        regularAccessActive,
        regularAccessExpiresAt:
          user.regular_access_expires_at
      });
    } catch (error) {
      console.error(
        "Regular access error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to check access."
      });
    }
  }
);
// ============================================================
// PASSWORD RESET - REQUEST
// ============================================================

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    const userResult = await db.query(
      `
      SELECT
        id,
        name,
        username,
        email
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    // Do not reveal whether an account exists.
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message:
          "If an account exists for that email, password reset instructions have been generated."
      });
    }

    const user = userResult.rows[0];

    // Generate a random reset token.
    const rawToken =
      crypto.randomBytes(32).toString("hex");

    // Only the hash is stored in the database.
    const tokenHash =
      crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    const expiresAt =
      new Date(Date.now() + 30 * 60 * 1000);

    // Remove previous unused tokens for this user.
    await db.query(
      `
      DELETE FROM password_reset_tokens
      WHERE user_id = $1
        AND used_at IS NULL
      `,
      [user.id]
    );

    await db.query(
      `
      INSERT INTO password_reset_tokens
      (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
      `,
      [
        user.id,
        tokenHash,
        expiresAt
      ]
    );

    await logActivity(
      user,
      "PASSWORD_RESET_REQUEST",
      "Password reset requested."
    );

    /*
      For now we return the token so the frontend can
      complete the reset flow.

      In production, this should normally be sent
      through an email service instead.
    */

    return res.json({
      success: true,
      message:
        "Password reset token generated.",
      resetToken: rawToken,
      expiresAt
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process password reset request."
    });
  }
});

// ============================================================
// PASSWORD RESET - COMPLETE
// ============================================================

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const token =
      cleanString(
        req.body.token ||
        req.body.resetToken
      );

    const newPassword =
      String(
        req.body.password ||
        req.body.newPassword ||
        ""
      );

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters."
      });
    }

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const tokenResult =
      await db.query(
        `
        SELECT
          prt.id,
          prt.user_id,
          prt.expires_at,
          prt.used_at,
          u.id AS user_id,
          u.name,
          u.username,
          u.email
        FROM password_reset_tokens prt
        INNER JOIN users u
          ON u.id = prt.user_id
        WHERE prt.token_hash = $1
        LIMIT 1
        `,
        [tokenHash]
      );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid password reset token."
      });
    }

    const resetRecord =
      tokenResult.rows[0];

    if (resetRecord.used_at) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset token has already been used."
      });
    }

    if (
      new Date(resetRecord.expires_at) <=
      new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This password reset token has expired."
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );

    await db.query(
      `
      UPDATE users
      SET password = $1
      WHERE id = $2
      `,
      [
        hashedPassword,
        resetRecord.user_id
      ]
    );

    await db.query(
      `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [resetRecord.id]
    );

    await logActivity(
      {
        id: resetRecord.user_id,
        name: resetRecord.name,
        username: resetRecord.username
      },
      "PASSWORD_RESET",
      "User password was reset successfully."
    );

    return res.json({
      success: true,
      message:
        "Password reset successfully."
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reset password."
    });
  }
});

// ============================================================
// PUBLIC REGULAR PREDICTIONS
// ============================================================

app.get("/api/predictions", async (req, res) => {
  try {
    const category =
      cleanString(req.query.category);

    const league =
      cleanString(req.query.league);

    const search =
      cleanString(req.query.search);

    const values = [];
    const conditions = [
      "category = 'regular'"
    ];

    if (category && category !== "all") {
      values.push(category);
      conditions.push(
        `category = $${values.length}`
      );
    }

    if (league && league !== "all") {
      values.push(league);
      conditions.push(
        `LOWER(league) = LOWER($${values.length})`
      );
    }

    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          LOWER(home_team) LIKE LOWER($${values.length})
          OR
          LOWER(away_team) LIKE LOWER($${values.length})
          OR
          LOWER(league) LIKE LOWER($${values.length})
        )
      `);
    }

    const result =
      await db.query(
        `
        SELECT
          id,
          league,
          home_team,
          away_team,
          match_date,
          match_time,
          prediction,
          analysis,
          category,
          status,
          featured,
          created_at
        FROM predictions
        WHERE ${conditions.join(" AND ")}
        ORDER BY
          featured DESC,
          match_date ASC,
          match_time ASC,
          id DESC
        `,
        values
      );

    return res.json({
      success: true,
      predictions: result.rows
    });
  } catch (error) {
    console.error(
      "Public predictions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load predictions."
    });
  }
});

// ============================================================
// SINGLE REGULAR PREDICTION
// ============================================================

app.get(
  "/api/predictions/:id",
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid prediction ID."
        });
      }

      const result =
        await db.query(
          `
          SELECT
            id,
            league,
            home_team,
            away_team,
            match_date,
            match_time,
            prediction,
            analysis,
            category,
            status,
            featured,
            created_at
          FROM predictions
          WHERE id = $1
            AND category = 'regular'
          LIMIT 1
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Prediction not found."
        });
      }

      return res.json({
        success: true,
        prediction:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "Single prediction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load prediction."
      });
    }
  }
);

// ============================================================
// PUBLIC RESULTS
// ============================================================

app.get("/api/results", async (req, res) => {
  try {
    const category =
      cleanString(req.query.category);

    const values = [];
    const conditions = [];

    if (
      category &&
      category !== "all"
    ) {
      values.push(category);

      conditions.push(
        `category = $${values.length}`
      );
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const result =
      await db.query(
        `
        SELECT
          id,
          prediction_id,
          league,
          home_team,
          away_team,
          match_date,
          match_time,
          prediction,
          analysis,
          category,
          status,
          featured,
          created_at
        FROM prediction_results
        ${whereClause}
        ORDER BY
          match_date DESC,
          match_time DESC,
          id DESC
        `,
        values
      );

    return res.json({
      success: true,
      results: result.rows
    });
  } catch (error) {
    console.error(
      "Public results error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load results."
    });
  }
});

// ============================================================
// VIP ACCESS HELPER
// ============================================================

async function getActiveVipSubscription(userId) {
  const result =
    await db.query(
      `
      SELECT
        id,
        code,
        plan,
        duration_days,
        status,
        user_id,
        activated_at,
        expires_at,
        created_at
      FROM vip_subscriptions
      WHERE user_id = $1
        AND status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY expires_at DESC
      LIMIT 1
      `,
      [userId]
    );

  return result.rows[0] || null;
}

// ============================================================
// VIP ACCESS STATUS
// ============================================================

app.get(
  "/api/vip/status",
  requireUser,
  async (req, res) => {
    try {
      const subscription =
        await getActiveVipSubscription(
          req.user.id
        );

      if (!subscription) {
        return res.json({
          success: true,
          hasVipAccess: false,
          active: false,
          subscription: null
        });
      }

      return res.json({
        success: true,
        hasVipAccess: true,
        active: true,
        subscription
      });
    } catch (error) {
      console.error(
        "VIP status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to check VIP status."
      });
    }
  }
);

// ============================================================
// ADMIN - LIST PREDICTIONS
// ============================================================

app.get(
  "/api/admin/predictions",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            league,
            home_team,
            away_team,
            match_date,
            match_time,
            prediction,
            analysis,
            category,
            status,
            featured,
            created_at
          FROM predictions
          ORDER BY
            match_date DESC,
            match_time DESC,
            id DESC
          `
        );

      return res.json({
        success: true,
        predictions:
          result.rows
      });
    } catch (error) {
      console.error(
        "Admin predictions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load predictions."
      });
    }
  }
);

// ============================================================
// ADMIN - LIST VIP PREDICTIONS
// ============================================================

app.get(
  "/api/admin/vip-predictions",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            league,
            home_team,
            away_team,
            match_date,
            match_time,
            prediction,
            analysis,
            category,
            status,
            featured,
            created_at
          FROM predictions
          WHERE category = 'vip'
          ORDER BY
            match_date DESC,
            match_time DESC,
            id DESC
          `
        );

      return res.json({
        success: true,
        predictions:
          result.rows
      });
    } catch (error) {
      console.error(
        "Admin VIP predictions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load VIP predictions."
      });
    }
  }
);

// ============================================================
// ADMIN - CREATE PREDICTION
// ============================================================

app.post(
  "/api/admin/predictions",
  requireAdmin,
  async (req, res) => {
    try {
      const league =
        cleanString(req.body.league);

      const homeTeam =
        cleanString(
          req.body.homeTeam ||
          req.body.home_team
        );

      const awayTeam =
        cleanString(
          req.body.awayTeam ||
          req.body.away_team
        );

      const matchDate =
        cleanString(
          req.body.matchDate ||
          req.body.match_date
        );

      const matchTime =
        cleanString(
          req.body.matchTime ||
          req.body.match_time
        );

      const prediction =
        cleanString(
          req.body.prediction
        );

      const analysis =
        cleanString(
          req.body.analysis
        );

      const category =
        cleanString(
          req.body.category
        ) ||
        (
          toBoolean(req.body.isVip)
            ? "vip"
            : "regular"
        );

      const status =
        cleanString(
          req.body.status
        ) || "pending";

      const featured =
        toBoolean(
          req.body.featured
        );

      if (
        !league ||
        !homeTeam ||
        !awayTeam ||
        !matchDate ||
        !matchTime ||
        !prediction
      ) {
        return res.status(400).json({
          success: false,
          message:
            "League, teams, date, time and prediction are required."
        });
      }

      if (
        !["regular", "vip"].includes(
          category
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Prediction category must be regular or vip."
        });
      }

      const result =
        await db.query(
          `
          INSERT INTO predictions
          (
            league,
            home_team,
            away_team,
            match_date,
            match_time,
            prediction,
            analysis,
            category,
            status,
            featured
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )
          RETURNING *
          `,
          [
            league,
            homeTeam,
            awayTeam,
            matchDate,
            matchTime,
            prediction,
            analysis || null,
            category,
            status,
            featured
          ]
        );

      const created =
        result.rows[0];

      await logActivity(
        {
          username:
            req.admin.username
        },
        "CREATE_PREDICTION",
        `Created ${category} prediction: ${homeTeam} vs ${awayTeam}`
      );

      return res.status(201).json({
        success: true,
        message:
          "Prediction created successfully.",
        prediction: created
      });
    } catch (error) {
      console.error(
        "Create prediction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create prediction."
      });
    }
  }
);

// ============================================================
// ADMIN - UPDATE PREDICTION
// ============================================================

app.put(
  "/api/admin/predictions/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid prediction ID."
        });
      }

      const existing =
        await db.query(
          `
          SELECT *
          FROM predictions
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Prediction not found."
        });
      }

      const old =
        existing.rows[0];

      const league =
        cleanString(
          req.body.league
        ) || old.league;

      const homeTeam =
        cleanString(
          req.body.homeTeam ||
          req.body.home_team
        ) || old.home_team;

      const awayTeam =
        cleanString(
          req.body.awayTeam ||
          req.body.away_team
        ) || old.away_team;

      const matchDate =
        cleanString(
          req.body.matchDate ||
          req.body.match_date
        ) || old.match_date;

      const matchTime =
        cleanString(
          req.body.matchTime ||
          req.body.match_time
        ) || old.match_time;

      const prediction =
        cleanString(
          req.body.prediction
        ) || old.prediction;

      const analysis =
        req.body.analysis !== undefined
          ? cleanString(
              req.body.analysis
            )
          : old.analysis;

      const category =
        cleanString(
          req.body.category
        ) ||
        (
          req.body.isVip !== undefined
            ? (
                toBoolean(
                  req.body.isVip
                )
                  ? "vip"
                  : "regular"
              )
            : old.category
        );

      const status =
        cleanString(
          req.body.status
        ) || old.status;

      const featured =
        req.body.featured !== undefined
          ? toBoolean(
              req.body.featured
            )
          : old.featured;

      if (
        !["regular", "vip"].includes(
          category
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Prediction category must be regular or vip."
        });
      }

      const result =
        await db.query(
          `
          UPDATE predictions
          SET
            league = $1,
            home_team = $2,
            away_team = $3,
            match_date = $4,
            match_time = $5,
            prediction = $6,
            analysis = $7,
            category = $8,
            status = $9,
            featured = $10
          WHERE id = $11
          RETURNING *
          `,
          [
            league,
            homeTeam,
            awayTeam,
            matchDate,
            matchTime,
            prediction,
            analysis || null,
            category,
            status,
            featured,
            id
          ]
        );

      await logActivity(
        {
          username:
            req.admin.username
        },
        "UPDATE_PREDICTION",
        `Updated prediction #${id}`
      );

      return res.json({
        success: true,
        message:
          "Prediction updated successfully.",
        prediction:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "Update prediction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update prediction."
      });
    }
  }
);
// ============================================================
// ADMIN - DELETE PREDICTION
// ============================================================

app.delete(
  "/api/admin/predictions/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid prediction ID."
        });
      }

      const existing = await db.query(
        `
        SELECT *
        FROM predictions
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Prediction not found."
        });
      }

      await db.query(
        `
        DELETE FROM predictions
        WHERE id = $1
        `,
        [id]
      );

      await logActivity(
        {
          username: req.admin.username
        },
        "DELETE_PREDICTION",
        `Deleted prediction #${id}`
      );

      return res.json({
        success: true,
        message: "Prediction deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete prediction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to delete prediction."
      });
    }
  }
);

// ============================================================
// ADMIN - UPDATE PREDICTION STATUS
// ============================================================

app.patch(
  "/api/admin/predictions/:id/status",
  requireAdmin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const status =
        cleanString(req.body.status) ||
        "pending";

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid prediction ID."
        });
      }

      const result = await db.query(
        `
        UPDATE predictions
        SET status = $1
        WHERE id = $2
        RETURNING *
        `,
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Prediction not found."
        });
      }

      await logActivity(
        {
          username: req.admin.username
        },
        "UPDATE_PREDICTION_STATUS",
        `Prediction #${id} status changed to ${status}`
      );

      return res.json({
        success: true,
        message: "Prediction status updated.",
        prediction: result.rows[0]
      });
    } catch (error) {
      console.error(
        "Prediction status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update prediction status."
      });
    }
  }
);

// ============================================================
// ADMIN - RESULTS
// ============================================================

app.get(
  "/api/admin/results",
  requireAdmin,
  async (req, res) => {
    try {
      const result = await db.query(
        `
        SELECT
          id,
          prediction_id,
          league,
          home_team,
          away_team,
          match_date,
          match_time,
          prediction,
          analysis,
          category,
          status,
          featured,
          created_at
        FROM prediction_results
        ORDER BY
          match_date DESC,
          match_time DESC,
          id DESC
        `
      );

      return res.json({
        success: true,
        results: result.rows
      });
    } catch (error) {
      console.error(
        "Admin results error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to load results."
      });
    }
  }
);

// ============================================================
// ADMIN - CREATE RESULT
// ============================================================

app.post(
  "/api/admin/results",
  requireAdmin,
  async (req, res) => {
    try {
      const predictionIdRaw =
        req.body.predictionId ??
        req.body.prediction_id;

      const predictionId =
        predictionIdRaw === undefined ||
        predictionIdRaw === null ||
        predictionIdRaw === ""
          ? null
          : Number(predictionIdRaw);

      let league =
        cleanString(req.body.league);

      let homeTeam =
        cleanString(
          req.body.homeTeam ||
          req.body.home_team
        );

      let awayTeam =
        cleanString(
          req.body.awayTeam ||
          req.body.away_team
        );

      let matchDate =
        cleanString(
          req.body.matchDate ||
          req.body.match_date
        );

      let matchTime =
        cleanString(
          req.body.matchTime ||
          req.body.match_time
        );

      let prediction =
        cleanString(req.body.prediction);

      let analysis =
        cleanString(req.body.analysis);

      let category =
        cleanString(req.body.category) ||
        "regular";

      const status =
        cleanString(req.body.status) ||
        "pending";

      const featured =
        toBoolean(req.body.featured);

      // If a prediction ID is supplied,
      // use the existing prediction as the source.
      if (
        predictionId !== null &&
        Number.isInteger(predictionId)
      ) {
        const predictionResult =
          await db.query(
            `
            SELECT
              id,
              league,
              home_team,
              away_team,
              match_date,
              match_time,
              prediction,
              analysis,
              category,
              featured
            FROM predictions
            WHERE id = $1
            LIMIT 1
            `,
            [predictionId]
          );

        if (
          predictionResult.rows.length === 0
        ) {
          return res.status(404).json({
            success: false,
            message:
              "The selected prediction was not found."
          });
        }

        const source =
          predictionResult.rows[0];

        league =
          league || source.league;

        homeTeam =
          homeTeam || source.home_team;

        awayTeam =
          awayTeam || source.away_team;

        matchDate =
          matchDate || source.match_date;

        matchTime =
          matchTime || source.match_time;

        prediction =
          prediction || source.prediction;

        analysis =
          analysis || source.analysis || "";

        category =
          category || source.category;

      }

      if (
        !league ||
        !homeTeam ||
        !awayTeam ||
        !matchDate ||
        !matchTime ||
        !prediction
      ) {
        return res.status(400).json({
          success: false,
          message:
            "League, teams, date, time and prediction are required."
        });
      }

      if (
        !["regular", "vip"].includes(
          category
        )
      ) {
        category = "regular";
      }

      const result =
        await db.query(
          `
          INSERT INTO prediction_results
          (
            prediction_id,
            league,
            home_team,
            away_team,
            match_date,
            match_time,
            prediction,
            analysis,
            category,
            status,
            featured
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
          RETURNING *
          `,
          [
            Number.isInteger(predictionId)
              ? predictionId
              : null,
            league,
            homeTeam,
            awayTeam,
            matchDate,
            matchTime,
            prediction,
            analysis || null,
            category,
            status,
            featured
          ]
        );

      const created =
        result.rows[0];

      await logActivity(
        {
          username:
            req.admin.username
        },
        "CREATE_RESULT",
        `Created result for ${homeTeam} vs ${awayTeam}`
      );

      return res.status(201).json({
        success: true,
        message:
          "Result created successfully.",
        result: created
      });
    } catch (error) {
      console.error(
        "Create result error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create result."
      });
    }
  }
);

// ============================================================
// ADMIN - UPDATE RESULT
// ============================================================

app.put(
  "/api/admin/results/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid result ID."
        });
      }

      const existing =
        await db.query(
          `
          SELECT *
          FROM prediction_results
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        existing.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "Result not found."
        });
      }

      const old =
        existing.rows[0];

      const league =
        cleanString(
          req.body.league
        ) || old.league;

      const homeTeam =
        cleanString(
          req.body.homeTeam ||
          req.body.home_team
        ) || old.home_team;

      const awayTeam =
        cleanString(
          req.body.awayTeam ||
          req.body.away_team
        ) || old.away_team;

      const matchDate =
        cleanString(
          req.body.matchDate ||
          req.body.match_date
        ) || old.match_date;

      const matchTime =
        cleanString(
          req.body.matchTime ||
          req.body.match_time
        ) || old.match_time;

      const prediction =
        cleanString(
          req.body.prediction
        ) || old.prediction;

      const analysis =
        req.body.analysis !== undefined
          ? cleanString(
              req.body.analysis
            )
          : old.analysis;

      const category =
        cleanString(
          req.body.category
        ) || old.category;

      const status =
        cleanString(
          req.body.status
        ) || old.status;

      const featured =
        req.body.featured !== undefined
          ? toBoolean(
              req.body.featured
            )
          : old.featured;

      const result =
        await db.query(
          `
          UPDATE prediction_results
          SET
            league = $1,
            home_team = $2,
            away_team = $3,
            match_date = $4,
            match_time = $5,
            prediction = $6,
            analysis = $7,
            category = $8,
            status = $9,
            featured = $10
          WHERE id = $11
          RETURNING *
          `,
          [
            league,
            homeTeam,
            awayTeam,
            matchDate,
            matchTime,
            prediction,
            analysis || null,
            category,
            status,
            featured,
            id
          ]
        );

      await logActivity(
        {
          username:
            req.admin.username
        },
        "UPDATE_RESULT",
        `Updated result #${id}`
      );

      return res.json({
        success: true,
        message:
          "Result updated successfully.",
        result:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "Update result error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update result."
      });
    }
  }
);

// ============================================================
// ADMIN - DELETE RESULT
// ============================================================

app.delete(
  "/api/admin/results/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid result ID."
        });
      }

      const result =
        await db.query(
          `
          DELETE FROM prediction_results
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Result not found."
        });
      }

      await logActivity(
        {
          username:
            req.admin.username
        },
        "DELETE_RESULT",
        `Deleted result #${id}`
      );

      return res.json({
        success: true,
        message:
          "Result deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete result error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete result."
      });
    }
  }
);

// ============================================================
// ADMIN - RESET RESULT
// ============================================================

app.patch(
  "/api/admin/results/:id/reset",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid result ID."
        });
      }

      const result =
        await db.query(
          `
          UPDATE prediction_results
          SET status = 'pending'
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Result not found."
        });
      }

      await logActivity(
        {
          username:
            req.admin.username
        },
        "RESET_RESULT",
        `Reset result #${id} to pending`
      );

      return res.json({
        success: true,
        message:
          "Result reset successfully.",
        result:
          result.rows[0]
      });
    } catch (error) {
      console.error(
        "Reset result error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to reset result."
      });
    }
  }
);

// ============================================================
// ADMIN - USERS
// ============================================================

app.get(
  "/api/admin/users",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            name,
            username,
            email,
            is_active,
            created_at,
            regular_access_expires_at,
            last_payment_reference
          FROM users
          ORDER BY id DESC
          `
        );

      const users =
        result.rows.map((user) => ({
          ...user,
          status:
            user.is_active
              ? "active"
              : "inactive"
        }));

      return res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error(
        "Admin users error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load users."
      });
    }
  }
);

// ============================================================
// ADMIN - UPDATE USER
// ============================================================

app.put(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID."
        });
      }

      const existing =
        await db.query(
          `
          SELECT
            id,
            name,
            username,
            email,
            is_active
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );

      if (
        existing.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "User not found."
        });
      }

      const old =
        existing.rows[0];

      const name =
        req.body.name !== undefined
          ? cleanString(
              req.body.name
            )
          : old.name;

      const username =
        req.body.username !== undefined
          ? normalizeUsername(
              req.body.username
            )
          : old.username;

      const email =
        req.body.email !== undefined
          ? normalizeEmail(
              req.body.email
            )
          : old.email;

      const isActive =
        req.body.is_active !== undefined
          ? toBoolean(
              req.body.is_active
            )
          : req.body.isActive !== undefined
          ? toBoolean(
              req.body.isActive
            )
          : old.is_active;

      if (!name || !username || !email) {
        return res.status(400).json({
          success: false,
          message:
            "Name, username and email are required."
        });
      }

      const result =
        await db.query(
          `
          UPDATE users
          SET
            name = $1,
            username = $2,
            email = $3,
            is_active = $4
          WHERE id = $5
          RETURNING
            id,
            name,
            username,
            email,
            is_active,
            created_at,
            regular_access_expires_at,
            last_payment_reference
          `,
          [
            name,
            username,
            email,
            isActive,
            id
          ]
        );

      const updated =
        result.rows[0];

      await logActivity(
        {
          username:
            req.admin.username
        },
        "UPDATE_USER",
        `Updated user #${id}`
      );

      return res.json({
        success: true,
        message:
          "User updated successfully.",
        user: {
          ...updated,
          status:
            updated.is_active
              ? "active"
              : "inactive"
        }
      });
    } catch (error) {
      console.error(
        "Update user error:",
        error
      );

      if (
        error.code === "23505"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Username or email already exists."
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to update user."
      });
    }
  }
);
// ============================================================
// ADMIN - UPDATE USER STATUS
// ============================================================

app.patch(
  "/api/admin/users/:id/status",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID."
        });
      }

      const isActive =
        req.body.is_active !== undefined
          ? toBoolean(req.body.is_active)
          : req.body.isActive !== undefined
          ? toBoolean(req.body.isActive)
          : true;

      const result =
        await db.query(
          `
          UPDATE users
          SET is_active = $1
          WHERE id = $2
          RETURNING
            id,
            name,
            username,
            email,
            is_active,
            created_at,
            regular_access_expires_at,
            last_payment_reference
          `,
          [isActive, id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      const user =
        result.rows[0];

      await logActivity(
        {
          username:
            req.admin.username
        },
        "UPDATE_USER_STATUS",
        `User #${id} status changed to ${
          isActive ? "active" : "inactive"
        }`
      );

      return res.json({
        success: true,
        message:
          "User status updated successfully.",
        user: {
          ...user,
          status:
            user.is_active
              ? "active"
              : "inactive"
        }
      });
    } catch (error) {
      console.error(
        "Update user status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update user status."
      });
    }
  }
);

// ============================================================
// ADMIN - DELETE USER
// ============================================================

app.delete(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID."
        });
      }

      const result =
        await db.query(
          `
          DELETE FROM users
          WHERE id = $1
          RETURNING id, name, username, email
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      await logActivity(
        {
          username:
            req.admin.username
        },
        "DELETE_USER",
        `Deleted user #${id}`
      );

      return res.json({
        success: true,
        message:
          "User deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete user."
      });
    }
  }
);

// ============================================================
// ADMIN - ACTIVITY LOGS
// ============================================================

app.get(
  "/api/admin/activity-logs",
  requireAdmin,
  async (req, res) => {
    try {
      let limit =
        Number(req.query.limit || 200);

      if (!Number.isInteger(limit)) {
        limit = 200;
      }

      limit =
        Math.min(
          Math.max(limit, 1),
          500
        );

      const result =
        await db.query(
          `
          SELECT
            id,
            user_id,
            name,
            username,
            action,
            details,
            created_at
          FROM activity_logs
          ORDER BY id DESC
          LIMIT $1::integer
          `,
          [limit]
        );

      return res.json({
        success: true,
        logs: result.rows,
        activityLogs: result.rows
      });
    } catch (error) {
      console.error(
        "Activity logs error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load activity logs."
      });
    }
  }
);

// ============================================================
// ADMIN - NOTIFICATIONS
// ============================================================

app.get(
  "/api/admin/notifications",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            title,
            message,
            target,
            created_at
          FROM notifications
          ORDER BY id DESC
          LIMIT 200
          `
        );

      const notifications =
        result.rows.map(
          (notification) => ({
            ...notification,

            // Compatibility value for
            // admin frontend code that expects type.
            type: "info"
          })
        );

      return res.json({
        success: true,
        notifications
      });
    } catch (error) {
      console.error(
        "Admin notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load notifications."
      });
    }
  }
);

// ============================================================
// ADMIN - CREATE NOTIFICATION
// ============================================================

app.post(
  "/api/admin/notifications",
  requireAdmin,
  async (req, res) => {
    try {
      const title =
        cleanString(req.body.title);

      const message =
        cleanString(req.body.message);

      const target =
        cleanString(
          req.body.target
        ) || "all";

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message:
            "Notification title and message are required."
        });
      }

      const result =
        await db.query(
          `
          INSERT INTO notifications
          (
            title,
            message,
            target
          )
          VALUES ($1, $2, $3)
          RETURNING *
          `,
          [
            title,
            message,
            target
          ]
        );

      const notification =
        result.rows[0];

      await logActivity(
        {
          username:
            req.admin.username
        },
        "CREATE_NOTIFICATION",
        `Created notification: ${title}`
      );

      return res.status(201).json({
        success: true,
        message:
          "Notification created successfully.",
        notification: {
          ...notification,
          type: "info"
        }
      });
    } catch (error) {
      console.error(
        "Create notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create notification."
      });
    }
  }
);

// ============================================================
// ADMIN - DELETE NOTIFICATION
// ============================================================

app.delete(
  "/api/admin/notifications/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification ID."
        });
      }

      const result =
        await db.query(
          `
          DELETE FROM notifications
          WHERE id = $1
          RETURNING *
          `,
          [id]
        );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found."
        });
      }

      await logActivity(
        {
          username:
            req.admin.username
        },
        "DELETE_NOTIFICATION",
        `Deleted notification #${id}`
      );

      return res.json({
        success: true,
        message:
          "Notification deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete notification."
      });
    }
  }
);

// ============================================================
// USER - NOTIFICATIONS
// ============================================================

app.get(
  "/api/notifications",
  requireUser,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            n.id,
            n.title,
            n.message,
            n.target,
            n.created_at,
            CASE
              WHEN nr.id IS NULL THEN FALSE
              ELSE TRUE
            END AS is_read
          FROM notifications n
          LEFT JOIN notification_reads nr
            ON nr.notification_id = n.id
           AND nr.user_id = $1
          WHERE
            n.target = 'all'
            OR n.target = 'users'
          ORDER BY n.id DESC
          LIMIT 200
          `,
          [req.user.id]
        );

      return res.json({
        success: true,
        notifications:
          result.rows
      });
    } catch (error) {
      console.error(
        "User notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load notifications."
      });
    }
  }
);

// ============================================================
// USER - MARK NOTIFICATION AS READ
// ============================================================

app.post(
  "/api/notifications/:id/read",
  requireUser,
  async (req, res) => {
    try {
      const notificationId =
        Number(req.params.id);

      if (
        !Number.isInteger(
          notificationId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification ID."
        });
      }

      await db.query(
        `
        INSERT INTO notification_reads
        (
          notification_id,
          user_id
        )
        VALUES ($1, $2)
        ON CONFLICT
        (
          notification_id,
          user_id
        )
        DO NOTHING
        `,
        [
          notificationId,
          req.user.id
        ]
      );

      return res.json({
        success: true,
        message:
          "Notification marked as read."
      });
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to mark notification as read."
      });
    }
  }
);

// ============================================================
// ADMIN - GENERATE VIP CODE
// ============================================================

function generateVipCode() {
  const random =
    crypto
      .randomBytes(8)
      .toString("hex")
      .toUpperCase();

  return `FLEX-VIP-${random}`;
}

app.post(
  "/api/admin/vip-codes",
  requireAdmin,
  async (req, res) => {
    try {
      const plan =
        cleanString(
          req.body.plan
        ) || "1_week";

      const planMap = {
        "1_week": {
          duration: 7,
          label: "1 Week"
        },

        "2_weeks": {
          duration: 14,
          label: "2 Weeks"
        },

        "1_month": {
          duration: 30,
          label: "1 Month"
        }
      };

      if (!planMap[plan]) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid VIP plan."
        });
      }

      let code =
        generateVipCode();

      // Extremely unlikely collision protection.
      for (let i = 0; i < 5; i++) {
        const exists =
          await db.query(
            `
            SELECT id
            FROM vip_subscriptions
            WHERE code = $1
            LIMIT 1
            `,
            [code]
          );

        if (
          exists.rows.length === 0
        ) {
          break;
        }

        code =
          generateVipCode();
      }

      const result =
        await db.query(
          `
          INSERT INTO vip_subscriptions
          (
            code,
            plan,
            duration_days,
            status
          )
          VALUES ($1, $2, $3, 'unused')
          RETURNING *
          `,
          [
            code,
            plan,
            planMap[plan].duration
          ]
        );

      const vipCode =
        result.rows[0];

      await logActivity(
        {
          username:
            req.admin.username
        },
        "GENERATE_VIP_CODE",
        `Generated VIP code for ${planMap[plan].label}`
      );

      return res.status(201).json({
        success: true,
        message:
          "VIP code generated successfully.",
        code: vipCode
      });
    } catch (error) {
      console.error(
        "Generate VIP code error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate VIP code."
      });
    }
  }
);

// ============================================================
// ADMIN - LIST VIP CODES
// ============================================================

app.get(
  "/api/admin/vip-codes",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            code,
            plan,
            duration_days,
            status,
            user_id,
            activated_at,
            expires_at,
            created_at
          FROM vip_subscriptions
          ORDER BY id DESC
          `
        );

      return res.json({
        success: true,
        codes:
          result.rows,
        vipCodes:
          result.rows
      });
    } catch (error) {
      console.error(
        "Admin VIP codes error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load VIP codes."
      });
    }
  }
);

// ============================================================
// ADMIN - DELETE UNUSED VIP CODE
// ============================================================

app.delete(
  "/api/admin/vip-codes/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid VIP code ID."
        });
      }

      const result =
        await db.query(
          `
          DELETE FROM vip_subscriptions
          WHERE id = $1
            AND status = 'unused'
          RETURNING *
          `,
          [id]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "VIP code not found or has already been used."
        });
      }

      await logActivity(
        {
          username:
            req.admin.username
        },
        "DELETE_VIP_CODE",
        `Deleted VIP code #${id}`
      );

      return res.json({
        success: true,
        message:
          "VIP code deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete VIP code error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete VIP code."
      });
    }
  }
);

// ============================================================
// USER - REDEEM VIP CODE
// ============================================================

app.post(
  "/api/vip/redeem",
  requireUser,
  async (req, res) => {
    const client =
      await db.pool.connect();

    try {
      const code =
        cleanString(
          req.body.code
        ).toUpperCase();

      if (!code) {
        client.release();

        return res.status(400).json({
          success: false,
          message:
            "VIP access code is required."
        });
      }

      await client.query(
        "BEGIN"
      );

      const codeResult =
        await client.query(
          `
          SELECT
            id,
            code,
            plan,
            duration_days,
            status,
            user_id,
            activated_at,
            expires_at
          FROM vip_subscriptions
          WHERE code = $1
          FOR UPDATE
          `,
          [code]
        );

      if (
        codeResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        client.release();

        return res.status(404).json({
          success: false,
          message:
            "Invalid VIP access code."
        });
      }

      const subscription =
        codeResult.rows[0];

      if (
        subscription.status !==
        "unused"
      ) {
        await client.query(
          "ROLLBACK"
        );

        client.release();

        return res.status(409).json({
          success: false,
          message:
            "This VIP code has already been used."
        });
      }

      const activatedAt =
        new Date();

      const expiresAt =
        new Date(
          activatedAt.getTime() +
          subscription.duration_days *
            24 *
            60 *
            60 *
            1000
        );

      const updated =
        await client.query(
          `
          UPDATE vip_subscriptions
          SET
            status = 'active',
            user_id = $1,
            activated_at = $2,
            expires_at = $3
          WHERE id = $4
          RETURNING *
          `,
          [
            req.user.id,
            activatedAt,
            expiresAt,
            subscription.id
          ]
        );

      await client.query(
        "COMMIT"
      );

      client.release();

      await logActivity(
        req.user,
        "REDEEM_VIP_CODE",
        `VIP code ${code} redeemed.`
      );

      return res.json({
        success: true,
        message:
          "VIP access activated successfully.",
        subscription:
          updated.rows[0]
      });
    } catch (error) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (_) {}

      client.release();

      console.error(
        "Redeem VIP code error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to redeem VIP code."
      });
    }
  }
);

// ============================================================
// VIP PREDICTIONS
// ============================================================

app.get(
  "/api/vip/predictions",
  requireUser,
  async (req, res) => {
    try {
      const subscription =
        await getActiveVipSubscription(
          req.user.id
        );

      if (!subscription) {
        return res.status(403).json({
          success: false,
          message:
            "Active VIP access is required."
        });
      }

      const result =
        await db.query(
          `
          SELECT
            id,
            league,
            home_team,
            away_team,
            match_date,
            match_time,
            prediction,
            analysis,
            category,
            status,
            featured,
            created_at
          FROM predictions
          WHERE category = 'vip'
          ORDER BY
            featured DESC,
            match_date ASC,
            match_time ASC,
            id DESC
          `
        );

      return res.json({
        success: true,
        predictions:
          result.rows,
        subscription
      });
    } catch (error) {
      console.error(
        "VIP predictions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load VIP predictions."
      });
    }
  }
);

// ============================================================
// ADMIN - VIP SUBSCRIPTIONS
// ============================================================

app.get(
  "/api/admin/vip-subscriptions",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            vs.id,
            vs.code,
            vs.plan,
            vs.duration_days,
            vs.status,
            vs.user_id,
            vs.activated_at,
            vs.expires_at,
            vs.created_at,
            u.name,
            u.username,
            u.email
          FROM vip_subscriptions vs
          LEFT JOIN users u
            ON u.id = vs.user_id
          ORDER BY vs.id DESC
          `
        );

      return res.json({
        success: true,
        subscriptions:
          result.rows
      });
    } catch (error) {
      console.error(
        "VIP subscriptions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load VIP subscriptions."
      });
    }
  }
);
// ============================================================
// ADMIN - BOOKING CODES
// ============================================================

// LIST BOOKING CODES
app.get(
  "/api/admin/betting-codes",
  requireAdmin,
  async (req, res) => {
    try {
      const result =
        await db.query(
          `
          SELECT
            id,
            bookmaker,
            code,
            description,
            category,
            status,
            created_at
          FROM betting_codes
          ORDER BY id DESC
          `
        );

      return res.json({
        success: true,
        codes: result.rows,
        bettingCodes: result.rows
      });

    } catch (error) {

      console.error(
        "Admin booking codes error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load booking codes."
      });
    }
  }
);


// CREATE BOOKING CODE
app.post(
  "/api/admin/betting-codes",
  requireAdmin,
  async (req, res) => {
    try {

      const bookmaker =
        cleanString(
          req.body.bookmaker
        );

      const code =
        cleanString(
          req.body.code
        );

      const description =
        cleanString(
          req.body.description
        );

      const category =
        cleanString(
          req.body.category
        ) || "regular";

      const status =
        cleanString(
          req.body.status
        ) || "active";


      if (!bookmaker || !code) {

        return res.status(400).json({
          success: false,
          message:
            "Bookmaker and booking code are required."
        });
      }


      if (
        !["regular", "vip"].includes(
          category
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Category must be regular or vip."
        });
      }


      if (
        !["active", "inactive"].includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Status must be active or inactive."
        });
      }


      const duplicate =
        await db.query(
          `
          SELECT
            id
          FROM betting_codes
          WHERE LOWER(bookmaker) = LOWER($1)
            AND LOWER(code) = LOWER($2)
          LIMIT 1
          `,
          [
            bookmaker,
            code
          ]
        );


      if (
        duplicate.rows.length > 0
      ) {

        return res.status(409).json({
          success: false,
          message:
            "This booking code already exists for this bookmaker."
        });
      }


      const result =
        await db.query(
          `
          INSERT INTO betting_codes
          (
            bookmaker,
            code,
            description,
            category,
            status
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          RETURNING
            id,
            bookmaker,
            code,
            description,
            category,
            status,
            created_at
          `,
          [
            bookmaker,
            code,
            description || null,
            category,
            status
          ]
        );


      const bookingCode =
        result.rows[0];


      await logActivity(
        {
          username:
            req.admin.username
        },
        "CREATE_BOOKING_CODE",
        `Created ${category} booking code for ${bookmaker}`
      );


      return res.status(201).json({
        success: true,
        message:
          "Booking code added successfully.",
        code: bookingCode
      });

    } catch (error) {

      console.error(
        "Create booking code error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to create booking code."
      });
    }
  }
);


// UPDATE BOOKING CODE STATUS
app.patch(
  "/api/admin/betting-codes/:id/status",
  requireAdmin,
  async (req, res) => {
    try {

      const id =
        Number(req.params.id);

      const status =
        cleanString(
          req.body.status
        );


      if (!Number.isInteger(id)) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid booking code ID."
        });
      }


      if (
        !["active", "inactive"].includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Status must be active or inactive."
        });
      }


      const result =
        await db.query(
          `
          UPDATE betting_codes
          SET status = $1
          WHERE id = $2
          RETURNING
            id,
            bookmaker,
            code,
            description,
            category,
            status,
            created_at
          `,
          [
            status,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Booking code not found."
        });
      }


      await logActivity(
        {
          username:
            req.admin.username
        },
        "UPDATE_BOOKING_CODE_STATUS",
        `Booking code #${id} changed to ${status}`
      );


      return res.json({
        success: true,
        message:
          "Booking code status updated successfully.",
        code:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "Update booking code status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update booking code status."
      });
    }
  }
);


// DELETE BOOKING CODE
app.delete(
  "/api/admin/betting-codes/:id",
  requireAdmin,
  async (req, res) => {
    try {

      const id =
        Number(req.params.id);


      if (!Number.isInteger(id)) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid booking code ID."
        });
      }


      const result =
        await db.query(
          `
          DELETE FROM betting_codes
          WHERE id = $1
          RETURNING
            id,
            bookmaker,
            code,
            description,
            category,
            status
          `,
          [id]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            "Booking code not found."
        });
      }


      await logActivity(
        {
          username:
            req.admin.username
        },
        "DELETE_BOOKING_CODE",
        `Deleted booking code #${id}`
      );


      return res.json({
        success: true,
        message:
          "Booking code deleted successfully."
      });

    } catch (error) {

      console.error(
        "Delete booking code error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete booking code."
      });
    }
  }
);

// ============================================================
// CLEAN EXPIRED VIP SUBSCRIPTIONS
// ============================================================

async function cleanExpiredVipSubscriptions() {
  try {
    await db.query(
      `
      UPDATE vip_subscriptions
      SET status = 'expired'
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at <= CURRENT_TIMESTAMP
      `
    );
  } catch (error) {
    console.error(
      "VIP expiration cleanup error:",
      error.message
    );
  }
}

// ============================================================
// 404 HANDLER
// ============================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message:
        "API endpoint not found."
    });
  }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      message:
        "Internal server error."
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  try {
    console.log(
      "Initializing database..."
    );

    await db.init();

    await cleanExpiredVipSubscriptions();

    console.log(
      "Database initialized successfully."
    );

    app.listen(
      PORT,
      () => {
        console.log("");
        console.log(
          "=============================================="
        );
        console.log(
          " FLEX HUB PREDICTIONS"
        );
        console.log(
          " Backend server is running."
        );
        console.log(
          ` http://localhost:${PORT}`
        );
        console.log(
          "=============================================="
        );
        console.log("");
      }
    );
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on(
  "SIGINT",
  async () => {
    console.log(
      "Shutting down server..."
    );

    try {
      await db.close();
    } catch (error) {
      console.error(
        "Database shutdown error:",
        error.message
      );
    }

    process.exit(0);
  }
);

process.on(
  "SIGTERM",
  async () => {
    console.log(
      "Shutting down server..."
    );

    try {
      await db.close();
    } catch (error) {
      console.error(
        "Database shutdown error:",
        error.message
      );
    }

    process.exit(0);
  }
);
