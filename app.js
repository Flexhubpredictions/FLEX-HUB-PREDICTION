// ======================================================
// FLEX HUB PREDICTIONS - MAIN APP.JS
// ======================================================

const API_BASE_URL = "https://flex-hub-prediction.onrender.com/api";

// ======================================================
// STORAGE KEYS
// ======================================================

const STORAGE_KEYS = {
    user: "flexHubUser",
    userToken: "flexHubUserToken",
    vipToken: "flexHubVipToken"
};

// ======================================================
// GLOBAL VARIABLES
// ======================================================

let currentUser = null;
let allPredictions = [];

let currentLeagueFilter = "all";
let currentResultFilter = "all";
let currentSearchQuery = "";

// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    currentUser = getStoredUser();

    /*
     * Prevent the account gate from flashing
     * when a logged-in user refreshes the page.
     */
    const savedToken = getUserToken();

    const accountGate =
        document.getElementById(
            "accountGate"
        );

    const mainWebsite =
        document.getElementById(
            "mainWebsite"
        );

    if (
        savedToken &&
        accountGate &&
        mainWebsite
    ) {

        accountGate.style.display = "none";

        mainWebsite.style.display = "";
    }

    setupAccountForms();
    setupNavigation();
    setupSearch();
    setupLeagueFilters();
    setupResultFilters();
    setupMobileMenu();
    setupSignOut();
    setupFooterYear();
    setupWhatsAppLinks();

    // VIP page
    if (
        document.body.classList.contains(
            "vip-page"
        )
    ) {

        await setupVipPage();

        return;
    }

    // Main website
    await checkUserSession();
});
// ======================================================
// STORAGE
// ======================================================

function getStoredUser() {

    try {

        const storedUser =
            localStorage.getItem(
                STORAGE_KEYS.user
            );

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);

    } catch (error) {

        console.error(
            "Unable to read stored user:",
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

    currentUser = user;

    localStorage.setItem(
        STORAGE_KEYS.user,
        JSON.stringify(user)
    );

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
// API REQUEST HELPER
// ======================================================

async function apiRequest(endpoint, options = {}) {

    const token = getUserToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers
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

        const message =
            data.message ||
            data.error ||
            "Something went wrong.";

        throw new Error(message);
    }

    return data;
}

// ======================================================
// ACCOUNT FORMS
// ======================================================

function setupAccountForms() {

    const loginForm =
        document.querySelector(
            "#loginForm"
        );

    const registerForm =
        document.querySelector(
            "#registerForm"
        );

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
// LOGIN / REGISTER PANEL SWITCHING
// ======================================================

function setupAccountPanelSwitching() {

    const loginPanel =
        document.querySelector(
            "#loginPanel"
        );

    const registerPanel =
        document.querySelector(
            "#registerPanel"
        );

    // IMPORTANT:
    // These IDs match the buttons in index.html.
    const showRegisterButtons =
        document.querySelectorAll(
            "#showRegisterButton"
        );

    const showLoginButtons =
        document.querySelectorAll(
            "#showLoginButton"
        );

    // ----------------------------------------------
    // SHOW REGISTER PANEL
    // ----------------------------------------------

    showRegisterButtons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                // Hide login
                if (loginPanel) {

                    loginPanel.style.display =
                        "none";

                    loginPanel.hidden =
                        true;
                }

                // Show register
                if (registerPanel) {

                    registerPanel.hidden =
                        false;

                    registerPanel.style.display =
                        "";
                }
            }
        );
    });

    // ----------------------------------------------
    // SHOW LOGIN PANEL
    // ----------------------------------------------

    showLoginButtons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                // Hide register
                if (registerPanel) {

                    registerPanel.style.display =
                        "none";

                    registerPanel.hidden =
                        true;
                }

                // Show login
                if (loginPanel) {

                    loginPanel.hidden =
                        false;

                    loginPanel.style.display =
                        "";
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
            event.submitter,
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

        if (!data.user || !data.token) {

            throw new Error(
                "The server returned an invalid login response."
            );
        }

        saveUser(
            data.user,
            data.token
        );

        showElementMessage(
            message,
            "Login successful.",
            "success"
        );

       showFlexHubAnimation(checkUserSession);

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showElementMessage(
            message,
            error.message ||
            "Unable to login.",
            "error"
        );

    } finally {

        setButtonLoading(
            event.submitter,
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

    const name =
        getFormValue(
            form,
            [
                "name",
                "fullName"
            ]
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
            event.submitter,
            true,
            "Creating account..."
        );

        const data = await apiRequest(
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

    saveUser(
        data.user,
        data.token
    );

    await checkUserSession();

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
            event.submitter,
            false
        );
    }
}
// ======================================================
 // CHECK USER SESSION
 // ======================================================

async function checkUserSession() {

    const token = getUserToken();

    // No saved login
    if (!token) {

        showAccountGate();

        return false;
    }

    try {

        // Validate the saved login
        const userData =
            await apiRequest(
                "/user/me"
            );

        if (!userData.user) {

            throw new Error(
                "Invalid user session."
            );
        }

        // Keep the latest user information
        saveUser(
            userData.user
        );

        updateUserUI();

        /*
         * TEMPORARY:
         * Regular GH₵50 payment access is bypassed
         * while Paystack account activation is pending.
         *
         * Logged-in users can enter the website
         * immediately.
         */
        openMainWebsite();

        return true;

    } catch (error) {

        console.error(
            "Session check failed:",
            error
        );

        clearUserSession();

        showAccountGate();

        return false;
    }
}
// ======================================================
// ACCOUNT GATE
// ======================================================

function showAccountGate() {

    const gate =
        document.querySelector(
            "#accountGate"
        );

    const website =
        document.querySelector(
            "#mainWebsite"
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

/* =========================================================
   REGULAR ACCESS PAYMENT GATE — TEMPORARILY DISABLED
   ========================================================= */

function showRegularPaymentGate(access = null) {

    /*
     * Regular GHS 50 payment gate is temporarily disabled
     * while Paystack account activation is being reviewed.
     *
     * Logged-in users can access the website directly.
     */

    const paymentGate =
        document.getElementById(
            "regularPaymentGate"
        );

    if (paymentGate) {

        paymentGate.style.display =
            "none";
    }

    openMainWebsite();
}

/* =========================================================
   REGULAR PAYMENT GATE SETUP — PAYSTACK
   ========================================================= */

function setupRegularPaymentGate() {

    const paymentButton =
        document.getElementById(
            "regularPaymentButton"
        );

    const logoutButton =
        document.getElementById(
            "regularPaymentLogout"
        );

    const message =
        document.getElementById(
            "regularPaymentMessage"
        );

    if (paymentButton) {

        paymentButton.addEventListener(
            "click",
            async function () {

                if (message) {
                    message.textContent =
                        "Connecting to Paystack...";
                    message.style.display =
                        "block";
                }

                paymentButton.disabled = true;
                paymentButton.textContent =
                    "Please wait...";

                try {

                    const data =
                        await apiRequest(
                            "/payments/initialize",
                            {
                                method: "POST"
                            }
                        );

                    if (
                        !data ||
                        !data.authorization_url
                    ) {
                        throw new Error(
                            "Unable to start payment."
                        );
                    }

                    if (message) {
                        message.textContent =
                            "Redirecting to Paystack...";
                    }

                    window.location.href =
                        data.authorization_url;

                } catch (error) {

                    console.error(
                        "Paystack payment error:",
                        error
                    );

                    if (message) {
                        message.textContent =
                            error.message ||
                            "Unable to start payment. Please try again.";
                        message.style.display =
                            "block";
                    }

                    paymentButton.disabled =
                        false;

                    paymentButton.textContent =
                        "Pay GHS 50";
                }

            }
        );
    }

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                clearUserSession();

                const gate =
                    document.getElementById(
                        "regularPaymentGate"
                    );

                if (gate) {
                    gate.style.display =
                        "none";
                }

                showAccountGate();

            }
        );
    }
}

function openMainWebsite() {

    const gate =
        document.querySelector(
            "#accountGate"
        );

    const website =
        document.querySelector(
            "#mainWebsite"
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
        document.querySelector(
            "#loginPanel"
        );

    const registerPanel =
        document.querySelector(
            "#registerPanel"
        );

    if (registerPanel) {

        registerPanel.style.display =
            "none";

        registerPanel.hidden =
            true;
    }

    if (loginPanel) {

        loginPanel.hidden =
            false;

        loginPanel.style.display =
            "";
    }
}

// ======================================================
// USER INTERFACE
// ======================================================

function updateUserUI() {

    if (!currentUser) {
        return;
    }

    document
        .querySelectorAll(
            "#userName"
        )
        .forEach(element => {

            element.textContent =
                currentUser.name ||
                currentUser.username ||
                "User";
        });

    document
        .querySelectorAll(
            "[data-user-name]"
        )
        .forEach(element => {

            element.textContent =
                currentUser.name ||
                currentUser.username ||
                "User";
        });

    document
        .querySelectorAll(
            "[data-user-username]"
        )
        .forEach(element => {

            element.textContent =
                currentUser.username ||
                "—";
        });

    document
        .querySelectorAll(
            "[data-user-email]"
        )
        .forEach(element => {

            element.textContent =
                currentUser.email ||
                "—";
        });
}
/* =========================================================
   REGULAR ACCESS STATUS
   ========================================================= */

async function refreshRegularAccessStatus() {

    try {

        const access =
            await apiRequest(
                "/regular-access/status"
            );

        window.flexHubRegularAccess =
            access;

        return access;

    } catch (error) {

        console.error(
            "Regular access status failed:",
            error
        );

        window.flexHubRegularAccess = {
            active: false,
            expiresAt: null,
            remainingDays: 0
        };

        return window.flexHubRegularAccess;
    }
}

// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

    const links =
        document.querySelectorAll(
            "nav a[href^='#'], #mainNav a[href^='#']"
        );

    links.forEach(link => {

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

    // League cards
    document
        .querySelectorAll(
            ".league-card"
        )
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

                    const predictions =
                        document.querySelector(
                            "#predictions"
                        );

                    if (predictions) {

                        event.preventDefault();

                        predictions.scrollIntoView({
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

    const search =
        document.querySelector(
            "#predictionSearch"
        );

    if (!search) {
        return;
    }

    search.addEventListener(
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
    document.querySelector("#predictionsGrid");

const hasDashboardStats =
    document.querySelector("#totalPredictions");

if (!grid && !hasDashboardStats) {
    return;
}

   try {

    if (grid) {
        grid.innerHTML =
            `<div class="loading-state">
                <p>Loading predictions...</p>
            </div>`;
    }

    const data =
        await apiRequest(
            "/predictions"
        );

        allPredictions =
            Array.isArray(data)
                ? data
                : data.predictions || [];

       
       const newPredictionsAlert =
document.querySelector(”#newPredictionsAlert”);

const newPredictionsCount =
document.querySelector(”#newPredictionsCount”);

if (newPredictionsAlert && newPredictionsCount) {

const activePredictions =
    allPredictions.filter(
        prediction =>
            prediction.status !== "completed"
    );
newPredictionsCount.textContent =
    activePredictions.length;
newPredictionsAlert.style.display =
    activePredictions.length > 0
        ? "inline-flex"
        : "none";

}

     if (grid) {
    renderPredictions();
}

updatePredictionStats();
    } catch (error) {

        console.error(
            "Prediction loading error:",
            error
        );

       if (grid) {
    grid.innerHTML =
        `<div class="empty-state">
            <h3>Predictions unavailable</h3>
            <p>${escapeHtml(
                error.message ||
                "Unable to load predictions."
            )}</p>
        </div>`;
}
    }
}

// ======================================================
// RENDER REGULAR PREDICTIONS
// ======================================================

function renderPredictions() {

    const grid =
        document.querySelector(
            "#predictionsGrid"
        );

    if (!grid) {
        return;
    }

    let predictions =
        [...allPredictions];
    // Home page: show featured predictions only
    if (
        grid.dataset.homeFeaturedOnly === "true"
    ) {
        predictions =
            predictions.filter(
                prediction =>
                    prediction.featured === true
            );
    }
    predictions.sort(
    (a, b) =>
        Number(b.featured === true) -
        Number(a.featured === true)
);

    // Search
    if (currentSearchQuery) {

        predictions =
            predictions.filter(
                prediction => {

                    const searchableText = [
                        prediction.league,
                        prediction.home_team,
                        prediction.away_team,
                        prediction.prediction,
                        prediction.analysis
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    return searchableText.includes(
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

    if (!predictions.length) {

        grid.innerHTML =
            `<div class="empty-state">
                <h3>No predictions found</h3>
                <p>Try another search or league.</p>
            </div>`;

        return;
    }

    grid.innerHTML =
        predictions
            .map(createPredictionCard)
            .join("");
}

// ======================================================
// CREATE PREDICTION CARD
// ======================================================

function getMatchKickoffDate(prediction) {
    if (!prediction?.match_date || !prediction?.match_time) {
        return null;
    }

    const kickoff = new Date(
        `${prediction.match_date}T${prediction.match_time}`
    );

    if (Number.isNaN(kickoff.getTime())) {
        return null;
    }

    return kickoff;
}

function formatMatchCountdown(milliseconds) {
    const totalMinutes = Math.max(
        0,
        Math.floor(milliseconds / 60000)
    );

    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor(
        (totalMinutes % 1440) / 60
    );
    const minutes = totalMinutes % 60;

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
        .querySelectorAll(".match-countdown")
        .forEach((element) => {
            const date = element.dataset.matchDate;
            const time = element.dataset.matchTime;

            if (!date || !time) {
                return;
            }

            const kickoff = new Date(`${date}T${time}`);

            if (Number.isNaN(kickoff.getTime())) {
                return;
            }

            const elapsed = Date.now() - kickoff.getTime();
            const remaining = kickoff.getTime() - Date.now();

            const value =
                element.querySelector(".countdown-value");

            if (!value) {
                return;
            }

            if (remaining > 0) {
                value.textContent =
                    formatMatchCountdown(remaining);
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
                return;
            }

            if (
                elapsed >= twoHours &&
                elapsed <= twoAndHalfHours
            ) {
                value.textContent =
                    "MATCH ENDED";
                return;
            }

            value.textContent =
                "MATCH ENDED";
        });
}

setInterval(updateMatchCountdowns, 1000);

function createPredictionCard(prediction) {
const kickoffTime = getMatchKickoffDate(prediction);
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

    const statusText =
        formatStatus(status);

    const categoryText =
        category === "vip"
            ? "VIP"
            : "Regular";

    return `
        <article
        class="prediction-card ${prediction.featured ? "featured-prediction" : ""}"
            data-category="${escapeHtml(category)}"
            data-status="${escapeHtml(status)}">

            <div class="prediction-card-top">
            ${prediction.featured ? '<span class="featured-badge">★ FEATURED</span>' : ''}

                <span class="prediction-league">
                    ${escapeHtml(
                        prediction.league ||
                        "Football"
                    )}
                </span>

                <span
                    class="prediction-category ${category}">
                    ${categoryText}
                </span>

            </div>

            <div class="prediction-match">

                <div class="team home-team" style="display:flex;align-items:center;gap:10px;">

   <span
    class="team-badge"
    data-team-name="${escapeHtml(
        prediction.home_team || "Home Team"
    )}"
    style="
        width:36px;
        height:36px;
        min-width:36px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#111722;
        border:2px solid #f5b942;
        overflow:hidden;
    "
>
    ${escapeHtml(
        (prediction.home_team || "Home Team")
            .split(/\s+/)
            .map(word => word[0])
            .join("")
            .slice(0,3)
            .toUpperCase()
    )}
</span>

    <strong>
        ${escapeHtml(
            prediction.home_team ||
            "Home Team"
        )}
    </strong>

</div>

                <span class="vs">
                    VS
                </span>

              <div class="team away-team" style="display:flex;align-items:center;gap:10px;">

   <span
    class="team-badge"
    data-team-name="${escapeHtml(
        prediction.away_team || "Away Team"
    )}"
    style="
        width:36px;
        height:36px;
        min-width:36px;
        min-height:36px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#111722;
        border:2px solid #f5b942;
        overflow:hidden;
    "
>
    ${escapeHtml(
        (prediction.away_team || "Away Team")
            .split(/\s+/)
            .map(word => word[0])
            .join("")
            .slice(0,3)
            .toUpperCase()
    )}
</span>
    <strong>
        ${escapeHtml(
            prediction.away_team ||
            "Away Team"
        )}
    </strong>

</div>
            </div>

            <div class="prediction-info">

                <span>
                    ${formatMatchDate(
                        prediction.match_date
                    )}
                </span>

                <span>
                    ${escapeHtml(
                        prediction.match_time ||
                        ""
                    )}
                </span>
${
    kickoffTime
        ? `
            <div
                class="match-countdown"
                data-match-date="${escapeHtml(prediction.match_date || "")}"
                data-match-time="${escapeHtml(prediction.match_time || "")}"
            >
                <strong class="countdown-value">
                    ${formatMatchCountdown(
                        Math.max(
                            0,
                            kickoffTime.getTime() - Date.now()
                        )
                    )}
                </strong>
            </div>
          `
        : ""
}
}

<strong>
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
                class="prediction-status status-${escapeHtml(status)}">

                ${escapeHtml(statusText)}

            </div>
          

        </article>
    `;
}

async function deleteResult(id, source) {

    if (!confirm("Are you sure you want to delete this result?")) {
        return;
    }

    try {

        const response = await apiRequest(
            `/results/${id}?source=${encodeURIComponent(source)}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            const data = await response.json();
            throw new Error(
                data.message || "Unable to delete result."
            );
        }

        await loadResults();

    } catch (error) {

        alert(error.message);

    }
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

async function loadResults() {

    const grid =
        document.querySelector(
            "#resultsGrid"
        );

    if (!grid) {
        return;
    }

    try {

        grid.innerHTML =
            `<div class="loading-state">
                <p>Loading results...</p>
            </div>`;

        const data =
            await apiRequest(
                "/predictions?results=true"
            );

        const results =
            Array.isArray(data)
                ? data
                : data.predictions || [];

        window.flexHubResults =
            results;

        renderResults();

        updatePredictionStats();

    } catch (error) {

        console.error(
            "Results loading error:",
            error
        );

        grid.innerHTML =
            `<div class="empty-state">
                <h3>Results unavailable</h3>
                <p>${escapeHtml(
                    error.message ||
                    "Unable to load results."
                )}</p>
            </div>`;
    }
}

function renderResults() {

    const grid =
        document.querySelector(
            "#resultsGrid"
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
            prediction =>
                prediction.status &&
                prediction.status !== "pending"
        );

    if (
        currentResultFilter &&
        currentResultFilter !== "all"
    ) {

        filtered =
            filtered.filter(
                prediction =>
                    String(
                        prediction.status
                    ).toLowerCase() ===
                    String(
                        currentResultFilter
                    ).toLowerCase()
            );
    }

    if (!filtered.length) {

        grid.innerHTML =
            `<div class="empty-state">
                <h3>No results available</h3>
                <p>
                    Completed prediction results
                    will appear here.
                </p>
            </div>`;

        return;
    }

    grid.innerHTML =
        filtered
        .map(createPredictionCard)
            .join("");
}

// ======================================================
// STATISTICS
// ======================================================

function updatePredictionStats() {

    const total = allPredictions.length;

    const regular = allPredictions.filter(
        prediction => prediction.category !== "vip"
    ).length;

    const pending = allPredictions.filter(
        prediction => prediction.status === "pending"
    ).length;

    const completed = allPredictions.filter(
        prediction => prediction.status !== "pending"
    ).length;

    const won = allPredictions.filter(
        prediction => prediction.status === "won"
    ).length;

    const lost = allPredictions.filter(
        prediction => prediction.status === "lost"
    ).length;

    const voidPredictions = allPredictions.filter(
        prediction => prediction.status === "void"
    ).length;

    const decided = won + lost;

    const winRate = decided > 0
        ? Math.round((won / decided) * 100)
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

async function updateVipPredictionCount() {

    const element =
        document.querySelector(
            "#vipPredictions"
        );

    if (!element) {
        return;
    }

    const vipToken =
        getVipToken();

    if (!vipToken) {

        element.textContent =
            "0";

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/vip/predictions`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${vipToken}`
                    }
                }
            );

        if (!response.ok) {

            element.textContent =
                "0";

            return;
        }

        const data =
            await response.json();

        const predictions =
            Array.isArray(data)
                ? data
                : data.predictions || [];

        element.textContent =
            predictions.length;

    } catch (error) {

        console.error(
            "VIP statistics error:",
            error
        );

        element.textContent =
            "0";
    }
}

// ======================================================
// VIP PAGE
// ======================================================

async function setupVipPage() {

    const userToken =
        getUserToken();

    // VIP page requires an account
    if (!userToken) {

        window.location.href =
            "index.html";

        return;
    }

    // Verify normal user session
    const sessionValid =
        await verifyUserForVipPage();

    if (!sessionValid) {
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

        if (!data.user) {

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

        clearUserSession();

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
        document.querySelector(
            "#vipAccessForm"
        );

    if (!form) {
        return;
    }

    // Prevent duplicate listeners
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
// ACTIVATE VIP ACCESS
// ======================================================

async function handleVipAccess(event) {

    event.preventDefault();

    const codeInput =
        document.querySelector(
            "#vipAccessCode"
        );

    const message =
        document.querySelector(
            "#vipMessage"
        );

    const code =
        codeInput?.value.trim();

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
            event.submitter,
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

            throw new Error(
                data.message ||
                "Unable to activate VIP access."
            );
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

        if (codeInput) {

            codeInput.value =
                "";
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
            event.submitter,
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

        const response =
            await fetch(
                `${API_BASE_URL}/vip/status`,
                {
                    method: "GET",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${userToken}`
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

            console.error(
                "VIP status request failed:",
                data.message
            );

            updateVipStatusUI(null);

            return;
        }

        updateVipStatusUI(
            data
        );

       if (data.active === true) {

    await loadVipPredictions();
    await loadVipBettingCodes();       

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
        document.querySelector(
            "#vipStatus"
        );

    const planElement =
        document.querySelector(
            "#vipPlan"
        );

    const expiryElement =
        document.querySelector(
            "#vipExpiry"
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
                data.expiresAt
            );
    }
}

// ======================================================
// LOAD VIP PREDICTIONS
// ======================================================

async function loadVipPredictions() {

    const grid =
        document.querySelector(
            "#vipPredictionsGrid"
        );

    if (!grid) {
        return;
    }

    const vipToken =
        getVipToken();

    if (!vipToken) {

        grid.innerHTML =
            `<div class="empty-state">
                <h3>VIP access required</h3>
                <p>
                    Activate your VIP subscription
                    to view this section.
                </p>
            </div>`;

        return;
    }

    try {

        grid.innerHTML =
            `<div class="loading-state">
                <p>Loading VIP content...</p>
            </div>`;

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
                response.status === 401
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
                : data.predictions || [];

        if (!predictions.length) {

            grid.innerHTML =
                `<div class="empty-state">
                    <h3>No VIP predictions yet</h3>
                    <p>
                        New VIP match previews
                        will appear here.
                    </p>
                </div>`;

            return;
        }

        grid.innerHTML =
            predictions
                .map(createPredictionCard)
                .join("");

    } catch (error) {

        console.error(
            "VIP prediction error:",
            error
        );

        grid.innerHTML =
            `<div class="empty-state">
                <h3>VIP content unavailable</h3>
                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load VIP predictions."
                    )}
                </p>
            </div>`;
    }
}

// ======================================================
// VIP LOGOUT
// ======================================================

function setupVipLogout() {

    const buttons =
        document.querySelectorAll(
            "[data-vip-logout], #vipLogoutButton"
        );

    buttons.forEach(button => {

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

    const buttons =
        document.querySelectorAll(
            "#signOutButton, [data-sign-out]"
        );

    buttons.forEach(button => {

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

clearUserSession();

window.location.href = "index.html";
            }
        );
    });
}

// ======================================================
// MOBILE MENU
// ======================================================

function setupMobileMenu() {

    const menuButton =
        document.querySelector(
            "#menuButton"
        );

    const nav =
        document.querySelector(
            "#mainNav"
        );

    if (!menuButton || !nav) {
        return;
    }

    menuButton.addEventListener(
        "click",
        () => {

            nav.classList.toggle(
                "open"
            );

            menuButton.classList.toggle(
                "active"
            );

            const expanded =
                nav.classList.contains(
                    "active"
                );

            menuButton.setAttribute(
                "aria-expanded",
                expanded
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

    const menuButton =
        document.querySelector(
            "#menuButton"
        );

    const nav =
        document.querySelector(
            "#mainNav"
        );

    if (nav) {

        nav.classList.remove(
            "active"
        );
    }

    if (menuButton) {

        menuButton.classList.remove(
            "active"
        );

        menuButton.setAttribute(
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
            'a[href*="wa.me"]'
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
// FORM VALUE HELPER
// ======================================================

function getFormValue(form, names) {

    if (!form) {
        return "";
    }

    for (const name of names) {

        const element =
            form.querySelector(
                `[name="${name}"]`
            ) ||
            form.querySelector(
                `#${name}`
            );

        if (element) {

            const value =
                element.value?.trim();

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

    const statuses = {
        pending: "Pending",
        won: "match won",
        lost: "match lost",
        void: "Void"
    };

    return (
        statuses[status] ||
        capitalize(status)
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

    return (
        plans[plan] ||
        capitalize(
            String(
                plan || "VIP"
            ).replaceAll(
                "_",
                " "
            )
        )
    );
}

// ======================================================
// DATE FORMAT
// ======================================================

function formatMatchDate(date) {

    if (!date) {
        return "";
    }

    try {

        const parsed =
            new Date(
                `${date}T00:00:00`
            );

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {

            return escapeHtml(date);
        }

        return parsed.toLocaleDateString(
            undefined,
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    } catch (error) {

        return escapeHtml(date);
    }
}

// ======================================================
// VIP EXPIRY FORMAT
// ======================================================

function formatExpiry(date) {

    if (!date) {
        return "—";
    }

    try {

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

    } catch (error) {

        return "—";
    }
}

// ======================================================
// CAPITALIZE
// ======================================================

function capitalize(value) {

    if (!value) {
        return "";
    }

    return (
        String(value)
            .charAt(0)
            .toUpperCase() +
        String(value)
            .slice(1)
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
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}
// FORGOT PASSWORD
// =====================================================

(function setupForgotPassword() {
  function startForgotPassword() {
    const existing = document.getElementById("forgotPasswordOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "forgotPasswordOverlay";

    overlay.innerHTML = `
      <div style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.75);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:99999;
        padding:20px;
      ">
        <div style="
          width:100%;
          max-width:420px;
          background:#fff;
          border-radius:12px;
          padding:25px;
          box-shadow:0 20px 60px rgba(0,0,0,.35);
        ">
          <h2 style="margin:0 0 10px;color:#111;">
            Forgot Password
          </h2>

          <p style="margin:0 0 20px;color:#555;">
            Enter the email address you used to create your FLEX HUB PREDICTIONS account.
          </p>

          <input
            id="forgotPasswordEmail"
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            style="
              width:100%;
              box-sizing:border-box;
              padding:12px;
              border:1px solid #ccc;
              border-radius:7px;
              margin-bottom:12px;
              font-size:15px;
            "
          >

          <div
            id="forgotPasswordMessage"
            style="
              display:none;
              margin-bottom:12px;
              padding:10px;
              border-radius:7px;
              font-size:14px;
            "
          ></div>

          <button
            id="sendResetEmailButton"
            type="button"
            style="
              width:100%;
              padding:12px;
              border:0;
              border-radius:7px;
              background:#111;
              color:#fff;
              font-size:15px;
              cursor:pointer;
              margin-bottom:10px;
            "
          >
            Send Reset Link
          </button>

          <button
            id="closeForgotPasswordButton"
            type="button"
            style="
              width:100%;
              padding:10px;
              border:0;
              background:transparent;
              color:#555;
              cursor:pointer;
              font-size:14px;
            "
          >
            Back to Login
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const emailInput =
      document.getElementById("forgotPasswordEmail");

    const sendButton =
      document.getElementById("sendResetEmailButton");

    const closeButton =
      document.getElementById("closeForgotPasswordButton");

    const messageBox =
      document.getElementById("forgotPasswordMessage");

    closeButton.addEventListener("click", () => {
      overlay.remove();
    });

    emailInput.focus();

    sendButton.addEventListener("click", async () => {
      const email = emailInput.value.trim();

      if (!email) {
        messageBox.style.display = "block";
        messageBox.style.background = "#fff3cd";
        messageBox.style.color = "#664d03";
        messageBox.textContent = "Please enter your email address.";
        return;
      }

      sendButton.disabled = true;
      sendButton.textContent = "Sending...";

      messageBox.style.display = "none";

      try {
        const response = await fetch(
          "https://flex-hub-prediction.onrender.com/api/forgot-password",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
          }
        );

        const data = await response.json();

        messageBox.style.display = "block";
        messageBox.style.background = "#d1e7dd";
        messageBox.style.color = "#0f5132";
        messageBox.textContent =
          data.message ||
          "If an account with that email exists, a password reset link has been sent.";

        sendButton.textContent = "Email Sent";
      } catch (error) {
        console.error("Forgot password request failed:", error);

        messageBox.style.display = "block";
        messageBox.style.background = "#f8d7da";
        messageBox.style.color = "#842029";
        messageBox.textContent =
          "Unable to send the reset request right now. Please try again.";

        sendButton.disabled = false;
        sendButton.textContent = "Send Reset Link";
      }
    });
  }

  function connectForgotPasswordButton() {
    const button =
      document.getElementById("forgotPasswordButton");

    if (!button) return false;

    if (button.dataset.forgotPasswordReady === "true") {
      return true;
    }

    button.dataset.forgotPasswordReady = "true";

    button.addEventListener("click", (event) => {
      event.preventDefault();
      startForgotPassword();
    });

    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      connectForgotPasswordButton
    );
  } else {
    connectForgotPasswordButton();
  }

  // The login gate can be rendered dynamically, so keep checking
  // briefly until the button exists.
  let attempts = 0;

  const finder = setInterval(() => {
    attempts++;

    if (connectForgotPasswordButton() || attempts >= 30) {
      clearInterval(finder);
    }
  }, 500);
})();

// =====================================================
// END OF FORGOT PASSWORD
// =====================================================

// ======================================================
// ============================================================
// BETTING CODES
// ============================================================
// ============================================================
// BETTING CODES
// ============================================================

async function loadRegularBettingCodes() {

    const container =
        document.getElementById(
            "bettingCodesGrid"
        );

    if (!container) {
        return;
    }

    try {

        container.innerHTML = `
            <div class="loading-state">
                Loading betting codes...
            </div>
        `;

        const data =
            await apiRequest(
                "/betting-codes"
            );

        const bettingCodes =
            Array.isArray(data.bettingCodes)
                ? data.bettingCodes
                : Array.isArray(data.codes)
                    ? data.codes
                    : [];

        if (!bettingCodes.length) {

            container.innerHTML = `
                <div class="loading-state">
                    No betting codes available.
                </div>
            `;

            return;
        }

        container.innerHTML =
            bettingCodes.map(code => `

                <div class="betting-code-card">

                    <div class="prediction-card-header">

                        <strong>
                            ${escapeHtml(
                                code.bookmaker || ""
                            )}
                        </strong>

                    </div>

                    <div class="prediction-card-body">

                        <div>
                            <strong>
                                BETTING CODE
                            </strong>
                        </div>

                        <div style="
                            font-size:24px;
                            font-weight:800;
                            margin:10px 0;
                        ">
                            ${escapeHtml(
                                code.code || ""
                            )}
                        </div>

                        ${
                            code.description
                                ? `
                                    <div
                                        style="
                                            margin-bottom:15px;
                                        "
                                    >
                                        ${escapeHtml(
                                            code.description
                                        )}
                                    </div>
                                  `
                                : ""
                        }

                        <button
                            type="button"
                            class="primary-btn"
                            style="
                                margin-top:5px;
                                cursor:pointer;
                            "
                            data-betting-code="${escapeHtml(
                                code.code || ""
                            )}"
                            onclick="copyBettingCode(this)"
                        >
                            📋 COPY CODE
                        </button>

                    </div>

                </div>

            `).join("");

    } catch (error) {

        console.error(
            "Regular betting codes error:",
            error
        );

        container.innerHTML = `
            <div class="loading-state">
                Unable to load betting codes.
            </div>
        `;
    }
}

// ============================================================
// COPY BETTING CODE
// ============================================================

async function copyBettingCode(button) {

    const code = button.getAttribute("data-betting-code");

    if (!code) {
        return;
    }

    const originalText = button.textContent;

    try {

        await navigator.clipboard.writeText(code);

        button.textContent = "COPIED ✓";

        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);

    } catch (error) {

        console.error(
            "Copy betting code error:",
            error
        );

        button.textContent = "COPY FAILED";

        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }
}


// ============================================================
// END BETTING CODES
// ============================================================
// ============================================================
// ============================================================
// VIP BETTING CODES
// ============================================================

async function loadVipBettingCodes() {

    const container =
        document.getElementById("vipBettingCodesGrid");

    if (!container) {
        return;
    }

    try {

      const token =
    getVipToken();

        if (!token) {
            return;
        }

        const response = await fetch(
            "https://flex-hub-prediction.onrender.com/api/vip/betting-codes",
            {
                headers: {
                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to load VIP betting codes."
            );
        }

        const bettingCodes =
            data.bettingCodes || [];

        if (!bettingCodes.length) {

            container.innerHTML = `
                <div class="empty-state">

                    <h3>
                        No VIP betting codes yet
                    </h3>

                    <p>
                        Check back later for new
                        VIP betting codes.
                    </p>

                </div>
            `;

            return;
        }

        container.innerHTML =
            bettingCodes.map(code => `

                <div class="prediction-card">

                    <div class="prediction-card-header">

                        <strong>
                            ${escapeHtml(
                                code.bookmaker
                            )}
                        </strong>

                    </div>

                    <div class="prediction-card-body">

                        <div>
                            <strong>
                                VIP BETTING CODE
                            </strong>
                        </div>

                        <div style="
                            font-size:24px;
                            font-weight:800;
                            margin:10px 0;
                        ">
                            ${escapeHtml(
                                code.code
                            )}
                        </div>

                        ${
                            code.description
                                ? `
                                    <div
                                        style="
                                            margin-bottom:15px;
                                        "
                                    >
                                        ${escapeHtml(
                                            code.description
                                        )}
                                    </div>
                                  `
                                : ""
                        }

                        <button
                            type="button"
                            class="primary-btn"
                            style="
                                margin-top:5px;
                                cursor:pointer;
                            "
                            data-betting-code="${escapeHtml(
                                code.code
                            )}"
                            onclick="copyBettingCode(this)"
                        >
                            📋 COPY CODE
                        </button>

                    </div>

                </div>

            `).join("");

    } catch (error) {

        console.error(
            "VIP betting codes error:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    Unable to load VIP betting codes
                </h3>

                <p>
                    Please try again later.
                </p>

            </div>
        `;
    }
}


// ============================================================
// END VIP BETTING CODES
// ============================================================
// REAL TEAM BADGES
// ============================================================

async function loadTeamBadges() {

    const badges = document.querySelectorAll(
        ".team-badge[data-team-name]"
    );

    for (const badge of badges) {

        // Do not request or replace a badge that is
        // already loaded.
        if (badge.querySelector("img")) {
            continue;
        }

        const teamName =
            badge.getAttribute("data-team-name");

        if (!teamName) {
            continue;
        }

        try {

            const response = await fetch(
                "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=" +
                encodeURIComponent(teamName)
            );

            const data = await response.json();

            const team =
                data.teams &&
                data.teams[0];

            if (
                team &&
                team.strBadge
            ) {

                badge.innerHTML = `
                    <img
                        src="${team.strBadge}"
                        alt="${escapeHtml(teamName)}"
                        style="
                            width:36px;
                            height:36px;
                            object-fit:contain;
                            display:block;
                        "
                    >
                `;

            }

        } catch (error) {

            console.error(
                "Team badge error:",
                teamName,
                error
            );

        }
    }
}

// Watch prediction cards for team badges
const teamBadgeObserver = new MutationObserver(() => {

    loadTeamBadges();

});

teamBadgeObserver.observe(document.body, {
    childList: true,
    subtree: true
});


// Load badges already on the page
setTimeout(() => {
    loadTeamBadges();
}, 1000);


// ============================================================
// END REAL TEAM BADGES
// ============================================================
// ============================================================
// FLEX HUB LOGIN / REGISTER ANIMATION
// ============================================================

function showFlexHubAnimation(callback) {

    const overlay = document.createElement("div");

    overlay.id = "flexHubAnimation";

    overlay.innerHTML = `
        <div class="flex-hub-animation-content">

            <div class="flex-hub-logo">
                FLEX
            </div>

            <div class="flex-hub-title">
                HUB
            </div>

            <div class="flex-hub-subtitle">
                PREDICTIONS
            </div>

            <div class="flex-hub-loading">
                LOADING...
            </div>

        </div>
    `;

    const style = document.createElement("style");

    style.textContent = `
        #flexHubAnimation {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: #05070b;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: flexHubFadeIn .25s ease forwards;
        }

        .flex-hub-animation-content {
            text-align: center;
            transform: scale(.85);
            animation: flexHubZoom 1.1s ease forwards;
        }

        .flex-hub-logo {
            color: #f5b942;
            font-size: 58px;
            font-weight: 1000;
            letter-spacing: 2px;
            line-height: .9;
            text-shadow: 0 0 25px rgba(245,185,66,.45);
        }

        .flex-hub-title {
            color: white;
            font-size: 34px;
            font-weight: 900;
            letter-spacing: 5px;
            margin-top: 4px;
        }

        .flex-hub-subtitle {
            color: #f5b942;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 6px;
            margin-top: 8px;
        }

        .flex-hub-loading {
            margin-top: 28px;
            color: #ffffff;
            font-size: 13px;
            letter-spacing: 4px;
            opacity: .75;
            animation: flexHubPulse 1s ease-in-out infinite;
        }

        @keyframes flexHubZoom {

            0% {
                opacity: 0;
                transform: scale(.65);
            }

            55% {
                opacity: 1;
                transform: scale(1.05);
            }

            100% {
                opacity: 1;
                transform: scale(1);
            }

        }

        @keyframes flexHubFadeIn {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }

        }

        @keyframes flexHubPulse {

            0%, 100% {
                opacity: .35;
            }

            50% {
                opacity: 1;
            }

        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    setTimeout(() => {

        // Remove the animation completely
        overlay.remove();
        style.remove();

        // Open the main website
        if (typeof callback === "function") {
            callback();
        }

    }, 1300);
}
// END OF FLEX HUB APP.JS
// ======================================================
// =====================================================

// ============================================================
// FLEX HUB PWA INSTALL BUTTON
// ============================================================

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    deferredInstallPrompt = event;

    const installButton =
        document.getElementById("installAppBtn");

    if (installButton) {
        installButton.style.display = "inline-block";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const installButton =
        document.getElementById("installAppBtn");

    if (!installButton) {
        return;
    }

    installButton.addEventListener("click", async () => {
        if (!deferredInstallPrompt) {
            return;
        }

        deferredInstallPrompt.prompt();

        await deferredInstallPrompt.userChoice;

        deferredInstallPrompt = null;

        installButton.style.display = "none";
    });
});

// ==================== USER NOTIFICATION CENTER ====================

(function setupNotificationCenter() {

    function notificationEscapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function addNotificationStyles() {

        if (document.getElementById("flexNotificationStyles")) {
            return;
        }

        const style = document.createElement("style");

        style.id = "flexNotificationStyles";

       style.textContent = `
    /* =====================================================
       FLEX HUB NOTIFICATION CENTER
       ===================================================== */

    #flexNotificationBell {
        position: fixed;
        right: 20px;
        bottom: 85px;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        z-index: 9998;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 20px rgba(0,0,0,.35);
    }

    #flexNotificationBadge {
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 21px;
        height: 21px;
        padding: 0 6px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 800;
        display: none;
        align-items: center;
        justify-content: center;
    }
    /* BRIGHT NOTIFICATION ALERT */

#flexNotificationBadge {
    background: #ff1744;
    color: #ffffff;
    border: 3px solid #07100c;
    font-size: 13px;
    font-weight: 900;
    min-width: 28px;
    height: 28px;
    padding: 0 7px;
    border-radius: 50%;
    box-shadow:
        0 0 10px rgba(255, 23, 68, .9),
        0 0 20px rgba(255, 23, 68, .6);
    z-index: 10000;
}

#flexNotificationBell.has-unread {
    animation: flexNotificationPulse 1.5s infinite;
}

@keyframes flexNotificationPulse {

    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.08);
        box-shadow:
            0 0 12px rgba(255, 23, 68, .7),
            0 0 25px rgba(255, 23, 68, .4);
    }

    100% {
        transform: scale(1);
    }

}


    /* =====================================================
       NOTIFICATION BOARD
       ===================================================== */

    #flexNotificationPanel {
        position: fixed;
        right: 20px;
        bottom: 150px;

        width: 390px;
        max-width: calc(100vw - 30px);

        max-height: 72vh;

        overflow-y: auto;

        z-index: 9999;

        display: none;

        border-radius: 18px;

        padding: 18px;

        box-shadow:
            0 12px 40px rgba(0,0,0,.45);

        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    #flexNotificationPanel.flex-notification-open {
        display: block;
    }


    /* =====================================================
       BOARD HEADER
       ===================================================== */

    .flex-notification-header {
        display: flex;

        align-items: center;

        justify-content: space-between;

        margin-bottom: 16px;

        padding-bottom: 12px;

        border-bottom:
            1px solid rgba(128,128,128,.25);
    }

    .flex-notification-header h3 {
        margin: 0;

        font-size: 19px;

        font-weight: 800;
    }

    #flexNotificationClose {
        width: 34px;
        height: 34px;

        border: none;

        border-radius: 50%;

        background: rgba(128,128,128,.15);

        cursor: pointer;

        font-size: 22px;

        display: flex;

        align-items: center;

        justify-content: center;
    }


    /* =====================================================
       NOTIFICATION BOARD / CARD
       ===================================================== */

    .flex-notification-item {

        position: relative;

        padding: 17px;

        margin-bottom: 13px;

        border-radius: 14px;

        border:
            1px solid rgba(128,128,128,.25);

        cursor: pointer;

        transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;

        overflow-wrap: anywhere;

        word-break: break-word;
    }

    .flex-notification-item:hover {

        transform: translateY(-2px);

        box-shadow:
            0 6px 20px rgba(0,0,0,.18);
    }


    /* UNREAD MESSAGE */

    .flex-notification-item.unread {

        font-weight: 600;

        border-width: 2px;
    }


    /* =====================================================
       NOTIFICATION TITLE
       ===================================================== */

    .flex-notification-title {

        font-size: 16px;

        line-height: 1.35;

        font-weight: 800;

        margin-bottom: 9px;
    }


    /* =====================================================
       NOTIFICATION MESSAGE BOARD
       ===================================================== */

    .flex-notification-message {

        font-size: 15px;

        line-height: 1.65;

        font-weight: 400;

        white-space: pre-wrap;

        overflow-wrap: anywhere;

        word-break: break-word;
    }


    /* =====================================================
       DATE / TIME
       ===================================================== */

    .flex-notification-time {

        margin-top: 12px;

        padding-top: 9px;

        border-top:
            1px solid rgba(128,128,128,.18);

        font-size: 11px;

        line-height: 1.4;

        opacity: .65;
    }


    /* =====================================================
       EMPTY / LOADING BOARD
       ===================================================== */

    .flex-notification-empty {

        text-align: center;

        padding: 30px 15px;

        opacity: .7;

        font-size: 14px;
    }


    /* =====================================================
       MOBILE
       ===================================================== */

    @media (max-width: 600px) {

        #flexNotificationBell {

            right: 15px;

            bottom: 75px;

            width: 52px;

            height: 52px;
        }

        #flexNotificationPanel {

            right: 15px;

            bottom: 138px;

            width: calc(100vw - 30px);

            max-height: 70vh;

            padding: 15px;

            border-radius: 16px;
        }

        .flex-notification-item {

            padding: 15px;

            border-radius: 13px;
        }

        .flex-notification-title {

            font-size: 15px;
        }

        .flex-notification-message {

            font-size: 14px;

            line-height: 1.65;
        }
    }
`;
        document.head.appendChild(style);
    }


    function createNotificationUI() {

        if (document.getElementById("flexNotificationBell")) {
            return;
        }

        addNotificationStyles();

        const bell = document.createElement("button");

        bell.id = "flexNotificationBell";
        bell.type = "button";
        bell.setAttribute("aria-label", "Notifications");
        bell.innerHTML = `
            🔔
            <span id="flexNotificationBadge"></span>
        `;

        const panel = document.createElement("div");

        panel.id = "flexNotificationPanel";

        panel.innerHTML = `
            <div class="flex-notification-header">

                <h3>Notifications</h3>

                <button
                    type="button"
                    id="flexNotificationClose"
                    aria-label="Close notifications"
                >
                    ×
                </button>

            </div>

            <div id="flexNotificationList">
                <div class="flex-notification-empty">
                    Loading notifications...
                </div>
            </div>
        `;

        document.body.appendChild(bell);
        document.body.appendChild(panel);

        bell.addEventListener("click", async () => {

            panel.classList.toggle(
                "flex-notification-open"
            );

            if (panel.classList.contains("flex-notification-open")) {
                await loadUserNotifications();
            }

        });

        document
            .getElementById("flexNotificationClose")
            .addEventListener("click", () => {

                panel.classList.remove(
                    "flex-notification-open"
                );

            });
    }


    async function loadUserNotifications() {

        const list = document.getElementById(
            "flexNotificationList"
        );

        const badge = document.getElementById(
            "flexNotificationBadge"
        );

        if (!list) return;

        try {

            const token = localStorage.getItem(
                STORAGE_KEYS.userToken
            );

            if (!token) {
                return;
            }

            const response = await fetch(
                API_BASE_URL + "/notifications",
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load notifications."
                );
            }

            const notifications =
                data.notifications || [];

            const unreadCount =
                Number(data.unreadCount || 0);

          const bell =
    document.getElementById(
        "flexNotificationBell"
    );

if (badge) {

    if (unreadCount > 0) {

        badge.textContent =
            unreadCount > 99
                ? "99+"
                : unreadCount;

        badge.style.display = "flex";

        if (bell) {
            bell.classList.add(
                "has-unread"
            );
        }

    } else {

        badge.style.display = "none";

        if (bell) {
            bell.classList.remove(
                "has-unread"
            );
        }

    }

}

            if (!notifications.length) {

                list.innerHTML = `
                    <div class="flex-notification-empty">
                        No notifications yet.
                    </div>
                `;

                return;
            }

            list.innerHTML = notifications.map(item => `

                <div
                    class="flex-notification-item ${
                        item.is_read ? "" : "unread"
                    }"
                    data-notification-id="${item.id}"
                >

                    <div class="flex-notification-title">

    <span>
        ${notificationEscapeHTML(item.title)}
    </span>

    ${
        !item.is_read
            ? `
                <span
                    style="
                        display:inline-flex;
                        align-items:center;
                        justify-content:center;
                        margin-left:8px;
                        padding:3px 7px;
                        border-radius:20px;
                        font-size:9px;
                        font-weight:800;
                        letter-spacing:.5px;
                    "
                >
                    NEW
                </span>
              `
            : ""
    }

</div>

                    <div class="flex-notification-message">
                        ${notificationEscapeHTML(item.message)}
                    </div>

                    <div class="flex-notification-time">
                        ${
                            item.created_at
                                ? new Date(
                                    item.created_at
                                  ).toLocaleString()
                                : ""
                        }
                    </div>

                </div>

            `).join("");

            list
                .querySelectorAll(
                    ".flex-notification-item"
                )
                .forEach(item => {

                    item.addEventListener(
                        "click",
                        async () => {

                            const id =
                                item.dataset.notificationId;

                            await markNotificationRead(id);

                            item.classList.remove(
                                "unread"
                            );

                            await loadUserNotifications();

                        }
                    );

                });

        } catch (error) {

            list.innerHTML = `
                <div class="flex-notification-empty">
                    ${notificationEscapeHTML(error.message)}
                </div>
            `;
        }
    }


    async function markNotificationRead(id) {

        try {

            const token = localStorage.getItem(
                STORAGE_KEYS.userToken
            );

            if (!token) return;

            await fetch(
                API_BASE_URL +
                `/notifications/${id}/read`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    }
                }
            );

        } catch (error) {

            console.error(
                "Notification read error:",
                error
            );

        }
    }


    function startNotificationCenter() {

        const token = localStorage.getItem(
            STORAGE_KEYS.userToken
        );

        if (!token) {
            return;
        }

        createNotificationUI();

        loadUserNotifications();

        setInterval(
            loadUserNotifications,
            60000
        );
    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            startNotificationCenter
        );

    } else {

        startNotificationCenter();

    }

})();

