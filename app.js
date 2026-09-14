```javascript
/* =========================================================
   FLEX HUB PREDICTIONS
   COMPLETE APP.JS
   =========================================================

   FEATURES
   ---------------------------------------------------------
   • Login
   • Registration
   • Session verification
   • Logout
   • Regular predictions
   • Search
   • League filters
   • Results
   • Regular betting codes
   • VIP page
   • VIP access codes
   • VIP predictions
   • VIP betting codes
   • Forgot password
   • Team badges
   • WhatsApp links
   • PWA installation
   • Notifications
   • Mobile navigation

   VVIP IS NOT INCLUDED.
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const API_BASE_URL =
    "https://flex-hub-prediction.onrender.com/api";

const STORAGE_KEYS = {
    USER: "flexHubUser",
    USER_TOKEN: "flexHubUserToken",
    VIP_TOKEN: "flexHubVipToken",
    REMEMBER_ME: "flexHubRememberMe"
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;

let allPredictions = [];
let allResults = [];

let currentSearchTerm = "";
let currentLeagueFilter = "all";
let currentResultFilter = "all";

let notificationPollingTimer = null;

let deferredInstallPrompt = null;

window.vipPredictionCount = 0;
window.vipAccessActive = false;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("FLEX HUB PREDICTIONS app.js loaded.");

    try {

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
        setupForgotPassword();
        setupNotificationCenter();

        const isVipPage =
            document.body.classList.contains("vip-page") ||
            document.getElementById("vipAccessForm") ||
            document.getElementById("vipPredictionsGrid");

        if (isVipPage) {

            await setupVipPage();

            return;
        }

        await checkUserSession();

    } catch (error) {

        console.error(
            "FLEX HUB initialization error:",
            error
        );

    }

});


/* =========================================================
   STORAGE
   ========================================================= */

function getStoredUser() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEYS.USER
            );

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "Unable to read stored user:",
            error
        );

        return null;
    }
}


function getUserToken() {

    return (
        localStorage.getItem(
            STORAGE_KEYS.USER_TOKEN
        ) || ""
    );

}


function getVipToken() {

    return (
        localStorage.getItem(
            STORAGE_KEYS.VIP_TOKEN
        ) || ""
    );

}


function saveUser(user, token) {

    currentUser = user || null;

    if (user) {

        localStorage.setItem(
            STORAGE_KEYS.USER,
            JSON.stringify(user)
        );

    }

    if (token) {

        localStorage.setItem(
            STORAGE_KEYS.USER_TOKEN,
            token
        );

    }

}


function clearUserSession() {

    currentUser = null;

    localStorage.removeItem(
        STORAGE_KEYS.USER
    );

    localStorage.removeItem(
        STORAGE_KEYS.USER_TOKEN
    );

    localStorage.removeItem(
        STORAGE_KEYS.VIP_TOKEN
    );

    window.vipAccessActive = false;

}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token =
        getUserToken();

    if (
        token &&
        !headers.Authorization &&
        !options.skipAuth
    ) {

        headers.Authorization =
            `Bearer ${token}`;

    }

    const requestOptions = {

        method:
            options.method || "GET",

        headers

    };

    if (
        options.body !== undefined
    ) {

        requestOptions.body =
            options.body;

    }

    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            requestOptions
        );

    let data = null;

    try {

        data =
            await response.json();

    } catch {

        data = null;

    }

    if (!response.ok) {

        const error =
            new Error(
                data?.message ||
                data?.error ||
                `Request failed with status ${response.status}`
            );

        error.status =
            response.status;

        error.data =
            data;

        throw error;

    }

    return data;

}


/* =========================================================
   ACCOUNT FORMS
   ========================================================= */

function setupAccountForms() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );

    const registerForm =
        document.getElementById(
            "registerForm"
        );

    const showRegisterButton =
        document.getElementById(
            "showRegisterButton"
        );

    const showLoginButton =
        document.getElementById(
            "showLoginButton"
        );


    if (
        loginForm &&
        !loginForm.dataset.initialized
    ) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

        loginForm.dataset.initialized =
            "true";

    }


    if (
        registerForm &&
        !registerForm.dataset.initialized
    ) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );

        registerForm.dataset.initialized =
            "true";

    }


    if (
        showRegisterButton &&
        !showRegisterButton.dataset.initialized
    ) {

        showRegisterButton.addEventListener(
            "click",
            showRegisterPanel
        );

        showRegisterButton.dataset.initialized =
            "true";

    }


    if (
        showLoginButton &&
        !showLoginButton.dataset.initialized
    ) {

        showLoginButton.addEventListener(
            "click",
            showLoginPanel
        );

        showLoginButton.dataset.initialized =
            "true";

    }

}


/* =========================================================
   LOGIN / REGISTER PANEL
   ========================================================= */

function showLoginPanel() {

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );

    const registerPanel =
        document.getElementById(
            "registerPanel"
        );

    if (loginPanel) {
        loginPanel.style.display =
            "block";
    }

    if (registerPanel) {
        registerPanel.style.display =
            "none";
    }

}


function showRegisterPanel() {

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );

    const registerPanel =
        document.getElementById(
            "registerPanel"
        );

    if (loginPanel) {
        loginPanel.style.display =
            "none";
    }

    if (registerPanel) {
        registerPanel.style.display =
            "block";
    }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const identifier =
        document
            .getElementById(
                "loginIdentifier"
            )
            ?.value
            .trim() || "";

    const password =
        document
            .getElementById(
                "loginPassword"
            )
            ?.value || "";

    const rememberMe =
        document
            .getElementById(
                "rememberMe"
            )
            ?.checked || false;

    const message =
        document.getElementById(
            "loginMessage"
        );

    const button =
        form.querySelector(
            'button[type="submit"]'
        );


    if (!identifier || !password) {

        showElementMessage(
            message,
            "Please enter your username/email and password.",
            "error"
        );

        return;
    }


    setButtonLoading(
        button,
        true,
        "Signing in..."
    );


    try {

        const data =
            await apiRequest(
                "/login",
                {
                    method: "POST",
                    skipAuth: true,
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
                "The server did not return a valid login session."
            );

        }


        saveUser(
            data.user,
            data.token
        );


        if (rememberMe) {

            localStorage.setItem(
                STORAGE_KEYS.REMEMBER_ME,
                "true"
            );

        } else {

            localStorage.removeItem(
                STORAGE_KEYS.REMEMBER_ME
            );

        }


        const valid =
            await verifyCurrentUserSession();


        if (!valid) {

            throw new Error(
                "Login succeeded, but the session could not be verified."
            );

        }


        showElementMessage(
            message,
            "Login successful.",
            "success"
        );


        showFlexHubAnimation(
            "Login successful"
        );


        setTimeout(
            () => {
                openMainWebsite();
            },
            1000
        );


    } catch (error) {

        console.error(
            "Login failed:",
            error
        );

        clearUserSession();

        showElementMessage(
            message,
            error.message ||
            "Login failed. Please try again.",
            "error"
        );


    } finally {

        setButtonLoading(
            button,
            false
        );

    }

}


/* =========================================================
   REGISTER
   ========================================================= */

async function handleRegister(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const name =
        getFormValue(
            "registerName"
        );

    const username =
        getFormValue(
            "registerUsername"
        );

    const email =
        getFormValue(
            "registerEmail"
        );

    const password =
        document.getElementById(
            "registerPassword"
        )?.value || "";

    const confirmPassword =
        document.getElementById(
            "registerConfirmPassword"
        )?.value || "";

    const terms =
        document.getElementById(
            "registerTerms"
        )?.checked || false;

    const message =
        document.getElementById(
            "registerMessage"
        );

    const button =
        form.querySelector(
            'button[type="submit"]'
        );


    if (
        !name ||
        !username ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        showElementMessage(
            message,
            "Please complete all required fields.",
            "error"
        );

        return;
    }


    if (
        password !== confirmPassword
    ) {

        showElementMessage(
            message,
            "Passwords do not match.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showElementMessage(
            message,
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    if (!terms) {

        showElementMessage(
            message,
            "Please accept the terms before creating your account.",
            "error"
        );

        return;
    }


    setButtonLoading(
        button,
        true,
        "Creating account..."
    );


    try {

        const data =
            await apiRequest(
                "/register",
                {
                    method: "POST",
                    skipAuth: true,
                    body: JSON.stringify({
                        name,
                        username,
                        email,
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
                "Account created, but no valid session was returned."
            );

        }


        saveUser(
            data.user,
            data.token
        );


        const valid =
            await verifyCurrentUserSession();


        if (!valid) {

            throw new Error(
                "Account created, but the session could not be verified."
            );

        }


        showElementMessage(
            message,
            "Account created successfully.",
            "success"
        );


        showFlexHubAnimation(
            "Account created successfully"
        );


        setTimeout(
            () => {
                openMainWebsite();
            },
            1000
        );


    } catch (error) {

        console.error(
            "Registration failed:",
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


/* =========================================================
   SESSION CHECK
   ========================================================= */

async function checkUserSession() {

    const accountGate =
        document.getElementById(
            "accountGate"
        );

    const mainWebsite =
        document.getElementById(
            "mainWebsite"
        );

    const token =
        getUserToken();


    if (!token) {

        if (accountGate) {
            accountGate.style.display =
                "";
        }

        if (mainWebsite) {
            mainWebsite.style.display =
                "none";
        }

        return false;
    }


    try {

        const valid =
            await verifyCurrentUserSession();


        if (!valid) {

            if (accountGate) {
                accountGate.style.display =
                    "";
            }

            if (mainWebsite) {
                mainWebsite.style.display =
                    "none";
            }

            return false;
        }


        updateUserUI();

        openMainWebsite();

        return true;


    } catch (error) {

        console.error(
            "Session check failed:",
            error
        );

        clearUserSession();

        if (accountGate) {
            accountGate.style.display =
                "";
        }

        if (mainWebsite) {
            mainWebsite.style.display =
                "none";
        }

        return false;

    }

}


/* =========================================================
   VERIFY USER
   ========================================================= */

async function verifyCurrentUserSession() {

    const token =
        getUserToken();

    if (!token) {
        return false;
    }


    try {

        const data =
            await apiRequest(
                "/user/me",
                {
                    method: "GET"
                }
            );


        if (
            !data ||
            !data.user
        ) {

            return false;

        }


        saveUser(
            data.user,
            token
        );

        return true;


    } catch (error) {

        console.error(
            "Session verification failed:",
            error
        );


        if (
            error.status === 401 ||
            error.status === 403
        ) {

            clearUserSession();

        }


        return false;

    }

}


/* =========================================================
   OPEN MAIN WEBSITE
   ========================================================= */

function openMainWebsite() {

    const accountGate =
        document.getElementById(
            "accountGate"
        );

    const mainWebsite =
        document.getElementById(
            "mainWebsite"
        );


    if (accountGate) {

        accountGate.style.display =
            "none";

    }


    if (mainWebsite) {

        mainWebsite.style.display =
            "block";

    }


    updateUserUI();

    closeMobileMenu();


    // Load site data.
    loadPredictions();
    loadRegularBettingCodes();
    loadResults();
    refreshRegularAccessStatus();
    loadNotifications();

}


/* =========================================================
   UPDATE USER UI
   ========================================================= */

function updateUserUI() {

    const userName =
        document.getElementById(
            "userName"
        );


    if (!userName) {
        return;
    }


    if (!currentUser) {

        userName.textContent =
            "User";

        return;
    }


    userName.textContent =
        currentUser.name ||
        currentUser.username ||
        currentUser.email ||
        "User";

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const links =
        document.querySelectorAll(
            "#mainNav a[href]"
        );


    links.forEach((link) => {

        if (link.dataset.initialized) {
            return;
        }


        link.addEventListener(
            "click",
            () => {
                closeMobileMenu();
            }
        );


        link.dataset.initialized =
            "true";

    });

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const button =
        document.getElementById(
            "menuButton"
        );

    const nav =
        document.getElementById(
            "mainNav"
        );


    if (
        !button ||
        !nav ||
        button.dataset.initialized
    ) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            const open =
                nav.classList.toggle(
                    "open"
                );

            button.setAttribute(
                "aria-expanded",
                String(open)
            );

        }
    );


    button.dataset.initialized =
        "true";

}


function closeMobileMenu() {

    const nav =
        document.getElementById(
            "mainNav"
        );

    const button =
        document.getElementById(
            "menuButton"
        );


    if (nav) {

        nav.classList.remove(
            "open"
        );

    }


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );

    }

}


/* =========================================================
   SIGN OUT
   ========================================================= */

function setupSignOut() {

    const button =
        document.getElementById(
            "signOutButton"
        );


    if (
        !button ||
        button.dataset.initialized
    ) {
        return;
    }


    button.addEventListener(
        "click",
        handleSignOut
    );


    button.dataset.initialized =
        "true";

}


async function handleSignOut(event) {

    if (event) {
        event.preventDefault();
    }


    try {

        if (getUserToken()) {

            await apiRequest(
                "/logout",
                {
                    method: "POST"
                }
            );

        }

    } catch (error) {

        console.warn(
            "Server logout failed:",
            error.message
        );

    }


    clearUserSession();


    const mainWebsite =
        document.getElementById(
            "mainWebsite"
        );

    const accountGate =
        document.getElementById(
            "accountGate"
        );


    if (mainWebsite) {
        mainWebsite.style.display =
            "none";
    }


    if (accountGate) {
        accountGate.style.display =
            "";
    }


    showLoginPanel();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const input =
        document.getElementById(
            "predictionSearch"
        ) ||
        document.getElementById(
            "searchInput"
        );


    if (
        !input ||
        input.dataset.initialized
    ) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            currentSearchTerm =
                input.value
                    .trim()
                    .toLowerCase();

            renderPredictions();

        }
    );


    input.dataset.initialized =
        "true";

}


/* =========================================================
   LEAGUE FILTER
   ========================================================= */

function setupLeagueFilters() {

    const buttons =
        document.querySelectorAll(
            "[data-league-filter]"
        );


    buttons.forEach((button) => {

        if (button.dataset.initialized) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                currentLeagueFilter =
                    (
                        button.dataset.leagueFilter ||
                        "all"
                    )
                    .toLowerCase();


                buttons.forEach(
                    (item) => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );


                button.classList.add(
                    "active"
                );


                renderPredictions();

            }
        );


        button.dataset.initialized =
            "true";

    });

}


/* =========================================================
   RESULT FILTER
   ========================================================= */

function setupResultFilters() {

    const buttons =
        document.querySelectorAll(
            "[data-result-filter]"
        );


    buttons.forEach((button) => {

        if (button.dataset.initialized) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                currentResultFilter =
                    (
                        button.dataset.resultFilter ||
                        "all"
                    )
                    .toLowerCase();


                buttons.forEach(
                    (item) => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );


                button.classList.add(
                    "active"
                );


                renderResults();

            }
        );


        button.dataset.initialized =
            "true";

    });

}


/* =========================================================
   LOAD PREDICTIONS
   ========================================================= */

async function loadPredictions() {

    const grid =
        document.getElementById(
            "predictionsGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `
        <div class="loading-state">
            <span>Loading predictions...</span>
        </div>
    `;


    try {

        const data =
            await apiRequest(
                "/predictions",
                {
                    method: "GET"
                }
            );


        if (Array.isArray(data)) {

            allPredictions =
                data;

        } else if (
            Array.isArray(
                data?.predictions
            )
        ) {

            allPredictions =
                data.predictions;

        } else {

            allPredictions = [];

        }


        renderPredictions();

        updatePredictionStats();


    } catch (error) {

        console.error(
            "Unable to load predictions:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <h3>Predictions unavailable</h3>
                <p>
                    We could not load the latest predictions.
                    Please refresh the page and try again.
                </p>
            </div>
        `;

    }

}


/* =========================================================
   RENDER PREDICTIONS
   ========================================================= */

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


    if (currentSearchTerm) {

        predictions =
            predictions.filter(
                (prediction) => {

                    const searchable =
                        [
                            prediction.homeTeam,
                            prediction.awayTeam,
                            prediction.home_team,
                            prediction.away_team,
                            prediction.league,
                            prediction.leagueName,
                            prediction.prediction,
                            prediction.tip,
                            prediction.pick,
                            prediction.type
                        ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return searchable.includes(
                        currentSearchTerm
                    );

                }
            );

    }


    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {

        predictions =
            predictions.filter(
                (prediction) => {

                    const league =
                        String(
                            prediction.league ||
                            prediction.leagueName ||
                            ""
                        )
                        .toLowerCase();


                    return (
                        league ===
                        currentLeagueFilter
                    );

                }
            );

    }


    // Home page can request featured predictions.
    if (
        grid.dataset.homeFeaturedOnly ===
        "true"
    ) {

        const featured =
            predictions.filter(
                (prediction) =>
                    prediction.featured === true ||
                    prediction.isFeatured === true
            );


        if (featured.length > 0) {
            predictions = featured;
        }

    }


    if (predictions.length === 0) {

        grid.innerHTML = `
            <div class="empty-state">
                <h3>No predictions found</h3>
                <p>
                    There are no predictions matching
                    your current search or filter.
                </p>
            </div>
        `;

        return;
    }


    grid.innerHTML =
        predictions
            .map(
                createPredictionCard
            )
            .join("");


    loadTeamBadges();

}


/* =========================================================
   PREDICTION CARD
   ========================================================= */

function createPredictionCard(
    prediction
) {

    const homeTeam =
        prediction.homeTeam ||
        prediction.home_team ||
        "Home Team";


    const awayTeam =
        prediction.awayTeam ||
        prediction.away_team ||
        "Away Team";


    const league =
        prediction.league ||
        prediction.leagueName ||
        "Football";


    const predictionText =
        prediction.prediction ||
        prediction.tip ||
        prediction.pick ||
        "Prediction unavailable";


    const odds =
        prediction.odds ||
        prediction.expectedOdds ||
        "";


    const type =
        prediction.type ||
        prediction.category ||
        "Match";


    const matchDate =
        prediction.matchDate ||
        prediction.match_date ||
        prediction.date ||
        "";


    const status =
        prediction.status ||
        "pending";


    return `
        <article
            class="prediction-card"
            data-league="${escapeHtml(league)}"
        >

            <div class="prediction-card-top">

                <span class="prediction-league">
                    ${escapeHtml(league)}
                </span>

                <span class="prediction-type">
                    ${escapeHtml(type)}
                </span>

            </div>


            <div class="prediction-teams">

                <div class="prediction-team">

                    <span
                        class="team-badge"
                        data-team-name="${escapeHtml(homeTeam)}"
                    >
                        ${escapeHtml(
                            getTeamInitials(homeTeam)
                        )}
                    </span>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>


                <div class="prediction-vs">
                    VS
                </div>


                <div class="prediction-team">

                    <span
                        class="team-badge"
                        data-team-name="${escapeHtml(awayTeam)}"
                    >
                        ${escapeHtml(
                            getTeamInitials(awayTeam)
                        )}
                    </span>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>


            <div class="prediction-main">

                <div class="prediction-pick">

                    <span>
                        Prediction
                    </span>

                    <strong>
                        ${escapeHtml(
                            predictionText
                        )}
                    </strong>

                </div>


                ${
                    odds
                        ? `
                            <div class="prediction-odds">

                                <span>
                                    Odds
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        String(odds)
                                    )}
                                </strong>

                            </div>
                        `
                        : ""
                }

            </div>


            ${
                matchDate
                    ? `
                        <div class="prediction-date">
                            ${formatMatchDate(
                                matchDate
                            )}
                        </div>
                    `
                    : ""
            }


            <div class="prediction-card-bottom">

                <span
                    class="prediction-status status-${escapeHtml(
                        String(status).toLowerCase()
                    )}"
                >
                    ${formatStatus(status)}
                </span>

                <span class="prediction-countdown">
                    ${getMatchCountdown(
                        matchDate
                    )}
                </span>

            </div>

        </article>
    `;

}


/* =========================================================
   TEAM INITIALS
   ========================================================= */

function getTeamInitials(
    teamName
) {

    if (!teamName) {
        return "FC";
    }


    const words =
        String(teamName)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();

}


/* =========================================================
   MATCH COUNTDOWN
   ========================================================= */

function getMatchCountdown(
    matchDate
) {

    if (!matchDate) {
        return "";
    }


    const timestamp =
        new Date(matchDate)
            .getTime();


    if (Number.isNaN(timestamp)) {
        return "";
    }


    const difference =
        timestamp -
        Date.now();


    if (difference <= 0) {
        return "Started";
    }


    const minutes =
        Math.floor(
            difference /
            (1000 * 60)
        );


    const days =
        Math.floor(
            minutes / 1440
        );


    const hours =
        Math.floor(
            (minutes % 1440) / 60
        );


    const remainingMinutes =
        minutes % 60;


    if (days > 0) {

        return `${days}d ${hours}h`;

    }


    if (hours > 0) {

        return `${hours}h ${remainingMinutes}m`;

    }


    return `${remainingMinutes}m`;

}


/* =========================================================
   LOAD RESULTS
   ========================================================= */

async function loadResults() {

    try {

        const data =
            await apiRequest(
                "/results",
                {
                    method: "GET"
                }
            );


        if (Array.isArray(data)) {

            allResults =
                data;

        } else if (
            Array.isArray(
                data?.results
            )
        ) {

            allResults =
                data.results;

        } else {

            allResults = [];

        }


        renderResults();

        updatePredictionStats();


    } catch (error) {

        console.error(
            "Unable to load results:",
            error
        );

        allResults = [];

        renderResults();

    }

}


/* =========================================================
   RENDER RESULTS
   ========================================================= */

function renderResults() {

    const containers = [

        document.getElementById(
            "resultsGrid"
        ),

        document.getElementById(
            "recentResultsGrid"
        ),

        document.getElementById(
            "resultsContainer"
        )

    ].filter(Boolean);


    if (!containers.length) {
        return;
    }


    let results =
        [...allResults];


    if (
        currentResultFilter &&
        currentResultFilter !== "all"
    ) {

        results =
            results.filter(
                (result) => {

                    const status =
                        String(
                            result.status ||
                            result.result ||
                            ""
                        )
                        .toLowerCase();


                    return (
                        status ===
                        currentResultFilter
                    );

                }
            );

    }


    containers.forEach(
        (container) => {

            if (!results.length) {

                container.innerHTML = `
                    <div class="empty-state">
                        <h3>No results available</h3>
                        <p>
                            Match results will appear here
                            once they are published.
                        </p>
                    </div>
                `;

                return;
            }


            container.innerHTML =
                results
                    .map(
                        createResultCard
                    )
                    .join("");

        }
    );

}


/* =========================================================
   RESULT CARD
   ========================================================= */

function createResultCard(
    result
) {

    const homeTeam =
        result.homeTeam ||
        result.home_team ||
        "Home Team";


    const awayTeam =
        result.awayTeam ||
        result.away_team ||
        "Away Team";


    const homeScore =
        result.homeScore ??
        result.home_score ??
        "-";


    const awayScore =
        result.awayScore ??
        result.away_score ??
        "-";


    const league =
        result.league ||
        result.leagueName ||
        "Football";


    const status =
        result.status ||
        result.result ||
        "pending";


    return `
        <article class="result-card">

            <div class="result-card-top">

                <span>
                    ${escapeHtml(league)}
                </span>

                <span
                    class="result-status status-${escapeHtml(
                        String(status).toLowerCase()
                    )}"
                >
                    ${formatStatus(status)}
                </span>

            </div>


            <div class="result-teams">

                <div class="result-team">

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                    <span>
                        ${escapeHtml(
                            String(homeScore)
                        )}
                    </span>

                </div>


                <div class="result-divider">
                    -
                </div>


                <div class="result-team">

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                    <span>
                        ${escapeHtml(
                            String(awayScore)
                        )}
                    </span>

                </div>

            </div>

        </article>
    `;

}


/* =========================================================
   STATISTICS
   ========================================================= */

function updatePredictionStats() {

    document
        .querySelectorAll(
            "[data-prediction-count]"
        )
        .forEach(
            (element) => {

                element.textContent =
                    allPredictions.length;

            }
        );


    document
        .querySelectorAll(
            "[data-result-count]"
        )
        .forEach(
            (element) => {

                element.textContent =
                    allResults.length;

            }
        );


    updateVipPredictionCount();

}


/* =========================================================
   REGULAR PAYMENT
   ========================================================= */

function setupRegularPaymentGate() {

    const button =
        document.getElementById(
            "paymentButton"
        );


    if (
        !button ||
        button.dataset.initialized
    ) {
        return;
    }


    button.addEventListener(
        "click",
        initializeRegularPayment
    );


    button.dataset.initialized =
        "true";

}


async function initializeRegularPayment() {

    const button =
        document.getElementById(
            "paymentButton"
        );


    setButtonLoading(
        button,
        true,
        "Connecting..."
    );


    try {

        const data =
            await apiRequest(
                "/payments/initialize",
                {
                    method: "POST",
                    body: JSON.stringify({
                        amount: 50
                    })
                }
            );


        const paymentUrl =
            data?.authorization_url ||
            data?.url;


        if (!paymentUrl) {

            throw new Error(
                "Payment link was not returned by the server."
            );

        }


        window.location.href =
            paymentUrl;


    } catch (error) {

        console.error(
            "Payment initialization failed:",
            error
        );

        alert(
            error.message ||
            "Unable to initialize payment."
        );


    } finally {

        setButtonLoading(
            button,
            false
        );

    }

}


/* =========================================================
   REGULAR ACCESS
   ========================================================= */

async function refreshRegularAccessStatus() {

    if (!getUserToken()) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/user/access",
                {
                    method: "GET"
                }
            );


        updateRegularAccessUI(
            data
        );


    } catch (error) {

        console.warn(
            "Unable to load regular access status:",
            error.message
        );

    }

}


function updateRegularAccessUI(
    data
) {

    if (!data) {
        return;
    }


    document
        .querySelectorAll(
            "[data-access-status]"
        )
        .forEach(
            (element) => {

                element.textContent =
                    data.active
                        ? "Active"
                        : "Inactive";

            }
        );

}


/* =========================================================
   REGULAR BETTING CODES
   ========================================================= */

async function loadRegularBettingCodes() {

    const container =
        document.getElementById(
            "bettingCodesGrid"
        ) ||
        document.getElementById(
            "bettingCodesContainer"
        ) ||
        document.getElementById(
            "regularBettingCodes"
        );


    if (!container) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/betting-codes",
                {
                    method: "GET"
                }
            );


        let codes = [];


        if (Array.isArray(data)) {

            codes = data;

        } else if (
            Array.isArray(
                data?.codes
            )
        ) {

            codes =
                data.codes;

        }


        if (!codes.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <h3>No betting codes yet</h3>
                    <p>
                        New betting codes will appear here.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            codes
                .map(
                    createBettingCodeCard
                )
                .join("");


    } catch (error) {

        console.error(
            "Unable to load betting codes:",
            error
        );


        container.innerHTML = `
            <div class="empty-state">
                <h3>Betting codes unavailable</h3>
                <p>
                    Please try again later.
                </p>
            </div>
        `;

    }

}


function createBettingCodeCard(
    item
) {

    const code =
        item.code ||
        item.bettingCode ||
        item.bookingCode ||
        "";


    const title =
        item.title ||
        item.name ||
        "Betting Code";


    const description =
        item.description ||
        item.note ||
        "";


    const odds =
        item.odds ||
        item.totalOdds ||
        "";


    return `
        <div class="betting-code-card">

            <div class="betting-code-content">

                <h3>
                    ${escapeHtml(title)}
                </h3>

                ${
                    description
                        ? `
                            <p>
                                ${escapeHtml(
                                    description
                                )}
                            </p>
                        `
                        : ""
                }

                ${
                    odds
                        ? `
                            <span>
                                Odds:
                                <strong>
                                    ${escapeHtml(
                                        String(odds)
                                    )}
                                </strong>
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="betting-code-action">

                <code>
                    ${escapeHtml(code)}
                </code>

                <button
                    type="button"
                    class="copy-code-button"
                    onclick="copyBettingCode('${escapeJs(
                        code
                    )}')"
                >
                    Copy
                </button>

            </div>

        </div>
    `;

}


async function copyBettingCode(
    code
) {

    if (!code) {
        return;
    }


    try {

        await navigator.clipboard.writeText(
            code
        );


        showTemporaryToast(
            "Betting code copied."
        );


    } catch (error) {

        console.error(
            "Unable to copy betting code:",
            error
        );

        alert(
            `Betting code: ${code}`
        );

    }

}


/* =========================================================
   VIP SETUP
   ========================================================= */

async function setupVipPage() {

    setupVipAccessForm();
    setupVipLogout();

    setupWhatsAppLinks();
    setupFooterYear();

    const verified =
        await verifyUserForVipPage();


    if (!verified) {
        return;
    }


    await checkVipStatus();


    if (window.vipAccessActive) {

        await loadVipPredictions();
        await loadVipBettingCodes();

    }

}


/* =========================================================
   VERIFY VIP USER
   ========================================================= */

async function verifyUserForVipPage() {

    if (!getUserToken()) {

        showVipMessage(
            "Please log in before accessing VIP.",
            "error"
        );


        setTimeout(
            () => {
                window.location.href =
                    "index.html";
            },
            1500
        );


        return false;
    }


    const valid =
        await verifyCurrentUserSession();


    if (!valid) {

        showVipMessage(
            "Your session has expired. Please log in again.",
            "error"
        );


        setTimeout(
            () => {
                window.location.href =
                    "index.html";
            },
            1500
        );


        return false;
    }


    updateUserUI();

    return true;

}


/* =========================================================
   VIP ACCESS FORM
   ========================================================= */

function setupVipAccessForm() {

    const form =
        document.getElementById(
            "vipAccessForm"
        );


    if (
        !form ||
        form.dataset.initialized
    ) {
        return;
    }


    form.addEventListener(
        "submit",
        handleVipAccess
    );


    form.dataset.initialized =
        "true";

}


async function handleVipAccess(
    event
) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const input =
        document.getElementById(
            "vipAccessCode"
        ) ||
        document.getElementById(
            "accessCode"
        );


    const message =
        document.getElementById(
            "vipAccessMessage"
        ) ||
        document.getElementById(
            "vipMessage"
        );


    const code =
        input?.value
            .trim() || "";


    const button =
        form.querySelector(
            'button[type="submit"]'
        );


    if (!code) {

        showElementMessage(
            message,
            "Please enter your VIP access code.",
            "error"
        );

        return;
    }


    setButtonLoading(
        button,
        true,
        "Activating..."
    );


    try {

        const data =
            await apiRequest(
                "/vip/access",
                {
                    method: "POST",
                    body: JSON.stringify({
                        code
                    })
                }
            );


        if (data?.token) {

            localStorage.setItem(
                STORAGE_KEYS.VIP_TOKEN,
                data.token
            );

        }


        showElementMessage(
            message,
            data?.message ||
            "VIP access activated successfully.",
            "success"
        );


        if (input) {
            input.value = "";
        }


        await checkVipStatus();

        await loadVipPredictions();

        await loadVipBettingCodes();


    } catch (error) {

        console.error(
            "VIP activation failed:",
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


/* =========================================================
   VIP STATUS
   ========================================================= */

async function checkVipStatus() {

    try {

        const data =
            await apiRequest(
                "/vip/status",
                {
                    method: "GET"
                }
            );


        updateVipStatusUI(
            data
        );


        return data;


    } catch (error) {

        console.error(
            "Unable to check VIP status:",
            error
        );


        updateVipStatusUI({
            active: false
        });


        return null;

    }

}


function updateVipStatusUI(
    data
) {

    const active =
        Boolean(
            data?.active ||
            data?.hasAccess ||
            data?.isActive
        );


    window.vipAccessActive =
        active;


    document
        .querySelectorAll(
            "[data-vip-status]"
        )
        .forEach(
            (element) => {

                element.textContent =
                    active
                        ? "ACTIVE"
                        : "INACTIVE";

                element.classList.toggle(
                    "active",
                    active
                );

                element.classList.toggle(
                    "inactive",
                    !active
                );

            }
        );


    const plan =
        data?.plan ||
        data?.planName ||
        data?.duration ||
        "";


    const expiry =
        data?.expiresAt ||
        data?.expires_at ||
        data?.expiryDate ||
        data?.expiry ||
        "";


    document
        .querySelectorAll(
            "[data-vip-plan]"
        )
        .forEach(
            (element) => {

                element.textContent =
                    plan
                        ? formatPlan(plan)
                        : active
                            ? "VIP"
                            : "No active plan";

            }
        );


    document
        .querySelectorAll(
            "[data-vip-expiry]"
        )
        .forEach(
            (element) => {

                element.textContent =
                    expiry
                        ? formatExpiry(expiry)
                        : "—";

            }
        );


    const vipContent =
        document.getElementById(
            "vipContent"
        );


    const vipLocked =
        document.getElementById(
            "vipLocked"
        );


    if (vipContent) {

        vipContent.style.display =
            active
                ? ""
                : "none";

    }


    if (vipLocked) {

        vipLocked.style.display =
            active
                ? "none"
                : "";

    }

}


/* =========================================================
   LOAD VIP PREDICTIONS
   ========================================================= */

async function loadVipPredictions() {

    const grid =
        document.getElementById(
            "vipPredictionsGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `
        <div class="loading-state">
            <span>
                Loading VIP predictions...
            </span>
        </div>
    `;


    try {

        const vipToken =
            getVipToken();


        const headers = {};


        if (vipToken) {

            headers.Authorization =
                `Bearer ${vipToken}`;

        }


        const data =
            await apiRequest(
                "/vip/predictions",
                {
                    method: "GET",
                    headers
                }
            );


        let predictions = [];


        if (Array.isArray(data)) {

            predictions =
                data;

        } else if (
            Array.isArray(
                data?.predictions
            )
        ) {

            predictions =
                data.predictions;

        }


        window.vipPredictionCount =
            predictions.length;


        updateVipPredictionCount();


        if (!predictions.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <h3>
                        No VIP predictions yet
                    </h3>

                    <p>
                        New VIP predictions will appear here.
                    </p>
                </div>
            `;

            return;
        }


        grid.innerHTML =
            predictions
                .map(
                    createVipPredictionCard
                )
                .join("");


        loadTeamBadges();


    } catch (error) {

        console.error(
            "Unable to load VIP predictions:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <h3>
                    VIP predictions unavailable
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Please activate VIP access and try again."
                    )}
                </p>
            </div>
        `;

    }

}


/* =========================================================
   VIP PREDICTION CARD
   ========================================================= */

function createVipPredictionCard(
    prediction
) {

    const homeTeam =
        prediction.homeTeam ||
        prediction.home_team ||
        "Home Team";


    const awayTeam =
        prediction.awayTeam ||
        prediction.away_team ||
        "Away Team";


    const league =
        prediction.league ||
        prediction.leagueName ||
        "Football";


    const predictionText =
        prediction.prediction ||
        prediction.tip ||
        prediction.pick ||
        "Prediction unavailable";


    const odds =
        prediction.odds ||
        prediction.expectedOdds ||
        "";


    const confidence =
        prediction.confidence ||
        prediction.rating ||
        "";


    const matchDate =
        prediction.matchDate ||
        prediction.match_date ||
        prediction.date ||
        "";


    return `
        <article class="prediction-card vip-prediction-card">

            <div class="prediction-card-top">

                <span class="prediction-league">
                    ${escapeHtml(league)}
                </span>

                <span class="prediction-type vip-label">
                    VIP
                </span>

            </div>


            <div class="prediction-teams">

                <div class="prediction-team">

                    <span
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            homeTeam
                        )}"
                    >
                        ${escapeHtml(
                            getTeamInitials(
                                homeTeam
                            )
                        )}
                    </span>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>


                <div class="prediction-vs">
                    VS
                </div>


                <div class="prediction-team">

                    <span
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            awayTeam
                        )}"
                    >
                        ${escapeHtml(
                            getTeamInitials(
                                awayTeam
                            )
                        )}
                    </span>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>


            <div class="prediction-main">

                <div class="prediction-pick">

                    <span>
                        VIP Prediction
                    </span>

                    <strong>
                        ${escapeHtml(
                            predictionText
                        )}
                    </strong>

                </div>


                ${
                    odds
                        ? `
                            <div class="prediction-odds">

                                <span>
                                    Odds
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        String(odds)
                                    )}
                                </strong>

                            </div>
                        `
                        : ""
                }

            </div>


            ${
                confidence
                    ? `
                        <div class="vip-confidence">
                            Confidence:
                            <strong>
                                ${escapeHtml(
                                    String(
                                        confidence
                                    )
                                )}
                            </strong>
                        </div>
                    `
                    : ""
            }


            ${
                matchDate
                    ? `
                        <div class="prediction-date">
                            ${formatMatchDate(
                                matchDate
                            )}
                        </div>
                    `
                    : ""
            }


            <div class="prediction-card-bottom">

                <span class="prediction-status status-vip">
                    VIP PICK
                </span>

                <span class="prediction-countdown">
                    ${getMatchCountdown(
                        matchDate
                    )}
                </span>

            </div>

        </article>
    `;

}


/* =========================================================
   VIP BETTING CODES
   ========================================================= */

async function loadVipBettingCodes() {

    const container =
        document.getElementById(
            "vipBettingCodesGrid"
        ) ||
        document.getElementById(
            "vipBettingCodesContainer"
        ) ||
        document.getElementById(
            "vipCodesGrid"
        );


    if (!container) {
        return;
    }


    try {

        const vipToken =
            getVipToken();


        const headers = {};


        if (vipToken) {

            headers.Authorization =
                `Bearer ${vipToken}`;

        }


        const data =
            await apiRequest(
                "/vip/betting-codes",
                {
                    method: "GET",
                    headers
                }
            );


        let codes = [];


        if (Array.isArray(data)) {

            codes =
                data;

        } else if (
            Array.isArray(
                data?.codes
            )
        ) {

            codes =
                data.codes;

        }


        if (!codes.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <h3>
                        No VIP betting codes yet
                    </h3>

                    <p>
                        New VIP codes will appear here.
                    </p>
                </div>
            `;

            return;
        }


        container.innerHTML =
            codes
                .map(
                    createVipBettingCodeCard
                )
                .join("");


    } catch (error) {

        console.error(
            "Unable to load VIP betting codes:",
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
                        "Please activate VIP access."
                    )}
                </p>
            </div>
        `;

    }

}


function createVipBettingCodeCard(
    item
) {

    const code =
        item.code ||
        item.bettingCode ||
        item.bookingCode ||
        "";


    const title =
        item.title ||
        item.name ||
        "VIP Betting Code";


    const description =
        item.description ||
        item.note ||
        "";


    const odds =
        item.odds ||
        item.totalOdds ||
        "";


    return `
        <div class="betting-code-card vip-betting-code-card">

            <div class="betting-code-content">

                <span class="vip-label">
                    VIP
                </span>

                <h3>
                    ${escapeHtml(title)}
                </h3>

                ${
                    description
                        ? `
                            <p>
                                ${escapeHtml(
                                    description
                                )}
                            </p>
                        `
                        : ""
                }

                ${
                    odds
                        ? `
                            <span>
                                Odds:
                                <strong>
                                    ${escapeHtml(
                                        String(odds)
                                    )}
                                </strong>
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="betting-code-action">

                <code>
                    ${escapeHtml(code)}
                </code>

                <button
                    type="button"
                    onclick="copyBettingCode('${escapeJs(
                        code
                    )}')"
                >
                    Copy
                </button>

            </div>

        </div>
    `;

}


/* =========================================================
   VIP LOGOUT
   ========================================================= */

function setupVipLogout() {

    const button =
        document.getElementById(
            "vipLogoutButton"
        );


    if (
        !button ||
        button.dataset.initialized
    ) {
        return;
    }


    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            clearUserSession();

            window.location.href =
                "index.html";

        }
    );


    button.dataset.initialized =
        "true";

}


/* =========================================================
   TEAM BADGES
   ========================================================= */

async function loadTeamBadges() {

    const badges =
        document.querySelectorAll(
            ".team-badge[data-team-name]"
        );


    if (!badges.length) {
        return;
    }


    for (const badge of badges) {

        const teamName =
            badge.dataset.teamName;


        if (!teamName) {
            continue;
        }


        try {

            const response =
                await fetch(
                    `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(
                        teamName
                    )}`
                );


            if (!response.ok) {
                continue;
            }


            const data =
                await response.json();


            const team =
                data?.teams?.[0];


            if (!team) {
                continue;
            }


            const logo =
                team.strBadge ||
                team.strTeamBadge ||
                "";


            if (!logo) {
                continue;
            }


            badge.style.backgroundImage =
                `url("${logo}")`;

            badge.style.backgroundSize =
                "cover";

            badge.style.backgroundPosition =
                "center";

            badge.style.backgroundRepeat =
                "no-repeat";

            badge.textContent = "";


        } catch (error) {

            console.warn(
                `Team badge unavailable for ${teamName}`,
                error
            );

        }

    }

}


/* =========================================================
   WHATSAPP
   ========================================================= */

function setupWhatsAppLinks() {

    const links =
        document.querySelectorAll(
            "[data-whatsapp]"
        );


    links.forEach((link) => {

        if (link.dataset.initialized) {
            return;
        }


        link.addEventListener(
            "click",
            () => {

                const number =
                    link.dataset.whatsapp;


                if (!number) {
                    return;
                }


                const message =
                    link.dataset.message ||
                    "Hello FLEX HUB PREDICTIONS.";


                const url =
                    `https://wa.me/${number}?text=${encodeURIComponent(
                        message
                    )}`;


                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


        link.dataset.initialized =
            "true";

    });

}


/* =========================================================
   FOOTER YEAR
   ========================================================= */

function setupFooterYear() {

    const element =
        document.getElementById(
            "currentYear"
        );


    if (element) {

        element.textContent =
            new Date().getFullYear();

    }

}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

function setupForgotPassword() {

    const button =
        document.getElementById(
            "forgotPasswordButton"
        );


    if (
        !button ||
        button.dataset.initialized
    ) {
        return;
    }


    button.addEventListener(
        "click",
        showForgotPasswordModal
    );


    button.dataset.initialized =
        "true";

}


function showForgotPasswordModal(
    event
) {

    if (event) {
        event.preventDefault();
    }


    let modal =
        document.getElementById(
            "forgotPasswordModal"
        );


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "forgotPasswordModal";

        modal.innerHTML = `

            <div class="forgot-password-overlay">

                <div class="forgot-password-box">

                    <button
                        type="button"
                        class="forgot-password-close"
                        id="closeForgotPassword"
                    >
                        ×
                    </button>

                    <h2>
                        Reset Password
                    </h2>

                    <p>
                        Enter your account email
                        to request a password reset.
                    </p>

                    <form id="forgotPasswordForm">

                        <input
                            type="email"
                            id="forgotPasswordEmail"
                            placeholder="Email address"
                            required
                        >

                        <button
                            type="submit"
                        >
                            Send Reset Request
                        </button>

                        <div
                            id="forgotPasswordMessage"
                        ></div>

                    </form>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        document
            .getElementById(
                "closeForgotPassword"
            )
            ?.addEventListener(
                "click",
                () => {
                    modal.remove();
                }
            );


        document
            .getElementById(
                "forgotPasswordForm"
            )
            ?.addEventListener(
                "submit",
                handleForgotPassword
            );

    }


    modal.style.display =
        "block";

}


async function handleForgotPassword(
    event
) {

    event.preventDefault();


    const email =
        getFormValue(
            "forgotPasswordEmail"
        );


    const message =
        document.getElementById(
            "forgotPasswordMessage"
        );


    if (!email) {

        showElementMessage(
            message,
            "Please enter your email.",
            "error"
        );

        return;
    }


    try {

        const data =
            await apiRequest(
                "/forgot-password",
                {
                    method: "POST",
                    skipAuth: true,
                    body: JSON.stringify({
                        email
                    })
                }
            );


        showElementMessage(
            message,
            data?.message ||
            "If the account exists, password reset instructions have been sent.",
            "success"
        );


    } catch (error) {

        console.error(
            "Forgot password failed:",
            error
        );


        showElementMessage(
            message,
            error.message ||
            "Unable to process your request.",
            "error"
        );

    }

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function setupNotificationCenter() {

    const button =
        document.getElementById(
            "notificationButton"
        ) ||
        document.getElementById(
            "notificationsButton"
        );


    if (!button) {
        return;
    }


    if (!button.dataset.initialized) {

        button.addEventListener(
            "click",
            toggleNotificationPanel
        );

        button.dataset.initialized =
            "true";

    }


    injectNotificationStyles();

    startNotificationPolling();

}


function startNotificationPolling() {

    if (notificationPollingTimer) {
        clearInterval(
            notificationPollingTimer
        );
    }


    loadNotifications();


    notificationPollingTimer =
        setInterval(
            loadNotifications,
            60000
        );

}


async function loadNotifications() {

    if (!getUserToken()) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/notifications",
                {
                    method: "GET"
                }
            );


        const notifications =
            Array.isArray(data)
                ? data
                : Array.isArray(
                    data?.notifications
                )
                    ? data.notifications
                    : [];


        renderNotifications(
            notifications
        );


        updateNotificationBadge(
            notifications
        );


    } catch (error) {

        console.warn(
            "Unable to load notifications:",
            error.message
        );

    }

}


function renderNotifications(
    notifications
) {

    let panel =
        document.getElementById(
            "notificationPanel"
        );


    if (!panel) {

        panel =
            document.createElement(
                "div"
            );

        panel.id =
            "notificationPanel";

        panel.className =
            "flex-notification-panel";

        document.body.appendChild(
            panel
        );

    }


    if (!notifications.length) {

        panel.innerHTML = `
            <div class="notification-empty">
                <strong>
                    Notifications
                </strong>

                <p>
                    No new notifications.
                </p>
            </div>
        `;

        return;
    }


    panel.innerHTML = `

        <div class="notification-header">

            <strong>
                Notifications
            </strong>

            <button
                type="button"
                onclick="markAllNotificationsRead()"
            >
                Mark all read
            </button>

        </div>

        <div class="notification-list">

            ${notifications
                .map(
                    (notification) =>
                        createNotificationHTML(
                            notification
                        )
                )
                .join("")}

        </div>
    `;

}


function createNotificationHTML(
    notification
) {

    const id =
        notification.id ||
        notification._id ||
        "";


    const title =
        notification.title ||
        "Notification";


    const message =
        notification.message ||
        notification.body ||
        "";


    const read =
        Boolean(
            notification.read ||
            notification.isRead
        );


    return `
        <div
            class="flex-notification-item ${
                read ? "read" : "unread"
            }"
            data-notification-id="${escapeHtml(
                String(id)
            )}"
        >

            <strong>
                ${escapeHtml(title)}
            </strong>

            <p>
                ${escapeHtml(message)}
            </p>

            ${
                !read
                    ? `
                        <button
                            type="button"
                            onclick="markNotificationRead('${escapeJs(
                                String(id)
                            )}')"
                        >
                            Mark as read
                        </button>
                    `
                    : ""
            }

        </div>
    `;

}


function toggleNotificationPanel() {

    const panel =
        document.getElementById(
            "notificationPanel"
        );


    if (!panel) {

        loadNotifications();

        return;

    }


    panel.classList.toggle(
        "open"
    );

}


async function markNotificationRead(
    id
) {

    if (!id) {
        return;
    }


    try {

        await apiRequest(
            `/notifications/${encodeURIComponent(
                id
            )}/read`,
            {
                method: "PATCH"
            }
        );


        await loadNotifications();


    } catch (error) {

        console.error(
            "Unable to mark notification read:",
            error
        );

    }

}


async function markAllNotificationsRead() {

    try {

        await apiRequest(
            "/notifications/read-all",
            {
                method: "PATCH"
            }
        );


        await loadNotifications();


    } catch (error) {

        console.error(
            "Unable to mark notifications read:",
            error
        );

    }

}


function updateNotificationBadge(
    notifications
) {

    const unread =
        notifications.filter(
            (notification) =>
                !(
                    notification.read ||
                    notification.isRead
                )
        ).length;


    const buttons =
        document.querySelectorAll(
            "#notificationButton, #notificationsButton"
        );


    buttons.forEach((button) => {

        let badge =
            button.querySelector(
                ".notification-badge"
            );


        if (
            unread > 0 &&
            !badge
        ) {

            badge =
                document.createElement(
                    "span"
                );

            badge.className =
                "notification-badge";

            button.appendChild(
                badge
            );

        }


        if (badge) {

            badge.textContent =
                unread > 99
                    ? "99+"
                    : String(unread);

            badge.style.display =
                unread > 0
                    ? ""
                    : "none";

        }

    });

}


/* =========================================================
   NOTIFICATION STYLES
   ========================================================= */

function injectNotificationStyles() {

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

        .flex-notification-panel {
            position: fixed;
            top: 80px;
            right: 20px;
            width: min(380px, calc(100vw - 30px));
            max-height: 70vh;
            overflow-y: auto;
            background: #080b12;
            border: 1px solid rgba(245,185,66,.35);
            border-radius: 16px;
            padding: 15px;
            z-index: 99999;
            box-shadow: 0 20px 60px rgba(0,0,0,.45);
            display: none;
        }

        .flex-notification-panel.open {
            display: block;
        }

        .notification-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .notification-header button,
        .flex-notification-item button {
            border: 0;
            cursor: pointer;
            border-radius: 8px;
            padding: 7px 10px;
        }

        .flex-notification-item {
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 12px;
            background: rgba(255,255,255,.04);
        }

        .flex-notification-item.unread {
            border-left: 3px solid #f5b942;
        }

        .flex-notification-item p {
            margin: 5px 0 10px;
            opacity: .8;
        }

        .notification-empty {
            padding: 15px;
            text-align: center;
        }

        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 20px;
            background: #ff4d5a;
            color: white;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #notificationButton,
        #notificationsButton {
            position: relative;
        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   PWA INSTALL
   ========================================================= */

function setupPWAInstall() {

    const button =
        document.getElementById(
            "installAppBtn"
        );


    window.addEventListener(
        "beforeinstallprompt",
        (event) => {

            event.preventDefault();

            deferredInstallPrompt =
                event;


            if (button) {

                button.style.display =
                    "";

            }

        }
    );


    if (
        button &&
        !button.dataset.initialized
    ) {

        button.addEventListener(
            "click",
            installPWA
        );

        button.dataset.initialized =
            "true";

    }


    window.addEventListener(
        "appinstalled",
        () => {

            deferredInstallPrompt =
                null;

            hideInstallButton();

        }
    );

}


async function installPWA() {

    if (!deferredInstallPrompt) {

        showTemporaryToast(
            "Install option is not available yet."
        );

        return;
    }


    deferredInstallPrompt.prompt();


    try {

        await deferredInstallPrompt.userChoice;

    } catch (error) {

        console.warn(
            "PWA installation cancelled:",
            error
        );

    }


    deferredInstallPrompt =
        null;


    hideInstallButton();

}


function hideInstallButton() {

    const button =
        document.getElementById(
            "installAppBtn"
        );


    if (button) {

        button.style.display =
            "none";

    }

}


/* =========================================================
   SUCCESS ANIMATION
   ========================================================= */

function showFlexHubAnimation(
    message = "Success"
) {

    const existing =
        document.getElementById(
            "flexHubSuccessAnimation"
        );


    if (existing) {
        existing.remove();
    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "flexHubSuccessAnimation";


    overlay.innerHTML = `

        <div class="flex-success-box">

            <div class="flex-success-icon">
                ✓
            </div>

            <h2>
                FLEX HUB
            </h2>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>

    `;


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "flexSuccessAnimationStyle";


    style.textContent = `

        #flexHubSuccessAnimation {
            position: fixed;
            inset: 0;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(3,5,8,.94);
            backdrop-filter: blur(12px);
        }

        .flex-success-box {
            width: min(380px, calc(100vw - 40px));
            text-align: center;
            padding: 35px 25px;
            border-radius: 22px;
            border: 1px solid rgba(245,185,66,.4);
            background: #080b12;
            box-shadow: 0 25px 80px rgba(0,0,0,.55);
            animation: flexSuccessPop .35s ease;
        }

        .flex-success-icon {
            width: 70px;
            height: 70px;
            margin: 0 auto 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #25d366;
            color: white;
            font-size: 40px;
            font-weight: 800;
        }

        .flex-success-box h2 {
            margin: 0 0 8px;
            color: #f5b942;
        }

        .flex-success-box p {
            margin: 0;
            color: #fff;
        }

        @keyframes flexSuccessPop {
            from {
                opacity: 0;
                transform: scale(.8);
            }

            to {
                opacity: 1;
                transform: scale(1);
            }
        }

    `;


    if (
        !document.getElementById(
            "flexSuccessAnimationStyle"
        )
    ) {

        document.head.appendChild(
            style
        );

    }


    document.body.appendChild(
        overlay
    );


    setTimeout(
        () => {

            if (overlay) {
                overlay.remove();
            }

        },
        1000
    );

}


/* =========================================================
   UTILITY HELPERS
   ========================================================= */

function getFormValue(
    id
) {

    const element =
        document.getElementById(id);


    return element
        ? element.value.trim()
        : "";

}


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

}


function showVipMessage(
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            "vipAccessMessage"
        ) ||
        document.getElementById(
            "vipMessage"
        );


    showElementMessage(
        element,
        message,
        type
    );

}


function setButtonLoading(
    button,
    loading,
    loadingText = "Loading..."
) {

    if (!button) {
        return;
    }


    if (loading) {

        if (!button.dataset.originalText) {

            button.dataset.originalText =
                button.textContent;

        }


        button.disabled =
            true;

        button.classList.add(
            "is-loading"
        );

        button.textContent =
            loadingText;


    } else {

        button.disabled =
            false;

        button.classList.remove(
            "is-loading"
        );


        if (
            button.dataset.originalText
        ) {

            button.textContent =
                button.dataset.originalText;

            delete button.dataset.originalText;

        }

    }

}


/* =========================================================
   FORMATTING
   ========================================================= */

function formatStatus(
    status
) {

    if (!status) {
        return "Pending";
    }


    const value =
        String(status)
            .trim()
            .toLowerCase();


    const labels = {

        win: "WIN",
        won: "WIN",

        loss: "LOSS",
        lost: "LOSS",

        pending: "PENDING",

        void: "VOID",

        cancelled: "CANCELLED",
        canceled: "CANCELLED",

        active: "ACTIVE",
        inactive: "INACTIVE"

    };


    return (
        labels[value] ||
        capitalize(value)
    );

}


function formatPlan(
    plan
) {

    if (!plan) {
        return "VIP";
    }


    const value =
        String(plan)
            .trim()
            .toLowerCase()
            .replace(/[-_]/g, "");


    const plans = {

        week: "1 Week",
        "1week": "1 Week",

        "2week": "2 Weeks",
        "2weeks": "2 Weeks",

        month: "1 Month",
        "1month": "1 Month"

    };


    return (
        plans[value] ||
        capitalize(
            String(plan)
                .replace(/[-_]/g, " ")
        )
    );

}


function formatMatchDate(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


function formatExpiry(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


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


/* =========================================================
   SECURITY HELPERS
   ========================================================= */

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


function escapeJs(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\n/g,
            "\\n"
        )
        .replace(
            /\r/g,
            "\\r"
        );

}


/* =========================================================
   TEMPORARY TOAST
   ========================================================= */

function showTemporaryToast(
    message
) {

    const old =
        document.getElementById(
            "flexHubToast"
        );


    if (old) {
        old.remove();
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.id =
        "flexHubToast";


    toast.textContent =
        message;


    toast.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 25px;
        transform: translateX(-50%);
        z-index: 100001;
        background: #080b12;
        color: #fff;
        border: 1px solid rgba(245,185,66,.45);
        border-radius: 12px;
        padding: 12px 18px;
        box-shadow: 0 15px 40px rgba(0,0,0,.4);
        font-weight: 700;
    `;


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        2200
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.copyBettingCode =
    copyBettingCode;

window.markNotificationRead =
    markNotificationRead;

window.markAllNotificationsRead =
    markAllNotificationsRead;

window.handleSignOut =
    handleSignOut;

window.handleLogin =
    handleLogin;

window.handleRegister =
    handleRegister;

window.handleVipAccess =
    handleVipAccess;


/* =========================================================
   END OF FLEX HUB APP.JS
   ========================================================= */
```
