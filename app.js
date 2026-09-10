// ============================================================
// FLEX HUB PREDICTIONS
// MAIN APP.JS — PART 1
// ============================================================

"use strict";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
    "https://flex-hub-prediction.onrender.com/api";

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEYS = {
    user: "flexHubUser",
    userToken: "flexHubUserToken",
    vipToken: "flexHubVipToken"
};

// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;

let allPredictions = [];
let allResults = [];

let currentLeagueFilter = "all";
let currentResultFilter = "all";
let currentSearchQuery = "";

let applicationStarted = false;
let mainWebsiteOpened = false;

let countdownTimer = null;
let notificationTimer = null;

// ============================================================
// PAGE INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeFlexHub
);

async function initializeFlexHub() {

    // Prevent accidental double initialization
    if (applicationStarted) {
        return;
    }

    applicationStarted = true;

    // ------------------------------------------
    // Restore saved account
    // ------------------------------------------

    currentUser = getStoredUser();

    // ------------------------------------------
    // Setup website functionality
    // ------------------------------------------

    setupAccountForms();
    setupNavigation();
    setupSearch();
    setupLeagueFilters();
    setupResultFilters();
    setupMobileMenu();
    setupSignOut();
    setupFooterYear();
    setupWhatsAppLinks();
    setupInstallButton();

    // ------------------------------------------
    // VIP PAGE
    // ------------------------------------------

    if (
        document.body &&
        document.body.classList.contains("vip-page")
    ) {

        await setupVipPage();

        return;
    }

    // ------------------------------------------
    // NORMAL WEBSITE
    // ------------------------------------------

    const sessionValid =
        await checkUserSession();

    if (sessionValid) {

        startNotificationCenter();
    }
}

// ============================================================
// STORAGE
// ============================================================

function getStoredUser() {

    try {

        const storedUser =
            localStorage.getItem(
                STORAGE_KEYS.user
            );

        if (!storedUser) {
            return null;
        }

        const user =
            JSON.parse(storedUser);

        if (
            !user ||
            typeof user !== "object"
        ) {
            return null;
        }

        return user;

    } catch (error) {

        console.error(
            "Unable to restore saved user:",
            error
        );

        localStorage.removeItem(
            STORAGE_KEYS.user
        );

        return null;
    }
}

// ============================================================
// GET USER TOKEN
// ============================================================

function getUserToken() {

    return (
        localStorage.getItem(
            STORAGE_KEYS.userToken
        ) || ""
    );
}

// ============================================================
// GET VIP TOKEN
// ============================================================

function getVipToken() {

    return (
        localStorage.getItem(
            STORAGE_KEYS.vipToken
        ) || ""
    );
}

// ============================================================
// SAVE USER
// ============================================================

function saveUser(
    user,
    token = null
) {

    if (
        !user ||
        typeof user !== "object"
    ) {
        return;
    }

    currentUser = user;

    localStorage.setItem(
        STORAGE_KEYS.user,
        JSON.stringify(user)
    );

    // Only replace the existing token
    // when the server actually gives us one.
    if (token) {

        localStorage.setItem(
            STORAGE_KEYS.userToken,
            token
        );
    }
}

// ============================================================
// CLEAR USER SESSION
// ============================================================

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

    allPredictions = [];
    allResults = [];

    mainWebsiteOpened = false;
}

// ============================================================
// API REQUEST HELPER
// ============================================================

async function apiRequest(
    endpoint,
    options = {}
) {

    if (!endpoint) {

        throw new Error(
            "Invalid API endpoint."
        );
    }

    const token =
        getUserToken();

    const headers = {
        "Content-Type":
            "application/json",

        ...(options.headers || {})
    };

    // Add normal user authentication
    // automatically when available.
    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    let response;

    try {

        response =
            await fetch(
                `${API_BASE_URL}${endpoint}`,
                {
                    ...options,
                    headers
                }
            );

    } catch (error) {

        console.error(
            "API connection error:",
            error
        );

        throw new Error(
            "Unable to connect to FLEX HUB server. Please check your internet connection and try again."
        );
    }

    // ------------------------------------------
    // Read response safely
    // ------------------------------------------

    let data = {};

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            data =
                await response.json();

        } catch (error) {

            data = {};
        }

    } else {

        try {

            const text =
                await response.text();

            data =
                text
                    ? { message: text }
                    : {};

        } catch (error) {

            data = {};
        }
    }

    // ------------------------------------------
    // Handle API errors
    // ------------------------------------------

    if (!response.ok) {

        const message =
            data.message ||
            data.error ||
            `Request failed (${response.status}).`;

        const error =
            new Error(message);

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }

    return data;
}

// ============================================================
// ACCOUNT FORMS
// ============================================================

function setupAccountForms() {

    const loginForm =
        document.querySelector(
            "#loginForm"
        );

    const registerForm =
        document.querySelector(
            "#registerForm"
        );

    // ------------------------------------------
    // LOGIN
    // ------------------------------------------

    if (loginForm) {

        // Prevent duplicate listeners
        if (
            loginForm.dataset.flexHubReady !==
            "true"
        ) {

            loginForm.dataset.flexHubReady =
                "true";

            loginForm.addEventListener(
                "submit",
                handleLogin
            );
        }
    }

    // ------------------------------------------
    // REGISTER
    // ------------------------------------------

    if (registerForm) {

        if (
            registerForm.dataset.flexHubReady !==
            "true"
        ) {

            registerForm.dataset.flexHubReady =
                "true";

            registerForm.addEventListener(
                "submit",
                handleRegister
            );
        }
    }

    setupAccountPanelSwitching();
}

// ============================================================
// ACCOUNT PANEL SWITCHING
// ============================================================

function setupAccountPanelSwitching() {

    const loginPanel =
        document.querySelector(
            "#loginPanel"
        );

    const registerPanel =
        document.querySelector(
            "#registerPanel"
        );

    // Support both the new buttons
    // and the previous data attributes.
    const showRegisterButtons =
        document.querySelectorAll(
            "#showRegisterButton, [data-show-register]"
        );

    const showLoginButtons =
        document.querySelectorAll(
            "#showLoginButton, [data-show-login]"
        );

    // ------------------------------------------
    // SHOW REGISTER
    // ------------------------------------------

    showRegisterButtons.forEach(
        button => {

            if (
                button.dataset.flexHubSwitchReady ===
                "true"
            ) {
                return;
            }

            button.dataset.flexHubSwitchReady =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showRegisterPanel(
                        loginPanel,
                        registerPanel
                    );
                }
            );
        }
    );

    // ------------------------------------------
    // SHOW LOGIN
    // ------------------------------------------

    showLoginButtons.forEach(
        button => {

            if (
                button.dataset.flexHubSwitchReady ===
                "true"
            ) {
                return;
            }

            button.dataset.flexHubSwitchReady =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    showLoginPanel(
                        loginPanel,
                        registerPanel
                    );
                }
            );
        }
    );
}

// ============================================================
// SHOW REGISTER PANEL
// ============================================================

function showRegisterPanel(
    loginPanel = document.querySelector("#loginPanel"),
    registerPanel = document.querySelector("#registerPanel")
) {

    if (loginPanel) {

        loginPanel.hidden = true;
        loginPanel.style.display = "none";
    }

    if (registerPanel) {

        registerPanel.hidden = false;
        registerPanel.style.display = "";
    }
}

// ============================================================
// SHOW LOGIN PANEL
// ============================================================

function showLoginPanel(
    loginPanel = document.querySelector("#loginPanel"),
    registerPanel = document.querySelector("#registerPanel")
) {

    if (registerPanel) {

        registerPanel.hidden = true;
        registerPanel.style.display = "none";
    }

    if (loginPanel) {

        loginPanel.hidden = false;
        loginPanel.style.display = "";
    }
}

// ============================================================
// LOGIN
// ============================================================

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

    // ------------------------------------------
    // Validation
    // ------------------------------------------

    if (!identifier) {

        showElementMessage(
            message,
            "Please enter your username or email.",
            "error"
        );

        return;
    }

    if (!password) {

        showElementMessage(
            message,
            "Please enter your password.",
            "error"
        );

        return;
    }

    const submitButton =
        event.submitter ||
        form.querySelector(
            'button[type="submit"]'
        );

    try {

        setButtonLoading(
            submitButton,
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

        // --------------------------------------
        // Validate server response
        // --------------------------------------

        if (!data.user) {

            throw new Error(
                "The server did not return your account."
            );
        }

        if (!data.token) {

            throw new Error(
                "The server did not return a login session."
            );
        }

        // --------------------------------------
        // Save session permanently
        // --------------------------------------

        saveUser(
            data.user,
            data.token
        );

        showElementMessage(
            message,
            "Login successful.",
            "success"
        );

        // --------------------------------------
        // Show branded transition
        // --------------------------------------

        showFlexHubAnimation(
            () => {

                openMainWebsite({
                    reloadData: true
                });

            }
        );

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showElementMessage(
            message,
            error.message ||
            "Unable to login. Please try again.",
            "error"
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );
    }
}

// ============================================================
// REGISTER
// ============================================================

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

    // ------------------------------------------
    // Validation
    // ------------------------------------------

    if (!name) {

        showElementMessage(
            message,
            "Please enter your name.",
            "error"
        );

        return;
    }

    if (!username) {

        showElementMessage(
            message,
            "Please choose a username.",
            "error"
        );

        return;
    }

    if (!email) {

        showElementMessage(
            message,
            "Please enter your email address.",
            "error"
        );

        return;
    }

    if (!password) {

        showElementMessage(
            message,
            "Please create a password.",
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

    const submitButton =
        event.submitter ||
        form.querySelector(
            'button[type="submit"]'
        );

    try {

        setButtonLoading(
            submitButton,
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

        // --------------------------------------
        // Save account
        // --------------------------------------

        saveUser(
            data.user,
            data.token || null
        );

        showElementMessage(
            message,
            "Account created successfully.",
            "success"
        );

        // --------------------------------------
        // If server automatically logs the user in
        // --------------------------------------

        if (data.token) {

            openMainWebsite({
                reloadData: true
            });

            return;
        }

        // --------------------------------------
        // Otherwise return to login
        // --------------------------------------

        setTimeout(
            () => {

                switchToLoginPanel();

            },
            900
        );

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        showElementMessage(
            message,
            error.message ||
            "Unable to create your account.",
            "error"
        );

    } finally {

        setButtonLoading(
            submitButton,
            false
        );
    }
}

// ============================================================
// CHECK USER SESSION
// ============================================================

async function checkUserSession() {

    const token =
        getUserToken();

    // No saved login = show login gate.
    if (!token) {

        showAccountGate();

        return false;
    }

    try {

        // Verify the token BEFORE opening
        // the main website.
        const data =
            await apiRequest(
                "/user/me"
            );

        if (!data.user) {

            throw new Error(
                "Invalid user session."
            );
        }

        // Refresh saved user information.
        saveUser(
            data.user
        );

        updateUserUI();

        openMainWebsite({
            reloadData: true,
            scrollTop: false
        });

        return true;

    } catch (error) {

        console.error(
            "Session check failed:",
            error
        );

        // Invalid/expired account token.
        clearUserSession();

        showAccountGate();

        return false;
    }
}

// ============================================================
// ACCOUNT GATE
// ============================================================

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

        gate.hidden = false;
        gate.style.display = "";
    }

    if (website) {

        website.hidden = true;
        website.style.display = "none";
    }

    mainWebsiteOpened = false;
}

// ============================================================
// OPEN MAIN WEBSITE
// ============================================================

async function openMainWebsite(
    options = {}
) {

    const {
        reloadData = true,
        scrollTop = true
    } = options;

    const gate =
        document.querySelector(
            "#accountGate"
        );

    const website =
        document.querySelector(
            "#mainWebsite"
        );

    // ------------------------------------------
    // Hide account gate
    // ------------------------------------------

    if (gate) {

        gate.hidden = true;
        gate.style.display = "none";
    }

    // ------------------------------------------
    // Show main website
    // ------------------------------------------

    if (website) {

        website.hidden = false;
        website.style.display = "";
    }

    mainWebsiteOpened = true;

    updateUserUI();
    closeMobileMenu();

    // ------------------------------------------
    // Load content
    // ------------------------------------------

    if (reloadData) {

        await Promise.allSettled([
            loadPredictions(),
            loadRegularBettingCodes(),
            loadResults()
        ]);

        startNotificationCenter();
    }

    // ------------------------------------------
    // Scroll only when requested
    // ------------------------------------------

    if (scrollTop) {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
}

// ============================================================
// SWITCH TO LOGIN
// ============================================================

function switchToLoginPanel() {

    showLoginPanel();

    const loginForm =
        document.querySelector(
            "#loginForm"
        );

    if (loginForm) {

        const firstInput =
            loginForm.querySelector(
                "input"
            );

        if (firstInput) {

            setTimeout(
                () => firstInput.focus(),
                100
            );
        }
    }
}

// ============================================================
// USER INTERFACE
// ============================================================

function updateUserUI() {

    if (!currentUser) {
        return;
    }

    const displayName =
        currentUser.name ||
        currentUser.username ||
        "User";

    // ------------------------------------------
    // Name
    // ------------------------------------------

    document
        .querySelectorAll(
            "#userName, [data-user-name]"
        )
        .forEach(element => {

            element.textContent =
                displayName;
        });

    // ------------------------------------------
    // Username
    // ------------------------------------------

    document
        .querySelectorAll(
            "[data-user-username]"
        )
        .forEach(element => {

            element.textContent =
                currentUser.username ||
                "—";
        });

    // ------------------------------------------
    // Email
    // ------------------------------------------

    document
        .querySelectorAll(
            "[data-user-email]"
        )
        .forEach(element => {

            element.textContent =
                currentUser.email ||
                "—";
        });

    // ------------------------------------------
    // Optional VIP indicator
    // ------------------------------------------

    updateStoredVipIndicator();
}

// ============================================================
// STORED VIP INDICATOR
// ============================================================

function updateStoredVipIndicator() {

    const vipToken =
        getVipToken();

    document
        .querySelectorAll(
            "[data-vip-user]"
        )
        .forEach(element => {

            element.classList.toggle(
                "active",
                Boolean(vipToken)
            );
        });
}
// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    const links =
        document.querySelectorAll(
            "nav a[href^='#'], " +
            "#mainNav a[href^='#'], " +
            "[data-scroll-target]"
        );

    links.forEach(link => {

        if (
            link.dataset.flexHubNavigationReady ===
            "true"
        ) {
            return;
        }

        link.dataset.flexHubNavigationReady =
            "true";

        link.addEventListener(
            "click",
            event => {

                const dataTarget =
                    link.getAttribute(
                        "data-scroll-target"
                    );

                const href =
                    link.getAttribute(
                        "href"
                    );

                const targetSelector =
                    dataTarget ||
                    href;

                if (
                    !targetSelector ||
                    targetSelector === "#"
                ) {
                    return;
                }

                let target = null;

                try {

                    target =
                        document.querySelector(
                            targetSelector
                        );

                } catch (error) {

                    console.warn(
                        "Invalid navigation target:",
                        targetSelector
                    );

                    return;
                }

                if (!target) {
                    return;
                }

                event.preventDefault();

                closeMobileMenu();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                // Keep the URL clean without
                // forcing a page reload.
                if (
                    href &&
                    href.startsWith("#") &&
                    history.replaceState
                ) {

                    history.replaceState(
                        null,
                        "",
                        href
                    );
                }
            }
        );
    });

    setupLeagueCards();
}

// ============================================================
// LEAGUE CARDS
// ============================================================

function setupLeagueCards() {

    document
        .querySelectorAll(
            ".league-card, [data-league]"
        )
        .forEach(card => {

            if (
                card.dataset.flexHubLeagueReady ===
                "true"
            ) {
                return;
            }

            card.dataset.flexHubLeagueReady =
                "true";

            card.addEventListener(
                "click",
                event => {

                    const league =
                        card.dataset.league;

                    if (!league) {
                        return;
                    }

                    currentLeagueFilter =
                        league;

                    updateLeagueFilterUI();

                    renderPredictions();

                    const predictionsSection =
                        document.querySelector(
                            "#predictions"
                        ) ||
                        document.querySelector(
                            "#predictionsSection"
                        );

                    if (predictionsSection) {

                        event.preventDefault();

                        predictionsSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }
            );
        });
}

// ============================================================
// SEARCH
// ============================================================

function setupSearch() {

    const search =
        document.querySelector(
            "#predictionSearch"
        ) ||
        document.querySelector(
            "[data-prediction-search]"
        );

    if (!search) {
        return;
    }

    if (
        search.dataset.flexHubSearchReady ===
        "true"
    ) {
        return;
    }

    search.dataset.flexHubSearchReady =
        "true";

    search.addEventListener(
        "input",
        event => {

            currentSearchQuery =
                String(
                    event.target.value || ""
                )
                    .trim()
                    .toLowerCase();

            renderPredictions();
        }
    );
}

// ============================================================
// LEAGUE FILTERS
// ============================================================

function setupLeagueFilters() {

    document
        .querySelectorAll(
            "[data-league-filter]"
        )
        .forEach(button => {

            if (
                button.dataset.flexHubLeagueFilterReady ===
                "true"
            ) {
                return;
            }

            button.dataset.flexHubLeagueFilterReady =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    currentLeagueFilter =
                        button.dataset.leagueFilter ||
                        "all";

                    updateLeagueFilterUI();

                    renderPredictions();
                }
            );
        });

    updateLeagueFilterUI();
}

// ============================================================
// UPDATE LEAGUE FILTER UI
// ============================================================

function updateLeagueFilterUI() {

    document
        .querySelectorAll(
            "[data-league-filter]"
        )
        .forEach(button => {

            const value =
                String(
                    button.dataset.leagueFilter ||
                    "all"
                )
                    .trim()
                    .toLowerCase();

            const activeValue =
                String(
                    currentLeagueFilter ||
                    "all"
                )
                    .trim()
                    .toLowerCase();

            const isActive =
                value === activeValue;

            button.classList.toggle(
                "active",
                isActive
            );

            button.setAttribute(
                "aria-pressed",
                isActive
                    ? "true"
                    : "false"
            );
        });
}

// ============================================================
// LOAD PREDICTIONS
// ============================================================

async function loadPredictions() {

    const grid =
        document.querySelector(
            "#predictionsGrid"
        );

    const hasStats =
        Boolean(
            document.querySelector(
                "#totalPredictions"
            )
        );

    // Nothing on this page requires
    // regular predictions.
    if (!grid && !hasStats) {
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

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data.predictions
                )
                    ? data.predictions
                    : [];

        // --------------------------------------
        // Only keep valid objects
        // --------------------------------------

        allPredictions =
            predictions.filter(
                prediction =>
                    prediction &&
                    typeof prediction === "object"
            );

        // --------------------------------------
        // Render
        // --------------------------------------

        if (grid) {
            renderPredictions();
        }

        updatePredictionStats();

        // --------------------------------------
        // Team badges
        // --------------------------------------

        scheduleTeamBadgeLoad();

    } catch (error) {

        console.error(
            "Prediction loading error:",
            error
        );

        allPredictions = [];

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

                    <button
                        type="button"
                        class="primary-btn"
                        data-retry-predictions
                    >
                        Try Again
                    </button>
                </div>
            `;

            const retryButton =
                grid.querySelector(
                    "[data-retry-predictions]"
                );

            if (retryButton) {

                retryButton.addEventListener(
                    "click",
                    () => loadPredictions()
                );
            }
        }
    }
}

// ============================================================
// RENDER PREDICTIONS
// ============================================================

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

    // ------------------------------------------
    // Home featured mode
    // ------------------------------------------

    if (
        grid.dataset.homeFeaturedOnly ===
        "true"
    ) {

        predictions =
            predictions.filter(
                prediction =>
                    prediction.featured === true ||
                    String(
                        prediction.featured
                    ).toLowerCase() === "true"
            );
    }

    // ------------------------------------------
    // Featured first
    // ------------------------------------------

    predictions.sort(
        (a, b) => {

            const featuredA =
                a.featured === true ||
                String(
                    a.featured
                ).toLowerCase() === "true";

            const featuredB =
                b.featured === true ||
                String(
                    b.featured
                ).toLowerCase() === "true";

            return (
                Number(featuredB) -
                Number(featuredA)
            );
        }
    );

    // ------------------------------------------
    // Search
    // ------------------------------------------

    if (currentSearchQuery) {

        predictions =
            predictions.filter(
                prediction => {

                    const searchableText = [
                        prediction.league,
                        prediction.home_team,
                        prediction.away_team,
                        prediction.prediction,
                        prediction.analysis,
                        prediction.category,
                        prediction.status
                    ]
                        .filter(
                            value =>
                                value !== null &&
                                value !== undefined
                        )
                        .join(" ")
                        .toLowerCase();

                    return searchableText.includes(
                        currentSearchQuery
                    );
                }
            );
    }

    // ------------------------------------------
    // League filter
    // ------------------------------------------

    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {

        const selectedLeague =
            String(
                currentLeagueFilter
            )
                .trim()
                .toLowerCase();

        predictions =
            predictions.filter(
                prediction =>
                    String(
                        prediction.league || ""
                    )
                        .trim()
                        .toLowerCase() ===
                    selectedLeague
            );
    }

    // ------------------------------------------
    // Empty state
    // ------------------------------------------

    if (!predictions.length) {

        grid.innerHTML = `
            <div class="empty-state">

                <h3>
                    No predictions found
                </h3>

                <p>
                    Try another search or league.
                </p>

            </div>
        `;

        return;
    }

    // ------------------------------------------
    // Render cards
    // ------------------------------------------

    grid.innerHTML =
        predictions
            .map(
                prediction =>
                    createPredictionCard(
                        prediction
                    )
            )
            .join("");

    // ------------------------------------------
    // Load team badges after cards exist
    // ------------------------------------------

    scheduleTeamBadgeLoad();

    // ------------------------------------------
    // Update countdowns immediately
    // ------------------------------------------

    updateMatchCountdowns();
}

// ============================================================
// PREDICTION CARD DATA HELPERS
// ============================================================

function normalizePredictionStatus(
    prediction
) {

    return String(
        prediction?.status ||
        "pending"
    )
        .trim()
        .toLowerCase();
}

function normalizePredictionCategory(
    prediction
) {

    return String(
        prediction?.category ||
        "regular"
    )
        .trim()
        .toLowerCase();
}

function isFeaturedPrediction(
    prediction
) {

    return (
        prediction?.featured === true ||
        String(
            prediction?.featured
        ).toLowerCase() === "true"
    );
}

// ============================================================
// MATCH KICKOFF DATE
// ============================================================

function getMatchKickoffDate(
    prediction
) {

    if (
        !prediction ||
        !prediction.match_date ||
        !prediction.match_time
    ) {
        return null;
    }

    const date =
        String(
            prediction.match_date
        ).trim();

    const time =
        String(
            prediction.match_time
        ).trim();

    const kickoff =
        new Date(
            `${date}T${time}`
        );

    if (
        Number.isNaN(
            kickoff.getTime()
        )
    ) {
        return null;
    }

    return kickoff;
}

// ============================================================
// FORMAT COUNTDOWN
// ============================================================

function formatMatchCountdown(
    milliseconds
) {

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

        return (
            `${days}D ` +
            `${String(hours).padStart(2, "0")}H ` +
            `${String(minutes).padStart(2, "0")}M`
        );
    }

    if (hours > 0) {

        return (
            `${String(hours).padStart(2, "0")}H ` +
            `${String(minutes).padStart(2, "0")}M`
        );
    }

    return `${minutes}M`;
}

// ============================================================
// UPDATE MATCH COUNTDOWNS
// ============================================================

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

            if (!date || !time) {
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

            const now =
                Date.now();

            const kickoffTimestamp =
                kickoff.getTime();

            const remaining =
                kickoffTimestamp - now;

            const elapsed =
                now - kickoffTimestamp;

            const value =
                element.querySelector(
                    ".countdown-value"
                );

            if (!value) {
                return;
            }

            // ----------------------------------
            // Match has not started
            // ----------------------------------

            if (remaining > 0) {

                value.textContent =
                    formatMatchCountdown(
                        remaining
                    );

                element.dataset.state =
                    "upcoming";

                return;
            }

            // ----------------------------------
            // Match ongoing
            // ----------------------------------

            const twoHours =
                2 * 60 * 60 * 1000;

            if (
                elapsed >= 0 &&
                elapsed < twoHours
            ) {

                value.textContent =
                    "MATCH ONGOING";

                element.dataset.state =
                    "ongoing";

                return;
            }

            // ----------------------------------
            // Match ended
            // ----------------------------------

            value.textContent =
                "MATCH ENDED";

            element.dataset.state =
                "ended";
        });
}

// ============================================================
// START COUNTDOWN TIMER
// ============================================================

function startCountdownTimer() {

    if (countdownTimer) {
        return;
    }

    updateMatchCountdowns();

    countdownTimer =
        setInterval(
            updateMatchCountdowns,
            1000
        );
}

// Start once the document is ready.
startCountdownTimer();
// ============================================================
// CREATE PREDICTION CARD
// ============================================================

function createPredictionCard(prediction) {

    const status =
        normalizePredictionStatus(
            prediction
        );

    const category =
        normalizePredictionCategory(
            prediction
        );

    const featured =
        isFeaturedPrediction(
            prediction
        );

    const kickoffTime =
        getMatchKickoffDate(
            prediction
        );

    const statusText =
        formatStatus(
            status
        );

    const categoryText =
        category === "vip"
            ? "VIP"
            : "Regular";

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
            class="
                prediction-card
                ${featured ? "featured-prediction" : ""}
            "
            data-category="${escapeHtml(category)}"
            data-status="${escapeHtml(status)}"
        >

            <!-- ==========================================
                 CARD TOP
            =========================================== -->

            <div class="prediction-card-top">

                ${
                    featured
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
                    class="
                        prediction-category
                        ${escapeHtml(category)}
                    "
                >
                    ${escapeHtml(categoryText)}
                </span>

            </div>


            <!-- ==========================================
                 MATCH
            =========================================== -->

            <div class="prediction-match">

                <!-- HOME TEAM -->

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
                        ${escapeHtml(
                            homeTeam
                        )}
                    </strong>

                </div>


                <!-- VS -->

                <span class="vs">
                    VS
                </span>


                <!-- AWAY TEAM -->

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
                        ${escapeHtml(
                            awayTeam
                        )}
                    </strong>

                </div>

            </div>


            <!-- ==========================================
                 MATCH INFORMATION
            =========================================== -->

            <div class="prediction-info">

                ${
                    prediction.match_date
                        ? `
                            <span>
                                ${formatMatchDate(
                                    prediction.match_date
                                )}
                            </span>
                          `
                        : ""
                }

                ${
                    prediction.match_time
                        ? `
                            <span>
                                ${escapeHtml(
                                    prediction.match_time
                                )}
                            </span>
                          `
                        : ""
                }

                ${
                    kickoffTime
                        ? `
                            <div
                                class="match-countdown"
                                data-match-date="${escapeHtml(
                                    prediction.match_date || ""
                                )}"
                                data-match-time="${escapeHtml(
                                    prediction.match_time || ""
                                )}"
                            >
                                <strong class="countdown-value">
                                    ${formatMatchCountdown(
                                        Math.max(
                                            0,
                                            kickoffTime.getTime() -
                                            Date.now()
                                        )
                                    )}
                                </strong>
                            </div>
                          `
                        : ""
                }

            </div>


            <!-- ==========================================
                 PREDICTION
            =========================================== -->

            <div class="prediction-selection">

                <span class="label">
                    Prediction
                </span>

                <strong>
                    ${escapeHtml(
                        prediction.prediction ||
                        "Preview"
                    )}
                </strong>

            </div>


            <!-- ==========================================
                 ANALYSIS
            =========================================== -->

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


            <!-- ==========================================
                 STATUS
            =========================================== -->

            <div
                class="
                    prediction-status
                    status-${escapeHtml(status)}
                "
            >
                ${escapeHtml(statusText)}
            </div>

        </article>
    `;
}

// ============================================================
// GET TEAM INITIALS
// ============================================================

function getTeamInitials(
    teamName
) {

    const name =
        String(
            teamName ||
            ""
        ).trim();

    if (!name) {
        return "FC";
    }

    const words =
        name
            .split(/\s+/)
            .filter(Boolean);

    // Two or more words:
    // use the first letter of each word.
    if (words.length > 1) {

        return words
            .slice(0, 3)
            .map(
                word =>
                    word.charAt(0)
            )
            .join("")
            .toUpperCase();
    }

    // One word:
    // use up to three letters.
    return name
        .slice(0, 3)
        .toUpperCase();
}

// ============================================================
// RESULTS
// ============================================================

function setupResultFilters() {

    document
        .querySelectorAll(
            "[data-result-filter]"
        )
        .forEach(button => {

            if (
                button.dataset.flexHubResultFilterReady ===
                "true"
            ) {
                return;
            }

            button.dataset.flexHubResultFilterReady =
                "true";

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    currentResultFilter =
                        button.dataset.resultFilter ||
                        "all";

                    updateResultFilterUI();

                    renderResults();
                }
            );
        });

    updateResultFilterUI();
}

// ============================================================
// UPDATE RESULT FILTER UI
// ============================================================

function updateResultFilterUI() {

    document
        .querySelectorAll(
            "[data-result-filter]"
        )
        .forEach(button => {

            const value =
                String(
                    button.dataset.resultFilter ||
                    "all"
                )
                    .trim()
                    .toLowerCase();

            const activeValue =
                String(
                    currentResultFilter ||
                    "all"
                )
                    .trim()
                    .toLowerCase();

            const isActive =
                value === activeValue;

            button.classList.toggle(
                "active",
                isActive
            );

            button.setAttribute(
                "aria-pressed",
                isActive
                    ? "true"
                    : "false"
            );
        });
}

// ============================================================
// LOAD RESULTS
// ============================================================

async function loadResults() {

    const grid =
        document.querySelector(
            "#resultsGrid"
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

        const data =
            await apiRequest(
                "/predictions?results=true"
            );

        const results =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data.predictions
                )
                    ? data.predictions
                    : [];

        allResults =
            results.filter(
                result =>
                    result &&
                    typeof result === "object"
            );

        // Keep backward compatibility
        // with the previous global variable.
        window.flexHubResults =
            allResults;

        renderResults();

        updatePredictionStats();

        scheduleTeamBadgeLoad();

    } catch (error) {

        console.error(
            "Results loading error:",
            error
        );

        allResults = [];

        window.flexHubResults = [];

        grid.innerHTML = `
            <div class="empty-state">

                <h3>
                    Results unavailable
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load results."
                    )}
                </p>

                <button
                    type="button"
                    class="primary-btn"
                    data-retry-results
                >
                    Try Again
                </button>

            </div>
        `;

        const retryButton =
            grid.querySelector(
                "[data-retry-results]"
            );

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                () => loadResults()
            );
        }
    }
}

// ============================================================
// RENDER RESULTS
// ============================================================

function renderResults() {

    const grid =
        document.querySelector(
            "#resultsGrid"
        );

    if (!grid) {
        return;
    }

    const results =
        Array.isArray(allResults)
            ? allResults
            : [];

    // ------------------------------------------
    // Only completed results
    // ------------------------------------------

    let filtered =
        results.filter(
            prediction => {

                const status =
                    normalizePredictionStatus(
                        prediction
                    );

                return (
                    status !== "pending"
                );
            }
        );

    // ------------------------------------------
    // Result status filter
    // ------------------------------------------

    if (
        currentResultFilter &&
        currentResultFilter !== "all"
    ) {

        const selectedStatus =
            String(
                currentResultFilter
            )
                .trim()
                .toLowerCase();

        filtered =
            filtered.filter(
                prediction =>
                    normalizePredictionStatus(
                        prediction
                    ) === selectedStatus
            );
    }

    // ------------------------------------------
    // Empty
    // ------------------------------------------

    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">

                <h3>
                    No results available
                </h3>

                <p>
                    Completed prediction results
                    will appear here.
                </p>

            </div>
        `;

        return;
    }

    // ------------------------------------------
    // Render
    // ------------------------------------------

    grid.innerHTML =
        filtered
            .map(
                prediction =>
                    createPredictionCard(
                        prediction
                    )
            )
            .join("");

    scheduleTeamBadgeLoad();

    updateMatchCountdowns();
}

// ============================================================
// PREDICTION STATISTICS
// ============================================================

function updatePredictionStats() {

    const predictions =
        Array.isArray(
            allPredictions
        )
            ? allPredictions
            : [];

    const total =
        predictions.length;

    const regular =
        predictions.filter(
            prediction =>
                normalizePredictionCategory(
                    prediction
                ) !== "vip"
        ).length;

    const pending =
        predictions.filter(
            prediction =>
                normalizePredictionStatus(
                    prediction
                ) === "pending"
        ).length;

    const completed =
        predictions.filter(
            prediction =>
                normalizePredictionStatus(
                    prediction
                ) !== "pending"
        ).length;

    const won =
        predictions.filter(
            prediction =>
                normalizePredictionStatus(
                    prediction
                ) === "won"
        ).length;

    const lost =
        predictions.filter(
            prediction =>
                normalizePredictionStatus(
                    prediction
                ) === "lost"
        ).length;

    const voidPredictions =
        predictions.filter(
            prediction =>
                normalizePredictionStatus(
                    prediction
                ) === "void"
        ).length;

    const decided =
        won + lost;

    const winRate =
        decided > 0
            ? Math.round(
                (won / decided) * 100
            )
            : 0;

    // ------------------------------------------
    // Update dashboard numbers
    // ------------------------------------------

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

// ============================================================
// VIP PREDICTION COUNT
// ============================================================

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
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${vipToken}`
                    }
                }
            );

        if (!response.ok) {

            // A VIP token can expire.
            // Remove only the VIP token,
            // not the normal user session.
            if (
                response.status === 401
            ) {

                localStorage.removeItem(
                    STORAGE_KEYS.vipToken
                );

                updateStoredVipIndicator();
            }

            element.textContent =
                "0";

            return;
        }

        const data =
            await response.json();

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data.predictions
                )
                    ? data.predictions
                    : [];

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
// ============================================================
// VIP PAGE
// ============================================================

async function setupVipPage() {

    const userToken =
        getUserToken();

    // VIP still requires a normal FLEX HUB account.
    if (!userToken) {

        window.location.href =
            "index.html";

        return;
    }

    const sessionValid =
        await verifyUserForVipPage();

    if (!sessionValid) {
        return;
    }

    setupVipAccessForm();
    setupVipLogout();

    await checkVipStatus();

    // Notification center should also work
    // on the VIP page for logged-in users.
    startNotificationCenter();
}

// ============================================================
// VERIFY USER FOR VIP PAGE
// ============================================================

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

// ============================================================
// VIP ACCESS FORM
// ============================================================

function setupVipAccessForm() {

    const form =
        document.querySelector(
            "#vipAccessForm"
        );

    if (!form) {
        return;
    }

    if (
        form.dataset.flexHubVipReady ===
        "true"
    ) {
        return;
    }

    form.dataset.flexHubVipReady =
        "true";

    form.addEventListener(
        "submit",
        handleVipAccess
    );
}

// ============================================================
// ACTIVATE VIP ACCESS
// ============================================================

async function handleVipAccess(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const codeInput =
        form.querySelector(
            "#vipAccessCode"
        ) ||
        document.querySelector(
            "#vipAccessCode"
        );

    const message =
        document.querySelector(
            "#vipMessage"
        ) ||
        findFormMessage(form);

    const code =
        codeInput?.value
            ?.trim() || "";

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

    const submitButton =
        event.submitter ||
        form.querySelector(
            'button[type="submit"]'
        );

    try {

        setButtonLoading(
            submitButton,
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
                data.error ||
                "Unable to activate VIP access."
            );
        }

        if (!data.token) {

            throw new Error(
                "The server did not return a VIP session."
            );
        }

        // ------------------------------------------
        // Store VIP session
        // ------------------------------------------

        localStorage.setItem(
            STORAGE_KEYS.vipToken,
            data.token
        );

        if (codeInput) {
            codeInput.value = "";
        }

        updateStoredVipIndicator();

        showElementMessage(
            message,
            "VIP access activated successfully!",
            "success"
        );

        // ------------------------------------------
        // Immediately refresh VIP information
        // ------------------------------------------

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
            submitButton,
            false
        );
    }
}

// ============================================================
// CHECK VIP STATUS
// ============================================================

async function checkVipStatus() {

    const userToken =
        getUserToken();

    if (!userToken) {

        updateVipStatusUI(null);

        return false;
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
                data.message ||
                data.error
            );

            updateVipStatusUI(null);

            return false;
        }

        updateVipStatusUI(
            data
        );

        // ------------------------------------------
        // Active VIP
        // ------------------------------------------

        if (data.active === true) {

            // If the VIP token is missing, the status
            // endpoint may still confirm the account.
            // Do not erase the normal user session.
            const vipToken =
                getVipToken();

            if (vipToken) {

                await Promise.allSettled([
                    loadVipPredictions(),
                    loadVipBettingCodes()
                ]);

            }

            updateStoredVipIndicator();

            return true;
        }

        // ------------------------------------------
        // No active VIP
        // ------------------------------------------

        const vipGrid =
            document.querySelector(
                "#vipPredictionsGrid"
            );

        if (vipGrid) {

            vipGrid.innerHTML = `
                <div class="empty-state">

                    <h3>
                        VIP access required
                    </h3>

                    <p>
                        Activate your VIP subscription
                        to view VIP predictions.
                    </p>

                </div>
            `;
        }

        const vipCodes =
            document.querySelector(
                "#vipBettingCodesGrid"
            );

        if (vipCodes) {

            vipCodes.innerHTML = `
                <div class="empty-state">

                    <h3>
                        VIP access required
                    </h3>

                    <p>
                        Activate your VIP subscription
                        to view VIP betting codes.
                    </p>

                </div>
            `;
        }

        return false;

    } catch (error) {

        console.error(
            "VIP status error:",
            error
        );

        updateVipStatusUI(null);

        return false;
    }
}

// ============================================================
// VIP STATUS UI
// ============================================================

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

    const active =
        Boolean(
            data &&
            data.active === true
        );

    // ------------------------------------------
    // LOCKED
    // ------------------------------------------

    if (!active) {

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

        updateStoredVipIndicator();

        return;
    }

    // ------------------------------------------
    // ACTIVE
    // ------------------------------------------

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

    updateStoredVipIndicator();
}

// ============================================================
// LOAD VIP PREDICTIONS
// ============================================================

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

        grid.innerHTML = `
            <div class="empty-state">

                <h3>
                    VIP access required
                </h3>

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

        // ------------------------------------------
        // Expired VIP token
        // ------------------------------------------

        if (!response.ok) {

            if (
                response.status === 401
            ) {

                localStorage.removeItem(
                    STORAGE_KEYS.vipToken
                );

                updateStoredVipIndicator();
            }

            throw new Error(
                data.message ||
                data.error ||
                "Unable to load VIP content."
            );
        }

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data.predictions
                )
                    ? data.predictions
                    : [];

        if (!predictions.length) {

            grid.innerHTML = `
                <div class="empty-state">

                    <h3>
                        No VIP predictions yet
                    </h3>

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
                .map(
                    prediction =>
                        createPredictionCard(
                            prediction
                        )
                )
                .join("");

        scheduleTeamBadgeLoad();
        updateMatchCountdowns();

    } catch (error) {

        console.error(
            "VIP prediction error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">

                <h3>
                    VIP content unavailable
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load VIP predictions."
                    )}
                </p>

                <button
                    type="button"
                    class="primary-btn"
                    data-retry-vip
                >
                    Try Again
                </button>

            </div>
        `;

        const retryButton =
            grid.querySelector(
                "[data-retry-vip]"
            );

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                () => loadVipPredictions()
            );
        }
    }
}

// ============================================================
// VIP LOGOUT
// ============================================================

function setupVipLogout() {

    const buttons =
        document.querySelectorAll(
            "[data-vip-logout], #vipLogoutButton"
        );

    buttons.forEach(button => {

        if (
            button.dataset.flexHubVipLogoutReady ===
            "true"
        ) {
            return;
        }

        button.dataset.flexHubVipLogoutReady =
            "true";

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                localStorage.removeItem(
                    STORAGE_KEYS.vipToken
                );

                updateStoredVipIndicator();

                window.location.href =
                    "index.html";
            }
        );
    });
}

// ============================================================
// MAIN SIGN OUT
// ============================================================

function setupSignOut() {

    const buttons =
        document.querySelectorAll(
            "#signOutButton, [data-sign-out]"
        );

    buttons.forEach(button => {

        if (
            button.dataset.flexHubSignOutReady ===
            "true"
        ) {
            return;
        }

        button.dataset.flexHubSignOutReady =
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

// ============================================================
// MOBILE MENU
// ============================================================

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

    if (
        menuButton.dataset.flexHubMenuReady ===
        "true"
    ) {
        return;
    }

    menuButton.dataset.flexHubMenuReady =
        "true";

    // ------------------------------------------
    // Toggle
    // ------------------------------------------

    menuButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            const isOpen =
                nav.classList.toggle(
                    "open"
                );

            menuButton.classList.toggle(
                "active",
                isOpen
            );

            menuButton.setAttribute(
                "aria-expanded",
                isOpen
                    ? "true"
                    : "false"
            );
        }
    );

    // ------------------------------------------
    // Close after navigation
    // ------------------------------------------

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

// ============================================================
// CLOSE MOBILE MENU
// ============================================================

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
            "open"
        );

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

// ============================================================
// WHATSAPP LINKS
// ============================================================

function setupWhatsAppLinks() {

    document
        .querySelectorAll(
            'a[href*="wa.me"], ' +
            'a[href*="whatsapp.com"]'
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

// ============================================================
// FOOTER YEAR
// ============================================================

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
// ============================================================
// FORM VALUE HELPER
// ============================================================

function getFormValue(
    form,
    names
) {

    if (!form || !Array.isArray(names)) {
        return "";
    }

    for (const name of names) {

        if (!name) {
            continue;
        }

        const selector =
            `[name="${CSS.escape(name)}"]`;

        const element =
            form.querySelector(
                selector
            ) ||
            form.querySelector(
                `#${CSS.escape(name)}`
            );

        if (!element) {
            continue;
        }

        const value =
            String(
                element.value || ""
            ).trim();

        if (value) {
            return value;
        }
    }

    return "";
}

// ============================================================
// FORM MESSAGE
// ============================================================

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
            "[role='alert']"
        )
    );
}

// ============================================================
// MESSAGE DISPLAY
// ============================================================

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
        "info",
        "warning"
    );

    element.classList.add(
        type
    );

    element.style.display =
        message
            ? ""
            : "none";

    element.setAttribute(
        "role",
        "alert"
    );
}

// ============================================================
// BUTTON LOADING
// ============================================================

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
                button.innerHTML;
        }

        button.disabled =
            true;

        button.setAttribute(
            "aria-busy",
            "true"
        );

        button.innerHTML =
            escapeHtml(
                loadingText
            );

    } else {

        button.disabled =
            false;

        button.removeAttribute(
            "aria-busy"
        );

        if (
            button.dataset.originalText
        ) {

            button.innerHTML =
                button.dataset.originalText;

            delete button.dataset.originalText;
        }
    }
}

// ============================================================
// SET TEXT
// ============================================================

function setText(
    selector,
    value
) {

    const element =
        document.querySelector(
            selector
        );

    if (element) {

        element.textContent =
            value;
    }
}

// ============================================================
// STATUS FORMAT
// ============================================================

function formatStatus(
    status
) {

    const normalized =
        String(
            status || "pending"
        )
            .trim()
            .toLowerCase();

    const statuses = {
        pending: "Pending",
        won: "Match Won",
        lost: "Match Lost",
        void: "Void"
    };

    return (
        statuses[normalized] ||
        capitalize(
            normalized
        )
    );
}

// ============================================================
// PLAN FORMAT
// ============================================================

function formatPlan(
    plan
) {

    const normalized =
        String(
            plan || ""
        )
            .trim()
            .toLowerCase();

    const plans = {
        "1_week": "1 Week VIP",
        "2_weeks": "2 Weeks VIP",
        "1_month": "1 Month VIP",
        "3_months": "3 Months VIP",
        "6_months": "6 Months VIP",
        "1_year": "1 Year VIP"
    };

    return (
        plans[normalized] ||
        capitalize(
            normalized
                .replaceAll(
                    "_",
                    " "
                )
        ) ||
        "VIP"
    );
}

// ============================================================
// DATE FORMAT
// ============================================================

function formatMatchDate(
    date
) {

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

            return escapeHtml(
                date
            );
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

        return escapeHtml(
            date
        );
    }
}

// ============================================================
// VIP EXPIRY FORMAT
// ============================================================

function formatExpiry(
    date
) {

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

// ============================================================
// CAPITALIZE
// ============================================================

function capitalize(
    value
) {

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

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

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

// ============================================================
// RETRY HELPER
// ============================================================

function createRetryButton(
    text,
    handler
) {

    const button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.className =
        "primary-btn";

    button.textContent =
        text || "Try Again";

    button.addEventListener(
        "click",
        handler
    );

    return button;
}

// ============================================================
// FORGOT PASSWORD
// ============================================================

function startForgotPassword() {

    const existing =
        document.getElementById(
            "forgotPasswordOverlay"
        );

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "forgotPasswordOverlay";

    overlay.className =
        "forgot-password-overlay";

    overlay.innerHTML = `
        <div class="forgot-password-backdrop"></div>

        <div
            class="forgot-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgotPasswordTitle"
        >

            <button
                type="button"
                class="forgot-password-close"
                id="closeForgotPasswordButton"
                aria-label="Close"
            >
                ×
            </button>

            <div class="forgot-password-icon">
                🔐
            </div>

            <h2 id="forgotPasswordTitle">
                Forgot Password?
            </h2>

            <p>
                Enter the email address you used
                to create your FLEX HUB PREDICTIONS
                account.
            </p>

            <input
                id="forgotPasswordEmail"
                type="email"
                placeholder="Enter your email"
                autocomplete="email"
            >

            <div
                id="forgotPasswordMessage"
                class="forgot-password-message"
                style="display:none;"
            ></div>

            <button
                id="sendResetEmailButton"
                type="button"
                class="primary-btn"
            >
                Send Reset Link
            </button>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    const emailInput =
        document.getElementById(
            "forgotPasswordEmail"
        );

    const sendButton =
        document.getElementById(
            "sendResetEmailButton"
        );

    const closeButton =
        document.getElementById(
            "closeForgotPasswordButton"
        );

    const messageBox =
        document.getElementById(
            "forgotPasswordMessage"
        );

    // ------------------------------------------
    // Close
    // ------------------------------------------

    const closeOverlay = () => {

        overlay.remove();
    };

    closeButton?.addEventListener(
        "click",
        closeOverlay
    );

    overlay
        .querySelector(
            ".forgot-password-backdrop"
        )
        ?.addEventListener(
            "click",
            closeOverlay
        );

    // ------------------------------------------
    // Escape key
    // ------------------------------------------

    const escapeHandler =
        event => {

            if (
                event.key === "Escape"
            ) {

                closeOverlay();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );
            }
        };

    document.addEventListener(
        "keydown",
        escapeHandler
    );

    // ------------------------------------------
    // Focus
    // ------------------------------------------

    setTimeout(
        () => emailInput?.focus(),
        50
    );

    // ------------------------------------------
    // Send reset email
    // ------------------------------------------

    sendButton?.addEventListener(
        "click",
        async () => {

            const email =
                emailInput?.value
                    ?.trim() || "";

            if (!email) {

                showElementMessage(
                    messageBox,
                    "Please enter your email address.",
                    "warning"
                );

                return;
            }

            setButtonLoading(
                sendButton,
                true,
                "Sending..."
            );

            showElementMessage(
                messageBox,
                "",
                "info"
            );

            try {

                const data =
                    await apiRequest(
                        "/forgot-password",
                        {
                            method: "POST",

                            // This endpoint intentionally
                            // does not need the user token.
                            headers: {},

                            body: JSON.stringify({
                                email
                            })
                        }
                    );

                showElementMessage(
                    messageBox,
                    data.message ||
                    "If an account with that email exists, a password reset link has been sent.",
                    "success"
                );

                sendButton.disabled =
                    true;

                sendButton.textContent =
                    "Email Sent";

            } catch (error) {

                console.error(
                    "Forgot password request failed:",
                    error
                );

                showElementMessage(
                    messageBox,
                    error.message ||
                    "Unable to send the reset request right now. Please try again.",
                    "error"
                );

                setButtonLoading(
                    sendButton,
                    false
                );
            }
        }
    );
}

// ============================================================
// CONNECT FORGOT PASSWORD BUTTON
// ============================================================

function connectForgotPasswordButton() {

    const buttons =
        document.querySelectorAll(
            "#forgotPasswordButton, " +
            "[data-forgot-password]"
        );

    if (!buttons.length) {
        return false;
    }

    buttons.forEach(button => {

        if (
            button.dataset.flexHubForgotReady ===
            "true"
        ) {
            return;
        }

        button.dataset.flexHubForgotReady =
            "true";

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                startForgotPassword();
            }
        );
    });

    return true;
}

// Connect immediately if the page
// has already finished loading.
if (
    document.readyState !==
    "loading"
) {

    connectForgotPasswordButton();

} else {

    document.addEventListener(
        "DOMContentLoaded",
        connectForgotPasswordButton
    );
}

// ============================================================
// FORGOT PASSWORD FALLBACK FINDER
// ============================================================

(function watchForForgotPasswordButton() {

    let attempts = 0;

    const finder =
        setInterval(
            () => {

                attempts++;

                if (
                    connectForgotPasswordButton() ||
                    attempts >= 30
                ) {

                    clearInterval(
                        finder
                    );
                }

            },
            500
        );

})();
// ============================================================
// REGULAR BETTING CODES
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
                <p>Loading betting codes...</p>
            </div>
        `;

        const data =
            await apiRequest(
                "/betting-codes"
            );

        const bettingCodes =
            Array.isArray(
                data.bettingCodes
            )
                ? data.bettingCodes
                : [];

        if (!bettingCodes.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <h3>
                        No betting codes available
                    </h3>

                    <p>
                        New betting codes will
                        appear here.
                    </p>
                </div>
            `;

            return;
        }

        container.innerHTML =
            bettingCodes
                .map(
                    code =>
                        createBettingCodeCard(
                            code,
                            false
                        )
                )
                .join("");

    } catch (error) {

        console.error(
            "Regular betting codes error:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    Betting codes unavailable
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Unable to load betting codes."
                    )}
                </p>

                <button
                    type="button"
                    class="primary-btn"
                    data-retry-betting-codes
                >
                    Try Again
                </button>

            </div>
        `;

        const retryButton =
            container.querySelector(
                "[data-retry-betting-codes]"
            );

        retryButton?.addEventListener(
            "click",
            () =>
                loadRegularBettingCodes()
        );
    }
}

// ============================================================
// CREATE BETTING CODE CARD
// ============================================================

function createBettingCodeCard(
    code,
    vip = false
) {

    const bookmaker =
        code?.bookmaker ||
        "Bookmaker";

    const bettingCode =
        code?.code ||
        "";

    const description =
        code?.description ||
        "";

    return `
        <article class="
            betting-code-card
            ${vip ? "vip-betting-code" : ""}
        ">

            <div class="prediction-card-header">

                <strong>
                    ${escapeHtml(
                        bookmaker
                    )}
                </strong>

            </div>

            <div class="prediction-card-body">

                <span class="label">
                    ${
                        vip
                            ? "VIP BETTING CODE"
                            : "BETTING CODE"
                    }
                </span>

                <div class="betting-code-value">
                    ${escapeHtml(
                        bettingCode
                    )}
                </div>

                ${
                    description
                        ? `
                            <div class="betting-code-description">
                                ${escapeHtml(
                                    description
                                )}
                            </div>
                          `
                        : ""
                }

                <button
                    type="button"
                    class="primary-btn"
                    data-copy-betting-code="${escapeHtml(
                        bettingCode
                    )}"
                >
                    📋 COPY CODE
                </button>

            </div>

        </article>
    `;
}

// ============================================================
// COPY BETTING CODE
// ============================================================

async function copyBettingCode(
    button
) {

    if (!button) {
        return;
    }

    const code =
        button.getAttribute(
            "data-copy-betting-code"
        ) ||
        button.getAttribute(
            "data-betting-code"
        );

    if (!code) {
        return;
    }

    const originalText =
        button.textContent;

    try {

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            await navigator.clipboard.writeText(
                code
            );

        } else {

            // Older browser fallback
            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value =
                code;

            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();
        }

        button.textContent =
            "COPIED ✓";

        setTimeout(
            () => {

                button.textContent =
                    originalText;

            },
            2000
        );

    } catch (error) {

        console.error(
            "Copy betting code error:",
            error
        );

        button.textContent =
            "COPY FAILED";

        setTimeout(
            () => {

                button.textContent =
                    originalText;

            },
            2000
        );
    }
}

// ============================================================
// COPY BUTTON EVENT DELEGATION
// ============================================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-copy-betting-code], " +
                "[data-betting-code]"
            );

        if (!button) {
            return;
        }

        copyBettingCode(
            button
        );
    }
);

// ============================================================
// VIP BETTING CODES
// ============================================================

async function loadVipBettingCodes() {

    const container =
        document.getElementById(
            "vipBettingCodesGrid"
        );

    if (!container) {
        return;
    }

    const token =
        getVipToken();

    if (!token) {

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    VIP access required
                </h3>

                <p>
                    Activate your VIP subscription
                    to view VIP betting codes.
                </p>

            </div>
        `;

        return;
    }

    try {

        container.innerHTML = `
            <div class="loading-state">
                <p>Loading VIP betting codes...</p>
            </div>
        `;

        const response =
            await fetch(
                `${API_BASE_URL}/vip/betting-codes`,
                {
                    method: "GET",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
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

                updateStoredVipIndicator();
            }

            throw new Error(
                data.message ||
                data.error ||
                "Unable to load VIP betting codes."
            );
        }

        const bettingCodes =
            Array.isArray(
                data.bettingCodes
            )
                ? data.bettingCodes
                : [];

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
            bettingCodes
                .map(
                    code =>
                        createBettingCodeCard(
                            code,
                            true
                        )
                )
                .join("");

    } catch (error) {

        console.error(
            "VIP betting codes error:",
            error
        );

        container.innerHTML = `
            <div class="empty-state">

                <h3>
                    VIP betting codes unavailable
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Please try again later."
                    )}
                </p>

            </div>
        `;
    }
}

// ============================================================
// TEAM BADGES
// ============================================================

const teamBadgeCache =
    new Map();

let teamBadgeLoadScheduled =
    false;

// ============================================================
// SCHEDULE TEAM BADGE LOAD
// ============================================================

function scheduleTeamBadgeLoad() {

    if (teamBadgeLoadScheduled) {
        return;
    }

    teamBadgeLoadScheduled =
        true;

    setTimeout(
        async () => {

            teamBadgeLoadScheduled =
                false;

            await loadTeamBadges();

        },
        100
    );
}

// ============================================================
// LOAD TEAM BADGES
// ============================================================

async function loadTeamBadges() {

    const badges =
        Array.from(
            document.querySelectorAll(
                ".team-badge[data-team-name]"
            )
        );

    if (!badges.length) {
        return;
    }

    for (
        const badge of badges
    ) {

        if (
            badge.querySelector(
                "img"
            )
        ) {
            continue;
        }

        const teamName =
            badge.getAttribute(
                "data-team-name"
            );

        if (!teamName) {
            continue;
        }

        const normalizedName =
            teamName
                .trim()
                .toLowerCase();

        // ------------------------------------------
        // Use cached badge
        // ------------------------------------------

        if (
            teamBadgeCache.has(
                normalizedName
            )
        ) {

            const cachedUrl =
                teamBadgeCache.get(
                    normalizedName
                );

            if (cachedUrl) {

                applyTeamBadge(
                    badge,
                    cachedUrl,
                    teamName
                );
            }

            continue;
        }

        try {

            const response =
                await fetch(
                    "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=" +
                    encodeURIComponent(
                        teamName
                    )
                );

            if (!response.ok) {

                teamBadgeCache.set(
                    normalizedName,
                    null
                );

                continue;
            }

            const data =
                await response.json();

            const team =
                Array.isArray(
                    data.teams
                )
                    ? data.teams[0]
                    : null;

            const badgeUrl =
                team?.strBadge ||
                null;

            teamBadgeCache.set(
                normalizedName,
                badgeUrl
            );

            if (badgeUrl) {

                applyTeamBadge(
                    badge,
                    badgeUrl,
                    teamName
                );
            }

        } catch (error) {

            console.error(
                "Team badge error:",
                teamName,
                error
            );

            // Cache failures so that
            // MutationObserver/re-renders don't
            // hammer the external API.
            teamBadgeCache.set(
                normalizedName,
                null
            );
        }
    }
}

// ============================================================
// APPLY TEAM BADGE
// ============================================================

function applyTeamBadge(
    badge,
    imageUrl,
    teamName
) {

    if (
        !badge ||
        !imageUrl
    ) {
        return;
    }

    if (
        badge.querySelector(
            "img"
        )
    ) {
        return;
    }

    const image =
        document.createElement(
            "img"
        );

    image.src =
        imageUrl;

    image.alt =
        teamName;

    image.loading =
        "lazy";

    image.decoding =
        "async";

    image.style.width =
        "100%";

    image.style.height =
        "100%";

    image.style.objectFit =
        "contain";

    image.style.display =
        "block";

    image.addEventListener(
        "error",
        () => {

            image.remove();
        },
        {
            once: true
        }
    );

    badge.textContent =
        "";

    badge.appendChild(
        image
    );
}

// ============================================================
// TEAM BADGE OBSERVER
// ============================================================

let teamBadgeObserver =
    null;

function setupTeamBadgeObserver() {

    if (
        teamBadgeObserver ||
        !document.body
    ) {
        return;
    }

    teamBadgeObserver =
        new MutationObserver(
            mutations => {

                let hasNewCards =
                    false;

                for (
                    const mutation
                    of mutations
                ) {

                    if (
                        mutation.type ===
                        "childList" &&
                        mutation.addedNodes.length
                    ) {

                        hasNewCards =
                            true;

                        break;
                    }
                }

                if (hasNewCards) {

                    scheduleTeamBadgeLoad();
                }
            }
        );

    teamBadgeObserver.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );
}

setupTeamBadgeObserver();

// ============================================================
// FLEX HUB LOGIN ANIMATION
// ============================================================

function showFlexHubAnimation(
    callback
) {

    const existing =
        document.getElementById(
            "flexHubAnimation"
        );

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement(
            "div"
        );

    overlay.id =
        "flexHubAnimation";

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

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "flexHubAnimationStyle";

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
            text-shadow:
                0 0 25px
                rgba(245,185,66,.45);
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
            animation:
                flexHubPulse
                1s ease-in-out infinite;
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

    document.head.appendChild(
        style
    );

    document.body.appendChild(
        overlay
    );

    setTimeout(
        () => {

            overlay.remove();
            style.remove();

            if (
                typeof callback ===
                "function"
            ) {

                callback();
            }

        },
        1300
    );
}

// ============================================================
// PWA INSTALL
// ============================================================

let deferredInstallPrompt =
    null;

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredInstallPrompt =
            event;

        const installButton =
            document.getElementById(
                "installAppBtn"
            );

        if (installButton) {

            installButton.style.display =
                "inline-flex";
        }
    }
);

function setupInstallButton() {

    const installButton =
        document.getElementById(
            "installAppBtn"
        );

    if (!installButton) {
        return;
    }

    if (
        installButton.dataset.flexHubInstallReady ===
        "true"
    ) {
        return;
    }

    installButton.dataset.flexHubInstallReady =
        "true";

    installButton.addEventListener(
        "click",
        async () => {

            if (!deferredInstallPrompt) {

                return;
            }

            deferredInstallPrompt.prompt();

            try {

                await deferredInstallPrompt.userChoice;

            } catch (error) {

                console.error(
                    "PWA install error:",
                    error
                );
            }

            deferredInstallPrompt =
                null;

            installButton.style.display =
                "none";
        }
    );
}

// ============================================================
// USER MESSAGE / NOTIFICATION CENTER
// ============================================================

(function setupNotificationCenter() {

    let notificationInitialized =
        false;

    // ------------------------------------------
    // Escape HTML
    // ------------------------------------------

    function notificationEscapeHTML(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    // ------------------------------------------
    // Notification styles
    // ------------------------------------------

    function addNotificationStyles() {

        if (
            document.getElementById(
                "flexNotificationStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "flexNotificationStyles";

        style.textContent = `
            #flexNotificationBell {
                position: fixed;
                right: 20px;
                bottom: 85px;
                width: 54px;
                height: 54px;
                border-radius: 50%;
                border: 1px solid
                    rgba(245,185,66,.35);
                cursor: pointer;
                z-index: 9998;
                font-size: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #111722;
                color: #ffffff;
                box-shadow:
                    0 8px 28px
                    rgba(0,0,0,.28);
                transition:
                    transform .2s ease,
                    box-shadow .2s ease;
            }

            #flexNotificationBell:hover {
                transform: translateY(-2px);
                box-shadow:
                    0 10px 32px
                    rgba(0,0,0,.35);
            }

            #flexNotificationBadge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 21px;
                height: 21px;
                padding: 0 5px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 800;
                display: none;
                align-items: center;
                justify-content: center;
                background: #e53935;
                color: #ffffff;
                border: 2px solid #111722;
            }

            #flexNotificationPanel {
                position: fixed;
                right: 20px;
                bottom: 150px;
                width: 360px;
                max-width:
                    calc(100vw - 30px);
                max-height: 70vh;
                overflow-y: auto;
                z-index: 9999;
                display: none;
                border-radius: 16px;
                padding: 18px;
                background: #111722;
                color: #ffffff;
                border: 1px solid
                    rgba(245,185,66,.18);
                box-shadow:
                    0 15px 50px
                    rgba(0,0,0,.42);
            }

            #flexNotificationPanel
            .flex-notification-open {
                display: block;
            }

            #flexNotificationPanel.flex-notification-open {
                display: block;
                animation:
                    flexNotificationOpen
                    .2s ease;
            }

            @keyframes flexNotificationOpen {
                from {
                    opacity: 0;
                    transform:
                        translateY(8px)
                        scale(.98);
                }

                to {
                    opacity: 1;
                    transform:
                        translateY(0)
                        scale(1);
                }
            }

            .flex-notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 14px;
            }

            .flex-notification-header h3 {
                margin: 0;
                font-size: 18px;
            }

            #flexNotificationClose {
                width: 34px;
                height: 34px;
                border: 0;
                border-radius: 50%;
                background:
                    rgba(255,255,255,.08);
                color: #ffffff;
                cursor: pointer;
                font-size: 21px;
                line-height: 1;
            }

            .flex-notification-item {
                padding: 14px;
                margin-bottom: 10px;
                border-radius: 12px;
                border: 1px solid
                    rgba(255,255,255,.09);
                background:
                    rgba(255,255,255,.035);
                cursor: pointer;
                transition:
                    background .2s ease,
                    border-color .2s ease;
            }

            .flex-notification-item:hover {
                background:
                    rgba(255,255,255,.07);
                border-color:
                    rgba(245,185,66,.25);
            }

            .flex-notification-item.unread {
                border-color:
                    rgba(245,185,66,.35);
                background:
                    rgba(245,185,66,.06);
            }

            .flex-notification-title {
                font-size: 15px;
                font-weight: 800;
                margin-bottom: 5px;
            }

            .flex-notification-message {
                font-size: 14px;
                line-height: 1.5;
                opacity: .9;
            }

            .flex-notification-time {
                margin-top: 8px;
                font-size: 11px;
                opacity: .55;
            }

            .flex-notification-empty {
                text-align: center;
                padding: 28px 10px;
                opacity: .65;
                line-height: 1.5;
            }

            .flex-notification-error {
                text-align: center;
                padding: 20px 10px;
                color: #ffb4b4;
                line-height: 1.5;
            }

            @media (max-width: 600px) {

                #flexNotificationBell {
                    right: 15px;
                    bottom: 75px;
                }

                #flexNotificationPanel {
                    right: 15px;
                    bottom: 138px;
                    width:
                        calc(100vw - 30px);
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }

    // ------------------------------------------
    // Create notification interface
    // ------------------------------------------

    function createNotificationUI() {

        if (
            document.getElementById(
                "flexNotificationBell"
            )
        ) {
            return;
        }

        addNotificationStyles();

        const bell =
            document.createElement(
                "button"
            );

        bell.id =
            "flexNotificationBell";

        bell.type =
            "button";

        bell.setAttribute(
            "aria-label",
            "Notifications"
        );

        bell.innerHTML = `
            🔔
            <span
                id="flexNotificationBadge"
            ></span>
        `;

        const panel =
            document.createElement(
                "div"
            );

        panel.id =
            "flexNotificationPanel";

        panel.innerHTML = `
            <div
                class="flex-notification-header"
            >

                <h3>
                    Messages
                </h3>

                <button
                    type="button"
                    id="flexNotificationClose"
                    aria-label="Close messages"
                >
                    ×
                </button>

            </div>

            <div
                id="flexNotificationList"
            >
                <div
                    class="flex-notification-empty"
                >
                    Loading messages...
                </div>
            </div>
        `;

        document.body.appendChild(
            bell
        );

        document.body.appendChild(
            panel
        );

        // ------------------------------------------
        // Open / close panel
        // ------------------------------------------

        bell.addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                panel.classList.toggle(
                    "flex-notification-open"
                );

                if (
                    panel.classList.contains(
                        "flex-notification-open"
                    )
                ) {

                    await loadUserNotifications();
                }
            }
        );

        document
            .getElementById(
                "flexNotificationClose"
            )
            ?.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    panel.classList.remove(
                        "flex-notification-open"
                    );
                }
            );

        // ------------------------------------------
        // Close when clicking outside
        // ------------------------------------------

        document.addEventListener(
            "click",
            event => {

                if (
                    !panel.contains(
                        event.target
                    ) &&
                    !bell.contains(
                        event.target
                    )
                ) {

                    panel.classList.remove(
                        "flex-notification-open"
                    );
                }
            }
        );
    }

    // ------------------------------------------
    // Load notifications
    // ------------------------------------------

    async function loadUserNotifications() {

        const list =
            document.getElementById(
                "flexNotificationList"
            );

        const badge =
            document.getElementById(
                "flexNotificationBadge"
            );

        if (!list) {
            return;
        }

        const token =
            getUserToken();

        if (!token) {

            list.innerHTML = `
                <div
                    class="flex-notification-empty"
                >
                    Please login to view messages.
                </div>
            `;

            if (badge) {
                badge.style.display =
                    "none";
            }

            return;
        }

        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/notifications`,
                    {
                        method: "GET",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
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

                // Normal account session expired.
                if (
                    response.status === 401
                ) {

                    clearUserSession();

                    showAccountGate();
                }

                throw new Error(
                    data.message ||
                    data.error ||
                    "Unable to load messages."
                );
            }

            const notifications =
                Array.isArray(
                    data.notifications
                )
                    ? data.notifications
                    : [];

            const unreadCount =
                Number(
                    data.unreadCount || 0
                );

            // --------------------------------------
            // Badge
            // --------------------------------------

            if (badge) {

                if (
                    unreadCount > 0
                ) {

                    badge.textContent =
                        unreadCount > 99
                            ? "99+"
                            : String(
                                unreadCount
                            );

                    badge.style.display =
                        "flex";

                } else {

                    badge.style.display =
                        "none";
                }
            }

            // --------------------------------------
            // Empty
            // --------------------------------------

            if (!notifications.length) {

                list.innerHTML = `
                    <div
                        class="flex-notification-empty"
                    >
                        No messages yet.
                    </div>
                `;

                return;
            }

            // --------------------------------------
            // Render
            // --------------------------------------

            list.innerHTML =
                notifications
                    .map(
                        item => {

                            const isUnread =
                                !(
                                    item.is_read ===
                                    true ||
                                    item.is_read ===
                                    1
                                );

                            let createdAt =
                                "";

                            if (
                                item.created_at
                            ) {

                                const date =
                                    new Date(
                                        item.created_at
                                    );

                                if (
                                    !Number.isNaN(
                                        date.getTime()
                                    )
                                ) {

                                    createdAt =
                                        date.toLocaleString();
                                }
                            }

                            return `
                                <div
                                    class="
                                        flex-notification-item
                                        ${
                                            isUnread
                                                ? "unread"
                                                : ""
                                        }
                                    "
                                    data-notification-id="${escapeHtml(
                                        item.id
                                    )}"
                                >

                                    <div
                                        class="
                                            flex-notification-title
                                        "
                                    >
                                        ${notificationEscapeHTML(
                                            item.title ||
                                            "FLEX HUB Message"
                                        )}
                                    </div>

                                    <div
                                        class="
                                            flex-notification-message
                                        "
                                    >
                                        ${notificationEscapeHTML(
                                            item.message ||
                                            ""
                                        )}
                                    </div>

                                    ${
                                        createdAt
                                            ? `
                                                <div
                                                    class="
                                                        flex-notification-time
                                                    "
                                                >
                                                    ${notificationEscapeHTML(
                                                        createdAt
                                                    )}
                                                </div>
                                              `
                                            : ""
                                    }

                                </div>
                            `;
                        }
                    )
                    .join("");

            // --------------------------------------
            // Mark notification as read
            // --------------------------------------

            list
                .querySelectorAll(
                    ".flex-notification-item"
                )
                .forEach(item => {

                    item.addEventListener(
                        "click",
                        async () => {

                            const id =
                                item.dataset
                                    .notificationId;

                            if (!id) {
                                return;
                            }

                            await markNotificationRead(
                                id
                            );

                            item.classList.remove(
                                "unread"
                            );

                            await loadUserNotifications();
                        }
                    );
                });

        } catch (error) {

            console.error(
                "Notification loading error:",
                error
            );

            list.innerHTML = `
                <div
                    class="flex-notification-error"
                >
                    ${notificationEscapeHTML(
                        error.message ||
                        "Unable to load messages."
                    )}
                </div>
            `;
        }
    }

    // ------------------------------------------
    // Mark notification as read
    // ------------------------------------------

    async function markNotificationRead(
        id
    ) {

        const token =
            getUserToken();

        if (!token || !id) {
            return;
        }

        try {

            await fetch(
                `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
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

    // ------------------------------------------
    // Start notification center
    // ------------------------------------------

    function startNotificationCenter() {

        const token =
            getUserToken();

        if (!token) {
            return;
        }

        if (
            !notificationInitialized
        ) {

            createNotificationUI();

            notificationInitialized =
                true;
        }

        // Load immediately.
        loadUserNotifications();

        // --------------------------------------
        // Refresh every 30 seconds
        // --------------------------------------
        // This allows admin messages to appear
        // without the user refreshing the page.
        // --------------------------------------

        if (!notificationTimer) {

            notificationTimer =
                setInterval(
                    () => {

                        if (
                            getUserToken()
                        ) {

                            loadUserNotifications();
                        }

                    },
                    30000
                );
        }
    }

    // Expose only the function needed by
    // the main application.
    window.startFlexHubNotifications =
        startNotificationCenter;

})();

// ============================================================
// CONNECT NOTIFICATION STARTUP
// ============================================================

function startNotificationCenter() {

    if (
        typeof window
            .startFlexHubNotifications ===
        "function"
    ) {

        window.startFlexHubNotifications();
    }
}

// ============================================================
// FINAL STARTUP SAFETY
// ============================================================

if (
    document.readyState !==
    "loading"
) {

    scheduleTeamBadgeLoad();

} else {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            scheduleTeamBadgeLoad();

        }
    );
}

// ============================================================
// END OF FLEX HUB PREDICTIONS APP.JS
// ============================================================
