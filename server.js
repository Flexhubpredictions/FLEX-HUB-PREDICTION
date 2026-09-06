// ======================================================
// FLEX HUB PREDICTIONS - PRODUCTION BACKEND SERVER
// ======================================================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");

const db = require("./database");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// ======================================================
// CONFIGURATION
// ======================================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "FLEX";

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || "CHANGE_ADMIN_PASSWORD";

const JWT_SECRET =
    process.env.JWT_SECRET || "CHANGE_THIS_SECRET_BEFORE_HOSTING";

// Frontend URL for production CORS.
// During local development, localhost is allowed.
const FRONTEND_URL =
    process.env.FRONTEND_URL || "http://localhost:5500";

// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    FRONTEND_URL
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests without an Origin header
            // such as direct server-to-server requests.
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("Origin not allowed by CORS")
            );
        },
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

// ======================================================
// BODY PARSING
// ======================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ======================================================
// BASIC ROUTES
// ======================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "FLEX HUB PREDICTIONS backend is running."
    });
});

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "FLEX HUB PREDICTIONS API is online.",
        serverTime: new Date().toISOString()
    });
});

// ======================================================
// JWT FUNCTIONS
// ======================================================

function createToken(payload, expiresIn = "7d") {
    return jwt.sign(
        payload,
        JWT_SECRET,
        {
            expiresIn
        }
    );
}

function getTokenFromRequest(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.split(" ")[1];
}

// ======================================================
// USER AUTHENTICATION MIDDLEWARE
// ======================================================

function requireUser(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                message: "Please login first."
            });
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        if (decoded.type !== "user") {
            return res.status(401).json({
                message: "Invalid user token."
            });
        }

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message:
                "Your session has expired. Please login again."
        });
    }
}

// ======================================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ======================================================

function requireAdmin(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                message: "Admin login required."
            });
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        if (decoded.type !== "admin") {
            return res.status(401).json({
                message: "Invalid admin token."
            });
        }

        req.admin = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message:
                "Admin session expired. Please login again."
        });
    }
}

// ======================================================
// VIP AUTHENTICATION MIDDLEWARE
// ======================================================

function requireVip(req, res, next) {
    try {
        const token = getTokenFromRequest(req);

        if (!token) {
            return res.status(401).json({
                message: "VIP access required."
            });
        }

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        if (decoded.type !== "vip") {
            return res.status(401).json({
                message: "Invalid VIP token."
            });
        }

        const subscription = db.prepare(`
            SELECT *
            FROM vip_subscriptions
            WHERE id = ?
        `).get(decoded.subscriptionId);

        if (!subscription) {
            return res.status(401).json({
                message:
                    "VIP subscription not found."
            });
        }

        if (subscription.status !== "active") {
            return res.status(401).json({
                message:
                    "VIP subscription is not active."
            });
        }

        if (
            subscription.expires_at &&
            new Date(subscription.expires_at) <= new Date()
        ) {
            db.prepare(`
                UPDATE vip_subscriptions
                SET status = 'expired'
                WHERE id = ?
            `).run(subscription.id);

            return res.status(401).json({
                message:
                    "Your VIP access has expired."
            });
        }

        req.vip = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "VIP session expired."
        });
    }
}

// ======================================================
// USER REGISTRATION
// ======================================================

app.post("/api/register", async (req, res) => {
    try {
        const {
            name,
            username,
            email,
            password
        } = req.body;

        if (
            !name ||
            !username ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    "Please complete all registration fields."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message:
                    "Password must contain at least 6 characters."
            });
        }

        const cleanName = name.trim();
        const cleanUsername = username.trim();
        const cleanEmail =
            email.trim().toLowerCase();

        const existingUsername = db.prepare(`
            SELECT id
            FROM users
            WHERE username = ?
        `).get(cleanUsername);

        if (existingUsername) {
            return res.status(409).json({
                message:
                    "Username is already taken."
            });
        }

        const existingEmail = db.prepare(`
            SELECT id
            FROM users
            WHERE email = ?
        `).get(cleanEmail);

        if (existingEmail) {
            return res.status(409).json({
                message:
                    "Email is already registered."
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const result = db.prepare(`
            INSERT INTO users
            (name, username, email, password)
            VALUES (?, ?, ?, ?)
        `).run(
            cleanName,
            cleanUsername,
            cleanEmail,
            hashedPassword
        );

        const user = db.prepare(`
            SELECT
                id,
                name,
                username,
                email,
                created_at
            FROM users
            WHERE id = ?
        `).get(result.lastInsertRowid);

        const token = createToken({
            id: user.id,
            username: user.username,
            type: "user"
        });

        res.status(201).json({
            message:
                "Account created successfully.",
            user,
            token
        });

    } catch (error) {
        console.error(
            "Registration error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to create account."
        });
    }
});

// ======================================================
// USER LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {
    try {
        const {
            identifier,
            password
        } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                message:
                    "Enter your username/email and password."
            });
        }

        const cleanIdentifier =
            identifier.trim();

        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE username = ?
               OR email = ?
        `).get(
            cleanIdentifier,
            cleanIdentifier.toLowerCase()
        );

        if (!user) {
            return res.status(401).json({
                message:
                    "Invalid login details."
            });
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatches) {
            return res.status(401).json({
                message:
                    "Invalid login details."
            });
        }

        const token = createToken({
            id: user.id,
            username: user.username,
            type: "user"
        });

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
        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            message:
                "Unable to login."
        });
    }
});

// ======================================================
// CURRENT USER
// ======================================================

app.get(
    "/api/user/me",
    requireUser,
    (req, res) => {
        try {
            const user = db.prepare(`
                SELECT
                    id,
                    name,
                    username,
                    email,
                    created_at
                FROM users
                WHERE id = ?
            `).get(req.user.id);

            if (!user) {
                return res.status(404).json({
                    message:
                        "User account not found."
                });
            }

            res.json({
                user
            });

        } catch (error) {
            console.error(
                "Current user error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load user account."
            });
        }
    }
);

// ======================================================
// ADMIN LOGIN
// ======================================================

app.post(
    "/api/admin/login",
    async (req, res) => {
        try {
            const {
                username,
                password
            } = req.body;

            if (!username || !password) {
                return res.status(400).json({
                    message:
                        "Enter admin username and password."
                });
            }

            if (
                username !== ADMIN_USERNAME ||
                password !== ADMIN_PASSWORD
            ) {
                return res.status(401).json({
                    message:
                        "Invalid admin credentials."
                });
            }

            const token = createToken(
                {
                    username:
                        ADMIN_USERNAME,
                    type: "admin"
                },
                "2h"
            );

            res.json({
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
                "Admin login error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to login as admin."
            });
        }
    }
);

// ======================================================
// ADMIN PROFILE
// ======================================================

app.get(
    "/api/admin/me",
    requireAdmin,
    (req, res) => {
        res.json({
            admin: {
                username:
                    req.admin.username
            }
        });
    }
);

// ======================================================
// GENERATE VIP SUBSCRIPTION
// ======================================================

app.post(
    "/api/admin/vip-subscriptions",
    requireAdmin,
    (req, res) => {
        try {
            const {
                plan
            } = req.body;

            const plans = {
                "1_week": 7,
                "2_weeks": 14,
                "1_month": 30
            };

            if (!plans[plan]) {
                return res.status(400).json({
                    message:
                        "Invalid VIP plan."
                });
            }

            let code;

            do {
                code =
                    "FLEX-" +
                    crypto
                        .randomBytes(5)
                        .toString("hex")
                        .toUpperCase();

            } while (
                db.prepare(`
                    SELECT id
                    FROM vip_subscriptions
                    WHERE code = ?
                `).get(code)
            );

            const durationDays =
                plans[plan];

            const result = db.prepare(`
                INSERT INTO vip_subscriptions
                (code, plan, duration_days, status)
                VALUES (?, ?, ?, 'unused')
            `).run(
                code,
                plan,
                durationDays
            );

            res.status(201).json({
                message:
                    "VIP code generated successfully.",
                subscription: {
                    id:
                        result.lastInsertRowid,
                    code,
                    plan,
                    durationDays,
                    status: "unused"
                }
            });

        } catch (error) {
            console.error(
                "VIP generation error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to generate VIP code."
            });
        }
    }
);

// ======================================================
// VIP SUBSCRIPTION HISTORY
// ======================================================

app.get(
    "/api/admin/vip-subscriptions",
    requireAdmin,
    (req, res) => {
        try {
            const subscriptions =
                db.prepare(`
                    SELECT
                        vs.id,
                        vs.code,
                        vs.plan,
                        vs.duration_days,
                        vs.status,
                        vs.activated_at,
                        vs.expires_at,
                        vs.created_at,
                        u.username
                    FROM vip_subscriptions vs
                    LEFT JOIN users u
                        ON vs.user_id = u.id
                    ORDER BY vs.id DESC
                `).all();

            res.json({
                subscriptions
            });

        } catch (error) {
            console.error(
                "VIP subscription history error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load VIP subscriptions."
            });
        }
    }
);

// ======================================================
// VIP ACCESS
// ======================================================

app.post(
    "/api/vip/access",
    requireUser,
    (req, res) => {
        try {
            const {
                accessCode
            } = req.body;

            if (!accessCode) {
                return res.status(400).json({
                    message:
                        "Enter your VIP access code."
                });
            }

            const subscription =
                db.prepare(`
                    SELECT *
                    FROM vip_subscriptions
                    WHERE code = ?
                `).get(
                    accessCode
                        .trim()
                        .toUpperCase()
                );

            if (!subscription) {
                return res.status(404).json({
                    message:
                        "Invalid VIP access code."
                });
            }

            if (
                subscription.status !==
                "unused"
            ) {
                return res.status(400).json({
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

            db.prepare(`
                UPDATE vip_subscriptions
                SET
                    status = 'active',
                    user_id = ?,
                    activated_at = ?,
                    expires_at = ?
                WHERE id = ?
            `).run(
                req.user.id,
                activatedAt.toISOString(),
                expiresAt.toISOString(),
                subscription.id
            );

            const vipToken =
                createToken(
                    {
                        id: req.user.id,
                        subscriptionId:
                            subscription.id,
                        type: "vip"
                    },
                    `${subscription.duration_days}d`
                );

            res.json({
                message:
                    "VIP access activated.",
                token: vipToken,
                subscription: {
                    id:
                        subscription.id,
                    plan:
                        subscription.plan,
                    durationDays:
                        subscription.duration_days,
                    activatedAt:
                        activatedAt.toISOString(),
                    expiresAt:
                        expiresAt.toISOString(),
                    status:
                        "active"
                }
            });

        } catch (error) {
            console.error(
                "VIP access error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to activate VIP access."
            });
        }
    }
);

// ======================================================
// VIP STATUS
// ======================================================

app.get(
    "/api/vip/status",
    requireUser,
    (req, res) => {
        try {
            const subscription =
                db.prepare(`
                    SELECT
                        id,
                        plan,
                        duration_days,
                        status,
                        activated_at,
                        expires_at
                    FROM vip_subscriptions
                    WHERE user_id = ?
                    ORDER BY id DESC
                    LIMIT 1
                `).get(req.user.id);

            if (!subscription) {
                return res.json({
                    active: false,
                    status: "locked",
                    plan: null,
                    expiresAt: null,
                    remainingDays: 0
                });
            }

            if (
                subscription.status ===
                    "active" &&
                subscription.expires_at &&
                new Date(
                    subscription.expires_at
                ) <= new Date()
            ) {
                db.prepare(`
                    UPDATE vip_subscriptions
                    SET status = 'expired'
                    WHERE id = ?
                `).run(subscription.id);

                subscription.status =
                    "expired";
            }

            let remainingDays = 0;

            if (
                subscription.status ===
                    "active" &&
                subscription.expires_at
            ) {
                const remainingMs =
                    new Date(
                        subscription.expires_at
                    ).getTime() -
                    Date.now();

                remainingDays =
                    Math.max(
                        0,
                        Math.ceil(
                            remainingMs /
                            (1000 * 60 * 60 * 24)
                        )
                    );
            }

            res.json({
                active:
                    subscription.status ===
                    "active",
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
                "VIP status error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load VIP status."
            });
        }
    }
);

// ======================================================
// PUBLIC REGULAR PREDICTIONS
// ======================================================

app.get(
    "/api/predictions",
    (req, res) => {
        try {
            let predictions;

            if (
                req.query.results === "true"
            ) {
                predictions =
                    db.prepare(`
                        SELECT *
                        FROM predictions
                        WHERE category =
                            'regular'
                        AND status !=
                            'pending'
                        ORDER BY
                            match_date DESC,
                            match_time DESC
                    `).all();

            } else {
                predictions =
                    db.prepare(`
                        SELECT *
                        FROM predictions
                        WHERE category =
                            'regular'
                        ORDER BY
                            match_date ASC,
                            match_time ASC
                    `).all();
            }

            res.json({
                predictions
            });

        } catch (error) {
            console.error(
                "Regular predictions error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load predictions."
            });
        }
    }
);

// ======================================================
// SINGLE PUBLIC PREDICTION
// ======================================================

app.get(
    "/api/predictions/:id",
    (req, res) => {
        try {
            const prediction =
                db.prepare(`
                    SELECT *
                    FROM predictions
                    WHERE id = ?
                    AND category =
                        'regular'
                `).get(req.params.id);

            if (!prediction) {
                return res.status(404).json({
                    message:
                        "Prediction not found."
                });
            }

            res.json({
                prediction
            });

        } catch (error) {
            console.error(
                "Single prediction error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load prediction."
            });
        }
    }
);

// ======================================================
// VIP PREDICTIONS
// ======================================================

app.get(
    "/api/vip/predictions",
    requireVip,
    (req, res) => {
        try {
            const predictions =
                db.prepare(`
                    SELECT *
                    FROM predictions
                    WHERE category =
                        'vip'
                    ORDER BY
                        match_date ASC,
                        match_time ASC
                `).all();

            res.json({
                predictions
            });

        } catch (error) {
            console.error(
                "VIP predictions error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load VIP predictions."
            });
        }
    }
);

// ======================================================
// ADMIN - ALL PREDICTIONS
// ======================================================

app.get(
    "/api/admin/predictions",
    requireAdmin,
    (req, res) => {
        try {
            const predictions =
                db.prepare(`
                    SELECT *
                    FROM predictions
                    ORDER BY
                        match_date DESC,
                        match_time DESC
                `).all();

            res.json({
                predictions
            });

        } catch (error) {
            console.error(
                "Admin predictions error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load predictions."
            });
        }
    }
);

// ======================================================
// ADMIN - VIP PREDICTIONS
// ======================================================

app.get(
    "/api/admin/vip-predictions",
    requireAdmin,
    (req, res) => {
        try {
            const predictions =
                db.prepare(`
                    SELECT *
                    FROM predictions
                    WHERE category =
                        'vip'
                    ORDER BY
                        match_date DESC,
                        match_time DESC
                `).all();

            res.json({
                predictions
            });

        } catch (error) {
            console.error(
                "Admin VIP predictions error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to load VIP predictions."
            });
        }
    }
);

// ======================================================
// ADMIN - CREATE PREDICTION
// ======================================================

app.post(
    "/api/predictions",
    requireAdmin,
    (req, res) => {
        try {
            const {
                league,
                home_team,
                away_team,
                match_date,
                match_time,
                prediction,
                analysis,
                category,
                status
            } = req.body;

            if (
                !league ||
                !home_team ||
                !away_team ||
                !match_date ||
                !match_time ||
                !prediction
            ) {
                return res.status(400).json({
                    message:
                        "Please complete all required prediction fields."
                });
            }

            const validCategories = [
                "regular",
                "vip"
            ];

            const validStatuses = [
                "pending",
                "won",
                "lost",
                "void"
            ];

            const finalCategory =
                validCategories.includes(
                    category
                )
                    ? category
                    : "regular";

            const finalStatus =
                validStatuses.includes(
                    status
                )
                    ? status
                    : "pending";

            const result =
                db.prepare(`
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
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    league.trim(),
                    home_team.trim(),
                    away_team.trim(),
                    match_date,
                    match_time,
                    prediction.trim(),
                    analysis
                        ? analysis.trim()
                        : "",
                    finalCategory,
                    finalStatus
                );

            const newPrediction =
                db.prepare(`
                    SELECT *
                    FROM predictions
                    WHERE id = ?
                `).get(
                    result.lastInsertRowid
                );

            res.status(201).json({
                message:
                    "Prediction added successfully.",
                prediction:
                    newPrediction
            });

        } catch (error) {
            console.error(
                "Create prediction error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to create prediction."
            });
        }
    }
);

// ======================================================
// ADMIN - UPDATE PREDICTION
// ======================================================

app.put(
    "/api/predictions/:id",
    requireAdmin,
    (req, res) => {
        try {
            const {
                league,
                home_team,
                away_team,
                match_date,
                match_time,
                prediction,
                analysis,
                category,
                status
            } = req.body;

            const validCategories = [
                "regular",
                "vip"
            ];

            const validStatuses = [
                "pending",
                "won",
                "lost",
                "void"
            ];

            if (
                !league ||
                !home_team ||
                !away_team ||
                !match_date ||
                !match_time ||
                !prediction
            ) {
                return res.status(400).json({
                    message:
                        "Please complete all required fields."
                });
            }

            const finalCategory =
                validCategories.includes(
                    category
                )
                    ? category
                    : "regular";

            const finalStatus =
                validStatuses.includes(
                    status
                )
                    ? status
                    : "pending";

            const result =
                db.prepare(`
                    UPDATE predictions
                    SET
                        league = ?,
                        home_team = ?,
                        away_team = ?,
                        match_date = ?,
                        match_time = ?,
                        prediction = ?,
                        analysis = ?,
                        category = ?,
                        status = ?
                    WHERE id = ?
                `).run(
                    league.trim(),
                    home_team.trim(),
                    away_team.trim(),
                    match_date,
                    match_time,
                    prediction.trim(),
                    analysis
                        ? analysis.trim()
                        : "",
                    finalCategory,
                    finalStatus,
                    req.params.id
                );

            if (result.changes === 0) {
                return res.status(404).json({
                    message:
                        "Prediction not found."
                });
            }

            const updated =
                db.prepare(`
                    SELECT *
                    FROM predictions
                    WHERE id = ?
                `).get(req.params.id);

            res.json({
                message:
                    "Prediction updated successfully.",
                prediction:
                    updated
            });

        } catch (error) {
            console.error(
                "Update prediction error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to update prediction."
            });
        }
    }
);

// ======================================================
// ADMIN - DELETE PREDICTION
// ======================================================

app.delete(
    "/api/predictions/:id",
    requireAdmin,
    (req, res) => {
        try {
            const result =
                db.prepare(`
                    DELETE FROM predictions
                    WHERE id = ?
                `).run(req.params.id);

            if (result.changes === 0) {
                return res.status(404).json({
                    message:
                        "Prediction not found."
                });
            }

            res.json({
                message:
                    "Prediction deleted successfully."
            });

        } catch (error) {
            console.error(
                "Delete prediction error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to delete prediction."
            });
        }
    }
);

// ======================================================
// ADMIN - UPDATE RESULT STATUS
// ======================================================

app.patch(
    "/api/predictions/:id/status",
    requireAdmin,
    (req, res) => {
        try {
            const {
                status
            } = req.body;

            const validStatuses = [
                "pending",
                "won",
                "lost",
                "void"
            ];

            if (
                !validStatuses.includes(status)
            ) {
                return res.status(400).json({
                    message:
                        "Invalid result status."
                });
            }

            const result =
                db.prepare(`
                    UPDATE predictions
                    SET status = ?
                    WHERE id = ?
                `).run(
                    status,
                    req.params.id
                );

            if (result.changes === 0) {
                return res.status(404).json({
                    message:
                        "Prediction not found."
                });
            }

            res.json({
                message:
                    "Prediction status updated."
            });

        } catch (error) {
            console.error(
                "Update status error:",
                error
            );

            res.status(500).json({
                message:
                    "Unable to update prediction status."
            });
        }
    }
);

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
    res.status(404).json({
        message:
            "API route not found."
    });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {
        console.error(
            "Server error:",
            error
        );

        res.status(500).json({
            message:
                "Internal server error."
        });
    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    HOST,
    () => {
        console.log("");
        console.log(
            "=========================================="
        );
        console.log(
            "     FLEX HUB PREDICTIONS BACKEND"
        );
        console.log(
            "=========================================="
        );
        console.log(
            `Server running on ${HOST}:${PORT}`
        );
        console.log(
            "=========================================="
        );
        console.log("");
    }
);