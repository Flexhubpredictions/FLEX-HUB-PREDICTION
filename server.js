// ============================================================
// FLEX HUB PREDICTIONS - SERVER.JS
// PART 1 / 3
// ============================================================

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
const JWT_SECRET =
    process.env.JWT_SECRET || "CHANGE_THIS_SECRET_BEFORE_HOSTING";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "FLEX";
const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "CHANGE_ADMIN_PASSWORD";

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://flexhubpredictions.github.io/FLEX-HUB-PREDICTION/";

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:3000",
            "https://flexhubpredictions.github.io",
            FRONTEND_URL
        ],
        credentials: true
    })
);

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// ============================================================
// BASIC STATUS
// ============================================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "FLEX HUB PREDICTIONS backend is running.",
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// HELPERS
// ============================================================

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
            expiresIn: "30d"
        }
    );
}

function createVipToken(user, subscriptionId) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            type: "vip",
            subscriptionId
        },
        JWT_SECRET,
        {
            expiresIn: "30d"
        }
    );
}

function createVvipToken(user, subscriptionId) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            type: "vvip",
            subscriptionId
        },
        JWT_SECRET,
        {
            expiresIn: "30d"
        }
    );
}

function getBearerToken(req) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    return header.substring(7);
}

function generateCode(prefix = "FLEX") {
    return `${prefix}-${crypto
        .randomBytes(5)
        .toString("hex")
        .toUpperCase()}`;
}

// ============================================================
// ACTIVITY LOG
// ============================================================

async function logActivity(user, action, details = "") {
    try {
        await db.query(
            `INSERT INTO activity_logs
            (user_id, name, username, action, details)
            VALUES ($1, $2, $3, $4, $5)`,
            [
                user?.id || null,
                user?.name || "",
                user?.username || "",
                action,
                details
            ]
        );
    } catch (error) {
        console.error("Activity log error:", error.message);
    }
}

// ============================================================
// USER AUTHENTICATION
// ============================================================

async function requireUser(req, res, next) {
    try {
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== "user") {
            return res.status(401).json({
                success: false,
                message: "Invalid user token."
            });
        }

        const result = await db.query(
            `SELECT id, name, username, email, status, created_at
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        const user = result.rows[0];

        if (user.status && user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled."
            });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
}

// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

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

function requireAdmin(req, res, next) {
    try {
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required."
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
// REGISTER
// ============================================================

app.post("/api/register", async (req, res) => {
    try {
        const {
            name,
            username,
            email,
            password
        } = req.body;

        if (!name || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const existing = await db.query(
            `SELECT id
             FROM users
             WHERE LOWER(username) = LOWER($1)
                OR LOWER(email) = LOWER($2)
             LIMIT 1`,
            [username.trim(), email.trim()]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.query(
            `INSERT INTO users
            (name, username, email, password, status)
            VALUES ($1, $2, $3, $4, 'active')
            RETURNING id, name, username, email, status, created_at`,
            [
                name.trim(),
                username.trim(),
                email.trim().toLowerCase(),
                passwordHash
            ]
        );

        const user = result.rows[0];

        await logActivity(
            user,
            "Account Created",
            "New user account registered."
        );

        const token = createUserToken(user);

        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            token,
            user
        });
    } catch (error) {
        console.error("Register error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create account."
        });
    }
});

// ============================================================
// LOGIN
// ============================================================

app.post("/api/login", async (req, res) => {
    try {
        const {
            identifier,
            password
        } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Username/email and password are required."
            });
        }

        const result = await db.query(
            `SELECT *
             FROM users
             WHERE LOWER(username) = LOWER($1)
                OR LOWER(email) = LOWER($1)
             LIMIT 1`,
            [identifier.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid login details."
            });
        }

        const user = result.rows[0];

        if (user.status && user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled."
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid login details."
            });
        }

        const token = createUserToken(user);

        await logActivity(
            user,
            "Login",
            "User logged into the website."
        );

        res.json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                status: user.status,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to login."
        });
    }
});

// ============================================================
// CURRENT USER
// ============================================================

app.get("/api/user/me", requireUser, async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// ============================================================
// LOGOUT
// ============================================================

app.post("/api/logout", requireUser, async (req, res) => {
    await logActivity(
        req.user,
        "Logout",
        "User logged out."
    );

    res.json({
        success: true,
        message: "Logged out successfully."
    });
});

// ============================================================
// REGULAR ACCESS
// ============================================================

app.get(
    "/api/regular-access/status",
    requireUser,
    async (req, res) => {
        res.json({
            success: true,
            active: true,
            user: req.user
        });
    }
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const result = await db.query(
            `SELECT id, name, email
             FROM users
             WHERE LOWER(email) = LOWER($1)
             LIMIT 1`,
            [email.trim()]
        );

        // Always return a neutral response.
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                message:
                    "If the email exists, password reset instructions will be sent."
            });
        }

        const user = result.rows[0];

        const resetToken = crypto.randomBytes(32).toString("hex");

        const expiresAt = new Date(
            Date.now() + 30 * 60 * 1000
        );

        await db.query(
            `UPDATE users
             SET reset_token = $1,
                 reset_token_expires = $2
             WHERE id = $3`,
            [
                resetToken,
                expiresAt,
                user.id
            ]
        );

        console.log(
            `Password reset token for ${user.email}: ${resetToken}`
        );

        res.json({
            success: true,
            message:
                "If the email exists, password reset instructions will be sent."
        });
    } catch (error) {
        console.error("Forgot password error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to process password reset."
        });
    }
});

// ============================================================
// RESET PASSWORD
// ============================================================

app.post("/api/reset-password", async (req, res) => {
    try {
        const {
            token,
            password
        } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Reset token and password are required."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters."
            });
        }

        const result = await db.query(
            `SELECT id
             FROM users
             WHERE reset_token = $1
               AND reset_token_expires > CURRENT_TIMESTAMP
             LIMIT 1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token."
            });
        }

        const passwordHash = await bcrypt.hash(
            password,
            12
        );

        await db.query(
            `UPDATE users
             SET password = $1,
                 reset_token = NULL,
                 reset_token_expires = NULL
             WHERE id = $2`,
            [
                passwordHash,
                result.rows[0].id
            ]
        );

        res.json({
            success: true,
            message: "Password reset successfully."
        });
    } catch (error) {
        console.error("Reset password error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to reset password."
        });
    }
});

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post("/api/admin/login", async (req, res) => {
    try {
        const {
            username,
            password
        } = req.body;

        if (
            username !== ADMIN_USERNAME ||
            password !== ADMIN_PASSWORD
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials."
            });
        }

        const token = createAdminToken();

        res.json({
            success: true,
            message: "Admin login successful.",
            token,
            admin: {
                username: ADMIN_USERNAME
            }
        });
    } catch (error) {
        console.error("Admin login error:", error);

        res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});

// ============================================================
// ADMIN ME
// ============================================================

app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({
        success: true,
        admin: {
            username: ADMIN_USERNAME
        }
    });
});

// ============================================================
// END OF PART 1
// ============================================================
// ============================================================
// FLEX HUB PREDICTIONS - SERVER.JS
// PART 2 / 3
// ============================================================

// ============================================================
// VIP HELPERS
// ============================================================

async function getActiveVipSubscription(userId) {
    const result = await db.query(
        `SELECT *
         FROM vip_subscriptions
         WHERE user_id = $1
           AND status = 'active'
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY expires_at DESC
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
}

// ============================================================
// VVIP HELPERS
// ============================================================

async function getActiveVvipSubscription(userId) {
    const result = await db.query(
        `SELECT *
         FROM vvip_subscriptions
         WHERE user_id = $1
           AND status = 'active'
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY expires_at DESC
         LIMIT 1`,
        [userId]
    );

    return result.rows[0] || null;
}

// ============================================================
// VIP TOKEN AUTHENTICATION
// ============================================================

async function requireVip(req, res, next) {
    try {
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "VIP access required."
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== "vip") {
            return res.status(401).json({
                success: false,
                message: "Invalid VIP token."
            });
        }

        const userResult = await db.query(
            `SELECT id, name, username, email, status
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        const user = userResult.rows[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled."
            });
        }

        const subscriptionResult = await db.query(
            `SELECT *
             FROM vip_subscriptions
             WHERE id = $1
               AND user_id = $2
             LIMIT 1`,
            [
                decoded.subscriptionId,
                user.id
            ]
        );

        if (subscriptionResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "VIP subscription not found."
            });
        }

        const subscription = subscriptionResult.rows[0];

        if (
            subscription.status !== "active" ||
            new Date(subscription.expires_at) <= new Date()
        ) {
            await db.query(
                `UPDATE vip_subscriptions
                 SET status = 'expired'
                 WHERE id = $1`,
                [subscription.id]
            );

            return res.status(403).json({
                success: false,
                message: "Your VIP access has expired."
            });
        }

        req.user = user;
        req.vipSubscription = subscription;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired VIP token."
        });
    }
}

// ============================================================
// VVIP TOKEN AUTHENTICATION
// ============================================================

async function requireVvip(req, res, next) {
    try {
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "VVIP access required."
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== "vvip") {
            return res.status(401).json({
                success: false,
                message: "Invalid VVIP token."
            });
        }

        const userResult = await db.query(
            `SELECT id, name, username, email, status
             FROM users
             WHERE id = $1
             LIMIT 1`,
            [decoded.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account not found."
            });
        }

        const user = userResult.rows[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled."
            });
        }

        const subscriptionResult = await db.query(
            `SELECT *
             FROM vvip_subscriptions
             WHERE id = $1
               AND user_id = $2
             LIMIT 1`,
            [
                decoded.subscriptionId,
                user.id
            ]
        );

        if (subscriptionResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: "VVIP subscription not found."
            });
        }

        const subscription = subscriptionResult.rows[0];

        if (
            subscription.status !== "active" ||
            new Date(subscription.expires_at) <= new Date()
        ) {
            await db.query(
                `UPDATE vvip_subscriptions
                 SET status = 'expired'
                 WHERE id = $1`,
                [subscription.id]
            );

            return res.status(403).json({
                success: false,
                message: "Your VVIP access has expired."
            });
        }

        req.user = user;
        req.vvipSubscription = subscription;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired VVIP token."
        });
    }
}

// ============================================================
// ADMIN - CREATE VIP SUBSCRIPTION CODE
// ============================================================

app.post(
    "/api/admin/vip-subscriptions",
    requireAdmin,
    async (req, res) => {
        try {
            const { plan } = req.body;

            const plans = {
                "1_week": 7,
                "2_weeks": 14,
                "1_month": 30
            };

            if (!plans[plan]) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid VIP plan."
                });
            }

            const code = generateCode("VIP");

            const result = await db.query(
                `INSERT INTO vip_subscriptions
                (code, plan, duration_days, status)
                VALUES ($1, $2, $3, 'unused')
                RETURNING *`,
                [
                    code,
                    plan,
                    plans[plan]
                ]
            );

            res.status(201).json({
                success: true,
                message: "VIP access code generated.",
                subscription: result.rows[0]
            });
        } catch (error) {
            console.error(
                "VIP subscription generation error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to generate VIP code."
            });
        }
    }
);

// ============================================================
// ADMIN - VIP SUBSCRIPTION HISTORY
// ============================================================

app.get(
    "/api/admin/vip-subscriptions",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM vip_subscriptions
                 ORDER BY created_at DESC`
            );

            res.json({
                success: true,
                subscriptions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load VIP subscriptions."
            });
        }
    }
);

// ============================================================
// VIP ACCESS
// ============================================================

app.post(
    "/api/vip/access",
    requireUser,
    async (req, res) => {
        try {
            const accessCode = String(
                req.body.accessCode || ""
            )
                .trim()
                .toUpperCase();

            if (!accessCode) {
                return res.status(400).json({
                    success: false,
                    message: "VIP access code is required."
                });
            }

            const result = await db.query(
                `SELECT *
                 FROM vip_subscriptions
                 WHERE code = $1
                 LIMIT 1`,
                [accessCode]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Invalid VIP access code."
                });
            }

            const subscription = result.rows[0];

            if (
                subscription.status === "active" &&
                subscription.user_id === req.user.id
            ) {
                const token = createVipToken(
                    req.user,
                    subscription.id
                );

                return res.json({
                    success: true,
                    message: "VIP access restored.",
                    token,
                    subscription
                });
            }

            if (subscription.status !== "unused") {
                return res.status(409).json({
                    success: false,
                    message: "This VIP code has already been used."
                });
            }

            const expiresAt = new Date(
                Date.now() +
                Number(subscription.duration_days) *
                24 *
                60 *
                60 *
                1000
            );

            const updated = await db.query(
                `UPDATE vip_subscriptions
                 SET status = 'active',
                     user_id = $1,
                     activated_at = CURRENT_TIMESTAMP,
                     expires_at = $2
                 WHERE id = $3
                   AND status = 'unused'
                 RETURNING *`,
                [
                    req.user.id,
                    expiresAt,
                    subscription.id
                ]
            );

            if (updated.rows.length === 0) {
                return res.status(409).json({
                    success: false,
                    message: "This VIP code is no longer available."
                });
            }

            const activeSubscription =
                updated.rows[0];

            await logActivity(
                req.user,
                "VIP Access Activated",
                `VIP plan: ${activeSubscription.plan}`
            );

            const token = createVipToken(
                req.user,
                activeSubscription.id
            );

            res.json({
                success: true,
                message: "VIP access activated successfully.",
                token,
                subscription: activeSubscription
            });
        } catch (error) {
            console.error("VIP access error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to activate VIP access."
            });
        }
    }
);

// ============================================================
// VIP STATUS
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
                    active: false,
                    status: "inactive"
                });
            }

            const remainingMs =
                new Date(subscription.expires_at) -
                new Date();

            const remainingDays = Math.max(
                0,
                Math.ceil(
                    remainingMs /
                    (24 * 60 * 60 * 1000)
                )
            );

            res.json({
                success: true,
                active: true,
                status: subscription.status,
                plan: subscription.plan,
                expiresAt: subscription.expires_at,
                remainingDays
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to check VIP status."
            });
        }
    }
);

// ============================================================
// ADMIN - CREATE VVIP SUBSCRIPTION CODE
// ============================================================

app.post(
    "/api/admin/vvip-subscriptions",
    requireAdmin,
    async (req, res) => {
        try {
            const { plan } = req.body;

            const plans = {
                "1_week": 7,
                "2_weeks": 14,
                "1_month": 30
            };

            if (!plans[plan]) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid VVIP plan."
                });
            }

            const code = generateCode("VVIP");

            const result = await db.query(
                `INSERT INTO vvip_subscriptions
                (code, plan, duration_days, status)
                VALUES ($1, $2, $3, 'unused')
                RETURNING *`,
                [
                    code,
                    plan,
                    plans[plan]
                ]
            );

            res.status(201).json({
                success: true,
                message: "VVIP access code generated.",
                subscription: result.rows[0]
            });
        } catch (error) {
            console.error(
                "VVIP subscription generation error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to generate VVIP code."
            });
        }
    }
);

// ============================================================
// ADMIN - VVIP SUBSCRIPTION HISTORY
// ============================================================

app.get(
    "/api/admin/vvip-subscriptions",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM vvip_subscriptions
                 ORDER BY created_at DESC`
            );

            res.json({
                success: true,
                subscriptions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load VVIP subscriptions."
            });
        }
    }
);

// ============================================================
// VVIP ACCESS
// ============================================================

app.post(
    "/api/vvip/access",
    requireUser,
    async (req, res) => {
        try {
            const accessCode = String(
                req.body.accessCode || ""
            )
                .trim()
                .toUpperCase();

            if (!accessCode) {
                return res.status(400).json({
                    success: false,
                    message: "VVIP access code is required."
                });
            }

            const result = await db.query(
                `SELECT *
                 FROM vvip_subscriptions
                 WHERE code = $1
                 LIMIT 1`,
                [accessCode]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Invalid VVIP access code."
                });
            }

            const subscription = result.rows[0];

            if (
                subscription.status === "active" &&
                subscription.user_id === req.user.id
            ) {
                const token = createVvipToken(
                    req.user,
                    subscription.id
                );

                return res.json({
                    success: true,
                    message: "VVIP access restored.",
                    token,
                    subscription
                });
            }

            if (subscription.status !== "unused") {
                return res.status(409).json({
                    success: false,
                    message: "This VVIP code has already been used."
                });
            }

            const expiresAt = new Date(
                Date.now() +
                Number(subscription.duration_days) *
                24 *
                60 *
                60 *
                1000
            );

            const updated = await db.query(
                `UPDATE vvip_subscriptions
                 SET status = 'active',
                     user_id = $1,
                     activated_at = CURRENT_TIMESTAMP,
                     expires_at = $2
                 WHERE id = $3
                   AND status = 'unused'
                 RETURNING *`,
                [
                    req.user.id,
                    expiresAt,
                    subscription.id
                ]
            );

            if (updated.rows.length === 0) {
                return res.status(409).json({
                    success: false,
                    message: "This VVIP code is no longer available."
                });
            }

            const activeSubscription =
                updated.rows[0];

            await logActivity(
                req.user,
                "VVIP Access Activated",
                `VVIP plan: ${activeSubscription.plan}`
            );

            const token = createVvipToken(
                req.user,
                activeSubscription.id
            );

            res.json({
                success: true,
                message: "VVIP access activated successfully.",
                token,
                subscription: activeSubscription
            });
        } catch (error) {
            console.error("VVIP access error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to activate VVIP access."
            });
        }
    }
);

// ============================================================
// VVIP STATUS
// ============================================================

app.get(
    "/api/vvip/status",
    requireUser,
    async (req, res) => {
        try {
            const subscription =
                await getActiveVvipSubscription(
                    req.user.id
                );

            if (!subscription) {
                return res.json({
                    success: true,
                    active: false,
                    status: "inactive"
                });
            }

            const remainingMs =
                new Date(subscription.expires_at) -
                new Date();

            const remainingDays = Math.max(
                0,
                Math.ceil(
                    remainingMs /
                    (24 * 60 * 60 * 1000)
                )
            );

            res.json({
                success: true,
                active: true,
                status: subscription.status,
                plan: subscription.plan,
                expiresAt: subscription.expires_at,
                remainingDays
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to check VVIP status."
            });
        }
    }
);

// ============================================================
// REGULAR PREDICTIONS
// ============================================================

app.get(
    "/api/predictions",
    requireUser,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM predictions
                 WHERE category = 'regular'
                    OR category IS NULL
                 ORDER BY match_date ASC, match_time ASC, id DESC`
            );

            res.json({
                success: true,
                predictions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load predictions."
            });
        }
    }
);

// ============================================================
// SINGLE PREDICTION
// ============================================================

app.get(
    "/api/predictions/:id",
    requireUser,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM predictions
                 WHERE id = $1
                 LIMIT 1`,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Prediction not found."
                });
            }

            res.json({
                success: true,
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load prediction."
            });
        }
    }
);

// ============================================================
// VIP PREDICTIONS
// ============================================================

app.get(
    "/api/vip/predictions",
    requireVip,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM predictions
                 WHERE category = 'vip'
                 ORDER BY match_date ASC, match_time ASC, id DESC`
            );

            res.json({
                success: true,
                predictions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load VIP predictions."
            });
        }
    }
);

// ============================================================
// VVIP PREDICTIONS
// ============================================================

app.get(
    "/api/vvip/predictions",
    requireVvip,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM vvip_predictions
                 ORDER BY match_date ASC,
                          match_time ASC,
                          id DESC`
            );

            res.json({
                success: true,
                predictions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load VVIP predictions."
            });
        }
    }
);

// ============================================================
// ADMIN - ALL PREDICTIONS
// ============================================================

app.get(
    "/api/admin/predictions",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM predictions
                 ORDER BY match_date DESC,
                          match_time DESC,
                          id DESC`
            );

            res.json({
                success: true,
                predictions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load admin predictions."
            });
        }
    }
);

// ============================================================
// ADMIN - VIP PREDICTIONS
// ============================================================

app.get(
    "/api/admin/vip-predictions",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM predictions
                 WHERE category = 'vip'
                 ORDER BY match_date DESC,
                          match_time DESC,
                          id DESC`
            );

            res.json({
                success: true,
                predictions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load VIP predictions."
            });
        }
    }
);

// ============================================================
// ADMIN - VVIP PREDICTIONS
// ============================================================

app.get(
    "/api/admin/vvip-predictions",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM vvip_predictions
                 ORDER BY match_date DESC,
                          match_time DESC,
                          id DESC`
            );

            res.json({
                success: true,
                predictions: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load VVIP predictions."
            });
        }
    }
);

// ============================================================
// ADMIN - CREATE REGULAR / VIP PREDICTION
// ============================================================

app.post(
    "/api/predictions",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                league,
                category,
                homeTeam,
                awayTeam,
                matchDate,
                matchTime,
                prediction,
                analysis,
                status,
                featured
            } = req.body;

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

            const safeCategory =
                category === "vip"
                    ? "vip"
                    : "regular";

            const safeStatus = [
                "pending",
                "won",
                "lost",
                "void"
            ].includes(status)
                ? status
                : "pending";

            const result = await db.query(
                `INSERT INTO predictions
                (
                    league,
                    category,
                    home_team,
                    away_team,
                    match_date,
                    match_time,
                    prediction,
                    analysis,
                    status,
                    featured
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                RETURNING *`,
                [
                    league,
                    safeCategory,
                    homeTeam,
                    awayTeam,
                    matchDate,
                    matchTime,
                    prediction,
                    analysis || "",
                    safeStatus,
                    Boolean(featured)
                ]
            );

            res.status(201).json({
                success: true,
                message: "Prediction created successfully.",
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to create prediction."
            });
        }
    }
);

// ============================================================
// ADMIN - CREATE VVIP PREDICTION
// ============================================================

app.post(
    "/api/admin/vvip-predictions",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                league,
                homeTeam,
                awayTeam,
                matchDate,
                matchTime,
                prediction,
                analysis,
                status,
                featured
            } = req.body;

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

            const safeStatus = [
                "pending",
                "won",
                "lost",
                "void"
            ].includes(status)
                ? status
                : "pending";

            const result = await db.query(
                `INSERT INTO vvip_predictions
                (
                    league,
                    home_team,
                    away_team,
                    match_date,
                    match_time,
                    prediction,
                    analysis,
                    status,
                    featured
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *`,
                [
                    league,
                    homeTeam,
                    awayTeam,
                    matchDate,
                    matchTime,
                    prediction,
                    analysis || "",
                    safeStatus,
                    Boolean(featured)
                ]
            );

            res.status(201).json({
                success: true,
                message:
                    "VVIP prediction created successfully.",
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to create VVIP prediction."
            });
        }
    }
);

// ============================================================
// END OF PART 2
// ============================================================
// ============================================================
// FLEX HUB PREDICTIONS - SERVER.JS
// PART 3 / 3
// ============================================================

// ============================================================
// ADMIN - UPDATE REGULAR / VIP PREDICTION
// ============================================================

app.put(
    "/api/predictions/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                league,
                category,
                homeTeam,
                awayTeam,
                matchDate,
                matchTime,
                prediction,
                analysis,
                status,
                featured
            } = req.body;

            const safeCategory =
                category === "vip"
                    ? "vip"
                    : "regular";

            const safeStatus = [
                "pending",
                "won",
                "lost",
                "void"
            ].includes(status)
                ? status
                : "pending";

            const result = await db.query(
                `UPDATE predictions
                 SET league = $1,
                     category = $2,
                     home_team = $3,
                     away_team = $4,
                     match_date = $5,
                     match_time = $6,
                     prediction = $7,
                     analysis = $8,
                     status = $9,
                     featured = $10
                 WHERE id = $11
                 RETURNING *`,
                [
                    league,
                    safeCategory,
                    homeTeam,
                    awayTeam,
                    matchDate,
                    matchTime,
                    prediction,
                    analysis || "",
                    safeStatus,
                    Boolean(featured),
                    req.params.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Prediction not found."
                });
            }

            res.json({
                success: true,
                message: "Prediction updated successfully.",
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to update prediction."
            });
        }
    }
);

// ============================================================
// ADMIN - DELETE REGULAR / VIP PREDICTION
// ============================================================

app.delete(
    "/api/predictions/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `DELETE FROM predictions
                 WHERE id = $1
                 RETURNING *`,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Prediction not found."
                });
            }

            res.json({
                success: true,
                message: "Prediction deleted successfully."
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
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
    "/api/predictions/:id/status",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            const allowedStatuses = [
                "pending",
                "won",
                "lost",
                "void"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid prediction status."
                });
            }

            const result = await db.query(
                `UPDATE predictions
                 SET status = $1
                 WHERE id = $2
                 RETURNING *`,
                [
                    status,
                    req.params.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Prediction not found."
                });
            }

            res.json({
                success: true,
                message: "Prediction status updated.",
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to update prediction status."
            });
        }
    }
);

// ============================================================
// ADMIN - UPDATE VVIP PREDICTION
// ============================================================

app.put(
    "/api/admin/vvip-predictions/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                league,
                homeTeam,
                awayTeam,
                matchDate,
                matchTime,
                prediction,
                analysis,
                status,
                featured
            } = req.body;

            const safeStatus = [
                "pending",
                "won",
                "lost",
                "void"
            ].includes(status)
                ? status
                : "pending";

            const result = await db.query(
                `UPDATE vvip_predictions
                 SET league = $1,
                     home_team = $2,
                     away_team = $3,
                     match_date = $4,
                     match_time = $5,
                     prediction = $6,
                     analysis = $7,
                     status = $8,
                     featured = $9
                 WHERE id = $10
                 RETURNING *`,
                [
                    league,
                    homeTeam,
                    awayTeam,
                    matchDate,
                    matchTime,
                    prediction,
                    analysis || "",
                    safeStatus,
                    Boolean(featured),
                    req.params.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "VVIP prediction not found."
                });
            }

            res.json({
                success: true,
                message:
                    "VVIP prediction updated successfully.",
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to update VVIP prediction."
            });
        }
    }
);

// ============================================================
// ADMIN - DELETE VVIP PREDICTION
// ============================================================

app.delete(
    "/api/admin/vvip-predictions/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `DELETE FROM vvip_predictions
                 WHERE id = $1
                 RETURNING *`,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "VVIP prediction not found."
                });
            }

            res.json({
                success: true,
                message:
                    "VVIP prediction deleted successfully."
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete VVIP prediction."
            });
        }
    }
);

// ============================================================
// ADMIN - UPDATE VVIP PREDICTION STATUS
// ============================================================

app.patch(
    "/api/admin/vvip-predictions/:id/status",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            const allowedStatuses = [
                "pending",
                "won",
                "lost",
                "void"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid VVIP prediction status."
                });
            }

            const result = await db.query(
                `UPDATE vvip_predictions
                 SET status = $1
                 WHERE id = $2
                 RETURNING *`,
                [
                    status,
                    req.params.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "VVIP prediction not found."
                });
            }

            res.json({
                success: true,
                message:
                    "VVIP prediction status updated.",
                prediction: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to update VVIP status."
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
                `SELECT *
                 FROM predictions
                 WHERE status IN ('won', 'lost', 'void')
                 ORDER BY match_date DESC,
                          match_time DESC,
                          id DESC`
            );

            res.json({
                success: true,
                results: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load results."
            });
        }
    }
);

// ============================================================
// DELETE RESULT
// ============================================================

app.delete(
    "/api/results/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const result = await db.query(
                `UPDATE predictions
                 SET status = 'pending'
                 WHERE id = $1
                 RETURNING *`,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Result not found."
                });
            }

            res.json({
                success: true,
                message: "Result reset successfully."
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to reset result."
            });
        }
    }
);

// ============================================================
// ADMIN - REGISTERED USERS
// ============================================================

app.get(
    "/api/admin/users",
    requireAdmin,
    async (req, res) => {
        try {
            const search =
                String(req.query.search || "")
                    .trim();

            let result;

            if (search) {
                result = await db.query(
                    `SELECT
                        id,
                        name,
                        username,
                        email,
                        status,
                        created_at
                     FROM users
                     WHERE name ILIKE $1
                        OR username ILIKE $1
                        OR email ILIKE $1
                     ORDER BY created_at DESC`,
                    [`%${search}%`]
                );
            } else {
                result = await db.query(
                    `SELECT
                        id,
                        name,
                        username,
                        email,
                        status,
                        created_at
                     FROM users
                     ORDER BY created_at DESC`
                );
            }

            res.json({
                success: true,
                users: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load users."
            });
        }
    }
);

// ============================================================
// ADMIN - UPDATE USER
// ============================================================

app.patch(
    "/api/admin/users/:id",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            const allowedStatuses = [
                "active",
                "disabled"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user status."
                });
            }

            const result = await db.query(
                `UPDATE users
                 SET status = $1
                 WHERE id = $2
                 RETURNING id, name, username, email, status, created_at`,
                [
                    status,
                    req.params.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            const user = result.rows[0];

            await logActivity(
                user,
                status === "active"
                    ? "Account Enabled"
                    : "Account Disabled",
                `Admin changed account status to ${status}.`
            );

            res.json({
                success: true,
                message: "User updated successfully.",
                user
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to update user."
            });
        }
    }
);

// ============================================================
// ADMIN - USER STATUS
// ============================================================

app.patch(
    "/api/admin/users/:id/status",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            if (
                !["active", "disabled"]
                    .includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user status."
                });
            }

            const result = await db.query(
                `UPDATE users
                 SET status = $1
                 WHERE id = $2
                 RETURNING id, name, username, email, status, created_at`,
                [
                    status,
                    req.params.id
                ]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            res.json({
                success: true,
                message: "User status updated.",
                user: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
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
            const userResult = await db.query(
                `SELECT id, name, username, email
                 FROM users
                 WHERE id = $1
                 LIMIT 1`,
                [req.params.id]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            const user = userResult.rows[0];

            await db.query(
                `DELETE FROM users
                 WHERE id = $1`,
                [req.params.id]
            );

            res.json({
                success: true,
                message: "User deleted successfully."
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete user. The account may have linked records."
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
            const result = await db.query(
                `SELECT *
                 FROM activity_logs
                 ORDER BY created_at DESC
                 LIMIT 500`
            );

            res.json({
                success: true,
                logs: result.rows,
                activityLogs: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
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
            const result = await db.query(
                `SELECT *
                 FROM notifications
                 ORDER BY created_at DESC`
            );

            res.json({
                success: true,
                notifications: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
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
            const {
                title,
                message
            } = req.body;

            if (!title || !message) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Title and message are required."
                });
            }

            const result = await db.query(
                `INSERT INTO notifications
                (title, message)
                VALUES ($1, $2)
                RETURNING *`,
                [
                    title.trim(),
                    message.trim()
                ]
            );

            res.status(201).json({
                success: true,
                message:
                    "Notification created successfully.",
                notification: result.rows[0]
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
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
            const result = await db.query(
                `DELETE FROM notifications
                 WHERE id = $1
                 RETURNING *`,
                [req.params.id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Notification not found."
                });
            }

            res.json({
                success: true,
                message:
                    "Notification deleted successfully."
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to delete notification."
            });
        }
    }
);

// ============================================================
// USER NOTIFICATIONS
// ============================================================

app.get(
    "/api/notifications",
    requireUser,
    async (req, res) => {
        try {
            const result = await db.query(
                `SELECT *
                 FROM notifications
                 ORDER BY created_at DESC`
            );

            res.json({
                success: true,
                notifications: result.rows
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to load notifications."
            });
        }
    }
);

// ============================================================
// MARK NOTIFICATION AS READ
// ============================================================

app.post(
    "/api/notifications/:id/read",
    requireUser,
    async (req, res) => {
        try {
            await db.query(
                `UPDATE notifications
                 SET is_read = TRUE
                 WHERE id = $1`,
                [req.params.id]
            );

            res.json({
                success: true,
                message:
                    "Notification marked as read."
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message:
                    "Unable to update notification."
            });
        }
    }
);

// ============================================================
// PAYMENTS - INITIALIZE
// ============================================================

app.post(
    "/api/payments/initialize",
    requireUser,
    async (req, res) => {
        try {
            const {
                amount,
                email
            } = req.body;

            if (!amount || !email) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Amount and email are required."
                });
            }

            if (!process.env.PAYSTACK_SECRET_KEY) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Payment service is not configured."
                });
            }

            const reference =
                `FLEX-${Date.now()}-${crypto
                    .randomBytes(4)
                    .toString("hex")
                    .toUpperCase()}`;

            const response = await fetch(
                "https://api.paystack.co/transaction/initialize",
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        amount: Math.round(
                            Number(amount) * 100
                        ),
                        reference,
                        callback_url:
                            `${FRONTEND_URL}vip.html`
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.status) {
                return res.status(400).json({
                    success: false,
                    message:
                        data.message ||
                        "Unable to initialize payment."
                });
            }

            res.json({
                success: true,
                reference,
                authorizationUrl:
                    data.data.authorization_url,
                accessCode:
                    data.data.access_code
            });
        } catch (error) {
            console.error(
                "Payment initialization error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to initialize payment."
            });
        }
    }
);

// ============================================================
// PAYMENTS - VERIFY
// ============================================================

app.get(
    "/api/payments/verify/:reference",
    requireUser,
    async (req, res) => {
        try {
            if (!process.env.PAYSTACK_SECRET_KEY) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Payment service is not configured."
                });
            }

            const response = await fetch(
                `https://api.paystack.co/transaction/verify/${encodeURIComponent(
                    req.params.reference
                )}`,
                {
                    method: "GET",
                    headers: {
                        Authorization:
                            `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok || !data.status) {
                return res.status(400).json({
                    success: false,
                    message:
                        data.message ||
                        "Unable to verify payment."
                });
            }

            res.json({
                success: true,
                payment: data.data
            });
        } catch (error) {
            console.error(
                "Payment verification error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to verify payment."
            });
        }
    }
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        path: req.originalUrl
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
    console.error(
        "Unhandled server error:",
        error
    );

    res.status(500).json({
        success: false,
        message:
            "An unexpected server error occurred."
    });
});

// ============================================================
// START SERVER
// ============================================================

async function startServer() {
    try {
        await db.init();

        app.listen(
            PORT,
            "0.0.0.0",
            () => {
                console.log("");
                console.log(
                    "=========================================="
                );
                console.log(
                    "     FLEX HUB PREDICTIONS"
                );
                console.log(
                    "=========================================="
                );
                console.log(
                    `Backend server running on port ${PORT}`
                );
                console.log(
                    `API: http://localhost:${PORT}/api/status`
                );
                console.log(
                    "Database connected successfully."
                );
                console.log(
                    "=========================================="
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
// END OF SERVER.JS
// ============================================================
