/* =========================================================
   FLEX HUB PREDICTIONS
   COMPLETE APP.JS - PART 1/3
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

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "FLEX HUB PREDICTIONS app.js loaded."
        );

        try {

            currentUser =
                getStoredUser();

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
                document.body.classList.contains(
                    "vip-page"
                ) ||
                document.getElementById(
                    "vipAccessForm"
                ) ||
                document.getElementById(
                    "vipPredictionsGrid"
                );

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

    }
);


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


function saveUser(
    user,
    token
) {

    currentUser =
        user || null;

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

    window.vipAccessActive =
        false;

    window.vipPredictionCount =
        0;

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

    /*
     * Normal authenticated requests use
     * the logged-in user's token.
     *
     * VIP requests can provide their own
     * Authorization header.
     */

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

    const url =
        `${API_BASE_URL}${endpoint}`;

    console.log(
        `[FLEX HUB API] ${requestOptions.method} ${url}`
    );

    const response =
        await fetch(
            url,
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

async function handleLogin(
    event
) {

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


    if (
        !identifier ||
        !password
    ) {

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


        /*
         * Save the session BEFORE verification
         * so /user/me can use the returned token.
         */

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


        /*
         * Give the success animation a moment,
         * then reveal the main website.
         */

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

async function handleRegister(
    event
) {

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
        document
            .getElementById(
                "registerPassword"
            )
            ?.value || "";

    const confirmPassword =
        document
            .getElementById(
                "registerConfirmPassword"
            )
            ?.value || "";

    const terms =
        document
            .getElementById(
                "registerTerms"
            )
            ?.checked || false;

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


    if (
        password.length < 6
    ) {

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


    /*
     * No saved token:
     * keep the login gate visible.
     */

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

            showLoginPanel();

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

        showLoginPanel();

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


    /*
     * This is the important part for the
     * login -> main website transition.
     */

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


    /*
     * Load the site's content after the
     * authenticated area becomes visible.
     */

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


    links.forEach(
        (link) => {

            if (
                link.dataset.initialized
            ) {

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

        }
    );

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


async function handleSignOut(
    event
) {

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


    buttons.forEach(
        (button) => {

            if (
                button.dataset.initialized
            ) {

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

        }
    );

}


/* =========================================================
   RESULT FILTER
   ========================================================= */

function setupResultFilters() {

    const buttons =
        document.querySelectorAll(
            "[data-result-filter]"
        );


    buttons.forEach(
        (button) => {

            if (
                button.dataset.initialized
            ) {

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

        }
    );

}
// ======================================================
// FLEX HUB PREDICTIONS - APP.JS
// PART 2 / 3
// PREDICTIONS, RESULTS, REGULAR ACCESS & VIP
// ======================================================


// ======================================================
// LOAD REGULAR PREDICTIONS
// ======================================================

async function loadPredictions() {

    try {

        const data = await apiRequest("/predictions");

        let predictions = [];

        if (Array.isArray(data)) {

            predictions = data;

        } else if (
            data &&
            Array.isArray(data.predictions)
        ) {

            predictions = data.predictions;

        }

        allPredictions = predictions;

        renderPredictions();

        updatePredictionStats();

    } catch (error) {

        console.error(
            "Failed to load predictions:",
            error
        );

        allPredictions = [];

        renderPredictions();

        showTemporaryToast(
            "Unable to load predictions right now.",
            "error"
        );

    }

}


// ======================================================
// RENDER REGULAR PREDICTIONS
// ======================================================

function renderPredictions() {

    const grid =
        document.getElementById("predictionsGrid");

    if (!grid) {

        return;

    }


    const searchInput =
        document.getElementById("predictionSearch") ||
        document.getElementById("searchInput");


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    let filtered =
        Array.isArray(allPredictions)
            ? [...allPredictions]
            : [];


    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    if (searchTerm) {

        filtered =
            filtered.filter(
                (item) => {

                    const searchableText = [

                        item.homeTeam,
                        item.home_team,

                        item.awayTeam,
                        item.away_team,

                        item.league,
                        item.leagueName,

                        item.prediction,
                        item.tip,
                        item.pick,

                        item.category,
                        item.type

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return searchableText.includes(
                        searchTerm
                    );

                }
            );

    }


    // --------------------------------------------------
    // LEAGUE FILTER
    // --------------------------------------------------

    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {

        filtered =
            filtered.filter(
                (item) => {

                    const league =
                        (
                            item.league ||
                            item.leagueName ||
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    return league ===
                        currentLeagueFilter;

                }
            );

    }


    // --------------------------------------------------
    // FEATURED-ONLY GRID
    // --------------------------------------------------

    const featuredOnly =
        grid.dataset.homeFeaturedOnly === "true";


    if (featuredOnly) {

        filtered =
            filtered.filter(
                (item) =>
                    item.featured === true ||
                    item.featured === 1 ||
                    item.featured === "true"
            );

    }


    // --------------------------------------------------
    // EMPTY STATE
    // --------------------------------------------------

    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚽</div>
                <h3>No predictions found</h3>
                <p>
                    Try another team, league or prediction search.
                </p>
            </div>
        `;

        return;

    }


    // --------------------------------------------------
    // CREATE CARDS
    // --------------------------------------------------

    grid.innerHTML =
        filtered
            .map(createPredictionCard)
            .join("");



    // Load team badges after cards exist
    loadTeamBadges();

}


// ======================================================
// CREATE REGULAR PREDICTION CARD
// ======================================================

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


    const tip =
        prediction.prediction ||
        prediction.tip ||
        prediction.pick ||
        "Prediction unavailable";


    const analysis =
        prediction.analysis ||
        prediction.reason ||
        "";


    const odds =
        prediction.odds ||
        prediction.expectedOdds ||
        "";


    const category =
        prediction.category ||
        prediction.type ||
        "regular";


    const matchDate =
        prediction.matchDate ||
        prediction.match_date ||
        prediction.date ||
        "";


    const matchTime =
        prediction.matchTime ||
        prediction.match_time ||
        prediction.time ||
        "";


    const status =
        prediction.status ||
        "pending";


    const predictionId =
        prediction.id ||
        "";


    const statusClass =
        String(status)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");


    return `
        <article
            class="prediction-card"
            data-prediction-id="${escapeHtml(
                predictionId
            )}"
        >

            <div class="prediction-card-top">

                <span class="prediction-league">
                    ${escapeHtml(league)}
                </span>

                <span
                    class="prediction-status status-${escapeHtml(
                        statusClass
                    )}"
                >
                    ${escapeHtml(
                        formatStatus(status)
                    )}
                </span>

            </div>


            <div class="prediction-match">

                <div class="team team-home">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            homeTeam
                        )}"
                    >
                        ${escapeHtml(
                            getTeamInitials(homeTeam)
                        )}
                    </div>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>


                <div class="match-center">

                    <span class="match-date">
                        ${escapeHtml(
                            formatMatchDate(
                                matchDate
                            )
                        )}
                    </span>

                    <span class="match-time">
                        ${escapeHtml(
                            matchTime || "--:--"
                        )}
                    </span>

                    <span class="match-vs">
                        VS
                    </span>

                </div>


                <div class="team team-away">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            awayTeam
                        )}"
                    >
                        ${escapeHtml(
                            getTeamInitials(awayTeam)
                        )}
                    </div>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>


            <div class="prediction-content">

                <div class="prediction-label">
                    PREDICTION
                </div>

                <div class="prediction-pick">
                    ${escapeHtml(tip)}
                </div>


                ${
                    odds
                        ? `
                            <div class="prediction-odds">
                                Expected Odds:
                                <strong>
                                    ${escapeHtml(odds)}
                                </strong>
                            </div>
                        `
                        : ""
                }


                ${
                    analysis
                        ? `
                            <div class="prediction-analysis">
                                ${escapeHtml(analysis)}
                            </div>
                        `
                        : ""
                }

            </div>


            <div class="prediction-card-bottom">

                <span class="prediction-category">
                    ${escapeHtml(
                        capitalize(category)
                    )}
                </span>


                <span
                    class="match-countdown"
                    data-match-date="${escapeHtml(
                        matchDate
                    )}"
                    data-match-time="${escapeHtml(
                        matchTime
                    )}"
                >
                    ${escapeHtml(
                        getMatchCountdown(
                            matchDate,
                            matchTime
                        )
                    )}
                </span>

            </div>

        </article>
    `;

}


// ======================================================
// TEAM INITIALS
// ======================================================

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


// ======================================================
// MATCH COUNTDOWN
// ======================================================

function getMatchCountdown(
    matchDate,
    matchTime
) {

    if (!matchDate) {

        return "Upcoming";

    }


    try {

        let dateString =
            String(matchDate).trim();


        if (
            matchTime &&
            !dateString.includes("T")
        ) {

            dateString +=
                `T${String(matchTime).trim()}`;

        }


        const matchTimestamp =
            new Date(dateString).getTime();


        if (Number.isNaN(matchTimestamp)) {

            return "Upcoming";

        }


        const now =
            Date.now();


        const difference =
            matchTimestamp - now;


        if (difference <= 0) {

            return "Started";

        }


        const totalMinutes =
            Math.floor(
                difference /
                (1000 * 60)
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

            return `${days}d ${hours}h`;

        }


        if (hours > 0) {

            return `${hours}h ${minutes}m`;

        }


        return `${minutes}m`;

    } catch (error) {

        return "Upcoming";

    }

}


// ======================================================
// LOAD RESULTS
// ======================================================

async function loadResults() {

    try {

        const data =
            await apiRequest("/results");


        let results = [];


        if (Array.isArray(data)) {

            results = data;

        } else if (
            data &&
            Array.isArray(data.results)
        ) {

            results = data.results;

        }


        allResults = results;

        renderResults();

        updatePredictionStats();

    } catch (error) {

        console.error(
            "Failed to load results:",
            error
        );

        allResults = [];

        renderResults();

    }

}


// ======================================================
// RENDER RESULTS
// ======================================================

function renderResults() {

    const grid =
        document.getElementById("resultsGrid") ||
        document.getElementById("recentResultsGrid") ||
        document.getElementById("resultsContainer");


    if (!grid) {

        return;

    }


    let filtered =
        Array.isArray(allResults)
            ? [...allResults]
            : [];


    if (
        currentResultFilter &&
        currentResultFilter !== "all"
    ) {

        filtered =
            filtered.filter(
                (item) => {

                    const status =
                        String(
                            item.status ||
                            ""
                        )
                        .toLowerCase()
                        .trim();


                    return status ===
                        currentResultFilter;

                }
            );

    }


    if (!filtered.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    📊
                </div>

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
            .map(createResultCard)
            .join("");

}


// ======================================================
// CREATE RESULT CARD
// ======================================================

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


    const league =
        result.league ||
        result.leagueName ||
        "Football";


    const prediction =
        result.prediction ||
        result.tip ||
        result.pick ||
        "Prediction";


    const homeScore =
        result.homeScore ??
        result.home_score ??
        "-";


    const awayScore =
        result.awayScore ??
        result.away_score ??
        "-";


    const status =
        result.status ||
        "pending";


    const matchDate =
        result.matchDate ||
        result.match_date ||
        result.date ||
        "";


    const matchTime =
        result.matchTime ||
        result.match_time ||
        result.time ||
        "";


    const statusClass =
        String(status)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");


    return `
        <article class="result-card">

            <div class="result-card-header">

                <span class="result-league">
                    ${escapeHtml(league)}
                </span>

                <span
                    class="result-status status-${escapeHtml(
                        statusClass
                    )}"
                >
                    ${escapeHtml(
                        formatStatus(status)
                    )}
                </span>

            </div>


            <div class="result-match">

                <div class="result-team">
                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                    <span class="result-score">
                        ${escapeHtml(homeScore)}
                    </span>
                </div>


                <div class="result-separator">
                    -
                </div>


                <div class="result-team">
                    <span class="result-score">
                        ${escapeHtml(awayScore)}
                    </span>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>
                </div>

            </div>


            <div class="result-details">

                <span>
                    Prediction:
                </span>

                <strong>
                    ${escapeHtml(prediction)}
                </strong>

            </div>


            <div class="result-date">

                ${escapeHtml(
                    formatMatchDate(
                        matchDate
                    )
                )}

                ${
                    matchTime
                        ? ` • ${escapeHtml(matchTime)}`
                        : ""
                }

            </div>

        </article>
    `;

}


// ======================================================
// UPDATE PREDICTION STATISTICS
// ======================================================

function updatePredictionStats() {

    const total =
        Array.isArray(allPredictions)
            ? allPredictions.length
            : 0;


    const resultsCount =
        Array.isArray(allResults)
            ? allResults.length
            : 0;


    const leagueSet =
        new Set();


    if (Array.isArray(allPredictions)) {

        allPredictions.forEach(
            (item) => {

                const league =
                    item.league ||
                    item.leagueName;


                if (league) {

                    leagueSet.add(
                        String(league)
                    );

                }

            }
        );

    }


    const stats = {

        totalPredictions: total,

        predictionsCount: total,

        totalResults: resultsCount,

        resultsCount: resultsCount,

        totalLeagues: leagueSet.size,

        leaguesCount: leagueSet.size

    };


    const elements = {

        totalPredictions:
            document.getElementById(
                "totalPredictions"
            ),

        predictionsCount:
            document.getElementById(
                "predictionsCount"
            ),

        totalResults:
            document.getElementById(
                "totalResults"
            ),

        resultsCount:
            document.getElementById(
                "resultsCount"
            ),

        totalLeagues:
            document.getElementById(
                "totalLeagues"
            ),

        leaguesCount:
            document.getElementById(
                "leaguesCount"
            )

    };


    Object.keys(elements)
        .forEach(
            (key) => {

                if (elements[key]) {

                    elements[key].textContent =
                        stats[key];

                }

            }
        );

}


// ======================================================
// REGULAR ACCESS / PAYMENT GATE
// ======================================================

function setupRegularPaymentGate() {

    const paymentButtons =
        document.querySelectorAll(
            "[data-payment-button], #paymentButton, #payNowButton"
        );


    paymentButtons.forEach(
        (button) => {

            if (
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
    );


    refreshRegularAccessStatus();

}


// ======================================================
// INITIALIZE REGULAR PAYMENT
// ======================================================

async function initializeRegularPayment(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const button =
        event &&
        event.currentTarget
            ? event.currentTarget
            : null;


    setButtonLoading(
        button,
        true,
        "Processing..."
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


        if (
            data &&
            data.paymentUrl
        ) {

            window.location.href =
                data.paymentUrl;

            return;

        }


        if (
            data &&
            data.authorization_url
        ) {

            window.location.href =
                data.authorization_url;

            return;

        }


        showTemporaryToast(
            "Payment service is not available yet.",
            "error"
        );

    } catch (error) {

        console.error(
            "Payment initialization error:",
            error
        );


        showTemporaryToast(
            "Payment service is currently unavailable.",
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
// REFRESH REGULAR ACCESS
// ======================================================

async function refreshRegularAccessStatus() {

    const token =
        getAuthToken();


    if (!token) {

        return;

    }


    try {

        const data =
            await apiRequest(
                "/user/access"
            );


        updateRegularAccessUI(
            data
        );

    } catch (error) {

        console.warn(
            "Regular access check failed:",
            error
        );

    }

}


// ======================================================
// UPDATE REGULAR ACCESS UI
// ======================================================

function updateRegularAccessUI(
    data
) {

    if (!data) {

        return;

    }


    const active =
        data.active === true ||
        data.hasAccess === true ||
        data.accessActive === true;


    const expiresAt =
        data.expiresAt ||
        data.expires_at;


    const accessElements =
        document.querySelectorAll(
            "[data-access-status]"
        );


    accessElements.forEach(
        (element) => {

            element.textContent =
                active
                    ? (
                        expiresAt
                            ? `Active until ${formatExpiry(expiresAt)}`
                            : "Active"
                    )
                    : "Inactive";

        }
    );


    const expiryElements =
        document.querySelectorAll(
            "[data-access-expiry]"
        );


    expiryElements.forEach(
        (element) => {

            element.textContent =
                expiresAt
                    ? formatExpiry(expiresAt)
                    : "Not active";

        }
    );

}


// ======================================================
// LOAD REGULAR BETTING CODES
// ======================================================

async function loadRegularBettingCodes() {

    const grid =
        document.getElementById(
            "bettingCodesGrid"
        );


    if (!grid) {

        return;

    }


    try {

        const data =
            await apiRequest(
                "/betting-codes"
            );


        let codes = [];


        if (Array.isArray(data)) {

            codes = data;

        } else if (
            data &&
            Array.isArray(data.codes)
        ) {

            codes = data.codes;

        }


        if (!codes.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        🎯
                    </div>

                    <h3>No codes available</h3>

                    <p>
                        New prediction-related codes
                        will appear here when published.
                    </p>
                </div>
            `;

            return;

        }


        grid.innerHTML =
            codes
                .map(createBettingCodeCard)
                .join("");

    } catch (error) {

        console.error(
            "Failed to load betting codes:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <h3>Codes unavailable</h3>

                <p>
                    Please try again later.
                </p>
            </div>
        `;

    }

}


// ======================================================
// CREATE REGULAR CODE CARD
// ======================================================

function createBettingCodeCard(
    item
) {

    const bookmaker =
        item.bookmaker ||
        item.provider ||
        "Code";


    const code =
        item.code ||
        "";


    const description =
        item.description ||
        "";


    const category =
        item.category ||
        "regular";


    return `
        <article class="betting-code-card">

            <div class="betting-code-header">

                <span>
                    ${escapeHtml(bookmaker)}
                </span>

                <span>
                    ${escapeHtml(
                        capitalize(category)
                    )}
                </span>

            </div>


            <div class="betting-code-value">

                <code>
                    ${escapeHtml(code)}
                </code>

                <button
                    type="button"
                    class="copy-code-btn"
                    onclick="copyBettingCode('${escapeJs(code)}')"
                >
                    Copy
                </button>

            </div>


            ${
                description
                    ? `
                        <p class="betting-code-description">
                            ${escapeHtml(description)}
                        </p>
                    `
                    : ""
            }

        </article>
    `;

}


// ======================================================
// COPY REGULAR CODE
// ======================================================

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
            "Code copied successfully.",
            "success"
        );

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );


        showTemporaryToast(
            "Unable to copy code.",
            "error"
        );

    }

}


// ======================================================
// VIP PAGE SETUP
// ======================================================

function setupVipPage() {

    const vipAccessForm =
        document.getElementById(
            "vipAccessForm"
        );


    const vipPage =
        Boolean(
            vipAccessForm ||
            document.getElementById(
                "vipPredictionsGrid"
            ) ||
            document.getElementById(
                "vipContent"
            )
        );


    if (!vipPage) {

        return;

    }


    setupVipLogout();

    verifyUserForVipPage();

    setupVipAccessForm();

}


// ======================================================
// VERIFY USER FOR VIP PAGE
// ======================================================

async function verifyUserForVipPage() {

    const token =
        getAuthToken();


    if (!token) {

        updateVipStatusUI({
            active: false,
            message:
                "Please log in to access VIP."
        });

        return;

    }


    try {

        await verifyCurrentUserSession();

    } catch (error) {

        console.warn(
            "VIP user verification failed:",
            error
        );

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


    if (form.dataset.initialized) {

        return;

    }


    form.addEventListener(
        "submit",
        handleVipAccess
    );


    form.dataset.initialized =
        "true";

}


// ======================================================
// HANDLE VIP ACCESS
// ======================================================

async function handleVipAccess(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const input =
        document.getElementById(
            "vipAccessCode"
        ) ||
        document.getElementById(
            "accessCode"
        );


    const code =
        input
            ? input.value.trim()
            : "";


    if (!code) {

        showVipMessage(
            "Please enter your VIP access code.",
            "error"
        );

        return;

    }


    const button =
        event &&
        event.submitter
            ? event.submitter
            : null;


    setButtonLoading(
        button,
        true,
        "Verifying..."
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


        const vipToken =
            data &&
            (
                data.vipToken ||
                data.token ||
                data.accessToken
            );


        if (vipToken) {

            saveVipToken(
                vipToken
            );

        }


        showVipMessage(
            data.message ||
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
            "VIP access error:",
            error
        );


        showVipMessage(
            error.message ||
            "Invalid or expired VIP access code.",
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

    const vipToken =
        getVipToken();


    if (!vipToken) {

        updateVipStatusUI({
            active: false
        });

        return false;

    }


    try {

        const headers = {};


        headers.Authorization =
            `Bearer ${vipToken}`;


        const data =
            await apiRequest(
                "/vip/status",
                {
                    headers
                }
            );


        updateVipStatusUI(
            data
        );


        const active =
            data &&
            (
                data.active === true ||
                data.hasAccess === true ||
                data.valid === true
            );


        return active;

    } catch (error) {

        console.error(
            "VIP status error:",
            error
        );


        updateVipStatusUI({
            active: false,
            message:
                error.message ||
                "VIP access could not be verified."
        });


        return false;

    }

}


// ======================================================
// UPDATE VIP STATUS UI
// ======================================================

function updateVipStatusUI(
    data
) {

    data =
        data || {};


    const active =
        data.active === true ||
        data.hasAccess === true ||
        data.valid === true;


    const vipContent =
        document.getElementById(
            "vipContent"
        );


    const vipLocked =
        document.getElementById(
            "vipLocked"
        );


    const messageElement =
        document.getElementById(
            "vipAccessMessage"
        ) ||
        document.getElementById(
            "vipMessage"
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


    if (messageElement && data.message) {

        messageElement.textContent =
            data.message;

        messageElement.className =
            active
                ? "success"
                : "error";

    }


    const statusElements =
        document.querySelectorAll(
            "[data-vip-status]"
        );


    statusElements.forEach(
        (element) => {

            element.textContent =
                active
                    ? "VIP ACTIVE"
                    : "VIP LOCKED";

        }
    );


    const expiry =
        data.expiresAt ||
        data.expires_at;


    const expiryElements =
        document.querySelectorAll(
            "[data-vip-expiry]"
        );


    expiryElements.forEach(
        (element) => {

            element.textContent =
                expiry
                    ? formatExpiry(expiry)
                    : "Not active";

        }
    );


    const plan =
        data.plan ||
        "";


    const planElements =
        document.querySelectorAll(
            "[data-vip-plan]"
        );


    planElements.forEach(
        (element) => {

            element.textContent =
                plan
                    ? formatPlan(plan)
                    : "VIP";

        }
    );

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
                    Enter your valid VIP access code
                    to view VIP predictions.
                </p>
            </div>
        `;

        return;

    }


    try {

        const headers = {};


        headers.Authorization =
            `Bearer ${vipToken}`;


        const data =
            await apiRequest(
                "/vip/predictions",
                {
                    headers
                }
            );


        let predictions = [];


        if (Array.isArray(data)) {

            predictions = data;

        } else if (
            data &&
            Array.isArray(data.predictions)
        ) {

            predictions =
                data.predictions;

        }


        if (!predictions.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        👑
                    </div>

                    <h3>No VIP predictions yet</h3>

                    <p>
                        New VIP predictions will appear
                        here when published.
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
            "Failed to load VIP predictions:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <h3>VIP predictions unavailable</h3>

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


// ======================================================
// CREATE VIP PREDICTION CARD
// ======================================================

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


    const tip =
        prediction.prediction ||
        prediction.tip ||
        prediction.pick ||
        "Prediction unavailable";


    const analysis =
        prediction.analysis ||
        prediction.reason ||
        "";


    const odds =
        prediction.odds ||
        prediction.expectedOdds ||
        "";


    const matchDate =
        prediction.matchDate ||
        prediction.match_date ||
        prediction.date ||
        "";


    const matchTime =
        prediction.matchTime ||
        prediction.match_time ||
        prediction.time ||
        "";


    const status =
        prediction.status ||
        "pending";


    const statusClass =
        String(status)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");


    return `
        <article class="vip-prediction-card">

            <div class="vip-prediction-header">

                <span class="vip-badge">
                    VIP
                </span>

                <span class="prediction-league">
                    ${escapeHtml(league)}
                </span>

                <span
                    class="prediction-status status-${escapeHtml(
                        statusClass
                    )}"
                >
                    ${escapeHtml(
                        formatStatus(status)
                    )}
                </span>

            </div>


            <div class="prediction-match">

                <div class="team team-home">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            homeTeam
                        )}"
                    >
                        ${escapeHtml(
                            getTeamInitials(homeTeam)
                        )}
                    </div>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>


                <div class="match-center">

                    <span class="match-date">
                        ${escapeHtml(
                            formatMatchDate(
                                matchDate
                            )
                        )}
                    </span>

                    <span class="match-time">
                        ${escapeHtml(
                            matchTime || "--:--"
                        )}
                    </span>

                    <span class="match-vs">
                        VS
                    </span>

                </div>


                <div class="team team-away">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(
                            awayTeam
                        )}"
                    >
                        ${escapeHtml(
                            getTeamInitials(awayTeam)
                        )}
                    </div>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>


            <div class="vip-prediction-content">

                <div class="prediction-label">
                    VIP PREDICTION
                </div>

                <div class="prediction-pick">
                    ${escapeHtml(tip)}
                </div>


                ${
                    odds
                        ? `
                            <div class="prediction-odds">
                                Expected Odds:
                                <strong>
                                    ${escapeHtml(odds)}
                                </strong>
                            </div>
                        `
                        : ""
                }


                ${
                    analysis
                        ? `
                            <div class="prediction-analysis">
                                ${escapeHtml(analysis)}
                            </div>
                        `
                        : ""
                }

            </div>


            <div class="prediction-card-bottom">

                <span class="vip-label">
                    PREMIUM ACCESS
                </span>

                <span class="match-countdown">
                    ${escapeHtml(
                        getMatchCountdown(
                            matchDate,
                            matchTime
                        )
                    )}
                </span>

            </div>

        </article>
    `;

}


// ======================================================
// END OF PART 2
// ======================================================
// ======================================================
// FLEX HUB PREDICTIONS - APP.JS
// PART 3 / 3
// VIP CODES, LOGOUT, BADGES, NOTIFICATIONS, PWA & HELPERS
// ======================================================


// ======================================================
// LOAD VIP BETTING CODES
// ======================================================

async function loadVipBettingCodes() {

    const grid =
        document.getElementById(
            "vipBettingCodesGrid"
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
                    Enter your VIP access code to view
                    premium content.
                </p>
            </div>
        `;

        return;

    }


    try {

        const headers = {};

        headers.Authorization =
            `Bearer ${vipToken}`;


        const data =
            await apiRequest(
                "/vip/betting-codes",
                {
                    headers
                }
            );


        let codes = [];


        if (Array.isArray(data)) {

            codes = data;

        } else if (
            data &&
            Array.isArray(data.codes)
        ) {

            codes = data.codes;

        }


        if (!codes.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        👑
                    </div>

                    <h3>No VIP codes yet</h3>

                    <p>
                        New VIP codes will appear here
                        when published.
                    </p>
                </div>
            `;

            return;

        }


        grid.innerHTML =
            codes
                .map(
                    createVipBettingCodeCard
                )
                .join("");

    } catch (error) {

        console.error(
            "Failed to load VIP betting codes:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <h3>VIP codes unavailable</h3>

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


// ======================================================
// CREATE VIP BETTING CODE CARD
// ======================================================

function createVipBettingCodeCard(
    item
) {

    const bookmaker =
        item.bookmaker ||
        item.provider ||
        "VIP Code";


    const code =
        item.code ||
        "";


    const description =
        item.description ||
        "";


    return `
        <article class="vip-code-card">

            <div class="vip-code-header">

                <span class="vip-badge">
                    VIP
                </span>

                <strong>
                    ${escapeHtml(bookmaker)}
                </strong>

            </div>


            <div class="vip-code-value">

                <code>
                    ${escapeHtml(code)}
                </code>

                <button
                    type="button"
                    class="copy-code-btn"
                    onclick="copyBettingCode('${escapeJs(code)}')"
                >
                    Copy
                </button>

            </div>


            ${
                description
                    ? `
                        <p class="vip-code-description">
                            ${escapeHtml(description)}
                        </p>
                    `
                    : ""
            }

        </article>
    `;

}


// ======================================================
// VIP LOGOUT
// ======================================================

function setupVipLogout() {

    const buttons =
        document.querySelectorAll(
            "#vipLogoutButton, [data-vip-logout]"
        );


    buttons.forEach(
        (button) => {

            if (
                button.dataset.initialized
            ) {

                return;

            }


            button.addEventListener(
                "click",
                () => {

                    clearVipToken();

                    showVipMessage(
                        "VIP access has been signed out.",
                        "success"
                    );


                    updateVipStatusUI({
                        active: false,
                        message:
                            "VIP access required."
                    });


                    const grid =
                        document.getElementById(
                            "vipPredictionsGrid"
                        );


                    if (grid) {

                        grid.innerHTML = `
                            <div class="empty-state">
                                <h3>VIP access required</h3>
                                <p>
                                    Enter your VIP access code
                                    to continue.
                                </p>
                            </div>
                        `;

                    }


                    const codeGrid =
                        document.getElementById(
                            "vipBettingCodesGrid"
                        );


                    if (codeGrid) {

                        codeGrid.innerHTML = "";

                    }

                }
            );


            button.dataset.initialized =
                "true";

        }
    );

}


// ======================================================
// LOAD TEAM BADGES
// ======================================================

async function loadTeamBadges() {

    const badges =
        document.querySelectorAll(
            ".team-badge[data-team-name]"
        );


    if (!badges.length) {

        return;

    }


    for (
        const badge of badges
    ) {

        if (
            badge.dataset.badgeLoaded ===
            "true"
        ) {

            continue;

        }


        const teamName =
            badge.dataset.teamName;


        if (!teamName) {

            continue;

        }


        try {

            const url =
                "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=" +
                encodeURIComponent(
                    teamName
                );


            const response =
                await fetch(url);


            if (!response.ok) {

                continue;

            }


            const data =
                await response.json();


            const team =
                data &&
                Array.isArray(data.teams) &&
                data.teams.length
                    ? data.teams[0]
                    : null;


            if (
                team &&
                team.strBadge
            ) {

                badge.innerHTML = `
                    <img
                        src="${escapeHtml(
                            team.strBadge
                        )}"
                        alt="${escapeHtml(
                            teamName
                        )}"
                        loading="lazy"
                    >
                `;

                badge.classList.add(
                    "has-team-badge"
                );

            }


            badge.dataset.badgeLoaded =
                "true";

        } catch (error) {

            console.warn(
                "Team badge lookup failed:",
                teamName
            );

        }

    }

}


// ======================================================
// WHATSAPP LINKS
// ======================================================

function setupWhatsAppLinks() {

    const links =
        document.querySelectorAll(
            "[data-whatsapp]"
        );


    links.forEach(
        (link) => {

            if (
                link.dataset.initialized
            ) {

                return;

            }


            link.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();


                    const number =
                        link.dataset.whatsapp;


                    const message =
                        link.dataset.whatsappMessage ||
                        "Hello FLEX HUB PREDICTIONS.";


                    if (!number) {

                        return;

                    }


                    const cleanNumber =
                        String(number)
                            .replace(
                                /[^0-9+]/g,
                                ""
                            );


                    const whatsappUrl =
                        `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
                            message
                        )}`;


                    window.open(
                        whatsappUrl,
                        "_blank",
                        "noopener,noreferrer"
                    );

                }
            );


            link.dataset.initialized =
                "true";

        }
    );

}


// ======================================================
// FOOTER YEAR
// ======================================================

function setupFooterYear() {

    const yearElement =
        document.getElementById(
            "currentYear"
        );


    if (yearElement) {

        yearElement.textContent =
            new Date().getFullYear();

    }

}


// ======================================================
// FORGOT PASSWORD
// ======================================================

function setupForgotPassword() {

    const button =
        document.getElementById(
            "forgotPasswordButton"
        );


    if (!button) {

        return;

    }


    if (button.dataset.initialized) {

        return;

    }


    button.addEventListener(
        "click",
        showForgotPasswordModal
    );


    button.dataset.initialized =
        "true";

}


// ======================================================
// SHOW FORGOT PASSWORD MODAL
// ======================================================

function showForgotPasswordModal() {

    const identifier =
        window.prompt(
            "Enter your username or email address:"
        );


    if (!identifier) {

        return;

    }


    handleForgotPassword(
        identifier.trim()
    );

}


// ======================================================
// HANDLE FORGOT PASSWORD
// ======================================================

async function handleForgotPassword(
    identifier
) {

    if (!identifier) {

        return;

    }


    try {

        const data =
            await apiRequest(
                "/forgot-password",
                {
                    method: "POST",

                    body: JSON.stringify({
                        identifier
                    })
                }
            );


        showTemporaryToast(
            data.message ||
            "If the account exists, password reset instructions have been sent.",
            "success"
        );

    } catch (error) {

        console.error(
            "Forgot password error:",
            error
        );


        showTemporaryToast(
            error.message ||
            "Unable to process password reset.",
            "error"
        );

    }

}


// ======================================================
// NOTIFICATION CENTER
// ======================================================

let notificationTimer =
    null;


function setupNotificationCenter() {

    const notificationButtons =
        document.querySelectorAll(
            "[data-notification-toggle], #notificationButton, #notificationBell"
        );


    notificationButtons.forEach(
        (button) => {

            if (
                button.dataset.initialized
            ) {

                return;

            }


            button.addEventListener(
                "click",
                toggleNotificationPanel
            );


            button.dataset.initialized =
                "true";

        }
    );


    injectNotificationStyles();

    loadNotifications();

    startNotificationPolling();

}


// ======================================================
// START NOTIFICATION POLLING
// ======================================================

function startNotificationPolling() {

    if (notificationTimer) {

        clearInterval(
            notificationTimer
        );

    }


    notificationTimer =
        setInterval(
            () => {

                if (getAuthToken()) {

                    loadNotifications();

                }

            },
            60000
        );

}


// ======================================================
// LOAD NOTIFICATIONS
// ======================================================

async function loadNotifications() {

    if (!getAuthToken()) {

        updateNotificationBadge(0);

        return;

    }


    try {

        const data =
            await apiRequest(
                "/notifications"
            );


        let notifications = [];


        if (Array.isArray(data)) {

            notifications = data;

        } else if (
            data &&
            Array.isArray(data.notifications)
        ) {

            notifications =
                data.notifications;

        }


        window.flexHubNotifications =
            notifications;


        renderNotifications(
            notifications
        );

    } catch (error) {

        console.warn(
            "Notification loading failed:",
            error
        );

    }

}


// ======================================================
// RENDER NOTIFICATIONS
// ======================================================

function renderNotifications(
    notifications
) {

    const panel =
        document.querySelector(
            "[data-notification-panel]"
        ) ||
        document.getElementById(
            "notificationPanel"
        );


    if (!panel) {

        updateNotificationBadge(
            Array.isArray(notifications)
                ? notifications.length
                : 0
        );

        return;

    }


    if (
        !Array.isArray(notifications) ||
        !notifications.length
    ) {

        panel.innerHTML = `
            <div class="notification-empty">
                <span>🔔</span>
                <strong>No notifications</strong>
                <p>
                    You're all caught up.
                </p>
            </div>
        `;

        updateNotificationBadge(0);

        return;

    }


    panel.innerHTML = `
        <div class="notification-panel-header">

            <strong>
                Notifications
            </strong>

            <button
                type="button"
                data-mark-all-notifications
            >
                Mark all read
            </button>

        </div>

        <div class="notification-list">

            ${notifications
                .map(createNotificationHTML)
                .join("")}

        </div>
    `;


    const markAllButton =
        panel.querySelector(
            "[data-mark-all-notifications]"
        );


    if (markAllButton) {

        markAllButton.addEventListener(
            "click",
            markAllNotificationsRead
        );

    }


    panel
        .querySelectorAll(
            "[data-notification-id]"
        )
        .forEach(
            (item) => {

                item.addEventListener(
                    "click",
                    () => {

                        markNotificationRead(
                            item.dataset.notificationId
                        );

                    }
                );

            }
        );


    const unreadCount =
        notifications.filter(
            (item) =>
                !(
                    item.read === true ||
                    item.isRead === true
                )
        ).length;


    updateNotificationBadge(
        unreadCount
    );

}


// ======================================================
// CREATE NOTIFICATION HTML
// ======================================================

function createNotificationHTML(
    notification
) {

    const id =
        notification.id ||
        notification.notification_id ||
        "";


    const title =
        notification.title ||
        "Notification";


    const message =
        notification.message ||
        "";


    const createdAt =
        notification.created_at ||
        notification.createdAt ||
        "";


    const read =
        notification.read === true ||
        notification.isRead === true;


    return `
        <div
            class="notification-item ${
                read
                    ? "read"
                    : "unread"
            }"
            data-notification-id="${escapeHtml(
                id
            )}"
        >

            <div class="notification-icon">
                🔔
            </div>

            <div class="notification-content">

                <strong>
                    ${escapeHtml(title)}
                </strong>

                <p>
                    ${escapeHtml(message)}
                </p>

                ${
                    createdAt
                        ? `
                            <small>
                                ${escapeHtml(
                                    formatExpiry(
                                        createdAt
                                    )
                                )}
                            </small>
                        `
                        : ""
                }

            </div>

        </div>
    `;

}


// ======================================================
// TOGGLE NOTIFICATION PANEL
// ======================================================

function toggleNotificationPanel(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const panel =
        document.querySelector(
            "[data-notification-panel]"
        ) ||
        document.getElementById(
            "notificationPanel"
        );


    if (!panel) {

        return;

    }


    const isOpen =
        panel.classList.toggle(
            "open"
        );


    panel.setAttribute(
        "aria-hidden",
        isOpen
            ? "false"
            : "true"
    );


    if (isOpen) {

        loadNotifications();

    }

}


// ======================================================
// MARK ONE NOTIFICATION READ
// ======================================================

async function markNotificationRead(
    notificationId
) {

    if (!notificationId) {

        return;

    }


    try {

        await apiRequest(
            `/notifications/${encodeURIComponent(
                notificationId
            )}/read`,
            {
                method: "POST"
            }
        );


        loadNotifications();

    } catch (error) {

        console.warn(
            "Unable to mark notification as read:",
            error
        );

    }

}


// ======================================================
// MARK ALL NOTIFICATIONS READ
// ======================================================

async function markAllNotificationsRead() {

    try {

        await apiRequest(
            "/notifications/read-all",
            {
                method: "POST"
            }
        );


        loadNotifications();

        showTemporaryToast(
            "All notifications marked as read.",
            "success"
        );

    } catch (error) {

        console.warn(
            "Unable to mark notifications as read:",
            error
        );

    }

}


// ======================================================
// UPDATE NOTIFICATION BADGE
// ======================================================

function updateNotificationBadge(
    count
) {

    const badges =
        document.querySelectorAll(
            "[data-notification-badge], #notificationBadge"
        );


    badges.forEach(
        (badge) => {

            const numericCount =
                Number(count) || 0;


            badge.textContent =
                numericCount > 99
                    ? "99+"
                    : String(
                        numericCount
                    );


            badge.style.display =
                numericCount > 0
                    ? ""
                    : "none";

        }
    );

}


// ======================================================
// NOTIFICATION STYLES
// ======================================================

function injectNotificationStyles() {

    if (
        document.getElementById(
            "flexHubNotificationStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "flexHubNotificationStyles";


    style.textContent = `
        .notification-item {
            cursor: pointer;
        }

        .notification-item.unread {
            font-weight: 600;
        }

        .notification-panel {
            z-index: 9999;
        }

        .notification-panel.open {
            display: block;
        }

        .notification-empty {
            padding: 24px;
            text-align: center;
        }

        .notification-empty span {
            display: block;
            font-size: 30px;
            margin-bottom: 8px;
        }

        .notification-list {
            max-height: 420px;
            overflow-y: auto;
        }

        .notification-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px;
        }

        .notification-panel-header button {
            cursor: pointer;
        }
    `;


    document.head.appendChild(
        style
    );

}


// ======================================================
// PWA INSTALL
// ======================================================

let deferredInstallPrompt =
    null;


function setupPWAInstall() {

    const installButton =
        document.getElementById(
            "installAppBtn"
        );


    window.addEventListener(
        "beforeinstallprompt",
        (event) => {

            event.preventDefault();

            deferredInstallPrompt =
                event;


            if (installButton) {

                installButton.style.display =
                    "";

            }

        }
    );


    if (installButton) {

        installButton.addEventListener(
            "click",
            installPWA
        );

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


// ======================================================
// INSTALL PWA
// ======================================================

async function installPWA() {

    if (!deferredInstallPrompt) {

        showTemporaryToast(
            "App installation is not available right now.",
            "error"
        );

        return;

    }


    try {

        await deferredInstallPrompt.prompt();


        await deferredInstallPrompt.userChoice;

    } catch (error) {

        console.warn(
            "PWA installation error:",
            error
        );

    } finally {

        deferredInstallPrompt =
            null;

        hideInstallButton();

    }

}


// ======================================================
// HIDE INSTALL BUTTON
// ======================================================

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


// ======================================================
// FLEX HUB SUCCESS ANIMATION
// ======================================================

function showFlexHubAnimation(
    message = "Welcome to FLEX HUB PREDICTIONS"
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

            <div class="flex-success-logo">
                ⚽
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
        "flexHubSuccessAnimationStyles";


    style.textContent = `
        #flexHubSuccessAnimation {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(3, 5, 8, .92);
            backdrop-filter: blur(10px);
            animation: flexFadeIn .25s ease;
        }

        .flex-success-box {
            width: min(90%, 430px);
            padding: 34px;
            text-align: center;
            border-radius: 24px;
            background: #080c14;
            border: 1px solid rgba(245, 185, 66, .45);
            box-shadow: 0 25px 80px rgba(0,0,0,.55);
        }

        .flex-success-logo {
            font-size: 54px;
            margin-bottom: 12px;
        }

        .flex-success-box h2 {
            margin: 0 0 8px;
        }

        .flex-success-box p {
            margin: 0;
            opacity: .8;
        }

        @keyframes flexFadeIn {
            from {
                opacity: 0;
            }

            to {
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

            if (overlay) {

                overlay.remove();

            }


            if (style) {

                style.remove();

            }

        },
        1800
    );

}


// ======================================================
// FORM VALUE HELPER
// ======================================================

function getFormValue(
    id
) {

    const element =
        document.getElementById(id);


    if (!element) {

        return "";

    }


    return String(
        element.value || ""
    ).trim();

}


// ======================================================
// GENERIC MESSAGE HELPER
// ======================================================

function showElementMessage(
    elementOrId,
    message,
    type = "info"
) {

    const element =
        typeof elementOrId === "string"
            ? document.getElementById(
                elementOrId
            )
            : elementOrId;


    if (!element) {

        return;

    }


    element.textContent =
        message || "";


    element.classList.remove(
        "success",
        "error",
        "warning",
        "info"
    );


    element.classList.add(
        type
    );

}


// ======================================================
// VIP MESSAGE HELPER
// ======================================================

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
            button.dataset.originalText ===
            undefined
        ) {

            button.dataset.originalText =
                button.innerHTML;

        }


        button.disabled =
            true;


        button.innerHTML =
            loadingText;

    } else {

        button.disabled =
            false;


        if (
            button.dataset.originalText !==
            undefined
        ) {

            button.innerHTML =
                button.dataset.originalText;

        }

    }

}


// ======================================================
// FORMAT STATUS
// ======================================================

function formatStatus(
    status
) {

    if (!status) {

        return "Pending";

    }


    const normalized =
        String(status)
            .trim()
            .toLowerCase();


    const map = {

        pending: "Pending",

        won: "Won",

        win: "Won",

        winning: "Won",

        lost: "Lost",

        loss: "Lost",

        losing: "Lost",

        void: "Void",

        cancelled: "Cancelled",

        canceled: "Cancelled",

        completed: "Completed",

        active: "Active",

        inactive: "Inactive"

    };


    return (
        map[normalized] ||
        capitalize(
            normalized
        )
    );

}


// ======================================================
// FORMAT PLAN
// ======================================================

function formatPlan(
    plan
) {

    if (!plan) {

        return "VIP";

    }


    const normalized =
        String(plan)
            .trim()
            .toLowerCase();


    if (
        normalized.includes("week")
    ) {

        return capitalize(
            normalized
        );

    }


    if (
        normalized.includes("month")
    ) {

        return capitalize(
            normalized
        );

    }


    return capitalize(
        normalized
    );

}


// ======================================================
// FORMAT MATCH DATE
// ======================================================

function formatMatchDate(
    date
) {

    if (!date) {

        return "Date unavailable";

    }


    const parsed =
        new Date(date);


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
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ======================================================
// FORMAT EXPIRY / DATE-TIME
// ======================================================

function formatExpiry(
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
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// ======================================================
// CAPITALIZE
// ======================================================

function capitalize(
    value
) {

    if (!value) {

        return "";

    }


    const text =
        String(value)
            .trim();


    if (!text) {

        return "";

    }


    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


// ======================================================
// ESCAPE HTML
// ======================================================

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


// ======================================================
// ESCAPE JAVASCRIPT STRING
// ======================================================

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
            /\r/g,
            "\\r"
        )
        .replace(
            /\n/g,
            "\\n"
        )
        .replace(
            /</g,
            "\\u003C"
        )
        .replace(
            />/g,
            "\\u003E"
        );

}


// ======================================================
// TEMPORARY TOAST
// ======================================================

function showTemporaryToast(
    message,
    type = "info"
) {

    const existing =
        document.querySelector(
            ".flex-hub-toast"
        );


    if (existing) {

        existing.remove();

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `flex-hub-toast ${type}`;


    toast.textContent =
        message || "";


    toast.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 28px;
        transform: translateX(-50%);
        z-index: 999999;
        max-width: min(90vw, 460px);
        padding: 13px 18px;
        border-radius: 12px;
        background: #080c14;
        border: 1px solid rgba(245,185,66,.35);
        box-shadow: 0 15px 40px rgba(0,0,0,.45);
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
    `;


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            toast.remove();

        },
        3000
    );

}


// ======================================================
// GLOBAL FUNCTIONS
// ======================================================

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


// ======================================================
// FINAL SAFETY CHECK
// ======================================================

window.FLEX_HUB_APP =
    {
        version: "3.0",

        loadPredictions,
        loadResults,

        loadVipPredictions,
        loadVipBettingCodes,

        checkVipStatus,

        handleLogin,
        handleRegister,

        handleSignOut
    };


// ======================================================
// END OF APP.JS
// ======================================================
