// ======================================================
// FLEX HUB PREDICTIONS - MAIN APP.JS
// COMPLETE FRONTEND VERSION
// ======================================================

const API_BASE_URL =
    "https://flex-hub-prediction.onrender.com/api";

// ======================================================
// STORAGE KEYS
// ======================================================

const STORAGE_KEYS = {
    user: "flexHubUser",
    userToken: "flexHubUserToken",
    vipToken: "flexHubVipToken"
};

// ======================================================
// GLOBAL STATE
// ======================================================

let currentUser = null;
let allPredictions = [];
let currentLeagueFilter = "all";
let currentResultFilter = "all";
let currentSearchQuery = "";

let deferredInstallPrompt = null;

// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    currentUser = getStoredUser();

    setupAccountForms();
    setupNavigation();
    setupSearch();
    setupLeagueFilters();
    setupResultFilters();
    setupMobileMenu();
    setupSignOut();
    setupFooterYear();
    setupWhatsAppLinks();
    setupRegularPaymentGate();
    setupPWAInstall();
    setupForgotPasswordButton();

    // VIP page
    if (
        document.body.classList.contains("vip-page") ||
        document.getElementById("vipAccessForm") ||
        document.getElementById("vipPredictionsGrid")
    ) {
        await setupVipPage();
        return;
    }

    // Normal site
    await checkUserSession();

    startNotificationCenter();
});

// ======================================================
// STORAGE
// ======================================================

function getStoredUser() {

    try {

        const value =
            localStorage.getItem(
                STORAGE_KEYS.user
            );

        return value
            ? JSON.parse(value)
            : null;

    } catch (error) {

        console.error(
            "Stored user error:",
            error
        );

        return null;
    }
}

function getUserToken() {

    return localStorage.getItem(
        STORAGE_KEYS.userToken
    );
}

function getVipToken() {

    return localStorage.getItem(
        STORAGE_KEYS.vipToken
    );
}

function saveUser(user, token = null) {

    currentUser = user || null;

    if (user) {

        localStorage.setItem(
            STORAGE_KEYS.user,
            JSON.stringify(user)
        );
    }

    if (token) {

        localStorage.setItem(
            STORAGE_KEYS.userToken,
            token
        );
    }
}

function clearUserSession() {

    currentUser = null;

    localStorage.removeItem(
        STORAGE_KEYS.user
    );

    localStorage.removeItem(
        STORAGE_KEYS.userToken
    );

    localStorage.removeItem(
        STORAGE_KEYS.vipToken
    );
}

// ======================================================
// API REQUEST
// ======================================================

async function apiRequest(endpoint, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getUserToken();

    if (
        token &&
        !headers.Authorization &&
        !headers.authorization
    ) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    let response;

    try {

        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );

    } catch (error) {

        throw new Error(
            "Unable to connect to FLEX HUB server."
        );
    }

    let data = {};

    try {

        data = await response.json();

    } catch (error) {

        data = {};
    }

    if (!response.ok) {

        const message =
            data.message ||
            data.error ||
            `Request failed with status ${response.status}.`;

        const requestError =
            new Error(message);

        requestError.status =
            response.status;

        requestError.data =
            data;

        throw requestError;
    }

    return data;
}

// ======================================================
// ACCOUNT FORMS
// ======================================================

function setupAccountForms() {

    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );
    }

    setupAccountPanelSwitching();
}

// ======================================================
// LOGIN / REGISTER SWITCH
// ======================================================

function setupAccountPanelSwitching() {

    const loginPanel =
        document.getElementById("loginPanel");

    const registerPanel =
        document.getElementById("registerPanel");

    document
        .querySelectorAll("#showRegisterButton")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    if (loginPanel) {
                        loginPanel.style.display = "none";
                        loginPanel.hidden = true;
                    }

                    if (registerPanel) {
                        registerPanel.hidden = false;
                        registerPanel.style.display = "";
                    }
                }
            );
        });

    document
        .querySelectorAll("#showLoginButton")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    if (registerPanel) {
                        registerPanel.style.display = "none";
                        registerPanel.hidden = true;
                    }

                    if (loginPanel) {
                        loginPanel.hidden = false;
                        loginPanel.style.display = "";
                    }
                }
            );
        });
}

// ======================================================
// LOGIN
// ======================================================

async function handleLogin(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const button =
        event.submitter ||
        form.querySelector(
            'button[type="submit"]'
        );

    const identifier =
        getFormValue(
            form,
            [
                "identifier",
                "username",
                "email"
            ]
        );

    const password =
        getFormValue(
            form,
            ["password"]
        );

    const message =
        findFormMessage(form);

    if (!identifier || !password) {

        showElementMessage(
            message,
            "Please enter your username/email and password.",
            "error"
        );

        return;
    }

    try {

        setButtonLoading(
            button,
            true,
            "Signing in..."
        );

        const data =
            await apiRequest(
                "/login",
                {
                    method: "POST",
                    body: JSON.stringify({
                        identifier,
                        password
                    })
                }
            );

        if (
            !data ||
            !data.token ||
            !data.user
        ) {
            throw new Error(
                "Login response from the server is incomplete."
            );
        }

        // Save token FIRST
        saveUser(
            data.user,
            data.token
        );

        showElementMessage(
            message,
            "Login successful.",
            "success"
        );

        /*
         * Verify the exact token returned by the server.
         * If this succeeds, open the website.
         */
        const valid =
            await verifyCurrentUserSession();

        if (!valid) {

            throw new Error(
                "Login succeeded, but the session could not be verified. Please try again."
            );
        }

        showFlexHubAnimation(
            openMainWebsite
        );

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        /*
         * Do NOT immediately destroy a valid-looking
         * session unless the server explicitly rejected it.
         */
        if (error.status === 401) {
            clearUserSession();
        }

        showElementMessage(
            message,
            error.message ||
            "Unable to login.",
            "error"
        );

    } finally {

        setButtonLoading(
            button,
            false
        );
    }
}

// ======================================================
// REGISTER
// ======================================================

async function handleRegister(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const button =
        event.submitter ||
        form.querySelector(
            'button[type="submit"]'
        );

    const name =
        getFormValue(
            form,
            ["name", "fullName"]
        );

    const username =
        getFormValue(
            form,
            ["username"]
        );

    const email =
        getFormValue(
            form,
            ["email"]
        );

    const password =
        getFormValue(
            form,
            ["password"]
        );

    const confirmPassword =
        getFormValue(
            form,
            [
                "confirmPassword",
                "passwordConfirm",
                "confirm_password"
            ]
        );

    const message =
        findFormMessage(form);

    if (
        !name ||
        !username ||
        !email ||
        !password
    ) {

        showElementMessage(
            message,
            "Please complete all registration fields.",
            "error"
        );

        return;
    }

    if (
        confirmPassword &&
        password !== confirmPassword
    ) {

        showElementMessage(
            message,
            "Passwords do not match.",
            "error"
        );

        return;
    }

    try {

        setButtonLoading(
            button,
            true,
            "Creating account..."
        );

        const data =
            await apiRequest(
                "/register",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        username,
                        email,
                        password
                    })
                }
            );

        if (!data.user) {

            throw new Error(
                "The server did not return the new account."
            );
        }

        saveUser(
            data.user,
            data.token || null
        );

        showElementMessage(
            message,
            "Account created successfully.",
            "success"
        );

        if (data.token) {

            const valid =
                await verifyCurrentUserSession();

            if (!valid) {

                throw new Error(
                    "Account created, but the new session could not be verified."
                );
            }

            showFlexHubAnimation(
                openMainWebsite
            );

        } else {

            switchToLoginPanel();
        }

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        showElementMessage(
            message,
            error.message ||
            "Unable to create account.",
            "error"
        );

    } finally {

        setButtonLoading(
            button,
            false
        );
    }
}

// ======================================================
// CHECK CURRENT SESSION
// ======================================================

async function checkUserSession() {

    const token =
        getUserToken();

    if (!token) {

        showAccountGate();

        return false;
    }

    const valid =
        await verifyCurrentUserSession();

    if (!valid) {

        showAccountGate();

        return false;
    }

    updateUserUI();

    openMainWebsite();

    return true;
}

// ======================================================
// VERIFY USER SESSION
// ======================================================

async function verifyCurrentUserSession() {

    const token =
        getUserToken();

    if (!token) {
        return false;
    }

    try {

        const data =
            await apiRequest(
                "/user/me"
            );

        if (!data || !data.user) {

            throw new Error(
                "Invalid user session."
            );
        }

        saveUser(
            data.user
        );

        updateUserUI();

        return true;

    } catch (error) {

        console.error(
            "Session verification failed:",
            error
        );

        /*
         * Only clear the token when the server
         * actually says the session is unauthorized.
         */
        if (
            error.status === 401 ||
            error.status === 403
        ) {

            clearUserSession();
        }

        return false;
    }
}

// ======================================================
// ACCOUNT GATE
// ======================================================

function showAccountGate() {

    const gate =
        document.getElementById(
            "accountGate"
        );

    const website =
        document.getElementById(
            "mainWebsite"
        );

    if (gate) {

        gate.style.display =
            "";
    }

    if (website) {

        website.style.display =
            "none";
    }
}

// ======================================================
// OPEN MAIN WEBSITE
// ======================================================

function openMainWebsite() {

    const gate =
        document.getElementById(
            "accountGate"
        );

    const website =
        document.getElementById(
            "mainWebsite"
        );

    if (gate) {

        gate.style.display =
            "none";
    }

    if (website) {

        website.style.display =
            "";
    }

    updateUserUI();

    closeMobileMenu();

    loadPredictions();
    loadRegularBettingCodes();
    loadResults();
    refreshRegularAccessStatus();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ======================================================
// SWITCH TO LOGIN
// ======================================================

function switchToLoginPanel() {

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );

    const registerPanel =
        document.getElementById(
            "registerPanel"
        );

    if (registerPanel) {

        registerPanel.style.display =
            "none";

        registerPanel.hidden =
            true;
    }

    if (loginPanel) {

        loginPanel.style.display =
            "";

        loginPanel.hidden =
            false;
    }
}

// ======================================================
// USER UI
// ======================================================

function updateUserUI() {

    if (!currentUser) {
        return;
    }

    const displayName =
        currentUser.name ||
        currentUser.username ||
        "User";

    document
        .querySelectorAll("#userName")
        .forEach(element => {

            element.textContent =
                displayName;
        });

    document
        .querySelectorAll("[data-user-name]")
        .forEach(element => {

            element.textContent =
                displayName;
        });

    document
        .querySelectorAll("[data-user-username]")
        .forEach(element => {

            element.textContent =
                currentUser.username ||
                "—";
        });

    document
        .querySelectorAll("[data-user-email]")
        .forEach(element => {

            element.textContent =
                currentUser.email ||
                "—";
        });
}

// ======================================================
// REGULAR ACCESS
// ======================================================

async function refreshRegularAccessStatus() {

    try {

        const data =
            await apiRequest(
                "/regular-access/status"
            );

        window.flexHubRegularAccess =
            data;

        return data;

    } catch (error) {

        console.error(
            "Regular access status error:",
            error
        );

        window.flexHubRegularAccess = {
            active: true,
            expiresAt: null,
            remainingDays: 0
        };

        return window.flexHubRegularAccess;
    }
}

// ======================================================
// REGULAR PAYMENT GATE
// ======================================================

function setupRegularPaymentGate() {

    const button =
        document.getElementById(
            "regularPaymentButton"
        );

    const logout =
        document.getElementById(
            "regularPaymentLogout"
        );

    if (button) {

        button.addEventListener(
            "click",
            initializeRegularPayment
        );
    }

    if (logout) {

        logout.addEventListener(
            "click",
            event => {

                event.preventDefault();

                clearUserSession();

                showAccountGate();
            }
        );
    }
}

async function initializeRegularPayment() {

    const button =
        document.getElementById(
            "regularPaymentButton"
        );

    const message =
        document.getElementById(
            "regularPaymentMessage"
        );

    if (!button) {
        return;
    }

    try {

        button.disabled = true;
        button.textContent =
            "Please wait...";

        if (message) {
            message.textContent =
                "Connecting to payment service...";
            message.style.display =
                "block";
        }

        const data =
            await apiRequest(
                "/payments/initialize",
                {
                    method: "POST",
                    body: JSON.stringify({
                        amount: 50,
                        plan: "regular"
                    })
                }
            );

        if (
            !data ||
            !data.authorization_url
        ) {

            throw new Error(
                "Unable to initialize payment."
            );
        }

        window.location.href =
            data.authorization_url;

    } catch (error) {

        console.error(
            "Payment initialization error:",
            error
        );

        if (message) {

            message.textContent =
                error.message ||
                "Unable to start payment.";

            message.style.display =
                "block";
        }

        button.disabled =
            false;

        button.textContent =
            "Pay GHS 50";
    }
}

// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

    document
        .querySelectorAll(
            "nav a[href^='#'], #mainNav a[href^='#']"
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                event => {

                    const href =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !href ||
                        href === "#"
                    ) {
                        return;
                    }

                    const target =
                        document.querySelector(
                            href
                        );

                    if (!target) {
                        return;
                    }

                    event.preventDefault();

                    closeMobileMenu();

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            );
        });

    document
        .querySelectorAll(".league-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                event => {

                    const league =
                        card.dataset.league;

                    if (league) {

                        currentLeagueFilter =
                            league;

                        updateLeagueFilterUI();

                        renderPredictions();
                    }

                    const section =
                        document.getElementById(
                            "predictions"
                        );

                    if (section) {

                        event.preventDefault();

                        section.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }
            );
        });
}

// ======================================================
// SEARCH
// ======================================================

function setupSearch() {

    const input =
        document.getElementById(
            "predictionSearch"
        );

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        event => {

            currentSearchQuery =
                event.target.value
                    .trim()
                    .toLowerCase();

            renderPredictions();
        }
    );
}

// ======================================================
// LEAGUE FILTERS
// ======================================================

function setupLeagueFilters() {

    document
        .querySelectorAll(
            "[data-league-filter]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    currentLeagueFilter =
                        button.dataset.leagueFilter ||
                        "all";

                    updateLeagueFilterUI();
                    renderPredictions();
                }
            );
        });
}

function updateLeagueFilterUI() {

    document
        .querySelectorAll(
            "[data-league-filter]"
        )
        .forEach(button => {

            const value =
                button.dataset.leagueFilter ||
                "all";

            button.classList.toggle(
                "active",
                value.toLowerCase() ===
                currentLeagueFilter.toLowerCase()
            );
        });
}

// ======================================================
// LOAD REGULAR PREDICTIONS
// ======================================================

async function loadPredictions() {

    const grid =
        document.getElementById(
            "predictionsGrid"
        );

    const statsElement =
        document.getElementById(
            "totalPredictions"
        );

    if (!grid && !statsElement) {
        return;
    }

    try {

        if (grid) {

            grid.innerHTML = `
                <div class="loading-state">
                    <p>Loading predictions...</p>
                </div>
            `;
        }

        const data =
            await apiRequest(
                "/predictions"
            );

        allPredictions =
            Array.isArray(data)
                ? data
                : Array.isArray(data.predictions)
                    ? data.predictions
                    : [];

        updatePredictionStats();

        if (grid) {
            renderPredictions();
        }

        setTimeout(
            loadTeamBadges,
            100
        );

    } catch (error) {

        console.error(
            "Prediction loading error:",
            error
        );

        if (grid) {

            grid.innerHTML = `
                <div class="empty-state">
                    <h3>Predictions unavailable</h3>
                    <p>
                        ${escapeHtml(
                            error.message ||
                            "Unable to load predictions."
                        )}
                    </p>
                </div>
            `;
        }
    }
}

// ======================================================
// RENDER PREDICTIONS
// ======================================================

function renderPredictions() {

    const grid =
        document.getElementById(
            "predictionsGrid"
        );

    if (!grid) {
        return;
    }

    let predictions =
        [...allPredictions];

    // Home page featured-only mode
    if (
        grid.dataset.homeFeaturedOnly ===
        "true"
    ) {

        predictions =
            predictions.filter(
                prediction =>
                    prediction.featured === true
            );
    }

    // Search
    if (currentSearchQuery) {

        predictions =
            predictions.filter(
                prediction => {

                    const searchable =
                        [
                            prediction.league,
                            prediction.home_team,
                            prediction.away_team,
                            prediction.prediction,
                            prediction.analysis
                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();

                    return searchable.includes(
                        currentSearchQuery
                    );
                }
            );
    }

    // League
    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {

        predictions =
            predictions.filter(
                prediction =>
                    String(
                        prediction.league || ""
                    ).toLowerCase() ===
                    String(
                        currentLeagueFilter
                    ).toLowerCase()
            );
    }

    // Featured first
    predictions.sort(
        (a, b) =>
            Number(b.featured === true) -
            Number(a.featured === true)
    );

    const alert =
        document.getElementById(
            "newPredictionsAlert"
        );

    const count =
        document.getElementById(
            "newPredictionsCount"
        );

    if (alert && count) {

        const featured =
            allPredictions.filter(
                prediction =>
                    prediction.featured === true &&
                    String(
                        prediction.status ||
                        "pending"
                    ).toLowerCase() ===
                    "pending"
            ).length;

        count.textContent =
            featured;

        alert.style.display =
            featured > 0
                ? "inline-flex"
                : "none";
    }

    if (!predictions.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <h3>No predictions found</h3>
                <p>
                    Try another search or league.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML =
        predictions
            .map(createPredictionCard)
            .join("");

    loadTeamBadges();
}

// ======================================================
// MATCH DATE / COUNTDOWN
// ======================================================

function getMatchKickoffDate(prediction) {

    if (
        !prediction ||
        !prediction.match_date ||
        !prediction.match_time
    ) {
        return null;
    }

    const date =
        new Date(
            `${prediction.match_date}T${prediction.match_time}`
        );

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function formatMatchCountdown(milliseconds) {

    const totalMinutes =
        Math.max(
            0,
            Math.floor(
                milliseconds / 60000
            )
        );

    const days =
        Math.floor(
            totalMinutes / 1440
        );

    const hours =
        Math.floor(
            (totalMinutes % 1440) / 60
        );

    const minutes =
        totalMinutes % 60;

    if (days > 0) {

        return `${days}D ${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
    }

    if (hours > 0) {

        return `${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
    }

    return `${minutes}M`;
}

function updateMatchCountdowns() {

    document
        .querySelectorAll(
            ".match-countdown"
        )
        .forEach(element => {

            const date =
                element.dataset.matchDate;

            const time =
                element.dataset.matchTime;

            const value =
                element.querySelector(
                    ".countdown-value"
                );

            if (
                !date ||
                !time ||
                !value
            ) {
                return;
            }

            const kickoff =
                new Date(
                    `${date}T${time}`
                );

            if (
                Number.isNaN(
                    kickoff.getTime()
                )
            ) {
                return;
            }

            const remaining =
                kickoff.getTime() -
                Date.now();

            const elapsed =
                Date.now() -
                kickoff.getTime();

            if (remaining > 0) {

                value.textContent =
                    formatMatchCountdown(
                        remaining
                    );

                return;
            }

            const twoHours =
                2 * 60 * 60 * 1000;

            const twoAndHalfHours =
                2.5 * 60 * 60 * 1000;

            if (
                elapsed >= 0 &&
                elapsed < twoHours
            ) {

                value.textContent =
                    "MATCH ONGOING";

            } else if (
                elapsed >= twoHours &&
                elapsed <= twoAndHalfHours
            ) {

                value.textContent =
                    "MATCH ENDED";

            } else {

                value.textContent =
                    "MATCH ENDED";
            }
        });
}

setInterval(
    updateMatchCountdowns,
    1000
);

// ======================================================
// CREATE PREDICTION CARD
// ======================================================

function createPredictionCard(prediction) {

    const status =
        String(
            prediction.status ||
            "pending"
        ).toLowerCase();

    const category =
        String(
            prediction.category ||
            "regular"
        ).toLowerCase();

    const kickoff =
        getMatchKickoffDate(
            prediction
        );

    const homeTeam =
        prediction.home_team ||
        "Home Team";

    const awayTeam =
        prediction.away_team ||
        "Away Team";

    const homeInitials =
        getTeamInitials(
            homeTeam
        );

    const awayInitials =
        getTeamInitials(
            awayTeam
        );

    return `
        <article
            class="prediction-card ${
                prediction.featured
                    ? "featured-prediction"
                    : ""
            }"
            data-category="${escapeHtml(category)}"
            data-status="${escapeHtml(status)}"
        >

            <div class="prediction-card-top">

                ${
                    prediction.featured
                        ? `
                            <span class="featured-badge">
                                ★ FEATURED
                            </span>
                        `
                        : ""
                }

                <span class="prediction-league">
                    ${escapeHtml(
                        prediction.league ||
                        "Football"
                    )}
                </span>

                <span
                    class="prediction-category ${escapeHtml(
                        category
                    )}"
                >
                    ${
                        category === "vip"
                            ? "VIP"
                            : "Regular"
                    }
                </span>

            </div>

            <div class="prediction-match">

                <div class="team home-team">

                    <span
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            homeTeam
                        )}"
                    >
                        ${escapeHtml(
                            homeInitials
                        )}
                    </span>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>

                <span class="vs">
                    VS
                </span>

                <div class="team away-team">

                    <span
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            awayTeam
                        )}"
                    >
                        ${escapeHtml(
                            awayInitials
                        )}
                    </span>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>

            <div class="prediction-info">

                <span>
                    ${escapeHtml(
                        formatMatchDate(
                            prediction.match_date
                        )
                    )}
                </span>

                <span>
                    ${escapeHtml(
                        prediction.match_time ||
                        ""
                    )}
                </span>

                ${
                    kickoff
                        ? `
                            <div
                                class="match-countdown"
                                data-match-date="${escapeHtml(
                                    prediction.match_date
                                )}"
                                data-match-time="${escapeHtml(
                                    prediction.match_time
                                )}"
                            >
                                <strong class="countdown-value">
                                    ${escapeHtml(
                                        formatMatchCountdown(
                                            Math.max(
                                                0,
                                                kickoff.getTime() -
                                                Date.now()
                                            )
                                        )
                                    )}
                                </strong>
                            </div>
                        `
                        : ""
                }

                <strong class="prediction-pick">
                    ${escapeHtml(
                        prediction.prediction ||
                        "Preview"
                    )}
                </strong>

            </div>

            ${
                prediction.analysis
                    ? `
                        <div class="prediction-analysis">

                            <span class="label">
                                Analysis
                            </span>

                            <p>
                                ${escapeHtml(
                                    prediction.analysis
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }

            <div
                class="prediction-status status-${escapeHtml(
                    status
                )}"
            >
                ${escapeHtml(
                    formatStatus(status)
                )}
            </div>

        </article>
    `;
}

// ======================================================
// TEAM INITIALS
// ======================================================

function getTeamInitials(name) {

    return String(name || "TEAM")
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word.charAt(0))
        .join("")
        .slice(0, 3)
        .toUpperCase();
}

// ======================================================
// RESULTS
// ======================================================

function setupResultFilters() {

    document
        .querySelectorAll(
            "[data-result-filter]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    currentResultFilter =
                        button.dataset.resultFilter ||
                        "all";

                    updateResultFilterUI();
                    renderResults();
                }
            );
        });
}

function updateResultFilterUI() {

    document
        .querySelectorAll(
            "[data-result-filter]"
        )
        .forEach(button => {

            const value =
                button.dataset.resultFilter ||
                "all";

            button.classList.toggle(
                "active",
                value.toLowerCase() ===
                currentResultFilter.toLowerCase()
            );
        });
}

// ======================================================
// LOAD RESULTS
// ======================================================

async function loadResults() {

    const grid =
        document.getElementById(
            "resultsGrid"
        );

    if (!grid) {
        return;
    }

    try {

        grid.innerHTML = `
            <div class="loading-state">
                <p>Loading results...</p>
            </div>
        `;

        /*
         * New backend has a dedicated /results endpoint.
         */
        const data =
            await apiRequest(
                "/results"
            );

        window.flexHubResults =
            Array.isArray(data)
                ? data
                : Array.isArray(data.results)
                    ? data.results
                    : Array.isArray(data.predictions)
                        ? data.predictions
                        : [];

        renderResults();

    } catch (error) {

        console.error(
            "Results loading error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <h3>Results unavailable</h3>
                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load results."
                    )}
                </p>
            </div>
        `;
    }
}

// ======================================================
// RENDER RESULTS
// ======================================================

function renderResults() {

    const grid =
        document.getElementById(
            "resultsGrid"
        );

    if (!grid) {
        return;
    }

    const results =
        Array.isArray(
            window.flexHubResults
        )
            ? window.flexHubResults
            : [];

    let filtered =
        results.filter(
            result => {

                const status =
                    String(
                        result.status ||
                        ""
                    ).toLowerCase();

                return (
                    status === "won" ||
                    status === "lost" ||
                    status === "void" ||
                    status === "completed"
                );
            }
        );

    if (
        currentResultFilter &&
        currentResultFilter !== "all"
    ) {

        filtered =
            filtered.filter(
                result =>
                    String(
                        result.status ||
                        ""
                    ).toLowerCase() ===
                    String(
                        currentResultFilter
                    ).toLowerCase()
            );
    }

    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <h3>No results available</h3>
                <p>
                    Completed prediction results
                    will appear here.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML =
        filtered
            .map(createPredictionCard)
            .join("");

    loadTeamBadges();
}

// ======================================================
// STATISTICS
// ======================================================

function updatePredictionStats() {

    const total =
        allPredictions.length;

    const regular =
        allPredictions.filter(
            prediction =>
                String(
                    prediction.category ||
                    "regular"
                ).toLowerCase() !==
                "vip"
        ).length;

    const pending =
        allPredictions.filter(
            prediction =>
                String(
                    prediction.status ||
                    "pending"
                ).toLowerCase() ===
                "pending"
        ).length;

    const won =
        allPredictions.filter(
            prediction =>
                String(
                    prediction.status ||
                    ""
                ).toLowerCase() ===
                "won"
        ).length;

    const lost =
        allPredictions.filter(
            prediction =>
                String(
                    prediction.status ||
                    ""
                ).toLowerCase() ===
                "lost"
        ).length;

    const voidPredictions =
        allPredictions.filter(
            prediction =>
                String(
                    prediction.status ||
                    ""
                ).toLowerCase() ===
                "void"
        ).length;

    const completed =
        won +
        lost +
        voidPredictions;

    const decided =
        won +
        lost;

    const winRate =
        decided > 0
            ? Math.round(
                (won / decided) * 100
            )
            : 0;

    setText(
        "#totalPredictions",
        total
    );

    setText(
        "#regularPredictions",
        regular
    );

    setText(
        "#pendingPredictions",
        pending
    );

    setText(
        "#completedPredictions",
        completed
    );

    setText(
        "#wonPredictions",
        won
    );

    setText(
        "#lostPredictions",
        lost
    );

    setText(
        "#voidPredictions",
        voidPredictions
    );

    setText(
        "#winRate",
        `${winRate}%`
    );

    updateVipPredictionCount();
}
// ======================================================
// VIP PREDICTION COUNT
// ======================================================

async function updateVipPredictionCount() {

    const element =
        document.getElementById(
            "vipPredictions"
        );

    if (!element) {
        return;
    }

    const vipToken =
        getVipToken();

    if (!vipToken) {

        element.textContent = "0";

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/vip/predictions`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            `Bearer ${vipToken}`
                    }
                }
            );

        let data = {};

        try {
            data = await response.json();
        } catch (error) {
            data = {};
        }

        if (!response.ok) {

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    STORAGE_KEYS.vipToken
                );
            }

            element.textContent = "0";

            return;
        }

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(data.predictions)
                    ? data.predictions
                    : [];

        element.textContent =
            predictions.length;

    } catch (error) {

        console.error(
            "VIP prediction count error:",
            error
        );

        element.textContent = "0";
    }
}

// ======================================================
// VIP PAGE
// ======================================================

async function setupVipPage() {

    const userToken =
        getUserToken();

    if (!userToken) {

        window.location.href =
            "index.html";

        return;
    }

    const valid =
        await verifyUserForVipPage();

    if (!valid) {
        return;
    }

    setupVipAccessForm();
    setupVipLogout();

    await checkVipStatus();
}

// ======================================================
// VERIFY USER FOR VIP PAGE
// ======================================================

async function verifyUserForVipPage() {

    try {

        const data =
            await apiRequest(
                "/user/me"
            );

        if (!data || !data.user) {

            throw new Error(
                "Invalid user session."
            );
        }

        saveUser(
            data.user
        );

        updateUserUI();

        return true;

    } catch (error) {

        console.error(
            "VIP user verification failed:",
            error
        );

        if (
            error.status === 401 ||
            error.status === 403
        ) {

            clearUserSession();
        }

        window.location.href =
            "index.html";

        return false;
    }
}

// ======================================================
// VIP ACCESS FORM
// ======================================================

function setupVipAccessForm() {

    const form =
        document.getElementById(
            "vipAccessForm"
        );

    if (!form) {
        return;
    }

    if (
        form.dataset.listenerAttached ===
        "true"
    ) {
        return;
    }

    form.dataset.listenerAttached =
        "true";

    form.addEventListener(
        "submit",
        handleVipAccess
    );
}

// ======================================================
// ACTIVATE VIP
// ======================================================

async function handleVipAccess(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const button =
        event.submitter ||
        form.querySelector(
            'button[type="submit"]'
        );

    const input =
        document.getElementById(
            "vipAccessCode"
        );

    const message =
        document.getElementById(
            "vipMessage"
        );

    const code =
        input?.value
            ?.trim()
            .toUpperCase();

    if (!code) {

        showElementMessage(
            message,
            "Please enter your VIP subscription code.",
            "error"
        );

        return;
    }

    const userToken =
        getUserToken();

    if (!userToken) {

        showElementMessage(
            message,
            "Please login to your account first.",
            "error"
        );

        return;
    }

    try {

        setButtonLoading(
            button,
            true,
            "Activating..."
        );

        const response =
            await fetch(
                `${API_BASE_URL}/vip/access`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            `Bearer ${userToken}`
                    },

                    body: JSON.stringify({
                        accessCode: code
                    })
                }
            );

        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            data = {};
        }

        if (!response.ok) {

            const activationError =
                new Error(
                    data.message ||
                    "Unable to activate VIP access."
                );

            activationError.status =
                response.status;

            throw activationError;
        }

        if (!data.token) {

            throw new Error(
                "The server did not return a VIP session."
            );
        }

        localStorage.setItem(
            STORAGE_KEYS.vipToken,
            data.token
        );

        if (input) {
            input.value = "";
        }

        showElementMessage(
            message,
            "VIP access activated successfully!",
            "success"
        );

        await checkVipStatus();

        updateVipPredictionCount();

    } catch (error) {

        console.error(
            "VIP activation error:",
            error
        );

        showElementMessage(
            message,
            error.message ||
            "Unable to activate VIP access.",
            "error"
        );

    } finally {

        setButtonLoading(
            button,
            false
        );
    }
}

// ======================================================
// CHECK VIP STATUS
// ======================================================

async function checkVipStatus() {

    const userToken =
        getUserToken();

    if (!userToken) {

        updateVipStatusUI(null);

        return;
    }

    try {

        /*
         * VIP status is checked using the
         * normal logged-in user token.
         */
        const data =
            await apiRequest(
                "/vip/status"
            );

        updateVipStatusUI(
            data
        );

        if (
            data &&
            data.active === true
        ) {

            await loadVipPredictions();
            await loadVipBettingCodes();

        } else {

            const grid =
                document.getElementById(
                    "vipPredictionsGrid"
                );

            if (grid) {

                grid.innerHTML = `
                    <div class="empty-state">
                        <h3>VIP access required</h3>
                        <p>
                            Activate your VIP subscription
                            to view VIP predictions.
                        </p>
                    </div>
                `;
            }

            const codesGrid =
                document.getElementById(
                    "vipBettingCodesGrid"
                );

            if (codesGrid) {

                codesGrid.innerHTML = `
                    <div class="empty-state">
                        <h3>VIP access required</h3>
                        <p>
                            Activate VIP access to view
                            VIP betting codes.
                        </p>
                    </div>
                `;
            }
        }

    } catch (error) {

        console.error(
            "VIP status error:",
            error
        );

        updateVipStatusUI(null);
    }
}

// ======================================================
// VIP STATUS UI
// ======================================================

function updateVipStatusUI(data) {

    const statusElement =
        document.getElementById(
            "vipStatus"
        );

    const planElement =
        document.getElementById(
            "vipPlan"
        );

    const expiryElement =
        document.getElementById(
            "vipExpiry"
        );

    if (!data || !data.active) {

        if (statusElement) {

            statusElement.textContent =
                "Locked";

            statusElement.classList.remove(
                "active"
            );

            statusElement.classList.add(
                "locked"
            );
        }

        if (planElement) {

            planElement.textContent =
                "No active VIP plan";
        }

        if (expiryElement) {

            expiryElement.textContent =
                "—";
        }

        return;
    }

    if (statusElement) {

        statusElement.textContent =
            "VIP Active";

        statusElement.classList.remove(
            "locked"
        );

        statusElement.classList.add(
            "active"
        );
    }

    if (planElement) {

        planElement.textContent =
            formatPlan(
                data.plan
            );
    }

    if (expiryElement) {

        expiryElement.textContent =
            formatExpiry(
                data.expiresAt ||
                data.expires_at
            );
    }
}

// ======================================================
// LOAD VIP PREDICTIONS
// ======================================================

async function loadVipPredictions() {

    const grid =
        document.getElementById(
            "vipPredictionsGrid"
        );

    if (!grid) {
        return;
    }

    const vipToken =
        getVipToken();

    if (!vipToken) {

        grid.innerHTML = `
            <div class="empty-state">
                <h3>VIP access required</h3>
                <p>
                    Activate your VIP subscription
                    to view this section.
                </p>
            </div>
        `;

        return;
    }

    try {

        grid.innerHTML = `
            <div class="loading-state">
                <p>Loading VIP content...</p>
            </div>
        `;

        const response =
            await fetch(
                `${API_BASE_URL}/vip/predictions`,
                {
                    method: "GET",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${vipToken}`
                    }
                }
            );

        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            data = {};
        }

        if (!response.ok) {

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    STORAGE_KEYS.vipToken
                );
            }

            throw new Error(
                data.message ||
                "Unable to load VIP content."
            );
        }

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(data.predictions)
                    ? data.predictions
                    : [];

        if (!predictions.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No VIP predictions yet</h3>
                    <p>
                        New VIP match previews
                        will appear here.
                    </p>
                </div>
            `;

            return;
        }

        grid.innerHTML =
            predictions
                .map(createPredictionCard)
                .join("");

        loadTeamBadges();

    } catch (error) {

        console.error(
            "VIP prediction error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <h3>VIP content unavailable</h3>
                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load VIP predictions."
                    )}
                </p>
            </div>
        `;
    }
}

// ======================================================
// VIP LOGOUT
// ======================================================

function setupVipLogout() {

    document
        .querySelectorAll(
            "[data-vip-logout], #vipLogoutButton"
        )
        .forEach(button => {

            if (
                button.dataset.vipLogoutAttached ===
                "true"
            ) {
                return;
            }

            button.dataset.vipLogoutAttached =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    localStorage.removeItem(
                        STORAGE_KEYS.vipToken
                    );

                    window.location.href =
                        "index.html";
                }
            );
        });
}

// ======================================================
// MAIN SIGN OUT
// ======================================================

function setupSignOut() {

    document
        .querySelectorAll(
            "#signOutButton, [data-sign-out]"
        )
        .forEach(button => {

            if (
                button.dataset.signOutAttached ===
                "true"
            ) {
                return;
            }

            button.dataset.signOutAttached =
                "true";

            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    try {

                        /*
                         * Inform backend that the user
                         * is signing out.
                         */
                        await apiRequest(
                            "/logout",
                            {
                                method: "POST"
                            }
                        );

                    } catch (error) {

                        console.warn(
                            "Server logout request failed:",
                            error
                        );
                    }

                    clearUserSession();

                    window.location.href =
                        "index.html";
                }
            );
        });
}

// ======================================================
// MOBILE MENU
// ======================================================

function setupMobileMenu() {

    const button =
        document.getElementById(
            "menuButton"
        );

    const nav =
        document.getElementById(
            "mainNav"
        );

    if (!button || !nav) {
        return;
    }

    button.addEventListener(
        "click",
        () => {

            const open =
                nav.classList.toggle(
                    "open"
                );

            /*
             * Support both common class names
             * in case the existing CSS uses active.
             */
            nav.classList.toggle(
                "active",
                open
            );

            button.classList.toggle(
                "active",
                open
            );

            button.setAttribute(
                "aria-expanded",
                open
                    ? "true"
                    : "false"
            );
        }
    );

    nav
        .querySelectorAll("a")
        .forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    closeMobileMenu();
                }
            );
        });
}

function closeMobileMenu() {

    const button =
        document.getElementById(
            "menuButton"
        );

    const nav =
        document.getElementById(
            "mainNav"
        );

    if (nav) {

        nav.classList.remove(
            "open"
        );

        nav.classList.remove(
            "active"
        );
    }

    if (button) {

        button.classList.remove(
            "active"
        );

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}

// ======================================================
// WHATSAPP LINKS
// ======================================================

function setupWhatsAppLinks() {

    document
        .querySelectorAll(
            'a[href*="wa.me"], a[href*="whatsapp.com"]'
        )
        .forEach(link => {

            link.setAttribute(
                "target",
                "_blank"
            );

            link.setAttribute(
                "rel",
                "noopener noreferrer"
            );
        });
}

// ======================================================
// FOOTER YEAR
// ======================================================

function setupFooterYear() {

    const year =
        new Date().getFullYear();

    document
        .querySelectorAll(
            "[data-current-year], #currentYear"
        )
        .forEach(element => {

            element.textContent =
                year;
        });
}

// ======================================================
// FORM VALUE
// ======================================================

function getFormValue(form, names) {

    if (!form) {
        return "";
    }

    for (const name of names) {

        const byName =
            form.querySelector(
                `[name="${name}"]`
            );

        const byId =
            form.querySelector(
                `#${name}`
            );

        const element =
            byName ||
            byId;

        if (element) {

            const value =
                String(
                    element.value ||
                    ""
                ).trim();

            if (value) {
                return value;
            }
        }
    }

    return "";
}

// ======================================================
// FORM MESSAGE
// ======================================================

function findFormMessage(form) {

    if (!form) {
        return null;
    }

    return (
        form.querySelector(
            "[data-form-message]"
        ) ||
        form.querySelector(
            ".form-message"
        ) ||
        form.querySelector(
            ".message"
        ) ||
        form.querySelector(
            ".login-message"
        ) ||
        form.querySelector(
            ".register-message"
        )
    );
}

// ======================================================
// MESSAGE DISPLAY
// ======================================================

function showElementMessage(
    element,
    message,
    type = "info"
) {

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.classList.remove(
        "success",
        "error",
        "info"
    );

    element.classList.add(
        type
    );

    element.style.display =
        message
            ? ""
            : "none";
}

// ======================================================
// BUTTON LOADING
// ======================================================

function setButtonLoading(
    button,
    loading,
    loadingText = "Loading..."
) {

    if (!button) {
        return;
    }

    if (loading) {

        if (
            !button.dataset.originalText
        ) {

            button.dataset.originalText =
                button.textContent;
        }

        button.disabled =
            true;

        button.textContent =
            loadingText;

    } else {

        button.disabled =
            false;

        if (
            button.dataset.originalText
        ) {

            button.textContent =
                button.dataset.originalText;

            delete button.dataset.originalText;
        }
    }
}

// ======================================================
// SET TEXT
// ======================================================

function setText(selector, value) {

    const element =
        document.querySelector(
            selector
        );

    if (element) {

        element.textContent =
            value;
    }
}

// ======================================================
// STATUS FORMAT
// ======================================================

function formatStatus(status) {

    const normalized =
        String(
            status ||
            "pending"
        ).toLowerCase();

    const statuses = {
        pending: "Pending",
        won: "Match Won",
        lost: "Match Lost",
        void: "Void",
        completed: "Completed"
    };

    return (
        statuses[normalized] ||
        capitalize(normalized)
    );
}

// ======================================================
// PLAN FORMAT
// ======================================================

function formatPlan(plan) {

    const plans = {
        "1_week": "1 Week VIP",
        "2_weeks": "2 Weeks VIP",
        "1_month": "1 Month VIP"
    };

    const key =
        String(
            plan || ""
        ).toLowerCase();

    return (
        plans[key] ||
        capitalize(
            key
                .replaceAll(
                    "_",
                    " "
                )
        ) ||
        "VIP"
    );
}

// ======================================================
// DATE FORMAT
// ======================================================

function formatMatchDate(date) {

    if (!date) {
        return "";
    }

    const parsed =
        new Date(
            `${date}T00:00:00`
        );

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return String(date);
    }

    return parsed.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}

// ======================================================
// VIP EXPIRY
// ======================================================

function formatExpiry(date) {

    if (!date) {
        return "—";
    }

    const parsed =
        new Date(date);

    if (
        Number.isNaN(
            parsed.getTime()
        )
    ) {
        return "—";
    }

    return parsed.toLocaleString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}

// ======================================================
// CAPITALIZE
// ======================================================

function capitalize(value) {

    if (!value) {
        return "";
    }

    const text =
        String(value);

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}

// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
// ======================================================
// FLEX HUB PREDICTIONS
// APP.JS — PART 3
// Betting Codes • Team Badges • Password Reset
// PWA • Notifications • Final Initialization
// ======================================================


// ======================================================
// REGULAR BETTING CODES
// ======================================================

async function loadRegularBettingCodes() {
    const container =
        document.getElementById("bettingCodesContainer") ||
        document.getElementById("regularBettingCodes");

    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">
            Loading betting codes...
        </div>
    `;

    try {
        const data = await apiRequest("/betting-codes");

        const codes = Array.isArray(data)
            ? data
            : Array.isArray(data.codes)
                ? data.codes
                : [];

        if (!codes.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No betting codes available</h3>
                    <p>Check back later for new betting codes.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = codes.map((item, index) => {
            const code =
                item.code ||
                item.bettingCode ||
                item.bookingCode ||
                "";

            const bookmaker =
                item.bookmaker ||
                item.platform ||
                item.name ||
                "Betting Code";

            const description =
                item.description ||
                "Use this code on the supported betting platform.";

            return `
                <article class="betting-code-card">
                    <div class="betting-code-header">
                        <div>
                            <span class="code-label">
                                BETTING CODE
                            </span>

                            <h3>
                                ${escapeHtml(bookmaker)}
                            </h3>
                        </div>

                        <span class="code-number">
                            #${index + 1}
                        </span>
                    </div>

                    <p class="betting-code-description">
                        ${escapeHtml(description)}
                    </p>

                    <div class="betting-code-value">
                        <span>${escapeHtml(code || "Unavailable")}</span>

                        ${
                            code
                                ? `
                                <button
                                    type="button"
                                    class="copy-code-button"
                                    onclick="copyBettingCode('${escapeHtml(code)}', this)"
                                >
                                    Copy
                                </button>
                                `
                                : ""
                        }
                    </div>
                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Failed to load betting codes:", error);

        container.innerHTML = `
            <div class="error-state">
                <h3>Unable to load betting codes</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}


// ======================================================
// COPY REGULAR BETTING CODE
// ======================================================

async function copyBettingCode(code, button = null) {
    if (!code) return;

    try {
        await navigator.clipboard.writeText(code);

        if (button) {
            const originalText = button.textContent;

            button.textContent = "Copied!";

            setTimeout(() => {
                button.textContent = originalText;
            }, 1800);
        }

    } catch (error) {
        console.error("Copy failed:", error);

        try {
            const textarea = document.createElement("textarea");

            textarea.value = code;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.focus();
            textarea.select();

            document.execCommand("copy");

            textarea.remove();

            if (button) {
                const originalText = button.textContent;

                button.textContent = "Copied!";

                setTimeout(() => {
                    button.textContent = originalText;
                }, 1800);
            }

        } catch (fallbackError) {
            console.error("Fallback copy failed:", fallbackError);
        }
    }
}


// ======================================================
// VIP BETTING CODES
// ======================================================

async function loadVipBettingCodes() {
    const container =
        document.getElementById("vipBettingCodesContainer") ||
        document.getElementById("vipBettingCodes");

    if (!container) return;

    const token = localStorage.getItem(VIP_TOKEN_KEY);

    if (!token) {
        container.innerHTML = `
            <div class="locked-state">
                <h3>VIP Betting Codes Locked</h3>
                <p>Activate your VIP access to view VIP betting codes.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            Loading VIP betting codes...
        </div>
    `;

    try {
        const data = await apiRequest(
            "/vip/betting-codes",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const codes = Array.isArray(data)
            ? data
            : Array.isArray(data.codes)
                ? data.codes
                : [];

        if (!codes.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No VIP betting codes available</h3>
                    <p>New VIP codes will appear here when available.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = codes.map((item, index) => {
            const code =
                item.code ||
                item.bettingCode ||
                item.bookingCode ||
                "";

            const bookmaker =
                item.bookmaker ||
                item.platform ||
                item.name ||
                "VIP Betting Code";

            const description =
                item.description ||
                "Exclusive VIP betting code.";

            return `
                <article class="betting-code-card vip-code-card">

                    <div class="betting-code-header">
                        <div>
                            <span class="code-label vip-label">
                                VIP CODE
                            </span>

                            <h3>
                                ${escapeHtml(bookmaker)}
                            </h3>
                        </div>

                        <span class="code-number">
                            #${index + 1}
                        </span>
                    </div>

                    <p class="betting-code-description">
                        ${escapeHtml(description)}
                    </p>

                    <div class="betting-code-value">
                        <span>
                            ${escapeHtml(code || "Unavailable")}
                        </span>

                        ${
                            code
                                ? `
                                <button
                                    type="button"
                                    class="copy-code-button"
                                    onclick="copyBettingCode('${escapeHtml(code)}', this)"
                                >
                                    Copy
                                </button>
                                `
                                : ""
                        }
                    </div>

                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Failed to load VIP betting codes:", error);

        container.innerHTML = `
            <div class="error-state">
                <h3>Unable to load VIP betting codes</h3>
                <p>Your VIP session may have expired.</p>
            </div>
        `;
    }
}


// ======================================================
// TEAM BADGES
// ======================================================

async function loadTeamBadges() {
    const images = document.querySelectorAll(
        "img[data-team], img[data-team-badge], .team-badge[data-team]"
    );

    if (!images.length) return;

    for (const image of images) {
        const teamName =
            image.dataset.team ||
            image.dataset.teamBadge ||
            image.getAttribute("alt");

        if (!teamName) continue;

        try {
            const encodedName = encodeURIComponent(teamName.trim());

            const response = await fetch(
                `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodedName}`
            );

            if (!response.ok) continue;

            const data = await response.json();

            if (
                data &&
                Array.isArray(data.teams) &&
                data.teams.length
            ) {
                const team = data.teams[0];

                if (team.strBadge) {
                    image.src = team.strBadge;
                    image.alt = team.strTeam || teamName;
                    image.loading = "lazy";
                }
            }

        } catch (error) {
            console.warn(
                `Could not load badge for ${teamName}`,
                error
            );
        }
    }
}


// ======================================================
// WATCH FOR NEW TEAM BADGES
// ======================================================

function setupTeamBadgeObserver() {
    if (!document.body) return;

    let badgeTimer = null;

    const observer = new MutationObserver(() => {
        clearTimeout(badgeTimer);

        badgeTimer = setTimeout(() => {
            loadTeamBadges();
        }, 300);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


// ======================================================
// FLEX HUB SUCCESS ANIMATION
// ======================================================

function showFlexHubAnimation(message = "Login successful") {
    const existing = document.getElementById(
        "flexHubSuccessAnimation"
    );

    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement("div");

    overlay.id = "flexHubSuccessAnimation";

    overlay.innerHTML = `
        <div class="flex-success-box">
            <div class="success-icon">
                ✓
            </div>

            <h2>
                ${escapeHtml(message)}
            </h2>

            <p>
                Welcome to FLEX HUB PREDICTIONS
            </p>
        </div>
    `;

    const style = document.createElement("style");

    style.textContent = `
        #flexHubSuccessAnimation {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(3, 5, 8, 0.88);
            backdrop-filter: blur(10px);
            animation: flexOverlayIn .25s ease;
        }

        .flex-success-box {
            width: min(420px, calc(100% - 40px));
            padding: 38px 25px;
            text-align: center;
            border-radius: 22px;
            background:
                linear-gradient(
                    145deg,
                    #111722,
                    #070a0f
                );
            border: 1px solid rgba(245,185,66,.45);
            box-shadow:
                0 25px 70px rgba(0,0,0,.55),
                0 0 35px rgba(20,121,255,.12);
            animation: flexBoxIn .35s ease;
        }

        .success-icon {
            width: 72px;
            height: 72px;
            margin: 0 auto 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #25d366;
            color: #fff;
            font-size: 38px;
            font-weight: 900;
            box-shadow: 0 0 30px rgba(37,211,102,.3);
        }

        .flex-success-box h2 {
            margin: 0 0 10px;
            color: #f5b942;
            font-size: 25px;
        }

        .flex-success-box p {
            margin: 0;
            color: #d8dee8;
        }

        @keyframes flexOverlayIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        @keyframes flexBoxIn {
            from {
                opacity: 0;
                transform: translateY(15px) scale(.96);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity .3s ease";

        setTimeout(() => {
            overlay.remove();
        }, 300);

    }, 1100);
}


// ======================================================
// FORGOT PASSWORD
// ======================================================

function setupForgotPassword() {
    const button = document.getElementById(
        "forgotPasswordButton"
    );

    if (!button) return;

    button.addEventListener("click", () => {
        showForgotPasswordModal();
    });
}


function showForgotPasswordModal() {
    const existing = document.getElementById(
        "forgotPasswordModal"
    );

    if (existing) {
        existing.remove();
    }

    const modal = document.createElement("div");

    modal.id = "forgotPasswordModal";

    modal.innerHTML = `
        <div class="password-modal-overlay">
            <div class="password-modal">

                <button
                    type="button"
                    class="password-modal-close"
                    id="closeForgotPassword"
                    aria-label="Close"
                >
                    ×
                </button>

                <div class="password-modal-icon">
                    🔐
                </div>

                <h2>
                    Reset Password
                </h2>

                <p>
                    Enter your email address and we will send
                    instructions if the account exists.
                </p>

                <form id="forgotPasswordForm">

                    <label for="forgotPasswordEmail">
                        Email Address
                    </label>

                    <input
                        type="email"
                        id="forgotPasswordEmail"
                        placeholder="Enter your email"
                        required
                    >

                    <div
                        id="forgotPasswordMessage"
                        class="form-message"
                    ></div>

                    <button
                        type="submit"
                        id="forgotPasswordSubmit"
                        class="primary-button"
                    >
                        Send Reset Request
                    </button>

                </form>

            </div>
        </div>
    `;

    const style = document.createElement("style");

    style.textContent = `
        .password-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(0,0,0,.78);
            backdrop-filter: blur(8px);
        }

        .password-modal {
            position: relative;
            width: min(440px, 100%);
            padding: 30px;
            border-radius: 22px;
            background: #080c12;
            border: 1px solid rgba(245,185,66,.35);
            box-shadow: 0 25px 80px rgba(0,0,0,.55);
        }

        .password-modal-close {
            position: absolute;
            top: 12px;
            right: 15px;
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 50%;
            background: rgba(255,255,255,.08);
            color: #fff;
            font-size: 25px;
            cursor: pointer;
        }

        .password-modal-icon {
            font-size: 38px;
            margin-bottom: 10px;
        }

        .password-modal h2 {
            margin: 0 0 8px;
            color: #f5b942;
        }

        .password-modal p {
            color: #aeb8c8;
            line-height: 1.6;
            margin-bottom: 22px;
        }

        .password-modal label {
            display: block;
            margin-bottom: 7px;
            color: #fff;
            font-weight: 700;
        }

        .password-modal input {
            width: 100%;
            box-sizing: border-box;
            padding: 14px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,.12);
            background: #111722;
            color: #fff;
            outline: none;
            margin-bottom: 14px;
        }

        .password-modal input:focus {
            border-color: #1479ff;
        }

        .password-modal .primary-button {
            width: 100%;
            border: 0;
            border-radius: 12px;
            padding: 14px;
            cursor: pointer;
            background: linear-gradient(
                135deg,
                #f5b942,
                #d99518
            );
            color: #05070b;
            font-weight: 900;
        }

        .password-modal .form-message {
            margin-bottom: 12px;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    const closeButton = document.getElementById(
        "closeForgotPassword"
    );

    const form = document.getElementById(
        "forgotPasswordForm"
    );

    const message = document.getElementById(
        "forgotPasswordMessage"
    );

    const submitButton = document.getElementById(
        "forgotPasswordSubmit"
    );

    closeButton?.addEventListener("click", () => {
        modal.remove();
    });

    modal
        .querySelector(".password-modal-overlay")
        ?.addEventListener("click", (event) => {
            if (
                event.target.classList.contains(
                    "password-modal-overlay"
                )
            ) {
                modal.remove();
            }
        });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email =
            document.getElementById(
                "forgotPasswordEmail"
            )?.value.trim();

        if (!email) return;

        submitButton.disabled = true;
        submitButton.textContent = "Sending...";

        message.textContent = "";
        message.className = "form-message";

        try {
            const response = await apiRequest(
                "/forgot-password",
                {
                    method: "POST",
                    body: {
                        email
                    }
                }
            );

            message.textContent =
                response.message ||
                "If the account exists, reset instructions have been sent.";

            message.classList.add("success-message");

            form.reset();

        } catch (error) {
            console.error(
                "Forgot password request failed:",
                error
            );

            message.textContent =
                error.message ||
                "Unable to process the request.";

            message.classList.add("error-message");

        } finally {
            submitButton.disabled = false;
            submitButton.textContent =
                "Send Reset Request";
        }
    });
}


// ======================================================
// NOTIFICATION CENTER
// ======================================================

function setupNotificationCenter() {
    const notificationButton =
        document.getElementById("notificationButton") ||
        document.getElementById("notificationsButton");

    if (!notificationButton) return;

    notificationButton.addEventListener(
        "click",
        async (event) => {
            event.preventDefault();

            await toggleNotificationPanel(
                notificationButton
            );
        }
    );
}


async function toggleNotificationPanel(button) {
    let panel = document.getElementById(
        "notificationPanel"
    );

    if (panel) {
        panel.remove();
        return;
    }

    panel = document.createElement("div");

    panel.id = "notificationPanel";

    panel.innerHTML = `
        <div class="notification-panel-inner">

            <div class="notification-panel-header">
                <div>
                    <span class="notification-small-label">
                        FLEX HUB
                    </span>

                    <h3>
                        Notifications
                    </h3>
                </div>

                <button
                    type="button"
                    id="markNotificationsRead"
                >
                    Mark all read
                </button>
            </div>

            <div
                id="notificationList"
                class="notification-list"
            >
                <div class="notification-loading">
                    Loading notifications...
                </div>
            </div>

        </div>
    `;

    document.body.appendChild(panel);

    positionNotificationPanel(
        panel,
        button
    );

    await loadNotifications();

    const markButton = document.getElementById(
        "markNotificationsRead"
    );

    markButton?.addEventListener(
        "click",
        async () => {
            await markAllNotificationsRead();
            await loadNotifications();
        }
    );

    setTimeout(() => {
        const closeHandler = (event) => {
            if (
                !panel.contains(event.target) &&
                event.target !== button
            ) {
                panel.remove();
                document.removeEventListener(
                    "click",
                    closeHandler
                );
            }
        };

        document.addEventListener(
            "click",
            closeHandler
        );
    }, 0);
}


function positionNotificationPanel(panel, button) {
    const rect = button.getBoundingClientRect();

    panel.style.position = "fixed";
    panel.style.top = `${rect.bottom + 10}px`;
    panel.style.right = "20px";
    panel.style.zIndex = "99998";
}


async function loadNotifications() {
    const container = document.getElementById(
        "notificationList"
    );

    if (!container) return;

    const token =
        localStorage.getItem(USER_TOKEN_KEY);

    if (!token) {
        container.innerHTML = `
            <div class="notification-empty">
                Please log in to view notifications.
            </div>
        `;
        return;
    }

    try {
        const data = await apiRequest(
            "/notifications",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const notifications =
            Array.isArray(data)
                ? data
                : Array.isArray(data.notifications)
                    ? data.notifications
                    : [];

        if (!notifications.length) {
            container.innerHTML = `
                <div class="notification-empty">
                    <div class="notification-empty-icon">
                        🔔
                    </div>

                    <p>
                        No notifications yet.
                    </p>
                </div>
            `;

            updateNotificationBadge(0);
            return;
        }

        let unreadCount = 0;

        container.innerHTML =
            notifications.map((notification) => {

                const id =
                    notification.id ||
                    notification._id;

                const title =
                    notification.title ||
                    "FLEX HUB Notification";

                const message =
                    notification.message ||
                    notification.text ||
                    "";

                const isRead =
                    notification.isRead === true ||
                    notification.read === true;

                if (!isRead) {
                    unreadCount++;
                }

                return `
                    <article
                        class="
                            notification-item
                            ${isRead ? "read" : "unread"}
                        "
                        data-notification-id="${escapeHtml(
                            String(id || "")
                        )}"
                    >

                        <div class="notification-dot"></div>

                        <div class="notification-content">

                            <h4>
                                ${escapeHtml(title)}
                            </h4>

                            <p>
                                ${escapeHtml(message)}
                            </p>

                            <small>
                                ${
                                    formatMatchDate(
                                        notification.createdAt ||
                                        notification.created_at
                                    )
                                }
                            </small>

                        </div>

                    </article>
                `;
            }).join("");

        updateNotificationBadge(unreadCount);

        container
            .querySelectorAll(".notification-item.unread")
            .forEach((item) => {

                item.addEventListener(
                    "click",
                    async () => {

                        const id =
                            item.dataset.notificationId;

                        if (!id) return;

                        await markNotificationRead(id);

                        item.classList.remove(
                            "unread"
                        );

                        item.classList.add(
                            "read"
                        );
                    }
                );
            });

    } catch (error) {
        console.error(
            "Failed to load notifications:",
            error
        );

        container.innerHTML = `
            <div class="notification-empty">
                Unable to load notifications.
            </div>
        `;
    }
}


async function markNotificationRead(id) {
    const token =
        localStorage.getItem(USER_TOKEN_KEY);

    if (!token || !id) return;

    try {
        await apiRequest(
            `/notifications/${encodeURIComponent(id)}/read`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

    } catch (error) {
        console.warn(
            "Could not mark notification as read:",
            error
        );
    }
}


async function markAllNotificationsRead() {
    const token =
        localStorage.getItem(USER_TOKEN_KEY);

    if (!token) return;

    try {
        await apiRequest(
            "/notifications/read-all",
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        updateNotificationBadge(0);

    } catch (error) {
        console.warn(
            "Could not mark notifications as read:",
            error
        );
    }
}


function updateNotificationBadge(count) {
    const buttons = [
        document.getElementById("notificationButton"),
        document.getElementById("notificationsButton")
    ].filter(Boolean);

    buttons.forEach((button) => {

        let badge = button.querySelector(
            ".notification-badge"
        );

        if (!count) {
            badge?.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement("span");
            badge.className =
                "notification-badge";

            button.style.position = "relative";
            button.appendChild(badge);
        }

        badge.textContent =
            count > 99
                ? "99+"
                : String(count);
    });
}


function injectNotificationStyles() {
    if (
        document.getElementById(
            "flexHubNotificationStyles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "flexHubNotificationStyles";

    style.textContent = `
        #notificationPanel {
            width: min(390px, calc(100vw - 30px));
            max-height: 70vh;
            overflow: hidden;
            border-radius: 18px;
            background: #080c12;
            border: 1px solid rgba(245,185,66,.3);
            box-shadow:
                0 25px 70px rgba(0,0,0,.55);
        }

        .notification-panel-inner {
            max-height: 70vh;
            display: flex;
            flex-direction: column;
        }

        .notification-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 18px;
            border-bottom:
                1px solid rgba(255,255,255,.08);
        }

        .notification-small-label {
            color: #1479ff;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1.5px;
        }

        .notification-panel-header h3 {
            margin: 3px 0 0;
            color: #f5b942;
        }

        .notification-panel-header button {
            border: 0;
            background: transparent;
            color: #1479ff;
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
        }

        .notification-list {
            overflow-y: auto;
        }

        .notification-item {
            display: flex;
            gap: 10px;
            padding: 15px 18px;
            cursor: pointer;
            border-bottom:
                1px solid rgba(255,255,255,.05);
            transition:
                background .2s ease;
        }

        .notification-item:hover {
            background:
                rgba(20,121,255,.08);
        }

        .notification-item.read {
            opacity: .7;
        }

        .notification-dot {
            flex: 0 0 8px;
            width: 8px;
            height: 8px;
            margin-top: 7px;
            border-radius: 50%;
            background: #1479ff;
        }

        .notification-item.read
        .notification-dot {
            background: #394454;
        }

        .notification-content {
            min-width: 0;
        }

        .notification-content h4 {
            margin: 0 0 5px;
            color: #fff;
            font-size: 14px;
        }

        .notification-content p {
            margin: 0 0 7px;
            color: #aeb8c8;
            font-size: 13px;
            line-height: 1.5;
        }

        .notification-content small {
            color: #697586;
            font-size: 10px;
        }

        .notification-empty,
        .notification-loading {
            padding: 35px 20px;
            text-align: center;
            color: #8995a7;
        }

        .notification-empty-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }

        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            background: #ff4d5a;
            color: #fff;
            font-size: 9px;
            font-weight: 900;
            border: 2px solid #05070b;
        }

        @media (max-width: 600px) {
            #notificationPanel {
                right: 10px !important;
                left: 10px;
                width: auto;
            }
        }
    `;

    document.head.appendChild(style);
}


// ======================================================
// PWA INSTALLATION
// ======================================================

let flexHubInstallPrompt = null;


function setupPWAInstall() {
    window.addEventListener(
        "beforeinstallprompt",
        (event) => {
            event.preventDefault();

            flexHubInstallPrompt = event;

            showInstallButton();
        }
    );

    window.addEventListener(
        "appinstalled",
        () => {
            flexHubInstallPrompt = null;

            hideInstallButton();
        }
    );

    const installButton =
        document.getElementById("installAppBtn");

    installButton?.addEventListener(
        "click",
        async () => {

            if (!flexHubInstallPrompt) {
                return;
            }

            flexHubInstallPrompt.prompt();

            try {
                await flexHubInstallPrompt.userChoice;
            } catch (error) {
                console.warn(
                    "PWA install choice failed:",
                    error
                );
            }

            flexHubInstallPrompt = null;

            hideInstallButton();
        }
    );
}


function showInstallButton() {
    const button =
        document.getElementById("installAppBtn");

    if (!button) return;

    button.hidden = false;
    button.style.display = "";
}


function hideInstallButton() {
    const button =
        document.getElementById("installAppBtn");

    if (!button) return;

    button.hidden = true;
    button.style.display = "none";
}


// ======================================================
// PERIODIC NOTIFICATION CHECK
// ======================================================

function startNotificationPolling() {
    if (
        window.flexHubNotificationPollingStarted
    ) {
        return;
    }

    window.flexHubNotificationPollingStarted =
        true;

    setInterval(async () => {

        const token =
            localStorage.getItem(
                USER_TOKEN_KEY
            );

        if (!token) return;

        try {
            const data = await apiRequest(
                "/notifications",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

            const notifications =
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.notifications)
                        ? data.notifications
                        : [];

            const unreadCount =
                notifications.filter(
                    (notification) =>
                        !(
                            notification.isRead === true ||
                            notification.read === true
                        )
                ).length;

            updateNotificationBadge(
                unreadCount
            );

        } catch (error) {
            // Silent polling failure.
        }

    }, 60000);
}


// ======================================================
// LOAD INITIAL PAGE FEATURES
// ======================================================

async function initializeFlexHubFeatures() {

    injectNotificationStyles();

    setupForgotPassword();

    setupNotificationCenter();

    setupPWAInstall();

    setupTeamBadgeObserver();

    setupWhatsAppLinks();

    setupFooterYear();

    startNotificationPolling();

    await loadTeamBadges();

    const bettingCodesContainer =
        document.getElementById(
            "bettingCodesContainer"
        ) ||
        document.getElementById(
            "regularBettingCodes"
        );

    if (bettingCodesContainer) {
        await loadRegularBettingCodes();
    }

    const vipCodesContainer =
        document.getElementById(
            "vipBettingCodesContainer"
        ) ||
        document.getElementById(
            "vipBettingCodes"
        );

    if (vipCodesContainer) {
        await loadVipBettingCodes();
    }
}


// ======================================================
// FINAL DOM INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {
            await initializeFlexHubFeatures();

        } catch (error) {
            console.error(
                "FLEX HUB initialization error:",
                error
            );
        }
    }
);


// ======================================================
// GLOBAL FUNCTIONS
// ======================================================

window.copyBettingCode =
    copyBettingCode;

window.loadRegularBettingCodes =
    loadRegularBettingCodes;

window.loadVipBettingCodes =
    loadVipBettingCodes;

window.loadTeamBadges =
    loadTeamBadges;

window.showFlexHubAnimation =
    showFlexHubAnimation;

window.showForgotPasswordModal =
    showForgotPasswordModal;

window.loadNotifications =
    loadNotifications;

window.markNotificationRead =
    markNotificationRead;

window.markAllNotificationsRead =
    markAllNotificationsRead;


// ======================================================
// END OF FLEX HUB PREDICTIONS APP.JS
// ======================================================
