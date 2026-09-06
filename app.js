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
    if (document.body.classList.contains("vip-page")) {
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

        openMainWebsite();

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

            openMainWebsite();

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

    const token =
        getUserToken();

    if (!token) {

        showAccountGate();

        return false;
    }

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
        document.querySelector(
            "#predictionsGrid"
        );

    if (!grid) {
        return;
    }

    try {

        grid.innerHTML =
            `<div class="loading-state">
                <p>Loading predictions...</p>
            </div>`;

        const data =
            await apiRequest(
                "/predictions"
            );

        allPredictions =
            Array.isArray(data)
                ? data
                : data.predictions || [];

        renderPredictions();

        updatePredictionStats();

    } catch (error) {

        console.error(
            "Prediction loading error:",
            error
        );

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

    const statusText =
        formatStatus(status);

    const categoryText =
        category === "vip"
            ? "VIP"
            : "Regular";

    return `
        <article
            class="prediction-card"
            data-category="${escapeHtml(category)}"
            data-status="${escapeHtml(status)}">

            <div class="prediction-card-top">

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

                <div class="team home-team">
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

                <div class="team away-team">
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

            </div>

            <div class="prediction-selection">

                <span class="label">
                    Editorial Prediction
                </span>

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

    const total =
        allPredictions.length;

    const regular =
        allPredictions.filter(
            prediction =>
                prediction.category !== "vip"
        ).length;

    const pending =
        allPredictions.filter(
            prediction =>
                prediction.status === "pending"
        ).length;

    const completed =
        allPredictions.filter(
            prediction =>
                prediction.status !== "pending"
        ).length;

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
            event => {

                event.preventDefault();

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
        won: "Completed",
        lost: "Completed",
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

// ======================================================
// END OF FLEX HUB APP.JS
// ======================================================
