// ============================================================
// FLEX HUB PREDICTIONS
// PRODUCTION BACKEND SERVER
// SERVER.JS - PART 1 / 3
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

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = Number(process.env.PORT) || 3000;

const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();

const ADMIN_USERNAME =
    process.env.ADMIN_USERNAME || "FLEX";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "";

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://flexhubpredictions.github.io/FLEX-HUB-PREDICTION/";

// ============================================================
// STARTUP SECURITY CHECK
// ============================================================

if (!JWT_SECRET) {
    console.error("");
    console.error("==========================================");
    console.error("FATAL CONFIGURATION ERROR");
    console.error("==========================================");
    console.error("JWT_SECRET is missing.");
    console.error("Add JWT_SECRET to the Render environment variables.");
    console.error("The server will not start without it.");
    console.error("==========================================");
    console.error("");

    process.exit(1);
}

if (!ADMIN_PASSWORD) {
    console.error("");
    console.error("WARNING: ADMIN_PASSWORD is not configured.");
    console.error("Set ADMIN_PASSWORD in Render environment variables.");
    console.error("");
}

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://flexhubpredictions.github.io",
    FRONTEND_URL.replace(/\/$/, "")
];

app.use(
    cors({
        origin(origin, callback) {
            // Allow requests without an Origin header.
            // This includes server-side requests and some tools.
            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin = origin.replace(/\/$/, "");

            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }

            console.warn(
                "[CORS] Blocked origin:",
                origin
            );

            return callback(
                new Error("Not allowed by CORS")
            );
        },
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(express.json({ limit: "2mb" }));

// ============================================================
// CACHE CONTROL
// ============================================================

app.use((req, res, next) => {
    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    res.setHeader(
        "Pragma",
        "no-cache"
    );

    res.setHeader(
        "Expires",
        "0"
    );

    next();
});

// ============================================================
// REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", () => {
        const duration =
            Date.now() - startedAt;

        console.log(
            `[API] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
        );
    });

    next();
});

// ============================================================
// BASIC STATUS
// ============================================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message:
            "FLEX HUB PREDICTIONS backend is running.",
        timestamp: new Date().toISOString(),
        environment:
            process.env.NODE_ENV || "development"
    });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// AUTH HELPERS
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

function createVipToken(
    user,
    subscriptionId
) {
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

function getBearerToken(req) {
    const authorization =
        String(
            req.headers.authorization || ""
        ).trim();

    if (!authorization) {
        return null;
    }

    if (
        !authorization
            .toLowerCase()
            .startsWith("bearer ")
    ) {
        return null;
    }

    const token =
        authorization.substring(7).trim();

    return token || null;
}

// ============================================================
// USER AUTHENTICATION
// ============================================================

async function requireUser(
    req,
    res,
    next
) {
    try {
        const token =
            getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required."
            });
        }

        let decoded;

        try {
            decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );
        } catch (jwtError) {
            console.error(
                "[AUTH] JWT verification failed:",
                jwtError.name,
                jwtError.message
            );

            return res.status(401).json({
                success: false,
                message:
                    "Invalid or expired token."
            });
        }

        if (
            !decoded ||
            decoded.type !== "user"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid user token."
            });
        }

        if (!decoded.id) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid user token."
            });
        }

        const result =
            await db.query(
                `SELECT
                    id,
                    name,
                    username,
                    email,
                    status,
                    created_at
                 FROM users
                 WHERE id = $1
                 LIMIT 1`,
                [decoded.id]
            );

        if (
            result.rows.length === 0
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "User account not found."
            });
        }

        const user =
            result.rows[0];

        if (
            user.status &&
            user.status !== "active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account has been disabled."
            });
        }

        req.user = user;

        next();

    } catch (error) {
        console.error(
            "[AUTH] Unexpected authentication error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Authentication service error."
        });
    }
}

// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

async function requireAdmin(
    req,
    res,
    next
) {
    try {
        const token =
            getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Admin authentication required."
            });
        }

        let decoded;

        try {
            decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );
        } catch (jwtError) {
            console.error(
                "[ADMIN AUTH] JWT verification failed:",
                jwtError.name,
                jwtError.message
            );

            return res.status(401).json({
                success: false,
                message:
                    "Invalid or expired admin token."
            });
        }

        if (
            !decoded ||
            decoded.type !== "admin"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Admin access required."
            });
        }

        req.admin = decoded;

        next();

    } catch (error) {
        console.error(
            "[ADMIN AUTH] Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Admin authentication service error."
        });
    }
}

// ============================================================
// ACTIVITY LOG
// ============================================================

async function logActivity(
    user,
    action,
    details = ""
) {
    try {
        await db.query(
            `INSERT INTO activity_logs
            (
                user_id,
                name,
                username,
                action,
                details
            )
            VALUES
            ($1,$2,$3,$4,$5)`,
            [
                user?.id || null,
                user?.name || "",
                user?.username || "",
                action,
                details
            ]
        );
    } catch (error) {
        console.error(
            "[ACTIVITY LOG]",
            error.message
        );
    }
}

// ============================================================
// CODE GENERATOR
// ============================================================

function generateCode(
    prefix = "FLEX"
) {
    return (
        `${prefix}-` +
        crypto
            .randomBytes(5)
            .toString("hex")
            .toUpperCase()
    );
}

// ============================================================
// REGISTER
// ============================================================

app.post(
    "/api/register",
    async (req, res) => {
        try {
            const {
                name,
                username,
                email,
                password
            } = req.body;

            const cleanName =
                String(name || "").trim();

            const cleanUsername =
                String(
                    username || ""
                ).trim();

            const cleanEmail =
                String(
                    email || ""
                )
                    .trim()
                    .toLowerCase();

            const cleanPassword =
                String(password || "");

            if (
                !cleanName ||
                !cleanUsername ||
                !cleanEmail ||
                !cleanPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "All fields are required."
                });
            }

            if (
                cleanPassword.length < 6
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters."
                });
            }

            const existing =
                await db.query(
                    `SELECT id
                     FROM users
                     WHERE LOWER(username) = LOWER($1)
                        OR LOWER(email) = LOWER($2)
                     LIMIT 1`,
                    [
                        cleanUsername,
                        cleanEmail
                    ]
                );

            if (
                existing.rows.length > 0
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Username or email already exists."
                });
            }

            const passwordHash =
                await bcrypt.hash(
                    cleanPassword,
                    12
                );

            const result =
                await db.query(
                    `INSERT INTO users
                    (
                        name,
                        username,
                        email,
                        password,
                        status
                    )
                    VALUES
                    ($1,$2,$3,$4,'active')
                    RETURNING
                        id,
                        name,
                        username,
                        email,
                        status,
                        created_at`,
                    [
                        cleanName,
                        cleanUsername,
                        cleanEmail,
                        passwordHash
                    ]
                );

            const user =
                result.rows[0];

            const token =
                createUserToken(user);

            await logActivity(
                user,
                "Account Created",
                "New user account registered."
            );

            return res.status(201).json({
                success: true,
                message:
                    "Account created successfully.",
                token,
                user
            });

        } catch (error) {
            console.error(
                "[REGISTER]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create account."
            });
        }
    }
);

// ============================================================
// LOGIN
// ============================================================

app.post(
    "/api/login",
    async (req, res) => {
        try {
            const identifier =
                String(
                    req.body.identifier || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            if (
                !identifier ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username/email and password are required."
                });
            }

            const result =
                await db.query(
                    `SELECT *
                     FROM users
                     WHERE LOWER(username) = LOWER($1)
                        OR LOWER(email) = LOWER($1)
                     LIMIT 1`,
                    [identifier]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid login details."
                });
            }

            const user =
                result.rows[0];

            if (
                user.status &&
                user.status !== "active"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Your account has been disabled."
                });
            }

            if (!user.password) {
                console.error(
                    "[LOGIN] User has no password hash:",
                    user.id
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Account authentication is not configured correctly."
                });
            }

            const validPassword =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid login details."
                });
            }

            const safeUser = {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                status: user.status,
                created_at:
                    user.created_at
            };

            const token =
                createUserToken(
                    safeUser
                );

            // Verify the token immediately after
            // creating it. This catches configuration
            // problems before the token reaches the browser.
            try {
                const verified =
                    jwt.verify(
                        token,
                        JWT_SECRET
                    );

                if (
                    verified.type !== "user" ||
                    String(verified.id) !==
                        String(safeUser.id)
                ) {
                    throw new Error(
                        "Created token failed self-verification."
                    );
                }
            } catch (tokenError) {
                console.error(
                    "[LOGIN] Newly created JWT failed verification:",
                    tokenError
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Unable to create a valid login session."
                });
            }

            await logActivity(
                safeUser,
                "Login",
                "User logged into the website."
            );

            console.log(
                `[AUTH] Login successful: ${safeUser.username}`
            );

            return res.json({
                success: true,
                message:
                    "Login successful.",
                token,
                user: safeUser
            });

        } catch (error) {
            console.error(
                "[LOGIN]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to login."
            });
        }
    }
);

// ============================================================
// CURRENT USER
// ============================================================

app.get(
    "/api/user/me",
    requireUser,
    async (req, res) => {
        return res.json({
            success: true,
            user: req.user
        });
    }
);

// ============================================================
// LOGOUT
// ============================================================

app.post(
    "/api/logout",
    requireUser,
    async (req, res) => {
        try {
            await logActivity(
                req.user,
                "Logout",
                "User logged out."
            );
        } catch (error) {
            console.error(
                "[LOGOUT ACTIVITY]",
                error.message
            );
        }

        return res.json({
            success: true,
            message:
                "Logged out successfully."
        });
    }
);

// ============================================================
// REGULAR ACCESS
// ============================================================

app.get(
    "/api/regular-access/status",
    requireUser,
    async (req, res) => {
        return res.json({
            success: true,
            active: true,
            user: req.user
        });
    }
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

app.post(
    "/api/forgot-password",
    async (req, res) => {
        try {
            const email =
                String(
                    req.body.email || ""
                )
                    .trim()
                    .toLowerCase();

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Email is required."
                });
            }

            const result =
                await db.query(
                    `SELECT
                        id,
                        name,
                        email
                     FROM users
                     WHERE LOWER(email) = LOWER($1)
                     LIMIT 1`,
                    [email]
                );

            if (
                result.rows.length === 0
            ) {
                return res.json({
                    success: true,
                    message:
                        "If the email exists, password reset instructions will be sent."
                });
            }

            const user =
                result.rows[0];

            const resetToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");

            const expiresAt =
                new Date(
                    Date.now() +
                    30 * 60 * 1000
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
                `[PASSWORD RESET] Token generated for ${user.email}`
            );

            // Do not expose the token in the HTTP response.
            // Email delivery can be connected later.

            return res.json({
                success: true,
                message:
                    "If the email exists, password reset instructions will be sent."
            });

        } catch (error) {
            console.error(
                "[FORGOT PASSWORD]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to process password reset."
            });
        }
    }
);

// ============================================================
// RESET PASSWORD
// ============================================================

app.post(
    "/api/reset-password",
    async (req, res) => {
        try {
            const token =
                String(
                    req.body.token || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            if (
                !token ||
                !password
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Reset token and password are required."
                });
            }

            if (
                password.length < 6
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 6 characters."
                });
            }

            const result =
                await db.query(
                    `SELECT id
                     FROM users
                     WHERE reset_token = $1
                       AND reset_token_expires > CURRENT_TIMESTAMP
                     LIMIT 1`,
                    [token]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid or expired reset token."
                });
            }

            const passwordHash =
                await bcrypt.hash(
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

            return res.json({
                success: true,
                message:
                    "Password reset successfully."
            });

        } catch (error) {
            console.error(
                "[RESET PASSWORD]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to reset password."
            });
        }
    }
);

// ============================================================
// ADMIN LOGIN
// ============================================================

app.post(
    "/api/admin/login",
    async (req, res) => {
        try {
            const username =
                String(
                    req.body.username || ""
                ).trim();

            const password =
                String(
                    req.body.password || ""
                );

            if (
                username !==
                    ADMIN_USERNAME ||
                password !==
                    ADMIN_PASSWORD
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Invalid admin credentials."
                });
            }

            const token =
                createAdminToken();

            // Verify immediately.
            jwt.verify(
                token,
                JWT_SECRET
            );

            console.log(
                "[ADMIN AUTH] Admin login successful."
            );

            return res.json({
                success: true,
                message:
                    "Admin login successful.",
                token,
                admin: {
                    username:
                        ADMIN_USERNAME
                }
            });

        } catch (error) {
            console.error(
                "[ADMIN LOGIN]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Admin login failed."
            });
        }
    }
);

// ============================================================
// ADMIN ME
// ============================================================

app.get(
    "/api/admin/me",
    requireAdmin,
    (req, res) => {
        return res.json({
            success: true,
            admin: {
                username:
                    ADMIN_USERNAME
            }
        });
    }
);

// ============================================================
// VIP HELPERS
// ============================================================

async function getActiveVipSubscription(
    userId
) {
    const result =
        await db.query(
            `SELECT *
             FROM vip_subscriptions
             WHERE user_id = $1
               AND status = 'active'
               AND expires_at > CURRENT_TIMESTAMP
             ORDER BY expires_at DESC
             LIMIT 1`,
            [userId]
        );

    return (
        result.rows[0] || null
    );
}

// ============================================================
// VIP TOKEN AUTHENTICATION
// ============================================================

async function requireVip(
    req,
    res,
    next
) {
    try {
        const token =
            getBearerToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "VIP access required."
            });
        }

        let decoded;

        try {
            decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid or expired VIP token."
            });
        }

        if (
            !decoded ||
            decoded.type !== "vip"
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid VIP token."
            });
        }

        const userResult =
            await db.query(
                `SELECT
                    id,
                    name,
                    username,
                    email,
                    status
                 FROM users
                 WHERE id = $1
                 LIMIT 1`,
                [decoded.id]
            );

        if (
            userResult.rows.length === 0
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "User account not found."
            });
        }

        const user =
            userResult.rows[0];

        if (
            user.status !== "active"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account has been disabled."
            });
        }

        const subscriptionResult =
            await db.query(
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

        if (
            subscriptionResult.rows.length === 0
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "VIP subscription not found."
            });
        }

        const subscription =
            subscriptionResult.rows[0];

        if (
            subscription.status !==
                "active" ||
            new Date(
                subscription.expires_at
            ) <= new Date()
        ) {
            await db.query(
                `UPDATE vip_subscriptions
                 SET status = 'expired'
                 WHERE id = $1`,
                [subscription.id]
            );

            return res.status(403).json({
                success: false,
                message:
                    "Your VIP access has expired."
            });
        }

        req.user = user;
        req.vipSubscription =
            subscription;

        next();

    } catch (error) {
        console.error(
            "[VIP AUTH]",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "VIP authentication service error."
        });
    }
}

// ============================================================
// ADMIN - CREATE VIP CODE
// ============================================================

app.post(
    "/api/admin/vip-subscriptions",
    requireAdmin,
    async (req, res) => {
        try {
            const {
                plan
            } = req.body;

            const plans = {
                "1_week": 7,
                "2_weeks": 14,
                "1_month": 30
            };

            if (
                !Object.prototype.hasOwnProperty.call(
                    plans,
                    plan
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid VIP plan."
                });
            }

            const code =
                generateCode("VIP");

            const result =
                await db.query(
                    `INSERT INTO vip_subscriptions
                    (
                        code,
                        plan,
                        duration_days,
                        status
                    )
                    VALUES
                    ($1,$2,$3,'unused')
                    RETURNING *`,
                    [
                        code,
                        plan,
                        plans[plan]
                    ]
                );

            return res.status(201).json({
                success: true,
                message:
                    "VIP access code generated.",
                subscription:
                    result.rows[0]
            });

        } catch (error) {
            console.error(
                "[VIP CODE]",
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
// ADMIN - VIP HISTORY
// ============================================================

app.get(
    "/api/admin/vip-subscriptions",
    requireAdmin,
    async (req, res) => {
        try {
            const result =
                await db.query(
                    `SELECT *
                     FROM vip_subscriptions
                     ORDER BY created_at DESC`
                );

            return res.json({
                success: true,
                subscriptions:
                    result.rows
            });

        } catch (error) {
            console.error(
                "[VIP HISTORY]",
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
// VIP ACCESS
// ============================================================

app.post(
    "/api/vip/access",
    requireUser,
    async (req, res) => {
        try {
            const accessCode =
                String(
                    req.body.accessCode || ""
                )
                    .trim()
                    .toUpperCase();

            if (!accessCode) {
                return res.status(400).json({
                    success: false,
                    message:
                        "VIP access code is required."
                });
            }

            const result =
                await db.query(
                    `SELECT *
                     FROM vip_subscriptions
                     WHERE code = $1
                     LIMIT 1`,
                    [accessCode]
                );

            if (
                result.rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Invalid VIP access code."
                });
            }

            const subscription =
                result.rows[0];

            // Allow the same user to restore
            // their already-active subscription.
            if (
                subscription.status ===
                    "active" &&
                String(
                    subscription.user_id
                ) ===
                    String(req.user.id)
            ) {
                const token =
                    createVipToken(
                        req.user,
                        subscription.id
                    );

                return res.json({
                    success: true,
                    message:
                        "VIP access restored.",
                    token,
                    subscription
                });
            }

            if (
                subscription.status !==
                    "unused"
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This VIP code has already been used."
                });
            }

            const expiresAt =
                new Date(
                    Date.now() +
                    Number(
                        subscription.duration_days
                    ) *
                    24 *
                    60 *
                    60 *
                    1000
                );

            const updated =
                await db.query(
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

            if (
                updated.rows.length === 0
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This VIP code is no longer available."
                });
            }

            const activeSubscription =
                updated.rows[0];

            await logActivity(
                req.user,
                "VIP Access Activated",
                `VIP plan: ${activeSubscription.plan}`
            );

            const token =
                createVipToken(
                    req.user,
                    activeSubscription.id
                );

            return res.json({
                success: true,
                message:
                    "VIP access activated successfully.",
                token,
                subscription:
                    activeSubscription
            });

        } catch (error) {
            console.error(
                "[VIP ACCESS]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to activate VIP access."
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
                new Date(
                    subscription.expires_at
                ) -
                new Date();

            const remainingDays =
                Math.max(
                    0,
                    Math.ceil(
                        remainingMs /
                        (24 *
                            60 *
                            60 *
                            1000)
                    )
                );

            return res.json({
                success: true,
                active: true,
                status:
                    subscription.status,
                plan:
                    subscription.plan,
                expiresAt:
                    subscription.expires_at,
                remainingDays
            });

        } catch (error) {
            console.error(
                "[VIP STATUS]",
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
// REGULAR PREDICTIONS
// ============================================================

app.get(
    "/api/predictions",
    requireUser,
    async (req, res) => {
        try {
            const result =
                await db.query(
                    `SELECT *
                     FROM predictions
                     WHERE category = 'regular'
                        OR category IS NULL
                     ORDER BY
                        match_date ASC,
                        match_time ASC,
                        id DESC`
                );

            return res.json({
                success: true,
                predictions:
                    result.rows
            });

        } catch (error) {
            console.error(
                "[PREDICTIONS]",
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
// SINGLE PREDICTION
// ============================================================

app.get(
    "/api/predictions/:id",
    requireUser,
    async (req, res) => {
        try {
            const result =
                await db.query(
                    `SELECT *
                     FROM predictions
                     WHERE id = $1
                     LIMIT 1`,
                    [req.params.id]
                );

            if (
                result.rows.length === 0
            ) {
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
                "[SINGLE PREDICTION]",
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
// VIP PREDICTIONS
// ============================================================

app.get(
    "/api/vip/predictions",
    requireVip,
    async (req, res) => {
        try {
            const result =
                await db.query(
                    `SELECT *
                     FROM predictions
                     WHERE category = 'vip'
                     ORDER BY
                        match_date ASC,
                        match_time ASC,
                        id DESC`
                );

            return res.json({
                success: true,
                predictions:
                    result.rows
            });

        } catch (error) {
            console.error(
                "[VIP PREDICTIONS]",
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
// ADMIN - ALL PREDICTIONS
// ============================================================

app.get(
    "/api/admin/predictions",
    requireAdmin,
    async (req, res) => {
        try {
            const result =
                await db.query(
                    `SELECT *
                     FROM predictions
                     ORDER BY
                        match_date DESC,
                        match_time DESC,
                        id DESC`
                );

            return res.json({
                success: true,
                predictions:
                    result.rows
            });

        } catch (error) {
            console.error(
                "[ADMIN PREDICTIONS]",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load admin predictions."
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
            const result =
                await db.query(
                    `SELECT *
                     FROM predictions
                     WHERE category = 'vip'
                     ORDER BY
                        match_date DESC,
                        match_time DESC,
                        id DESC`
                );

            return res.json({
                success: true,
                predictions:
                    result.rows
            });

        } catch (error) {
            console.error(
                "[ADMIN VIP PREDICTIONS]",
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
// ======================================================
// FLEX HUB PREDICTIONS - SERVER.JS
// PART 2 / 3
// ADMIN PREDICTIONS + RESULTS + USERS + NOTIFICATIONS
// ======================================================


// ======================================================
// ADMIN - CREATE PREDICTION
// ======================================================

app.post("/api/admin/predictions", requireAdmin, async (req, res) => {
    try {
        const {
            league,
            homeTeam,
            awayTeam,
            matchDate,
            matchTime,
            prediction,
            confidence,
            odds,
            type,
            analysis,
            isVip
        } = req.body;

        if (!homeTeam || !awayTeam || !prediction) {
            return res.status(400).json({
                success: false,
                message: "Home team, away team and prediction are required."
            });
        }

        const vip = Boolean(isVip);

        const result = await db.run(
            `
            INSERT INTO predictions (
                league,
                home_team,
                away_team,
                match_date,
                match_time,
                prediction,
                confidence,
                odds,
                type,
                analysis,
                is_vip,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
            [
                league || "General",
                homeTeam,
                awayTeam,
                matchDate || null,
                matchTime || null,
                prediction,
                confidence || null,
                odds || null,
                type || "Competitive Match",
                analysis || "",
                vip ? 1 : 0
            ]
        );

        await logActivity(
            req.admin.username,
            "CREATE_PREDICTION",
            `Created ${vip ? "VIP" : "regular"} prediction: ${homeTeam} vs ${awayTeam}`
        );

        const created = await db.get(
            "SELECT * FROM predictions WHERE id = ?",
            [result.lastID]
        );

        res.status(201).json({
            success: true,
            message: "Prediction created successfully.",
            prediction: created
        });

    } catch (error) {
        console.error("Create prediction error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create prediction."
        });
    }
});


// ======================================================
// ADMIN - UPDATE PREDICTION
// ======================================================

app.put("/api/admin/predictions/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid prediction ID."
            });
        }

        const existing = await db.get(
            "SELECT * FROM predictions WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Prediction not found."
            });
        }

        const {
            league,
            homeTeam,
            awayTeam,
            matchDate,
            matchTime,
            prediction,
            confidence,
            odds,
            type,
            analysis,
            isVip,
            status
        } = req.body;

        await db.run(
            `
            UPDATE predictions
            SET
                league = ?,
                home_team = ?,
                away_team = ?,
                match_date = ?,
                match_time = ?,
                prediction = ?,
                confidence = ?,
                odds = ?,
                type = ?,
                analysis = ?,
                is_vip = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                league ?? existing.league,
                homeTeam ?? existing.home_team,
                awayTeam ?? existing.away_team,
                matchDate ?? existing.match_date,
                matchTime ?? existing.match_time,
                prediction ?? existing.prediction,
                confidence ?? existing.confidence,
                odds ?? existing.odds,
                type ?? existing.type,
                analysis ?? existing.analysis,
                isVip !== undefined
                    ? (Boolean(isVip) ? 1 : 0)
                    : existing.is_vip,
                status ?? existing.status ?? "pending",
                id
            ]
        );

        await logActivity(
            req.admin.username,
            "UPDATE_PREDICTION",
            `Updated prediction ID ${id}`
        );

        const updated = await db.get(
            "SELECT * FROM predictions WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Prediction updated successfully.",
            prediction: updated
        });

    } catch (error) {
        console.error("Update prediction error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update prediction."
        });
    }
});


// ======================================================
// ADMIN - DELETE PREDICTION
// ======================================================

app.delete("/api/admin/predictions/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid prediction ID."
            });
        }

        const existing = await db.get(
            "SELECT * FROM predictions WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Prediction not found."
            });
        }

        await db.run(
            "DELETE FROM predictions WHERE id = ?",
            [id]
        );

        await logActivity(
            req.admin.username,
            "DELETE_PREDICTION",
            `Deleted prediction ID ${id}`
        );

        res.json({
            success: true,
            message: "Prediction deleted successfully."
        });

    } catch (error) {
        console.error("Delete prediction error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete prediction."
        });
    }
});


// ======================================================
// ADMIN - UPDATE PREDICTION RESULT STATUS
// ======================================================

app.patch("/api/admin/predictions/:id/status", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "won",
            "lost",
            "void",
            "cancelled"
        ];

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid prediction ID."
            });
        }

        if (!allowedStatuses.includes(String(status).toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid prediction status."
            });
        }

        const normalizedStatus = String(status).toLowerCase();

        const existing = await db.get(
            "SELECT * FROM predictions WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Prediction not found."
            });
        }

        await db.run(
            `
            UPDATE predictions
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [normalizedStatus, id]
        );

        await logActivity(
            req.admin.username,
            "UPDATE_PREDICTION_STATUS",
            `Prediction ID ${id} changed to ${normalizedStatus}`
        );

        res.json({
            success: true,
            message: "Prediction status updated successfully.",
            status: normalizedStatus
        });

    } catch (error) {
        console.error("Update prediction status error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update prediction status."
        });
    }
});


// ======================================================
// ADMIN - GET RESULTS
// ======================================================

app.get("/api/admin/results", requireAdmin, async (req, res) => {
    try {
        const results = await db.all(
            `
            SELECT *
            FROM results
            ORDER BY
                result_date DESC,
                id DESC
            `
        );

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("Admin results error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load results."
        });
    }
});


// ======================================================
// PUBLIC - GET RESULTS
// ======================================================

app.get("/api/results", async (req, res) => {
    try {
        const results = await db.all(
            `
            SELECT *
            FROM results
            ORDER BY
                result_date DESC,
                id DESC
            LIMIT 100
            `
        );

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("Public results error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load results."
        });
    }
});


// ======================================================
// ADMIN - CREATE RESULT
// ======================================================

app.post("/api/admin/results", requireAdmin, async (req, res) => {
    try {
        const {
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            prediction,
            status,
            resultDate,
            league
        } = req.body;

        if (!homeTeam || !awayTeam) {
            return res.status(400).json({
                success: false,
                message: "Home team and away team are required."
            });
        }

        const allowedStatuses = [
            "won",
            "lost",
            "pending",
            "void",
            "cancelled"
        ];

        const finalStatus = allowedStatuses.includes(
            String(status || "").toLowerCase()
        )
            ? String(status).toLowerCase()
            : "pending";

        const result = await db.run(
            `
            INSERT INTO results (
                home_team,
                away_team,
                home_score,
                away_score,
                prediction,
                status,
                result_date,
                league,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
            [
                homeTeam,
                awayTeam,
                homeScore ?? null,
                awayScore ?? null,
                prediction || "",
                finalStatus,
                resultDate || null,
                league || "General"
            ]
        );

        await logActivity(
            req.admin.username,
            "CREATE_RESULT",
            `Created result: ${homeTeam} vs ${awayTeam}`
        );

        const created = await db.get(
            "SELECT * FROM results WHERE id = ?",
            [result.lastID]
        );

        res.status(201).json({
            success: true,
            message: "Result created successfully.",
            result: created
        });

    } catch (error) {
        console.error("Create result error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create result."
        });
    }
});


// ======================================================
// ADMIN - UPDATE RESULT
// ======================================================

app.put("/api/admin/results/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid result ID."
            });
        }

        const existing = await db.get(
            "SELECT * FROM results WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Result not found."
            });
        }

        const {
            homeTeam,
            awayTeam,
            homeScore,
            awayScore,
            prediction,
            status,
            resultDate,
            league
        } = req.body;

        const allowedStatuses = [
            "won",
            "lost",
            "pending",
            "void",
            "cancelled"
        ];

        const finalStatus =
            status !== undefined
                ? (
                    allowedStatuses.includes(
                        String(status).toLowerCase()
                    )
                        ? String(status).toLowerCase()
                        : existing.status
                )
                : existing.status;

        await db.run(
            `
            UPDATE results
            SET
                home_team = ?,
                away_team = ?,
                home_score = ?,
                away_score = ?,
                prediction = ?,
                status = ?,
                result_date = ?,
                league = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                homeTeam ?? existing.home_team,
                awayTeam ?? existing.away_team,
                homeScore ?? existing.home_score,
                awayScore ?? existing.away_score,
                prediction ?? existing.prediction,
                finalStatus,
                resultDate ?? existing.result_date,
                league ?? existing.league,
                id
            ]
        );

        await logActivity(
            req.admin.username,
            "UPDATE_RESULT",
            `Updated result ID ${id}`
        );

        const updated = await db.get(
            "SELECT * FROM results WHERE id = ?",
            [id]
        );

        res.json({
            success: true,
            message: "Result updated successfully.",
            result: updated
        });

    } catch (error) {
        console.error("Update result error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update result."
        });
    }
});


// ======================================================
// ADMIN - DELETE RESULT
// ======================================================

app.delete("/api/admin/results/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid result ID."
            });
        }

        const existing = await db.get(
            "SELECT * FROM results WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Result not found."
            });
        }

        await db.run(
            "DELETE FROM results WHERE id = ?",
            [id]
        );

        await logActivity(
            req.admin.username,
            "DELETE_RESULT",
            `Deleted result ID ${id}`
        );

        res.json({
            success: true,
            message: "Result deleted successfully."
        });

    } catch (error) {
        console.error("Delete result error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete result."
        });
    }
});


// ======================================================
// ADMIN - GET USERS
// ======================================================

app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
        const users = await db.all(
            `
            SELECT
                id,
                name,
                username,
                email,
                is_active,
                is_admin,
                created_at,
                updated_at,
                last_login
            FROM users
            ORDER BY id DESC
            `
        );

        res.json({
            success: true,
            users
        });

    } catch (error) {
        console.error("Admin users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load users."
        });
    }
});


// ======================================================
// ADMIN - UPDATE USER
// ======================================================

app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const existing = await db.get(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const {
            name,
            username,
            email,
            isActive
        } = req.body;

        await db.run(
            `
            UPDATE users
            SET
                name = ?,
                username = ?,
                email = ?,
                is_active = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [
                name ?? existing.name,
                username ?? existing.username,
                email ?? existing.email,
                isActive !== undefined
                    ? (Boolean(isActive) ? 1 : 0)
                    : existing.is_active,
                id
            ]
        );

        await logActivity(
            req.admin.username,
            "UPDATE_USER",
            `Updated user ID ${id}`
        );

        const updated = await db.get(
            `
            SELECT
                id,
                name,
                username,
                email,
                is_active,
                is_admin,
                created_at,
                updated_at,
                last_login
            FROM users
            WHERE id = ?
            `,
            [id]
        );

        res.json({
            success: true,
            message: "User updated successfully.",
            user: updated
        });

    } catch (error) {
        console.error("Update user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update user."
        });
    }
});


// ======================================================
// ADMIN - UPDATE USER STATUS
// ======================================================

app.patch("/api/admin/users/:id/status", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { isActive } = req.body;

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const existing = await db.get(
            "SELECT id FROM users WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        await db.run(
            `
            UPDATE users
            SET is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [Boolean(isActive) ? 1 : 0, id]
        );

        await logActivity(
            req.admin.username,
            "UPDATE_USER_STATUS",
            `User ID ${id} set to ${Boolean(isActive) ? "active" : "inactive"}`
        );

        res.json({
            success: true,
            message: "User status updated successfully.",
            isActive: Boolean(isActive)
        });

    } catch (error) {
        console.error("Update user status error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update user status."
        });
    }
});


// ======================================================
// ADMIN - DELETE USER
// ======================================================

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const existing = await db.get(
            "SELECT id, username FROM users WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        await db.run(
            "DELETE FROM users WHERE id = ?",
            [id]
        );

        await logActivity(
            req.admin.username,
            "DELETE_USER",
            `Deleted user ${existing.username}`
        );

        res.json({
            success: true,
            message: "User deleted successfully."
        });

    } catch (error) {
        console.error("Delete user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete user."
        });
    }
});


// ======================================================
// ADMIN - ACTIVITY LOGS
// ======================================================

app.get("/api/admin/activity-logs", requireAdmin, async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(Number(req.query.limit) || 100, 1),
            500
        );

        const logs = await db.all(
            `
            SELECT *
            FROM activity_logs
            ORDER BY id DESC
            LIMIT ?
            `,
            [limit]
        );

        res.json({
            success: true,
            logs
        });

    } catch (error) {
        console.error("Activity logs error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load activity logs."
        });
    }
});


// ======================================================
// ADMIN - GET NOTIFICATIONS
// ======================================================

app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
        const notifications = await db.all(
            `
            SELECT *
            FROM notifications
            ORDER BY id DESC
            LIMIT 200
            `
        );

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error("Admin notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load notifications."
        });
    }
});


// ======================================================
// ADMIN - CREATE NOTIFICATION
// ======================================================

app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
        const {
            title,
            message,
            type,
            target
        } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "Notification title and message are required."
            });
        }

        const result = await db.run(
            `
            INSERT INTO notifications (
                title,
                message,
                type,
                target,
                created_at
            )
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `,
            [
                title,
                message,
                type || "info",
                target || "all"
            ]
        );

        await logActivity(
            req.admin.username,
            "CREATE_NOTIFICATION",
            `Created notification: ${title}`
        );

        const notification = await db.get(
            "SELECT * FROM notifications WHERE id = ?",
            [result.lastID]
        );

        res.status(201).json({
            success: true,
            message: "Notification created successfully.",
            notification
        });

    } catch (error) {
        console.error("Create notification error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create notification."
        });
    }
});


// ======================================================
// ADMIN - DELETE NOTIFICATION
// ======================================================

app.delete("/api/admin/notifications/:id", requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
        }

        const existing = await db.get(
            "SELECT id FROM notifications WHERE id = ?",
            [id]
        );

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        await db.run(
            "DELETE FROM notifications WHERE id = ?",
            [id]
        );

        await logActivity(
            req.admin.username,
            "DELETE_NOTIFICATION",
            `Deleted notification ID ${id}`
        );

        res.json({
            success: true,
            message: "Notification deleted successfully."
        });

    } catch (error) {
        console.error("Delete notification error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete notification."
        });
    }
});


// ======================================================
// USER - GET NOTIFICATIONS
// ======================================================

app.get("/api/notifications", requireUser, async (req, res) => {
    try {
        const notifications = await db.all(
            `
            SELECT *
            FROM notifications
            WHERE target = 'all'
               OR target = ?
            ORDER BY id DESC
            LIMIT 100
            `,
            [req.user.username]
        );

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error("User notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load notifications."
        });
    }
});


// ======================================================
// USER - MARK NOTIFICATION AS READ
// ======================================================

app.post("/api/notifications/:id/read", requireUser, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID."
            });
        }

        /*
         * This endpoint is intentionally tolerant because older
         * database versions may not have a separate notification_reads
         * table.
         *
         * If such a table exists, mark the notification there.
         */

        try {
            await db.run(
                `
                INSERT OR IGNORE INTO notification_reads (
                    notification_id,
                    user_id,
                    read_at
                )
                VALUES (?, ?, CURRENT_TIMESTAMP)
                `,
                [id, req.user.id]
            );
        } catch (readError) {
            console.warn(
                "notification_reads table unavailable:",
                readError.message
            );
        }

        res.json({
            success: true,
            message: "Notification marked as read."
        });

    } catch (error) {
        console.error("Mark notification read error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read."
        });
    }
});


// ======================================================
// PART 2 COMPLETE
// ======================================================
// ======================================================
// FLEX HUB PREDICTIONS - SERVER.JS
// PART 3 / 3
// PAYMENTS + PUBLIC UTILITIES + ERROR HANDLING + STARTUP
// ======================================================


// ======================================================
// PAYMENT - INITIALIZE
// ======================================================

app.post("/api/payments/initialize", requireUser, async (req, res) => {
    try {
        const {
            amount,
            email,
            plan,
            callbackUrl
        } = req.body;

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid payment amount is required."
            });
        }

        const paymentEmail =
            String(email || req.user.email || "").trim();

        if (!paymentEmail) {
            return res.status(400).json({
                success: false,
                message: "A valid email address is required."
            });
        }

        const reference =
            `FLEX-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

        const secretKey =
            String(process.env.PAYSTACK_SECRET_KEY || "").trim();

        /*
         * If Paystack is not configured yet, return a clear message
         * instead of crashing the server.
         */

        if (!secretKey) {
            return res.status(503).json({
                success: false,
                message: "Payment service is not configured yet."
            });
        }

        const paystackResponse = await fetch(
            "https://api.paystack.co/transaction/initialize",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${secretKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: paymentEmail,
                    amount: Math.round(numericAmount * 100),
                    reference,
                    callback_url:
                        callbackUrl ||
                        process.env.PAYMENT_CALLBACK_URL ||
                        undefined,
                    metadata: {
                        userId: req.user.id,
                        username: req.user.username,
                        plan: plan || "VIP"
                    }
                })
            }
        );

        const paymentData = await paystackResponse.json();

        if (!paystackResponse.ok || !paymentData.status) {
            console.error(
                "Paystack initialize error:",
                paymentData
            );

            return res.status(502).json({
                success: false,
                message:
                    paymentData.message ||
                    "Unable to initialize payment."
            });
        }

        /*
         * Store the transaction if the payments table exists.
         * This is wrapped so an older database does not crash
         * the payment initialization request.
         */

        try {
            await db.run(
                `
                INSERT INTO payments (
                    user_id,
                    reference,
                    amount,
                    plan,
                    status,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `,
                [
                    req.user.id,
                    reference,
                    numericAmount,
                    plan || "VIP",
                    "pending"
                ]
            );
        } catch (paymentDbError) {
            console.warn(
                "Payment record could not be stored:",
                paymentDbError.message
            );
        }

        await logActivity(
            req.user.username,
            "PAYMENT_INITIALIZED",
            `Payment initialized for ${plan || "VIP"}`
        );

        res.json({
            success: true,
            message: "Payment initialized successfully.",
            authorization_url:
                paymentData.data.authorization_url,
            access_code:
                paymentData.data.access_code,
            reference:
                paymentData.data.reference || reference
        });

    } catch (error) {
        console.error("Payment initialization error:", error);

        res.status(500).json({
            success: false,
            message: "Payment initialization failed."
        });
    }
});


// ======================================================
// PAYMENT - VERIFY
// ======================================================

app.get("/api/payments/verify/:reference", requireUser, async (req, res) => {
    try {
        const reference =
            String(req.params.reference || "").trim();

        if (!reference) {
            return res.status(400).json({
                success: false,
                message: "Payment reference is required."
            });
        }

        const secretKey =
            String(process.env.PAYSTACK_SECRET_KEY || "").trim();

        if (!secretKey) {
            return res.status(503).json({
                success: false,
                message: "Payment service is not configured yet."
            });
        }

        const paystackResponse = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${secretKey}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const paymentData = await paystackResponse.json();

        if (!paystackResponse.ok || !paymentData.status) {
            return res.status(502).json({
                success: false,
                message:
                    paymentData.message ||
                    "Unable to verify payment."
            });
        }

        const transaction =
            paymentData.data || {};

        const paymentStatus =
            String(transaction.status || "").toLowerCase();

        /*
         * Only treat Paystack's successful status as successful.
         */

        const successful =
            paymentStatus === "success";

        try {
            await db.run(
                `
                UPDATE payments
                SET
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE reference = ?
                `,
                [
                    successful ? "success" : paymentStatus,
                    reference
                ]
            );
        } catch (paymentDbError) {
            console.warn(
                "Payment record update failed:",
                paymentDbError.message
            );
        }

        await logActivity(
            req.user.username,
            "PAYMENT_VERIFIED",
            `Payment ${reference}: ${successful ? "success" : paymentStatus}`
        );

        res.json({
            success: true,
            paid: successful,
            status: paymentStatus,
            reference,
            transaction
        });

    } catch (error) {
        console.error("Payment verification error:", error);

        res.status(500).json({
            success: false,
            message: "Payment verification failed."
        });
    }
});


// ======================================================
// PUBLIC - SITE STATUS
// ======================================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        status: "online",
        service: "FLEX HUB PREDICTIONS API",
        version: "2.0.0",
        time: new Date().toISOString()
    });
});


// ======================================================
// PUBLIC - HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        service: "FLEX HUB PREDICTIONS",
        uptime: process.uptime(),
        time: new Date().toISOString()
    });
});


// ======================================================
// API 404 HANDLER
// ======================================================

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        path: req.originalUrl
    });
});


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
    console.error("GLOBAL SERVER ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    if (error && error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body is too large."
        });
    }

    res.status(
        Number(error?.status) >= 400
            ? Number(error.status)
            : 500
    ).json({
        success: false,
        message:
            error?.message ||
            "Internal server error."
    });
});


// ======================================================
// START SERVER
// ======================================================

async function startServer() {
    try {
        console.log("");
        console.log("==============================================");
        console.log(" FLEX HUB PREDICTIONS");
        console.log(" Starting backend server...");
        console.log("==============================================");

        await db.init();

        console.log("Database initialized successfully.");

        const PORT =
            Number(process.env.PORT) || 3000;

        app.listen(PORT, "0.0.0.0", () => {
            console.log("");
            console.log("==============================================");
            console.log(" FLEX HUB PREDICTIONS BACKEND");
            console.log("==============================================");
            console.log(` Server running on port ${PORT}`);
            console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
            console.log(` API: http://localhost:${PORT}/api`);
            console.log(` Status: http://localhost:${PORT}/api/status`);
            console.log(` Health: http://localhost:${PORT}/health`);
            console.log("==============================================");
            console.log("");
        });

    } catch (error) {
        console.error("");
        console.error("==============================================");
        console.error(" SERVER STARTUP FAILED");
        console.error("==============================================");
        console.error(error);
        console.error("==============================================");

        process.exit(1);
    }
}


// ======================================================
// PROCESS ERROR HANDLERS
// ======================================================

process.on("unhandledRejection", (reason) => {
    console.error(
        "UNHANDLED PROMISE REJECTION:",
        reason
    );
});

process.on("uncaughtException", (error) => {
    console.error(
        "UNCAUGHT EXCEPTION:",
        error
    );
});


// ======================================================
// START
// ======================================================

startServer();


// ======================================================
// END OF SERVER.JS
// ======================================================
