/* =========================================================
   FLEX HUB PREDICTIONS
   COMPLETE APPLICATION JAVASCRIPT
   PART 1 OF 7

   Regular + VIP + VVIP
   Login + Register + Notifications
   Predictions + Results + Betting Codes
   ========================================================= */

"use strict";

/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API_BASE_URL = "https://flex-hub-prediction.onrender.com/api";


/* =========================================================
   STORAGE KEYS
   ========================================================= */

const STORAGE_KEYS = {
    user: "flexHubUser",
    userToken: "flexHubUserToken",

    vipToken: "flexHubVipToken",
    vvipToken: "flexHubVvipToken"
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;

let allPredictions = [];

let currentLeagueFilter = "all";
let currentResultFilter = "all";
let currentSearchQuery = "";

let countdownInterval = null;

let notificationRefreshInterval = null;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    initializeApplication();

});


/* =========================================================
   MAIN APPLICATION INITIALIZER
   ========================================================= */

async function initializeApplication() {

    try {

        setupFooterYear();
        setupWhatsAppLinks();
        setupMobileMenu();
        setupInstallPrompt();
        setupNotifications();

        const body = document.body;

        /*
         * VIP PAGE
         */
        if (body && body.classList.contains("vip-page")) {

            await setupVipPage();

            return;
        }


        /*
         * VVIP PAGE
         */
        if (body && body.classList.contains("vvip-page")) {

            await setupVvipPage();

            return;
        }


        /*
         * NORMAL WEBSITE
         */

        setupAccountForms();
        setupNavigation();
        setupSearch();
        setupLeagueFilters();
        setupResultFilters();
        setupSignOut();

        setupForgotPassword();

        await checkUserSession();

    } catch (error) {

        console.error(
            "FLEX HUB initialization error:",
            error
        );

    }

}


/* =========================================================
   STORAGE HELPERS
   ========================================================= */

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


function getVvipToken() {

    return localStorage.getItem(
        STORAGE_KEYS.vvipToken
    );

}


/* =========================================================
   SAVE USER
   ========================================================= */

function saveUser(user, token = null) {

    if (user) {

        currentUser = user;

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


/* =========================================================
   CLEAR USER SESSION
   ========================================================= */

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

    localStorage.removeItem(
        STORAGE_KEYS.vvipToken
    );

}


/* =========================================================
   API REQUEST HELPER
   ========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const requestOptions = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };


    /*
     * Add normal user token automatically
     */
    const userToken = getUserToken();

    if (
        userToken &&
        !requestOptions.headers.Authorization
    ) {

        requestOptions.headers.Authorization =
            `Bearer ${userToken}`;

    }


    let response;

    try {

        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            requestOptions
        );

    } catch (networkError) {

        console.error(
            "Network error:",
            networkError
        );

        throw new Error(
            "Unable to connect to FLEX HUB server. Please check your internet connection."
        );

    }


    let data = null;

    try {

        data = await response.json();

    } catch (error) {

        data = null;

    }


    if (!response.ok) {

        const message =
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}`;

        throw new Error(message);

    }


    return data;

}


/* =========================================================
   ACCOUNT FORMS
   ========================================================= */

function setupAccountForms() {

    const loginForm =
        document.getElementById("loginForm");

    const registerForm =
        document.getElementById("registerForm");

    const showRegisterButton =
        document.getElementById(
            "showRegisterButton"
        );

    const showLoginButton =
        document.getElementById(
            "showLoginButton"
        );


    /*
     * LOGIN
     */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /*
     * REGISTER
     */

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );

    }


    /*
     * SWITCH TO REGISTER
     */

    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            () => {

                showAccountPanel("register");

            }
        );

    }


    /*
     * SWITCH TO LOGIN
     */

    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            () => {

                showAccountPanel("login");

            }
        );

    }

}


/* =========================================================
   ACCOUNT PANEL SWITCHING
   ========================================================= */

function showAccountPanel(type) {

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );

    const registerPanel =
        document.getElementById(
            "registerPanel"
        );


    if (type === "register") {

        if (loginPanel) {
            loginPanel.style.display = "none";
        }

        if (registerPanel) {
            registerPanel.style.display = "block";
        }

    } else {

        if (registerPanel) {
            registerPanel.style.display = "none";
        }

        if (loginPanel) {
            loginPanel.style.display = "block";
        }

    }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

    event.preventDefault();


    const identifier =
        getInputValue("loginIdentifier");

    const password =
        getInputValue("loginPassword");

    const rememberMe =
        document.getElementById(
            "rememberMe"
        )?.checked || false;


    const messageElement =
        document.getElementById(
            "loginMessage"
        );


    if (!identifier || !password) {

        showFormMessage(
            messageElement,
            "Please enter your username/email and password.",
            "error"
        );

        return;
    }


    const submitButton =
        event.target.querySelector(
            'button[type="submit"]'
        );


    setButtonLoading(
        submitButton,
        true,
        "Signing in..."
    );


    try {

        const data = await apiRequest(
            "/login",
            {
                method: "POST",
                body: JSON.stringify({
                    identifier,
                    password,
                    rememberMe
                })
            }
        );


        if (!data?.user) {

            throw new Error(
                "Login succeeded but no user information was returned."
            );

        }


        saveUser(
            data.user,
            data.token || null
        );


        showFormMessage(
            messageElement,
            "Login successful. Welcome to FLEX HUB!",
            "success"
        );


        showFlexHubAnimation(
            () => {

                openMainWebsite();

            }
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        showFormMessage(
            messageElement,
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


/* =========================================================
   REGISTER
   ========================================================= */

async function handleRegister(event) {

    event.preventDefault();


    const name =
        getInputValue("registerName");

    const username =
        getInputValue("registerUsername");

    const email =
        getInputValue("registerEmail");

    const password =
        getInputValue("registerPassword");

    const confirmPassword =
        getInputValue("registerConfirmPassword");


    const termsAccepted =
        document.getElementById(
            "registerTerms"
        )?.checked || false;


    const messageElement =
        document.getElementById(
            "registerMessage"
        );


    if (
        !name ||
        !username ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        showFormMessage(
            messageElement,
            "Please complete all required fields.",
            "error"
        );

        return;
    }


    if (password !== confirmPassword) {

        showFormMessage(
            messageElement,
            "Passwords do not match.",
            "error"
        );

        return;
    }


    if (!termsAccepted) {

        showFormMessage(
            messageElement,
            "Please accept the terms before creating your account.",
            "error"
        );

        return;
    }


    if (password.length < 6) {

        showFormMessage(
            messageElement,
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    const submitButton =
        event.target.querySelector(
            'button[type="submit"]'
        );


    setButtonLoading(
        submitButton,
        true,
        "Creating account..."
    );


    try {

        const data = await apiRequest(
            "/register",
            {
                method: "POST",
                body: JSON.stringify({
                    name,
                    username,
                    email,
                    password,
                    confirmPassword
                })
            }
        );


        /*
         * Some backend versions automatically
         * log the user in after registration.
         */

        if (data?.user) {

            saveUser(
                data.user,
                data.token || null
            );


            showFormMessage(
                messageElement,
                "Account created successfully!",
                "success"
            );


            showFlexHubAnimation(
                () => {

                    openMainWebsite();

                }
            );


            return;
        }


        /*
         * If backend does not automatically
         * log the user in, return to login.
         */

        showFormMessage(
            messageElement,
            data?.message ||
                "Account created successfully. Please login.",
            "success"
        );


        setTimeout(
            () => {

                showAccountPanel("login");

            },
            1200
        );


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        showFormMessage(
            messageElement,
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


/* =========================================================
   CHECK USER SESSION
   ========================================================= */

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


        if (data?.user) {

            saveUser(
                data.user
            );

            updateUserUI();

            openMainWebsite();

            return true;

        }


        throw new Error(
            "Invalid session."
        );


    } catch (error) {

        console.warn(
            "Session check failed:",
            error.message
        );

        clearUserSession();

        showAccountGate();

        return false;

    }

}


/* =========================================================
   ACCOUNT GATE
   ========================================================= */

function showAccountGate() {

    const gate =
        document.getElementById(
            "accountGate"
        );

    const mainWebsite =
        document.getElementById(
            "mainWebsite"
        );


    if (gate) {

        gate.style.display = "flex";

    }


    if (mainWebsite) {

        mainWebsite.style.display = "none";

    }

}


function hideAccountGate() {

    const gate =
        document.getElementById(
            "accountGate"
        );

    if (gate) {

        gate.style.display = "none";

    }

}


/* =========================================================
   OPEN MAIN WEBSITE
   ========================================================= */

async function openMainWebsite() {

    hideAccountGate();


    const mainWebsite =
        document.getElementById(
            "mainWebsite"
        );


    if (mainWebsite) {

        mainWebsite.style.display = "";

    }


    updateUserUI();


    /*
     * Load normal website content
     */

    await Promise.allSettled([
        loadPredictions(),
        loadRegularBettingCodes(),
        loadResults()
    ]);


    updatePredictionStats();

    updateVipPredictionCount();

    loadTeamBadges();

}


/* =========================================================
   USER UI
   ========================================================= */

function updateUserUI() {

    const user =
        currentUser ||
        getStoredUser();


    if (!user) {
        return;
    }


    currentUser = user;


    const name =
        user.name ||
        user.username ||
        "Member";


    const userNameElements =
        document.querySelectorAll(
            ".user-name, #headerUserName"
        );


    userNameElements.forEach(
        element => {

            element.textContent =
                name;

        }
    );


    const dashboardName =
        document.getElementById(
            "dashboardUserName"
        );


    if (dashboardName) {

        dashboardName.textContent =
            name;

    }


    const dashboardEmail =
        document.getElementById(
            "dashboardUserEmail"
        );


    if (dashboardEmail) {

        dashboardEmail.textContent =
            user.email || "";

    }

}


/* =========================================================
   END OF PART 1
   ========================================================= */
/* =========================================================
   FLEX HUB PREDICTIONS
   COMPLETE APPLICATION JAVASCRIPT
   PART 2 OF 7
   ========================================================= */


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const navLinks =
        document.querySelectorAll(
            "#mainNav a"
        );


    navLinks.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                closeMobileMenu();

            }
        );

    });

}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "predictionSearch"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
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


/* =========================================================
   LEAGUE FILTERS
   ========================================================= */

function setupLeagueFilters() {

    const buttons =
        document.querySelectorAll(
            "[data-league]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const league =
                    button.dataset.league ||
                    "all";


                currentLeagueFilter =
                    league.toLowerCase();


                updateLeagueFilterUI(
                    buttons,
                    button
                );


                renderPredictions();

            }
        );

    });

}


/* =========================================================
   UPDATE LEAGUE FILTER UI
   ========================================================= */

function updateLeagueFilterUI(
    buttons,
    activeButton
) {

    buttons.forEach(button => {

        button.classList.remove(
            "active"
        );

    });


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }

}


/* =========================================================
   RESULT FILTERS
   ========================================================= */

function setupResultFilters() {

    const buttons =
        document.querySelectorAll(
            "[data-result-filter]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentResultFilter =
                    (
                        button.dataset.resultFilter ||
                        "all"
                    ).toLowerCase();


                updateResultFilterUI(
                    buttons,
                    button
                );


                loadResults();

            }
        );

    });

}


/* =========================================================
   UPDATE RESULT FILTER UI
   ========================================================= */

function updateResultFilterUI(
    buttons,
    activeButton
) {

    buttons.forEach(button => {

        button.classList.remove(
            "active"
        );

    });


    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }

}


/* =========================================================
   LOAD REGULAR PREDICTIONS
   ========================================================= */

async function loadPredictions() {

    const grid =
        document.getElementById(
            "predictionsGrid"
        );


    if (!grid) {
        return;
    }


    showLoadingState(
        grid,
        "Loading football predictions..."
    );


    try {

        const data =
            await apiRequest(
                "/predictions"
            );


        if (Array.isArray(data)) {

            allPredictions =
                data;

        } else if (
            Array.isArray(data?.predictions)
        ) {

            allPredictions =
                data.predictions;

        } else {

            allPredictions = [];

        }


        renderPredictions();

        updatePredictionStats();


        /*
         * Countdown timers
         */

        startCountdowns();


    } catch (error) {

        console.error(
            "Unable to load predictions:",
            error
        );


        allPredictions = [];


        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Unable to load predictions</h3>
                <p>
                    ${escapeHtml(
                        error.message ||
                        "Please try again later."
                    )}
                </p>
                <button
                    class="btn btn-primary"
                    type="button"
                    onclick="loadPredictions()"
                >
                    Try Again
                </button>
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
        Array.isArray(allPredictions)
            ? [...allPredictions]
            : [];


    /*
     * League filter
     */

    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {

        predictions =
            predictions.filter(
                prediction => {

                    const league =
                        String(
                            prediction.league ||
                            prediction.competition ||
                            ""
                        ).toLowerCase();


                    return league.includes(
                        currentLeagueFilter
                    );

                }
            );

    }


    /*
     * Search filter
     */

    if (currentSearchQuery) {

        predictions =
            predictions.filter(
                prediction => {

                    const searchableText = [
                        prediction.homeTeam,
                        prediction.awayTeam,
                        prediction.home,
                        prediction.away,
                        prediction.league,
                        prediction.competition,
                        prediction.category,
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


    /*
     * No predictions
     */

    if (!predictions.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚽</div>
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
                prediction =>
                    createPredictionCard(
                        prediction
                    )
            )
            .join("");


    loadTeamBadges();

    startCountdowns();

}


/* =========================================================
   CREATE REGULAR PREDICTION CARD
   ========================================================= */

function createPredictionCard(
    prediction
) {

    const id =
        prediction._id ||
        prediction.id ||
        "";


    const homeTeam =
        prediction.homeTeam ||
        prediction.home ||
        "Home Team";


    const awayTeam =
        prediction.awayTeam ||
        prediction.away ||
        "Away Team";


    const league =
        prediction.league ||
        prediction.competition ||
        "Football";


    const category =
        prediction.category ||
        "Match Prediction";


    const predictionValue =
        prediction.prediction ||
        prediction.tip ||
        prediction.pick ||
        "Pending";


    const analysis =
        prediction.analysis ||
        prediction.reason ||
        "No analysis available.";


    const matchDate =
        prediction.matchDate ||
        prediction.date ||
        prediction.kickoff ||
        prediction.startTime ||
        "";


    const status =
        prediction.status ||
        "";


    const featured =
        prediction.featured === true ||
        prediction.isFeatured === true;


    const vip =
        prediction.vip === true ||
        prediction.isVip === true;


    const safeHome =
        escapeHtml(homeTeam);


    const safeAway =
        escapeHtml(awayTeam);


    const safeLeague =
        escapeHtml(league);


    const safeCategory =
        escapeHtml(category);


    const safePrediction =
        escapeHtml(predictionValue);


    const safeAnalysis =
        escapeHtml(analysis);


    const formattedDate =
        formatMatchDate(
            matchDate
        );


    const statusHtml =
        status
            ? `
                <div class="prediction-status ${getStatusClass(status)}">
                    ${escapeHtml(
                        formatStatus(status)
                    )}
                </div>
            `
            : "";


    const vipTag =
        vip
            ? `
                <span class="vip-tag">
                    VIP
                </span>
            `
            : "";


    return `
        <article
            class="
                prediction-card
                ${featured ? "featured-prediction" : ""}
            "
            data-prediction-id="${escapeHtml(
                String(id)
            )}"
        >

            ${
                featured
                    ? `
                        <div class="featured-badge">
                            ⭐ FEATURED
                        </div>
                    `
                    : ""
            }

            <div class="prediction-card-header">

                <div class="prediction-league">
                    ${safeLeague}
                </div>

                <div class="prediction-category">
                    ${safeCategory}
                    ${vipTag}
                </div>

            </div>


            <div class="prediction-teams">

                <div class="team">

                    <div
                        class="team-badge"
                        data-team-name="${safeHome}"
                    >
                        ⚽
                    </div>

                    <strong>
                        ${safeHome}
                    </strong>

                </div>


                <div class="vs">
                    VS
                </div>


                <div class="team">

                    <div
                        class="team-badge"
                        data-team-name="${safeAway}"
                    >
                        ⚽
                    </div>

                    <strong>
                        ${safeAway}
                    </strong>

                </div>

            </div>


            <div class="prediction-meta">

                <div>
                    <small>
                        DATE
                    </small>

                    <strong>
                        ${escapeHtml(
                            formattedDate
                        )}
                    </strong>
                </div>


                <div>
                    <small>
                        PREDICTION
                    </small>

                    <strong
                        class="prediction-value"
                    >
                        ${safePrediction}
                    </strong>
                </div>

            </div>


            <div class="prediction-analysis">

                <strong>
                    Analysis
                </strong>

                <p>
                    ${safeAnalysis}
                </p>

            </div>


            ${statusHtml}

            ${
                matchDate
                    ? `
                        <div
                            class="match-countdown"
                            data-match-date="${escapeHtml(
                                String(matchDate)
                            )}"
                        >
                            <span>
                                ⏳
                            </span>

                            <strong>
                                Calculating...
                            </strong>
                        </div>
                    `
                    : ""
            }

        </article>
    `;

}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(status) {

    const value =
        String(status)
            .toLowerCase();


    if (
        value.includes("win") ||
        value.includes("won") ||
        value.includes("success")
    ) {

        return "status-win";

    }


    if (
        value.includes("loss") ||
        value.includes("lost") ||
        value.includes("fail")
    ) {

        return "status-loss";

    }


    if (
        value.includes("void") ||
        value.includes("draw") ||
        value.includes("push")
    ) {

        return "status-void";

    }


    return "status-pending";

}


/* =========================================================
   COUNTDOWN TIMER
   ========================================================= */

function startCountdowns() {

    if (countdownInterval) {

        clearInterval(
            countdownInterval
        );

    }


    updateMatchCountdowns();


    countdownInterval =
        setInterval(
            updateMatchCountdowns,
            1000
        );

}


/* =========================================================
   UPDATE MATCH COUNTDOWNS
   ========================================================= */

function updateMatchCountdowns() {

    const countdowns =
        document.querySelectorAll(
            ".match-countdown"
        );


    if (!countdowns.length) {
        return;
    }


    const now =
        new Date().getTime();


    countdowns.forEach(
        countdown => {

            const dateValue =
                countdown.dataset.matchDate;


            if (!dateValue) {
                return;
            }


            const matchTime =
                new Date(
                    dateValue
                ).getTime();


            if (
                Number.isNaN(matchTime)
            ) {

                countdown.innerHTML = `
                    <span>⏳</span>
                    <strong>
                        Match time unavailable
                    </strong>
                `;

                return;
            }


            const difference =
                matchTime - now;


            if (difference <= 0) {

                countdown.innerHTML = `
                    <span>🔴</span>
                    <strong>
                        Match started
                    </strong>
                `;

                return;
            }


            const days =
                Math.floor(
                    difference /
                    (1000 * 60 * 60 * 24)
                );


            const hours =
                Math.floor(
                    (
                        difference %
                        (1000 * 60 * 60 * 24)
                    ) /
                    (1000 * 60 * 60)
                );


            const minutes =
                Math.floor(
                    (
                        difference %
                        (1000 * 60 * 60)
                    ) /
                    (1000 * 60)
                );


            const seconds =
                Math.floor(
                    (
                        difference %
                        (1000 * 60)
                    ) /
                    1000
                );


            let display = "";


            if (days > 0) {

                display =
                    `${days}d ${hours}h ${minutes}m`;

            } else {

                display =
                    `${hours}h ${minutes}m ${seconds}s`;

            }


            countdown.innerHTML = `
                <span>⏳</span>
                <strong>
                    Starts in ${escapeHtml(display)}
                </strong>
            `;

        }
    );

}


/* =========================================================
   UPDATE PREDICTION STATISTICS
   ========================================================= */

function updatePredictionStats() {

    const count =
        Array.isArray(allPredictions)
            ? allPredictions.length
            : 0;


    const possibleIds = [
        "predictionCount",
        "totalPredictions",
        "statsPredictionCount"
    ];


    possibleIds.forEach(id => {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                count;

        }

    });


    /*
     * Also update generic statistic
     * elements when available.
     */

    const elements =
        document.querySelectorAll(
            "[data-prediction-count]"
        );


    elements.forEach(element => {

        element.textContent =
            count;

    });

}


/* =========================================================
   UPDATE VIP PREDICTION COUNT
   ========================================================= */

async function updateVipPredictionCount() {

    const countElements =
        document.querySelectorAll(
            "[data-vip-prediction-count], #vipPredictionCount"
        );


    if (!countElements.length) {
        return;
    }


    const token =
        getVipToken();


    if (!token) {

        countElements.forEach(
            element => {

                element.textContent =
                    "0";

            }
        );

        return;
    }


    try {

        const data =
            await apiRequest(
                "/vip/predictions",
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        const predictions =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(
                        data?.predictions
                    )
                        ? data.predictions
                        : []
                );


        countElements.forEach(
            element => {

                element.textContent =
                    predictions.length;

            }
        );


    } catch (error) {

        console.warn(
            "Unable to update VIP count:",
            error.message
        );

    }

}


/* =========================================================
   END OF PART 2
   ========================================================= */
// =====================================================
// PART 3 — RESULTS, BETTING CODES & VIP FUNCTIONS
// =====================================================


// =====================================================
// RESULTS
// =====================================================

async function loadResults() {
    const grid = document.getElementById("resultsGrid");

    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading results...</p>
        </div>
    `;

    try {
        const data = await apiRequest("/results");

        const results = Array.isArray(data)
            ? data
            : Array.isArray(data?.results)
                ? data.results
                : [];

        window.allResults = results;

        renderResults(results);

    } catch (error) {
        console.error("Load results error:", error);

        grid.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load results</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}


// =====================================================
// RENDER RESULTS
// =====================================================

function renderResults(results = window.allResults || []) {
    const grid = document.getElementById("resultsGrid");

    if (!grid) return;

    let filteredResults = [...results];

    // Result filter
    if (currentResultFilter !== "all") {
        filteredResults = filteredResults.filter(result => {
            const status = String(
                result.status ||
                result.result ||
                result.outcome ||
                ""
            ).toLowerCase();

            return status === currentResultFilter.toLowerCase();
        });
    }

    // Search filter
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();

        filteredResults = filteredResults.filter(result => {
            const homeTeam = String(
                result.homeTeam ||
                result.home ||
                ""
            ).toLowerCase();

            const awayTeam = String(
                result.awayTeam ||
                result.away ||
                ""
            ).toLowerCase();

            const league = String(
                result.league ||
                result.competition ||
                ""
            ).toLowerCase();

            return (
                homeTeam.includes(query) ||
                awayTeam.includes(query) ||
                league.includes(query)
            );
        });
    }

    if (!filteredResults.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No results found</h3>
                <p>There are no results matching your current filter.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredResults.map(createResultCard).join("");

    loadTeamBadges();
}


// =====================================================
// RESULT CARD
// =====================================================

function createResultCard(result) {
    const homeTeam = escapeHtml(
        result.homeTeam ||
        result.home ||
        "Home Team"
    );

    const awayTeam = escapeHtml(
        result.awayTeam ||
        result.away ||
        "Away Team"
    );

    const league = escapeHtml(
        result.league ||
        result.competition ||
        "Football"
    );

    const prediction = escapeHtml(
        result.prediction ||
        result.tip ||
        result.pick ||
        "-"
    );

    const homeScore =
        result.homeScore ??
        result.homeGoals ??
        result.scoreHome ??
        "-";

    const awayScore =
        result.awayScore ??
        result.awayGoals ??
        result.scoreAway ??
        "-";

    const status = String(
        result.status ||
        result.result ||
        result.outcome ||
        "pending"
    ).toLowerCase();

    const matchDate =
        result.matchDate ||
        result.date ||
        result.kickoff ||
        result.startTime;

    const formattedDate = matchDate
        ? formatMatchDate(matchDate)
        : "";

    const statusClass = getStatusClass(status);

    return `
        <article class="result-card ${statusClass}">
            <div class="result-card-top">
                <span class="result-league">
                    ${league}
                </span>

                <span class="result-status ${statusClass}">
                    ${formatStatus(status)}
                </span>
            </div>

            <div class="result-match">
                <div class="result-team">
                    <div
                        class="team-badge"
                        data-team-name="${homeTeam}"
                    >
                        ${homeTeam.charAt(0)}
                    </div>

                    <span>${homeTeam}</span>
                </div>

                <div class="result-score">
                    <strong>
                        ${homeScore} - ${awayScore}
                    </strong>

                    ${
                        formattedDate
                            ? `<small>${formattedDate}</small>`
                            : ""
                    }
                </div>

                <div class="result-team">
                    <div
                        class="team-badge"
                        data-team-name="${awayTeam}"
                    >
                        ${awayTeam.charAt(0)}
                    </div>

                    <span>${awayTeam}</span>
                </div>
            </div>

            <div class="result-card-bottom">
                <span>
                    Prediction:
                    <strong>${prediction}</strong>
                </span>
            </div>
        </article>
    `;
}


// =====================================================
// DELETE RESULT
// =====================================================

async function deleteResult(resultId) {
    if (!resultId) return;

    const confirmed = window.confirm(
        "Are you sure you want to delete this result?"
    );

    if (!confirmed) return;

    try {
        await apiRequest(`/results/${resultId}`, {
            method: "DELETE"
        });

        window.allResults = (window.allResults || []).filter(
            result =>
                String(result._id || result.id) !== String(resultId)
        );

        renderResults(window.allResults);

        showTemporaryMessage(
            "Result deleted successfully.",
            "success"
        );

    } catch (error) {
        console.error("Delete result error:", error);

        showTemporaryMessage(
            error.message || "Unable to delete result.",
            "error"
        );
    }
}


// =====================================================
// BETTING CODES — REGULAR
// =====================================================

async function loadBettingCodes() {
    const grid = document.getElementById("bettingCodesGrid");

    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading betting codes...</p>
        </div>
    `;

    try {
        const data = await apiRequest("/betting-codes");

        const codes = Array.isArray(data)
            ? data
            : Array.isArray(data?.codes)
                ? data.codes
                : Array.isArray(data?.bettingCodes)
                    ? data.bettingCodes
                    : [];

        renderBettingCodes(codes);

    } catch (error) {
        console.error("Load betting codes error:", error);

        grid.innerHTML = `
            <div class="empty-state">
                <h3>No betting codes available</h3>
                <p>Check back later for the latest codes.</p>
            </div>
        `;
    }
}


// =====================================================
// RENDER BETTING CODES
// =====================================================

function renderBettingCodes(codes = []) {
    const grid = document.getElementById("bettingCodesGrid");

    if (!grid) return;

    if (!codes.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No betting codes available</h3>
                <p>New codes will appear here when available.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = codes.map(code => {
        const codeValue = escapeHtml(
            code.code ||
            code.bookingCode ||
            code.betCode ||
            "-"
        );

        const title = escapeHtml(
            code.title ||
            code.name ||
            "Betting Code"
        );

        const description = escapeHtml(
            code.description ||
            code.note ||
            ""
        );

        return `
            <article class="betting-code-card">
                <div class="betting-code-content">
                    <span class="betting-code-label">
                        ${title}
                    </span>

                    <strong class="betting-code-value">
                        ${codeValue}
                    </strong>

                    ${
                        description
                            ? `<p>${description}</p>`
                            : ""
                    }
                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="copyBettingCode('${escapeHtml(
                        codeValue
                    )}', this)"
                >
                    Copy Code
                </button>
            </article>
        `;
    }).join("");
}


// =====================================================
// COPY BETTING CODE
// =====================================================

async function copyBettingCode(code, button = null) {
    try {
        await navigator.clipboard.writeText(code);

        if (button) {
            const originalText = button.textContent;

            button.textContent = "Copied!";

            setTimeout(() => {
                button.textContent = originalText;
            }, 1800);
        }

        showTemporaryMessage(
            "Code copied successfully.",
            "success"
        );

    } catch (error) {
        console.error("Copy code error:", error);

        showTemporaryMessage(
            "Unable to copy the code.",
            "error"
        );
    }
}


// =====================================================
// VIP PAGE
// =====================================================

function setupVipPage() {
    const userToken = getUserToken();

    if (!userToken) {
        window.location.href = "index.html";
        return;
    }

    setupVipAccessForm();
    setupVipLogout();
    verifyUserForVipPage();
}


// =====================================================
// VERIFY USER BEFORE VIP
// =====================================================

async function verifyUserForVipPage() {
    try {
        const data = await apiRequest("/user/me");

        if (data?.user) {
            currentUser = data.user;
            saveUser(data.user);

            updateUserUI(data.user);
            await checkVipStatus();
        } else {
            throw new Error("User session is invalid.");
        }

    } catch (error) {
        console.error("VIP user verification error:", error);

        clearUserSession();
        window.location.href = "index.html";
    }
}


// =====================================================
// VIP ACCESS FORM
// =====================================================

function setupVipAccessForm() {
    const form = document.getElementById("vipAccessForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const input = document.getElementById("vipAccessCode");
        const message = document.getElementById("vipMessage");

        if (!input) return;

        const code = input.value.trim();

        if (!code) {
            showFormMessage(
                message,
                "Please enter your VIP access code.",
                "error"
            );
            return;
        }

        const button = form.querySelector("button[type='submit']");

        setButtonLoading(
            button,
            true,
            "Activating..."
        );

        try {
            const data = await apiRequest("/vip/access", {
                method: "POST",
                body: JSON.stringify({
                    accessCode: code
                })
            });

            if (data?.token) {
                localStorage.setItem(
                    STORAGE_KEYS.vipToken,
                    data.token
                );
            }

            showFormMessage(
                message,
                data?.message ||
                    "VIP access activated successfully.",
                "success"
            );

            input.value = "";

            await checkVipStatus();

        } catch (error) {
            console.error("VIP access error:", error);

            showFormMessage(
                message,
                error.message ||
                    "Unable to activate VIP access.",
                "error"
            );

        } finally {
            setButtonLoading(
                button,
                false,
                "Activate VIP Access"
            );
        }
    });
}


// =====================================================
// CHECK VIP STATUS
// =====================================================

async function checkVipStatus() {
    const token = getVipToken();

    if (!token) {
        updateVipStatusUI({
            active: false
        });

        return;
    }

    try {
        const data = await apiRequest(
            "/vip/status",
            {
                token,
                useUserToken: false
            }
        );

        updateVipStatusUI(data);

        if (
            data?.active ||
            data?.isActive ||
            data?.status === "active"
        ) {
            await loadVipPredictions();
            await loadVipBettingCodes();
        }

    } catch (error) {
        console.error("VIP status error:", error);

        localStorage.removeItem(
            STORAGE_KEYS.vipToken
        );

        updateVipStatusUI({
            active: false
        });
    }
}


// =====================================================
// VIP STATUS UI
// =====================================================

function updateVipStatusUI(data = {}) {
    const status = document.getElementById("vipStatus");
    const plan = document.getElementById("vipPlan");
    const expiry = document.getElementById("vipExpiry");

    const active =
        data.active ||
        data.isActive ||
        data.status === "active";

    if (status) {
        status.textContent = active
            ? "ACTIVE"
            : "INACTIVE";

        status.className =
            `vip-status-value ${
                active ? "active" : "inactive"
            }`;
    }

    if (plan) {
        plan.textContent = active
            ? formatPlan(
                data.plan ||
                data.duration ||
                data.subscriptionPlan
            )
            : "No Active Plan";
    }

    if (expiry) {
        expiry.textContent = active
            ? formatExpiry(
                data.expiry ||
                data.expiresAt ||
                data.expirationDate
            )
            : "Not Active";
    }

    const accessCard =
        document.querySelector(".vip-access-card");

    if (accessCard && active) {
        accessCard.classList.add("vip-active");
    }
}


// =====================================================
// LOAD VIP PREDICTIONS
// =====================================================

async function loadVipPredictions() {
    const grid =
        document.getElementById("vipPredictionsGrid");

    if (!grid) return;

    const token = getVipToken();

    if (!token) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>VIP access required</h3>
                <p>Activate your VIP membership to view these predictions.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading VIP predictions...</p>
        </div>
    `;

    try {
        const data = await apiRequest(
            "/vip/predictions",
            {
                token,
                useUserToken: false
            }
        );

        const predictions = Array.isArray(data)
            ? data
            : Array.isArray(data?.predictions)
                ? data.predictions
                : [];

        renderVipPredictions(predictions);

    } catch (error) {
        console.error(
            "Load VIP predictions error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <h3>Unable to load VIP predictions</h3>
                <p>Please refresh the page or try again later.</p>
            </div>
        `;
    }
}


// =====================================================
// RENDER VIP PREDICTIONS
// =====================================================

function renderVipPredictions(predictions = []) {
    const grid =
        document.getElementById("vipPredictionsGrid");

    if (!grid) return;

    if (!predictions.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No VIP predictions available</h3>
                <p>New VIP predictions will appear here.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = predictions
        .map(createPredictionCard)
        .join("");

    loadTeamBadges();
    startCountdowns();
}


// =====================================================
// VIP BETTING CODES
// =====================================================

async function loadVipBettingCodes() {
    const grid =
        document.getElementById("vipBettingCodesGrid");

    if (!grid) return;

    const token = getVipToken();

    if (!token) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>VIP access required</h3>
                <p>Activate VIP access to view betting codes.</p>
            </div>
        `;
        return;
    }

    try {
        const data = await apiRequest(
            "/vip/betting-codes",
            {
                token,
                useUserToken: false
            }
        );

        const codes = Array.isArray(data)
            ? data
            : Array.isArray(data?.codes)
                ? data.codes
                : Array.isArray(data?.bettingCodes)
                    ? data.bettingCodes
                    : [];

        renderVipBettingCodes(codes);

    } catch (error) {
        console.error(
            "Load VIP betting codes error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <h3>No VIP betting codes available</h3>
                <p>Check back later for new codes.</p>
            </div>
        `;
    }
}


// =====================================================
// RENDER VIP BETTING CODES
// =====================================================

function renderVipBettingCodes(codes = []) {
    const grid =
        document.getElementById("vipBettingCodesGrid");

    if (!grid) return;

    if (!codes.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No VIP betting codes available</h3>
                <p>New codes will appear here when available.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = codes.map(code => {
        const value = String(
            code.code ||
            code.bookingCode ||
            code.betCode ||
            "-"
        );

        const title = escapeHtml(
            code.title ||
            code.name ||
            "VIP Betting Code"
        );

        const description = escapeHtml(
            code.description ||
            code.note ||
            ""
        );

        return `
            <article class="betting-code-card vip-betting-code-card">
                <div class="betting-code-content">
                    <span class="betting-code-label">
                        ${title}
                    </span>

                    <strong class="betting-code-value">
                        ${escapeHtml(value)}
                    </strong>

                    ${
                        description
                            ? `<p>${description}</p>`
                            : ""
                    }
                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="copyBettingCode('${escapeHtml(value)}', this)"
                >
                    Copy Code
                </button>
            </article>
        `;
    }).join("");
}


// =====================================================
// VIP LOGOUT
// =====================================================

function setupVipLogout() {
    const button =
        document.getElementById("vipLogoutButton");

    if (!button) return;

    button.addEventListener("click", () => {
        localStorage.removeItem(
            STORAGE_KEYS.vipToken
        );

        window.location.href = "index.html";
    });
}


// =====================================================
// UPDATE VIP PREDICTION COUNT
// =====================================================

async function refreshVipPredictionCount() {
    const countElement =
        document.getElementById("vipPredictionCount");

    if (!countElement) return;

    const token = getVipToken();

    if (!token) {
        countElement.textContent = "0";
        return;
    }

    try {
        const data = await apiRequest(
            "/vip/predictions",
            {
                token,
                useUserToken: false
            }
        );

        const predictions = Array.isArray(data)
            ? data
            : Array.isArray(data?.predictions)
                ? data.predictions
                : [];

        countElement.textContent =
            String(predictions.length);

    } catch (error) {
        console.error(
            "VIP prediction count error:",
            error
        );

        countElement.textContent = "0";
    }
}
// =====================================================
// PART 4 — VVIP FUNCTIONS
// =====================================================


// =====================================================
// VVIP PAGE SETUP
// =====================================================

function setupVvipPage() {
    const userToken = getUserToken();

    if (!userToken) {
        window.location.href = "index.html";
        return;
    }

    setupVvipAccessForm();
    setupVvipLogout();
    verifyUserForVvipPage();
}


// =====================================================
// VERIFY USER BEFORE VVIP
// =====================================================

async function verifyUserForVvipPage() {
    try {
        const data = await apiRequest("/user/me");

        if (!data?.user) {
            throw new Error("User session is invalid.");
        }

        currentUser = data.user;

        saveUser(data.user);
        updateUserUI(data.user);

        await checkVvipStatus();

    } catch (error) {
        console.error(
            "VVIP user verification error:",
            error
        );

        clearUserSession();

        window.location.href = "index.html";
    }
}


// =====================================================
// VVIP ACCESS FORM
// =====================================================

function setupVvipAccessForm() {
    const form =
        document.getElementById("vvipAccessForm");

    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const input =
            document.getElementById("vvipAccessCode");

        const message =
            document.getElementById("vvipMessage");

        if (!input) return;

        const code = input.value.trim();

        if (!code) {
            showFormMessage(
                message,
                "Please enter your VVIP subscription code.",
                "error"
            );

            return;
        }

        const button =
            form.querySelector("button[type='submit']");

        setButtonLoading(
            button,
            true,
            "Activating..."
        );

        try {
            const data = await apiRequest(
                "/vvip/access",
                {
                    method: "POST",
                    body: JSON.stringify({
                        accessCode: code
                    })
                }
            );

            if (data?.token) {
                localStorage.setItem(
                    STORAGE_KEYS.vvipToken,
                    data.token
                );
            }

            showFormMessage(
                message,
                data?.message ||
                    "VVIP access activated successfully.",
                "success"
            );

            input.value = "";

            await checkVvipStatus();

        } catch (error) {
            console.error(
                "VVIP access error:",
                error
            );

            showFormMessage(
                message,
                error.message ||
                    "Unable to activate VVIP access.",
                "error"
            );

        } finally {
            setButtonLoading(
                button,
                false,
                "Activate VVIP Access"
            );
        }
    });
}


// =====================================================
// CHECK VVIP STATUS
// =====================================================

async function checkVvipStatus() {
    const token = getVvipToken();

    if (!token) {
        updateVvipStatusUI({
            active: false
        });

        return;
    }

    try {
        const data = await apiRequest(
            "/vvip/status",
            {
                token,
                useUserToken: false
            }
        );

        updateVvipStatusUI(data);

        const active =
            data?.active ||
            data?.isActive ||
            data?.status === "active";

        if (active) {
            await loadVvipPredictions();
            await loadVvipBettingCodes();
        }

    } catch (error) {
        console.error(
            "VVIP status error:",
            error
        );

        localStorage.removeItem(
            STORAGE_KEYS.vvipToken
        );

        updateVvipStatusUI({
            active: false
        });
    }
}


// =====================================================
// UPDATE VVIP STATUS UI
// =====================================================

function updateVvipStatusUI(data = {}) {
    const status =
        document.getElementById("vvipStatus");

    const plan =
        document.getElementById("vvipPlan");

    const expiry =
        document.getElementById("vvipExpiry");

    const active =
        data.active ||
        data.isActive ||
        data.status === "active";

    if (status) {
        status.textContent = active
            ? "ACTIVE"
            : "INACTIVE";

        status.className =
            `vip-status-value ${
                active ? "active" : "inactive"
            }`;
    }

    if (plan) {
        plan.textContent = active
            ? formatPlan(
                data.plan ||
                data.duration ||
                data.subscriptionPlan
            )
            : "No Active Plan";
    }

    if (expiry) {
        expiry.textContent = active
            ? formatExpiry(
                data.expiry ||
                data.expiresAt ||
                data.expirationDate
            )
            : "Not Active";
    }

    const accessCard =
        document.querySelector(".vvip-access-card");

    if (accessCard) {
        accessCard.classList.toggle(
            "vip-active",
            Boolean(active)
        );
    }

    const page =
        document.body;

    if (page) {
        page.classList.toggle(
            "vvip-unlocked",
            Boolean(active)
        );
    }
}


// =====================================================
// LOAD VVIP PREDICTIONS
// =====================================================

async function loadVvipPredictions() {
    const grid =
        document.getElementById(
            "vvipPredictionsGrid"
        );

    if (!grid) return;

    const token = getVvipToken();

    if (!token) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>VVIP access required</h3>
                <p>
                    Activate your VVIP membership
                    to view these predictions.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading VVIP predictions...</p>
        </div>
    `;

    try {
        const data = await apiRequest(
            "/vvip/predictions",
            {
                token,
                useUserToken: false
            }
        );

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(data?.predictions)
                    ? data.predictions
                    : [];

        renderVvipPredictions(predictions);

    } catch (error) {
        console.error(
            "Load VVIP predictions error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <h3>
                    Unable to load VVIP predictions
                </h3>

                <p>
                    Please refresh the page
                    or try again later.
                </p>
            </div>
        `;
    }
}


// =====================================================
// RENDER VVIP PREDICTIONS
// =====================================================

function renderVvipPredictions(
    predictions = []
) {
    const grid =
        document.getElementById(
            "vvipPredictionsGrid"
        );

    if (!grid) return;

    if (!predictions.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>
                    No VVIP predictions available
                </h3>

                <p>
                    New VVIP predictions
                    will appear here.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML = predictions
        .map(createPredictionCard)
        .join("");

    loadTeamBadges();
    startCountdowns();
}


// =====================================================
// LOAD VVIP BETTING CODES
// =====================================================

async function loadVvipBettingCodes() {
    const grid =
        document.getElementById(
            "vvipBettingCodesGrid"
        );

    if (!grid) return;

    const token = getVvipToken();

    if (!token) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>VVIP access required</h3>
                <p>
                    Activate VVIP access
                    to view betting codes.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading VVIP betting codes...</p>
        </div>
    `;

    try {
        const data = await apiRequest(
            "/vvip/betting-codes",
            {
                token,
                useUserToken: false
            }
        );

        const codes =
            Array.isArray(data)
                ? data
                : Array.isArray(data?.codes)
                    ? data.codes
                    : Array.isArray(
                        data?.bettingCodes
                    )
                        ? data.bettingCodes
                        : [];

        renderVvipBettingCodes(codes);

    } catch (error) {
        console.error(
            "Load VVIP betting codes error:",
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <h3>
                    No VVIP betting codes available
                </h3>

                <p>
                    Check back later for
                    new VVIP codes.
                </p>
            </div>
        `;
    }
}


// =====================================================
// RENDER VVIP BETTING CODES
// =====================================================

function renderVvipBettingCodes(
    codes = []
) {
    const grid =
        document.getElementById(
            "vvipBettingCodesGrid"
        );

    if (!grid) return;

    if (!codes.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>
                    No VVIP betting codes available
                </h3>

                <p>
                    New VVIP codes will
                    appear here when available.
                </p>
            </div>
        `;

        return;
    }

    grid.innerHTML = codes.map(code => {
        const codeValue = String(
            code.code ||
            code.bookingCode ||
            code.betCode ||
            "-"
        );

        const title = escapeHtml(
            code.title ||
            code.name ||
            "VVIP Betting Code"
        );

        const description = escapeHtml(
            code.description ||
            code.note ||
            ""
        );

        return `
            <article
                class="betting-code-card
                       vvip-betting-code-card"
            >
                <div class="betting-code-content">

                    <span class="betting-code-label">
                        ${title}
                    </span>

                    <strong class="betting-code-value">
                        ${escapeHtml(codeValue)}
                    </strong>

                    ${
                        description
                            ? `
                                <p>
                                    ${description}
                                </p>
                              `
                            : ""
                    }

                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="copyBettingCode(
                        '${escapeHtml(codeValue)}',
                        this
                    )"
                >
                    Copy Code
                </button>
            </article>
        `;
    }).join("");
}


// =====================================================
// VVIP LOGOUT
// =====================================================

function setupVvipLogout() {
    const button =
        document.getElementById(
            "vvipLogoutButton"
        );

    if (!button) return;

    button.addEventListener(
        "click",
        () => {
            localStorage.removeItem(
                STORAGE_KEYS.vvipToken
            );

            window.location.href =
                "index.html";
        }
    );
}


// =====================================================
// VVIP PREDICTION COUNT
// =====================================================

async function refreshVvipPredictionCount() {
    const countElement =
        document.getElementById(
            "vvipPredictionCount"
        );

    if (!countElement) return;

    const token = getVvipToken();

    if (!token) {
        countElement.textContent = "0";
        return;
    }

    try {
        const data = await apiRequest(
            "/vvip/predictions",
            {
                token,
                useUserToken: false
            }
        );

        const predictions =
            Array.isArray(data)
                ? data
                : Array.isArray(data?.predictions)
                    ? data.predictions
                    : [];

        countElement.textContent =
            String(predictions.length);

    } catch (error) {
        console.error(
            "VVIP prediction count error:",
            error
        );

        countElement.textContent = "0";
    }
}


// =====================================================
// VVIP ACCESS STATE HELPER
// =====================================================

function isVvipActive(data = {}) {
    return Boolean(
        data.active ||
        data.isActive ||
        data.status === "active"
    );
}


// =====================================================
// REFRESH VVIP CONTENT
// =====================================================

async function refreshVvipContent() {
    const token = getVvipToken();

    if (!token) {
        return;
    }

    try {
        const status = await apiRequest(
            "/vvip/status",
            {
                token,
                useUserToken: false
            }
        );

        if (!isVvipActive(status)) {
            updateVvipStatusUI(status);
            return;
        }

        updateVvipStatusUI(status);

        await Promise.all([
            loadVvipPredictions(),
            loadVvipBettingCodes()
        ]);

    } catch (error) {
        console.error(
            "Refresh VVIP content error:",
            error
        );
    }
}
// =====================================================
// PART 5 — FORGOT PASSWORD, MOBILE MENU & HELPERS
// =====================================================


// =====================================================
// FORGOT PASSWORD
// =====================================================

function setupForgotPassword() {
    const button =
        document.getElementById("forgotPasswordButton");

    if (!button) return;

    button.addEventListener("click", () => {
        openForgotPasswordOverlay();
    });
}


// =====================================================
// FORGOT PASSWORD OVERLAY
// =====================================================

function openForgotPasswordOverlay() {
    const existing =
        document.getElementById(
            "forgotPasswordOverlay"
        );

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement("div");

    overlay.id =
        "forgotPasswordOverlay";

    overlay.innerHTML = `
        <div class="forgot-password-modal">

            <button
                type="button"
                class="forgot-password-close"
                id="closeForgotPassword"
                aria-label="Close"
            >
                &times;
            </button>

            <div class="forgot-password-header">
                <div class="forgot-password-icon">
                    🔐
                </div>

                <h2>
                    Forgot Password?
                </h2>

                <p>
                    Enter your email address
                    and we will help you reset
                    your password.
                </p>
            </div>

            <form id="forgotPasswordForm">

                <div class="form-group">

                    <label for="forgotPasswordEmail">
                        Email Address
                    </label>

                    <input
                        type="email"
                        id="forgotPasswordEmail"
                        name="email"
                        placeholder="Enter your email"
                        autocomplete="email"
                        required
                    >

                </div>

                <div
                    id="forgotPasswordMessage"
                    class="form-message"
                ></div>

                <button
                    type="submit"
                    class="btn btn-primary"
                    id="forgotPasswordSubmit"
                >
                    Send Reset Request
                </button>

            </form>

        </div>
    `;

    document.body.appendChild(overlay);

    const form =
        document.getElementById(
            "forgotPasswordForm"
        );

    const closeButton =
        document.getElementById(
            "closeForgotPassword"
        );

    closeButton?.addEventListener(
        "click",
        closeForgotPasswordOverlay
    );

    overlay.addEventListener(
        "click",
        event => {
            if (event.target === overlay) {
                closeForgotPasswordOverlay();
            }
        }
    );

    form?.addEventListener(
        "submit",
        handleForgotPassword
    );
}


// =====================================================
// HANDLE FORGOT PASSWORD
// =====================================================

async function handleForgotPassword(event) {
    event.preventDefault();

    const form = event.currentTarget;

    const emailInput =
        document.getElementById(
            "forgotPasswordEmail"
        );

    const message =
        document.getElementById(
            "forgotPasswordMessage"
        );

    const button =
        document.getElementById(
            "forgotPasswordSubmit"
        );

    if (!emailInput) return;

    const email =
        emailInput.value.trim();

    if (!email) {
        showFormMessage(
            message,
            "Please enter your email address.",
            "error"
        );

        return;
    }

    setButtonLoading(
        button,
        true,
        "Sending..."
    );

    try {
        const data = await apiRequest(
            "/forgot-password",
            {
                method: "POST",
                body: JSON.stringify({
                    email
                }),
                useUserToken: false
            }
        );

        showFormMessage(
            message,
            data?.message ||
                "If the email exists, a password reset request has been sent.",
            "success"
        );

        form.reset();

    } catch (error) {
        console.error(
            "Forgot password error:",
            error
        );

        showFormMessage(
            message,
            error.message ||
                "Unable to process your request.",
            "error"
        );

    } finally {
        setButtonLoading(
            button,
            false,
            "Send Reset Request"
        );
    }
}


// =====================================================
// CLOSE FORGOT PASSWORD
// =====================================================

function closeForgotPasswordOverlay() {
    const overlay =
        document.getElementById(
            "forgotPasswordOverlay"
        );

    if (overlay) {
        overlay.remove();
    }
}


// =====================================================
// MOBILE NAVIGATION
// =====================================================

function setupMobileMenu() {
    const menuButton =
        document.getElementById("menuButton");

    const nav =
        document.getElementById("mainNav");

    if (!menuButton || !nav) {
        return;
    }

    menuButton.addEventListener(
        "click",
        () => {
            const isOpen =
                nav.classList.toggle("open");

            menuButton.classList.toggle(
                "active",
                isOpen
            );

            menuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        }
    );

    const links =
        nav.querySelectorAll("a");

    links.forEach(link => {
        link.addEventListener(
            "click",
            () => {
                nav.classList.remove("open");

                menuButton.classList.remove(
                    "active"
                );

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        );
    });

    document.addEventListener(
        "click",
        event => {
            if (
                !nav.classList.contains("open")
            ) {
                return;
            }

            if (
                !nav.contains(event.target) &&
                !menuButton.contains(event.target)
            ) {
                nav.classList.remove("open");

                menuButton.classList.remove(
                    "active"
                );

                menuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        }
    );
}


// =====================================================
// WHATSAPP LINKS
// =====================================================

function setupWhatsAppLinks() {
    const links =
        document.querySelectorAll(
            'a[href*="wa.me"], ' +
            'a[href*="whatsapp.com"]'
        );

    links.forEach(link => {
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


// =====================================================
// FOOTER YEAR
// =====================================================

function setupFooterYear() {
    const year =
        new Date().getFullYear();

    document
        .querySelectorAll("[data-current-year]")
        .forEach(element => {
            element.textContent =
                String(year);
        });

    const footerYear =
        document.getElementById(
            "footerYear"
        );

    if (footerYear) {
        footerYear.textContent =
            String(year);
    }
}


// =====================================================
// FORM MESSAGE
// =====================================================

function showFormMessage(
    element,
    message,
    type = "info"
) {
    if (!element) return;

    element.textContent =
        message || "";

    element.className =
        `form-message ${type}`;

    element.style.display =
        message ? "block" : "none";
}


// =====================================================
// TEMPORARY MESSAGE
// =====================================================

function showTemporaryMessage(
    message,
    type = "info"
) {
    let container =
        document.getElementById(
            "flexTemporaryMessage"
        );

    if (!container) {
        container =
            document.createElement("div");

        container.id =
            "flexTemporaryMessage";

        container.style.position =
            "fixed";

        container.style.top =
            "90px";

        container.style.right =
            "20px";

        container.style.zIndex =
            "99999";

        container.style.maxWidth =
            "calc(100vw - 40px)";

        document.body.appendChild(
            container
        );
    }

    const item =
        document.createElement("div");

    item.className =
        `flex-temp-message ${type}`;

    item.textContent =
        message;

    container.appendChild(item);

    setTimeout(() => {
        item.classList.add("hide");

        setTimeout(() => {
            item.remove();
        }, 300);

    }, 3000);
}


// =====================================================
// BUTTON LOADING STATE
// =====================================================

function setButtonLoading(
    button,
    loading,
    loadingText = "Loading..."
) {
    if (!button) return;

    if (loading) {
        if (!button.dataset.originalText) {
            button.dataset.originalText =
                button.textContent;
        }

        button.disabled = true;

        button.setAttribute(
            "aria-busy",
            "true"
        );

        button.textContent =
            loadingText;

    } else {
        button.disabled = false;

        button.removeAttribute(
            "aria-busy"
        );

        button.textContent =
            button.dataset.originalText ||
            button.textContent;

        delete button.dataset.originalText;
    }
}


// =====================================================
// SET TEXT HELPER
// =====================================================

function setText(
    selector,
    value
) {
    const element =
        typeof selector === "string"
            ? document.querySelector(selector)
            : selector;

    if (!element) return;

    element.textContent =
        value ?? "";
}


// =====================================================
// SAFE FORM VALUE
// =====================================================

function getInputValue(id) {
    const element =
        document.getElementById(id);

    return element
        ? element.value.trim()
        : "";
}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =====================================================
// CAPITALIZE
// =====================================================

function capitalize(value) {
    if (!value) return "";

    const text =
        String(value);

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}


// =====================================================
// FORMAT STATUS
// =====================================================

function formatStatus(status) {
    if (!status) {
        return "Pending";
    }

    const normalized =
        String(status)
            .toLowerCase()
            .replace(/[_-]+/g, " ");

    return normalized
        .split(" ")
        .map(word => capitalize(word))
        .join(" ");
}


// =====================================================
// STATUS CLASS
// =====================================================

function getStatusClass(status) {
    const value =
        String(status || "")
            .toLowerCase()
            .trim();

    if (
        value === "won" ||
        value === "win" ||
        value === "success"
    ) {
        return "status-win";
    }

    if (
        value === "lost" ||
        value === "loss" ||
        value === "lose"
    ) {
        return "status-loss";
    }

    if (
        value === "void" ||
        value === "cancelled" ||
        value === "canceled"
    ) {
        return "status-void";
    }

    if (
        value === "pending" ||
        value === "upcoming"
    ) {
        return "status-pending";
    }

    return "status-pending";
}


// =====================================================
// FORMAT PLAN
// =====================================================

function formatPlan(plan) {
    if (!plan) {
        return "Active Plan";
    }

    const normalized =
        String(plan)
            .toLowerCase()
            .replace(/[-\s]+/g, "_");

    const plans = {
        "1_week": "1 Week",
        "1week": "1 Week",
        "7_days": "1 Week",

        "2_weeks": "2 Weeks",
        "2weeks": "2 Weeks",
        "14_days": "2 Weeks",

        "1_month": "1 Month",
        "1month": "1 Month",
        "30_days": "1 Month",

        "3_months": "3 Months",
        "3months": "3 Months",

        "6_months": "6 Months",
        "6months": "6 Months",

        "1_year": "1 Year",
        "1year": "1 Year"
    };

    return (
        plans[normalized] ||
        capitalize(
            String(plan)
                .replace(/[_-]+/g, " ")
        )
    );
}


// =====================================================
// FORMAT MATCH DATE
// =====================================================

function formatMatchDate(dateValue) {
    if (!dateValue) {
        return "";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(dateValue);
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}


// =====================================================
// FORMAT EXPIRY
// =====================================================

function formatExpiry(dateValue) {
    if (!dateValue) {
        return "Not Available";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(dateValue);
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );
}
// =====================================================
// PART 6 — TEAM BADGES, ANIMATION, PWA & NOTIFICATIONS
// =====================================================


// =====================================================
// TEAM BADGES
// =====================================================

async function loadTeamBadges() {
    const badges =
        document.querySelectorAll(
            ".team-badge[data-team-name]"
        );

    if (!badges.length) return;

    const uniqueTeams = [
        ...new Set(
            Array.from(badges)
                .map(element =>
                    element.dataset.teamName?.trim()
                )
                .filter(Boolean)
        )
    ];

    if (!uniqueTeams.length) return;

    for (const teamName of uniqueTeams) {
        try {
            const badgeUrl =
                await findTeamBadge(teamName);

            if (!badgeUrl) continue;

            document
                .querySelectorAll(
                    `.team-badge[data-team-name="${CSS.escape(teamName)}"]`
                )
                .forEach(element => {
                    element.innerHTML = `
                        <img
                            src="${escapeHtml(badgeUrl)}"
                            alt="${escapeHtml(teamName)}"
                            loading="lazy"
                            onerror="
                                this.style.display='none';
                            "
                        >
                    `;

                    element.classList.add(
                        "has-team-badge"
                    );
                });

        } catch (error) {
            console.warn(
                `Unable to load badge for ${teamName}:`,
                error
            );
        }
    }
}


// =====================================================
// FIND TEAM BADGE
// =====================================================

async function findTeamBadge(teamName) {
    if (!teamName) return null;

    const cacheKey =
        `flexHubBadge_${teamName.toLowerCase()}`;

    const cached =
        localStorage.getItem(cacheKey);

    if (cached) {
        return cached;
    }

    const url =
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(
            teamName
        )}`;

    const response =
        await fetch(url);

    if (!response.ok) {
        return null;
    }

    const data =
        await response.json();

    const teams =
        Array.isArray(data?.teams)
            ? data.teams
            : [];

    if (!teams.length) {
        return null;
    }

    const normalizedSearch =
        teamName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

    let selectedTeam =
        teams.find(team => {
            const normalizedName =
                String(
                    team.strTeam || ""
                )
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]/g,
                        ""
                    );

            return (
                normalizedName ===
                normalizedSearch
            );
        });

    if (!selectedTeam) {
        selectedTeam = teams[0];
    }

    const badge =
        selectedTeam.strBadge ||
        selectedTeam.strLogo ||
        selectedTeam.strTeamBadge ||
        null;

    if (badge) {
        try {
            localStorage.setItem(
                cacheKey,
                badge
            );
        } catch (error) {
            console.warn(
                "Unable to cache team badge:",
                error
            );
        }
    }

    return badge;
}


// =====================================================
// TEAM BADGE OBSERVER
// =====================================================

function setupTeamBadgeObserver() {
    if (!document.body) return;

    let badgeTimeout = null;

    const observer =
        new MutationObserver(() => {
            clearTimeout(badgeTimeout);

            badgeTimeout = setTimeout(() => {
                loadTeamBadges();
            }, 300);
        });

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );
}


// =====================================================
// FLEX HUB PAGE ANIMATION
// =====================================================

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
        document.createElement("div");

    overlay.id =
        "flexHubAnimation";

    overlay.innerHTML = `
        <div class="flex-animation-inner">

            <div class="flex-animation-logo">
                FLEX
            </div>

            <div class="flex-animation-title">
                HUB
            </div>

            <div class="flex-animation-subtitle">
                PREDICTIONS
            </div>

            <div class="flex-animation-loader">
                <span></span>
                <span></span>
                <span></span>
            </div>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    requestAnimationFrame(() => {
        overlay.classList.add("show");
    });

    setTimeout(() => {
        overlay.classList.remove(
            "show"
        );

        setTimeout(() => {
            overlay.remove();

            if (
                typeof callback ===
                "function"
            ) {
                callback();
            }
        }, 300);

    }, 1300);
}


// =====================================================
// PWA INSTALL PROMPT
// =====================================================

let deferredInstallPrompt = null;

function setupInstallPrompt() {
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

    const installButton =
        document.getElementById(
            "installAppBtn"
        );

    if (!installButton) return;

    installButton.addEventListener(
        "click",
        async () => {
            if (!deferredInstallPrompt) {
                showTemporaryMessage(
                    "Install option is not available right now.",
                    "info"
                );

                return;
            }

            deferredInstallPrompt.prompt();

            try {
                await deferredInstallPrompt.userChoice;
            } catch (error) {
                console.warn(
                    "Install prompt error:",
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


// =====================================================
// NOTIFICATIONS
// =====================================================

function setupNotifications() {
    createNotificationBell();

    loadNotifications();

    if (
        notificationRefreshInterval
    ) {
        clearInterval(
            notificationRefreshInterval
        );
    }

    notificationRefreshInterval =
        setInterval(
            loadNotifications,
            60000
        );
}


// =====================================================
// CREATE NOTIFICATION BELL
// =====================================================

function createNotificationBell() {
    if (
        document.getElementById(
            "flexNotificationBell"
        )
    ) {
        return;
    }

    const userToken =
        getUserToken();

    if (!userToken) {
        return;
    }

    const wrapper =
        document.createElement("div");

    wrapper.id =
        "flexNotificationWrapper";

    wrapper.innerHTML = `
        <button
            type="button"
            id="flexNotificationBell"
            aria-label="Notifications"
            aria-expanded="false"
        >
            🔔
            <span
                id="flexNotificationBadge"
                style="display:none;"
            >
                0
            </span>
        </button>

        <div
            id="flexNotificationPanel"
            aria-hidden="true"
        >
            <div class="notification-panel-header">
                <strong>
                    Notifications
                </strong>

                <button
                    type="button"
                    id="markAllNotificationsRead"
                >
                    Mark all read
                </button>
            </div>

            <div
                id="flexNotificationList"
                class="notification-list"
            >
                <div class="notification-empty">
                    No notifications
                </div>
            </div>
        </div>
    `;

    const header =
        document.querySelector(
            ".site-header, header"
        );

    if (header) {
        header.appendChild(wrapper);
    } else {
        document.body.appendChild(
            wrapper
        );
    }

    const bell =
        document.getElementById(
            "flexNotificationBell"
        );

    const panel =
        document.getElementById(
            "flexNotificationPanel"
        );

    bell?.addEventListener(
        "click",
        event => {
            event.stopPropagation();

            const isOpen =
                panel.classList.toggle(
                    "open"
                );

            bell.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

            panel.setAttribute(
                "aria-hidden",
                String(!isOpen)
            );
        }
    );

    document.addEventListener(
        "click",
        event => {
            if (
                !wrapper.contains(
                    event.target
                )
            ) {
                panel?.classList.remove(
                    "open"
                );

                bell?.setAttribute(
                    "aria-expanded",
                    "false"
                );

                panel?.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        }
    );

    const markAll =
        document.getElementById(
            "markAllNotificationsRead"
        );

    markAll?.addEventListener(
        "click",
        markAllNotificationsRead
    );
}


// =====================================================
// LOAD NOTIFICATIONS
// =====================================================

async function loadNotifications() {
    const userToken =
        getUserToken();

    if (!userToken) {
        return;
    }

    try {
        const data =
            await apiRequest(
                "/notifications"
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

    } catch (error) {
        console.warn(
            "Notifications unavailable:",
            error
        );
    }
}


// =====================================================
// RENDER NOTIFICATIONS
// =====================================================

function renderNotifications(
    notifications = []
) {
    const list =
        document.getElementById(
            "flexNotificationList"
        );

    const badge =
        document.getElementById(
            "flexNotificationBadge"
        );

    const bell =
        document.getElementById(
            "flexNotificationBell"
        );

    if (!list) return;

    if (!notifications.length) {
        list.innerHTML = `
            <div class="notification-empty">
                No notifications yet.
            </div>
        `;

        if (badge) {
            badge.style.display =
                "none";
        }

        bell?.classList.remove(
            "has-notifications"
        );

        return;
    }

    const unread =
        notifications.filter(
            notification =>
                !notification.read &&
                !notification.isRead
        );

    if (badge) {
        badge.textContent =
            String(unread.length);

        badge.style.display =
            unread.length
                ? "inline-flex"
                : "none";
    }

    bell?.classList.toggle(
        "has-notifications",
        unread.length > 0
    );

    list.innerHTML =
        notifications
            .map(
                createNotificationItem
            )
            .join("");
}


// =====================================================
// CREATE NOTIFICATION ITEM
// =====================================================

function createNotificationItem(
    notification
) {
    const id =
        notification._id ||
        notification.id ||
        "";

    const title =
        escapeHtml(
            notification.title ||
            notification.subject ||
            "FLEX HUB Update"
        );

    const message =
        escapeHtml(
            notification.message ||
            notification.body ||
            ""
        );

    const createdAt =
        notification.createdAt ||
        notification.date ||
        notification.created_at;

    const isRead =
        Boolean(
            notification.read ||
            notification.isRead
        );

    return `
        <button
            type="button"
            class="
                notification-item
                ${isRead ? "read" : "unread"}
            "
            data-notification-id="${escapeHtml(
                id
            )}"
        >
            <span class="notification-dot"></span>

            <span class="notification-content">

                <strong>
                    ${title}
                </strong>

                <span>
                    ${message}
                </span>

                ${
                    createdAt
                        ? `
                            <small>
                                ${formatExpiry(
                                    createdAt
                                )}
                            </small>
                          `
                        : ""
                }

            </span>
        </button>
    `;
}


// =====================================================
// NOTIFICATION CLICK HANDLER
// =====================================================

document.addEventListener(
    "click",
    event => {
        const item =
            event.target.closest(
                ".notification-item"
            );

        if (!item) return;

        const id =
            item.dataset.notificationId;

        if (id) {
            markNotificationRead(id);
        }
    }
);


// =====================================================
// MARK NOTIFICATION AS READ
// =====================================================

async function markNotificationRead(
    notificationId
) {
    if (!notificationId) return;

    try {
        await apiRequest(
            `/notifications/${encodeURIComponent(
                notificationId
            )}/read`,
            {
                method: "PATCH"
            }
        );

        await loadNotifications();

    } catch (error) {
        console.warn(
            "Mark notification read error:",
            error
        );
    }
}


// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

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
        console.warn(
            "Mark all notifications error:",
            error
        );
    }
}


// =====================================================
// SETUP TEAM BADGE OBSERVER
// =====================================================

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        setupTeamBadgeObserver,
        {
            once: true
        }
    );
} else {
    setupTeamBadgeObserver();
}


// =====================================================
// PAGE VISIBILITY REFRESH
// =====================================================

document.addEventListener(
    "visibilitychange",
    () => {
        if (
            document.visibilityState ===
            "visible"
        ) {
            const body =
                document.body;

            if (
                body?.classList.contains(
                    "vvip-page"
                )
            ) {
                refreshVvipContent();
            }

            if (
                body?.classList.contains(
                    "vip-page"
                )
            ) {
                checkVipStatus();
            }
        }
    }
);
// =====================================================
// PART 7 — FINAL UTILITIES & GLOBAL SAFETY
// =====================================================


// =====================================================
// GLOBAL ERROR HANDLING
// =====================================================

window.addEventListener(
    "unhandledrejection",
    event => {
        console.error(
            "Unhandled promise rejection:",
            event.reason
        );
    }
);


// =====================================================
// GLOBAL JAVASCRIPT ERROR LOGGING
// =====================================================

window.addEventListener(
    "error",
    event => {
        console.error(
            "FLEX HUB JavaScript error:",
            event.error || event.message
        );
    }
);


// =====================================================
// PREVENT DOUBLE FORM SUBMISSIONS
// =====================================================

document.addEventListener(
    "submit",
    event => {
        const form =
            event.target;

        if (
            !(form instanceof HTMLFormElement)
        ) {
            return;
        }

        if (
            form.dataset.processing ===
            "true"
        ) {
            event.preventDefault();
            return;
        }

        form.dataset.processing =
            "true";

        setTimeout(() => {
            form.dataset.processing =
                "false";
        }, 1500);
    },
    true
);


// =====================================================
// KEEP CURRENT USER UI UPDATED
// =====================================================

function refreshCurrentUserUI() {
    const storedUser =
        getStoredUser();

    if (!storedUser) {
        return;
    }

    currentUser =
        storedUser;

    updateUserUI(
        storedUser
    );
}


// =====================================================
// REFRESH ACCOUNT INFORMATION
// =====================================================

async function refreshAccountInformation() {
    const token =
        getUserToken();

    if (!token) {
        return;
    }

    try {
        const data =
            await apiRequest(
                "/user/me"
            );

        if (data?.user) {
            currentUser =
                data.user;

            saveUser(
                data.user
            );

            updateUserUI(
                data.user
            );
        }

    } catch (error) {
        console.warn(
            "Account refresh failed:",
            error
        );
    }
}


// =====================================================
// GLOBAL SIGN OUT
// =====================================================

function performGlobalLogout() {
    clearUserSession();

    currentUser =
        null;

    allPredictions =
        [];

    window.location.href =
        "index.html";
}


// =====================================================
// PROTECT VIP / VVIP PAGES
// =====================================================

function protectPremiumPage() {
    const body =
        document.body;

    if (!body) return;

    const isVipPage =
        body.classList.contains(
            "vip-page"
        );

    const isVvipPage =
        body.classList.contains(
            "vvip-page"
        );

    if (
        !isVipPage &&
        !isVvipPage
    ) {
        return;
    }

    const userToken =
        getUserToken();

    if (!userToken) {
        window.location.href =
            "index.html";
    }
}


// =====================================================
// PERIODIC SESSION CHECK
// =====================================================

let sessionCheckInterval =
    null;

function startSessionMonitor() {
    if (
        sessionCheckInterval
    ) {
        clearInterval(
            sessionCheckInterval
        );
    }

    if (!getUserToken()) {
        return;
    }

    sessionCheckInterval =
        setInterval(
            async () => {
                try {
                    const data =
                        await apiRequest(
                            "/user/me"
                        );

                    if (data?.user) {
                        currentUser =
                            data.user;

                        saveUser(
                            data.user
                        );

                        updateUserUI(
                            data.user
                        );
                    }

                } catch (error) {
                    console.warn(
                        "Session check failed:",
                        error
                    );
                }
            },
            5 * 60 * 1000
        );
}


// =====================================================
// START PREMIUM PAGE MONITOR
// =====================================================

function startPremiumMonitor() {
    const body =
        document.body;

    if (!body) return;

    if (
        body.classList.contains(
            "vvip-page"
        )
    ) {
        setInterval(
            () => {
                refreshVvipContent();
            },
            5 * 60 * 1000
        );

        return;
    }

    if (
        body.classList.contains(
            "vip-page"
        )
    ) {
        setInterval(
            () => {
                checkVipStatus();
            },
            5 * 60 * 1000
        );
    }
}


// =====================================================
// ONLINE / OFFLINE STATUS
// =====================================================

function setupConnectionStatus() {
    const updateStatus = () => {
        if (!navigator.onLine) {
            showTemporaryMessage(
                "You are currently offline.",
                "info"
            );
        }
    };

    window.addEventListener(
        "offline",
        updateStatus
    );

    window.addEventListener(
        "online",
        () => {
            showTemporaryMessage(
                "Connection restored.",
                "success"
            );

            refreshAccountInformation();

            const body =
                document.body;

            if (
                body?.classList.contains(
                    "vvip-page"
                )
            ) {
                refreshVvipContent();
            }

            if (
                body?.classList.contains(
                    "vip-page"
                )
            ) {
                checkVipStatus();
            }
        }
    );
}


// =====================================================
// BACK TO TOP BUTTON
// =====================================================

function setupBackToTop() {
    const button =
        document.getElementById(
            "backToTop"
        );

    if (!button) return;

    window.addEventListener(
        "scroll",
        () => {
            button.classList.toggle(
                "show",
                window.scrollY > 500
            );
        }
    );

    button.addEventListener(
        "click",
        () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );
}


// =====================================================
// SMOOTH INTERNAL LINKS
// =====================================================

function setupSmoothLinks() {
    document.addEventListener(
        "click",
        event => {
            const link =
                event.target.closest(
                    'a[href^="#"]'
                );

            if (!link) return;

            const targetId =
                link.getAttribute(
                    "href"
                );

            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }

            const target =
                document.querySelector(
                    targetId
                );

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            history.replaceState(
                null,
                "",
                targetId
            );
        }
    );
}


// =====================================================
// INITIALIZE EXTRA FEATURES
// =====================================================

function initializeExtraFeatures() {
    setupConnectionStatus();
    setupBackToTop();
    setupSmoothLinks();

    refreshCurrentUserUI();

    protectPremiumPage();

    startSessionMonitor();

    startPremiumMonitor();
}


// =====================================================
// RUN EXTRA FEATURES
// =====================================================

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeExtraFeatures,
        {
            once: true
        }
    );
} else {
    initializeExtraFeatures();
}


// =====================================================
// GLOBAL FLEX HUB API
// =====================================================
// Useful for buttons or admin/frontend integrations.
// =====================================================

window.FlexHub = {
    getCurrentUser: () =>
        currentUser,

    getUserToken: () =>
        getUserToken(),

    getVipToken: () =>
        getVipToken(),

    getVvipToken: () =>
        getVvipToken(),

    refreshPredictions: () =>
        loadPredictions(),

    refreshResults: () =>
        loadResults(),

    refreshVip: () =>
        checkVipStatus(),

    refreshVvip: () =>
        refreshVvipContent(),

    logout: () =>
        performGlobalLogout()
};


// =====================================================
// FINAL INITIALIZATION NOTICE
// =====================================================

console.log(
    "FLEX HUB PREDICTIONS app.js loaded successfully."
);
console.log(
    "Regular, VIP and VVIP systems initialized."
);
