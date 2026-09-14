"use strict";

/* ============================================================
   FLEX HUB PREDICTIONS
   FRONTEND APPLICATION
   COMPLETE REWRITE
   PART 1/4
   ============================================================ */

const API_BASE_URL =
    "https://flex-hub-prediction.onrender.com/api";

/* ============================================================
   STORAGE
   ============================================================ */

const STORAGE_KEYS = {
    USER: "flexHubUser",
    USER_TOKEN: "flexHubUserToken",
    REMEMBER_ME: "flexHubRememberMe"
};

let currentUser = null;

let allPredictions = [];
let allResults = [];
let allBookingCodes = [];

let currentSearchTerm = "";
let currentLeagueFilter = "all";
let currentResultFilter = "all";

let notificationTimer = null;
let deferredInstallPrompt = null;

window.vipAccessActive = false;
window.vipPredictionCount = 0;

/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "FLEX HUB PREDICTIONS app starting..."
        );

        setupAccountForms();
        setupNavigation();
        setupSearch();
        setupFilters();
        setupMobileMenu();
        setupSignOut();
        setupFooter();
        setupWhatsApp();
        setupPaymentButtons();
        setupPWAInstall();
        setupForgotPassword();
        setupNotificationCenter();

        const currentPath =
            window.location.pathname.toLowerCase();

        const isVipPage =
            document.body?.dataset?.page === "vip" ||
            currentPath.includes("vip.html");

        if (isVipPage) {

            setupVipPage();

        } else {

            checkUserSession();

        }

        updateCurrentYear();
        setupTeamBadgeObserver();

    }
);


/* ============================================================
   STORAGE HELPERS
   ============================================================ */

function getUserToken() {

    return (
        localStorage.getItem(
            STORAGE_KEYS.USER_TOKEN
        ) || ""
    );

}


function getAuthToken() {

    return getUserToken();

}


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


function saveUser(
    user,
    token
) {

    if (user) {

        currentUser = user;

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

}


/* ============================================================
   DOM HELPER
   ============================================================ */

function getElement(id) {

    return document.getElementById(id);

}


/* ============================================================
   API REQUEST
   ============================================================ */

async function apiRequest(
    endpoint,
    options = {}
) {

    const {
        skipAuth = false,
        headers = {},
        ...fetchOptions
    } = options;

    const requestHeaders = {
        ...headers
    };


    if (
        fetchOptions.body &&
        typeof fetchOptions.body !== "string"
    ) {

        requestHeaders[
            "Content-Type"
        ] = "application/json";

        fetchOptions.body =
            JSON.stringify(
                fetchOptions.body
            );

    }


    if (!skipAuth) {

        const token =
            getUserToken();

        if (token) {

            requestHeaders.Authorization =
                `Bearer ${token}`;

        }

    }


    const url =
        endpoint.startsWith("http")
            ? endpoint
            : `${API_BASE_URL}${endpoint}`;


    let response;

    try {

        response =
            await fetch(
                url,
                {
                    ...fetchOptions,
                    headers:
                        requestHeaders
                }
            );

    } catch (networkError) {

        console.error(
            "Network request failed:",
            networkError
        );

        const error =
            new Error(
                "Unable to connect to the FLEX HUB server."
            );

        error.networkError =
            networkError;

        throw error;

    }


    let data = null;

    try {

        data =
            await response.json();

    } catch (_) {

        data = null;

    }


    if (!response.ok) {

        const message =
            data?.message ||
            (
                response.status === 404
                    ? "API endpoint not found."
                    : response.status === 401
                    ? "Authentication required."
                    : response.status === 403
                    ? "Access denied."
                    : `Request failed with status ${response.status}.`
            );


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


/* ============================================================
   ACCOUNT GATE
   ============================================================ */

function showAccountGate() {

    const gate =
        getElement(
            "accountGate"
        );

    const website =
        getElement(
            "mainWebsite"
        );


    if (gate) {

        gate.style.display = "";

        gate.classList.remove(
            "hidden",
            "is-hidden"
        );

    }


    if (website) {

        website.style.display =
            "none";

        website.classList.add(
            "hidden"
        );

    }

}


function hideAccountGate() {

    const gate =
        getElement(
            "accountGate"
        );

    const website =
        getElement(
            "mainWebsite"
        );


    if (gate) {

        gate.style.display =
            "none";

        gate.classList.add(
            "hidden"
        );

    }


    if (website) {

        website.style.display =
            "";

        website.classList.remove(
            "hidden"
        );

    }

}


/* ============================================================
   LOGIN / REGISTER PANELS
   ============================================================ */

function showLoginPanel() {

    const loginPanel =
        getElement(
            "loginPanel"
        );

    const registerPanel =
        getElement(
            "registerPanel"
        );


    if (loginPanel) {

        loginPanel.style.display =
            "";

    }


    if (registerPanel) {

        registerPanel.style.display =
            "none";

    }


    clearMessage(
        "registerMessage"
    );

}


function showRegisterPanel() {

    const loginPanel =
        getElement(
            "loginPanel"
        );

    const registerPanel =
        getElement(
            "registerPanel"
        );


    if (loginPanel) {

        loginPanel.style.display =
            "none";

    }


    if (registerPanel) {

        registerPanel.style.display =
            "";

    }


    clearMessage(
        "loginMessage"
    );

}


function setupAccountForms() {

    const loginForm =
        getElement(
            "loginForm"
        );

    const registerForm =
        getElement(
            "registerForm"
        );

    const showRegisterButton =
        getElement(
            "showRegisterButton"
        );

    const showLoginButton =
        getElement(
            "showLoginButton"
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


    if (showRegisterButton) {

        showRegisterButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                showRegisterPanel();

            }
        );

    }


    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                showLoginPanel();

            }
        );

    }

}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const identifierInput =
        getElement(
            "loginIdentifier"
        );

    const passwordInput =
        getElement(
            "loginPassword"
        );

    const rememberInput =
        getElement(
            "rememberMe"
        );

    const messageElement =
        getElement(
            "loginMessage"
        );


    const identifier =
        String(
            identifierInput?.value ||
            ""
        ).trim();


    const password =
        String(
            passwordInput?.value ||
            ""
        );


    if (!identifier) {

        showMessage(
            messageElement,
            "Please enter your username or email.",
            "error"
        );

        identifierInput?.focus();

        return;

    }


    if (!password) {

        showMessage(
            messageElement,
            "Please enter your password.",
            "error"
        );

        passwordInput?.focus();

        return;

    }


    setFormLoading(
        event?.currentTarget,
        true,
        "Signing in..."
    );


    showMessage(
        messageElement,
        "Signing in...",
        "info"
    );


    try {

        const data =
            await apiRequest(
                "/auth/login",
                {
                    method: "POST",
                    skipAuth: true,
                    body: {
                        identifier,
                        password
                    }
                }
            );


        if (
            !data ||
            !data.token ||
            !data.user
        ) {

            throw new Error(
                "The server returned an incomplete login response."
            );

        }


        saveUser(
            data.user,
            data.token
        );


        localStorage.setItem(
            STORAGE_KEYS.REMEMBER_ME,
            rememberInput?.checked
                ? "true"
                : "false"
        );


        const verified =
            await verifyCurrentUserSession(
                true
            );


        if (!verified) {

            console.warn(
                "Login succeeded, but session verification did not complete."
            );

        }


        currentUser =
            data.user;


        updateUserInterface();


        showMessage(
            messageElement,
            "Login successful. Opening FLEX HUB...",
            "success"
        );


        setTimeout(
            () => {

                openMainWebsite();

            },
            500
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        clearUserSession();


        showMessage(
            messageElement,
            error.message ||
                "Unable to sign in. Please try again.",
            "error"
        );


    } finally {

        setFormLoading(
            event?.currentTarget,
            false
        );

    }

}


/* ============================================================
   REGISTER
   ============================================================ */

async function handleRegister(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const nameInput =
        getElement(
            "registerName"
        );

    const usernameInput =
        getElement(
            "registerUsername"
        );

    const emailInput =
        getElement(
            "registerEmail"
        );

    const passwordInput =
        getElement(
            "registerPassword"
        );

    const confirmPasswordInput =
        getElement(
            "registerConfirmPassword"
        );

    const termsInput =
        getElement(
            "registerTerms"
        );

    const messageElement =
        getElement(
            "registerMessage"
        );


    const name =
        String(
            nameInput?.value ||
            ""
        ).trim();


    const username =
        String(
            usernameInput?.value ||
            ""
        ).trim();


    const email =
        String(
            emailInput?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const password =
        String(
            passwordInput?.value ||
            ""
        );


    const confirmPassword =
        String(
            confirmPasswordInput?.value ||
            ""
        );


    if (!name) {

        showMessage(
            messageElement,
            "Please enter your full name.",
            "error"
        );

        nameInput?.focus();

        return;

    }


    if (!username) {

        showMessage(
            messageElement,
            "Please choose a username.",
            "error"
        );

        usernameInput?.focus();

        return;

    }


    if (!email) {

        showMessage(
            messageElement,
            "Please enter your email address.",
            "error"
        );

        emailInput?.focus();

        return;

    }


    if (!password) {

        showMessage(
            messageElement,
            "Please create a password.",
            "error"
        );

        passwordInput?.focus();

        return;

    }


    if (password.length < 6) {

        showMessage(
            messageElement,
            "Password must be at least 6 characters.",
            "error"
        );

        passwordInput?.focus();

        return;

    }


    if (
        password !==
        confirmPassword
    ) {

        showMessage(
            messageElement,
            "Passwords do not match.",
            "error"
        );

        confirmPasswordInput?.focus();

        return;

    }


    if (
        termsInput &&
        !termsInput.checked
    ) {

        showMessage(
            messageElement,
            "Please accept the terms before creating your account.",
            "error"
        );

        return;

    }


    setFormLoading(
        event?.currentTarget,
        true,
        "Creating account..."
    );


    showMessage(
        messageElement,
        "Creating your account...",
        "info"
    );


    try {

        const data =
            await apiRequest(
                "/auth/register",
                {
                    method: "POST",
                    skipAuth: true,
                    body: {
                        name,
                        username,
                        email,
                        password
                    }
                }
            );


        if (
            !data ||
            !data.token ||
            !data.user
        ) {

            throw new Error(
                "The server returned an incomplete registration response."
            );

        }


        saveUser(
            data.user,
            data.token
        );


        localStorage.setItem(
            STORAGE_KEYS.REMEMBER_ME,
            "true"
        );


        await verifyCurrentUserSession(
            true
        );


        currentUser =
            data.user;


        updateUserInterface();


        showMessage(
            messageElement,
            "Account created successfully. Opening FLEX HUB...",
            "success"
        );


        setTimeout(
            () => {

                openMainWebsite();

            },
            500
        );


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        clearUserSession();


        showMessage(
            messageElement,
            error.message ||
                "Unable to create your account.",
            "error"
        );


    } finally {

        setFormLoading(
            event?.currentTarget,
            false
        );

    }

}


/* ============================================================
   VERIFY CURRENT USER
   ============================================================ */

async function verifyCurrentUserSession(
    preserveOnFailure = false
) {

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
            data &&
            data.user
        ) {

            currentUser =
                data.user;


            localStorage.setItem(
                STORAGE_KEYS.USER,
                JSON.stringify(
                    data.user
                )
            );


            return true;

        }


        return false;

    } catch (error) {

        console.warn(
            "User session verification failed:",
            error.message
        );


        if (
            !preserveOnFailure &&
            (
                error.status === 401 ||
                error.status === 403
            )
        ) {

            clearUserSession();

        }


        return false;

    }

}


/* ============================================================
   CHECK SESSION
   ============================================================ */

async function checkUserSession() {

    const token =
        getUserToken();

    const storedUser =
        getStoredUser();


    if (!token) {

        showAccountGate();

        return;

    }


    currentUser =
        storedUser;


    const verified =
        await verifyCurrentUserSession(
            false
        );


    if (verified) {

        openMainWebsite();

        return;

    }


    const remainingUser =
        getStoredUser();

    const remainingToken =
        getUserToken();


    if (
        remainingUser &&
        remainingToken
    ) {

        currentUser =
            remainingUser;

        openMainWebsite();

        return;

    }


    showAccountGate();

}


/* ============================================================
   OPEN MAIN WEBSITE
   ============================================================ */

function openMainWebsite() {

    hideAccountGate();

    updateUserInterface();

    closeMobileMenu();


    loadPredictions()
        .catch(
            (error) => {

                console.error(
                    "Prediction loading error:",
                    error
                );

            }
        );


    loadResults()
        .catch(
            (error) => {

                console.error(
                    "Results loading error:",
                    error
                );

            }
        );


    /*
     * NEW:
     * Load booking codes from the
     * public backend endpoint.
     */
    loadRegularBettingCodes()
        .catch(
            (error) => {

                console.error(
                    "Booking code loading error:",
                    error
                );

            }
        );


    refreshRegularAccessStatus()
        .catch(
            (error) => {

                console.error(
                    "Regular access error:",
                    error
                );

            }
        );


    loadNotifications()
        .catch(
            (error) => {

                console.error(
                    "Notification loading error:",
                    error
                );

            }
        );

}


/* ============================================================
   USER INTERFACE
   ============================================================ */

function updateUserInterface() {

    const user =
        currentUser ||
        getStoredUser();


    if (!user) {

        return;

    }


    const displayName =
        user.name ||
        user.username ||
        "Member";


    [
        getElement("userName"),
        getElement("headerUserName"),
        getElement("accountUserName")
    ]
        .filter(Boolean)
        .forEach(
            (element) => {

                element.textContent =
                    displayName;

            }
        );


    [
        getElement("usernameDisplay"),
        getElement("profileUsername")
    ]
        .filter(Boolean)
        .forEach(
            (element) => {

                element.textContent =
                    user.username ||
                    "";

            }
        );


    [
        getElement("emailDisplay"),
        getElement("profileEmail")
    ]
        .filter(Boolean)
        .forEach(
            (element) => {

                element.textContent =
                    user.email ||
                    "";

            }
        );

}


/* ============================================================
   SIGN OUT
   ============================================================ */

function setupSignOut() {

    const signOutButton =
        getElement(
            "signOutButton"
        );


    if (signOutButton) {

        signOutButton.addEventListener(
            "click",
            handleSignOut
        );

    }

}


async function handleSignOut(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const token =
        getUserToken();


    try {

        if (token) {

            await apiRequest(
                "/auth/logout",
                {
                    method: "POST"
                }
            );

        }

    } catch (error) {

        console.warn(
            "Logout request failed:",
            error.message
        );

    } finally {

        clearUserSession();

        window.vipAccessActive =
            false;

        window.vipPredictionCount =
            0;


        showAccountGate();

        showLoginPanel();


        const loginForm =
            getElement(
                "loginForm"
            );


        if (loginForm) {

            loginForm.reset();

        }


        closeMobileMenu();


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

}


/* ============================================================
   MESSAGE HELPERS
   ============================================================ */

function showMessage(
    elementOrId,
    message,
    type = "info"
) {

    const element =
        typeof elementOrId ===
        "string"
            ? getElement(
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


function clearMessage(id) {

    const element =
        getElement(id);


    if (!element) {

        return;

    }


    element.textContent =
        "";


    element.classList.remove(
        "success",
        "error",
        "info",
        "warning"
    );


    element.style.display =
        "none";

}


/* ============================================================
   FORM LOADING
   ============================================================ */

function setFormLoading(
    form,
    loading,
    text
) {

    if (!form) {

        return;

    }


    const submitButton =
        form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );


    if (!submitButton) {

        return;

    }


    if (loading) {

        submitButton.dataset
            .originalText =
            submitButton.textContent;


        submitButton.disabled =
            true;


        if (
            submitButton.tagName ===
            "INPUT"
        ) {

            submitButton.value =
                text ||
                "Please wait...";

        } else {

            submitButton.textContent =
                text ||
                "Please wait...";

        }

    } else {

        submitButton.disabled =
            false;


        const original =
            submitButton.dataset
                .originalText;


        if (
            submitButton.tagName ===
            "INPUT"
        ) {

            if (original) {

                submitButton.value =
                    original;

            }

        } else if (original) {

            submitButton.textContent =
                original;

        }

    }

}


/* ============================================================
   END OF PART 1
   ============================================================ */
/* ============================================================
   FLEX HUB PREDICTIONS
   APP.JS — PART 2/4
   PREDICTIONS + RESULTS + BOOKING CODES
   ============================================================ */


/* ============================================================
   PREDICTIONS
   ============================================================ */

async function loadPredictions() {

    try {

        const data =
            await apiRequest(
                "/predictions",
                {
                    method: "GET"
                }
            );


        allPredictions =
            Array.isArray(data)
                ? data
                : (
                    data?.predictions ||
                    data?.data ||
                    []
                );


        renderPredictions();


        updatePredictionStats();


        return allPredictions;

    } catch (error) {

        console.error(
            "Load predictions error:",
            error
        );


        allPredictions = [];


        renderPredictionsError();


        return [];

    }

}


/* ============================================================
   RENDER PREDICTIONS
   ============================================================ */

function renderPredictions() {

    const containers = [

        getElement(
            "predictionsGrid"
        ),

        getElement(
            "predictionGrid"
        ),

        getElement(
            "predictionsContainer"
        ),

        getElement(
            "regularPredictionsGrid"
        )

    ].filter(Boolean);


    if (!containers.length) {

        return;

    }


    let filtered =
        [...allPredictions];


    /* SEARCH */

    if (currentSearchTerm) {

        const search =
            currentSearchTerm
                .toLowerCase();


        filtered =
            filtered.filter(
                (item) => {

                    const text = [
                        item.league,
                        item.home_team,
                        item.away_team,
                        item.prediction,
                        item.analysis,
                        item.category
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    /* LEAGUE FILTER */

    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {

        filtered =
            filtered.filter(
                (item) =>
                    String(
                        item.league ||
                        ""
                    ).toLowerCase() ===
                    String(
                        currentLeagueFilter
                    ).toLowerCase()
            );

    }


    /* REGULAR PREDICTIONS */

    filtered =
        filtered.filter(
            (item) => {

                const category =
                    String(
                        item.category ||
                        "regular"
                    ).toLowerCase();


                return (
                    category ===
                    "regular"
                );

            }
        );


    if (!filtered.length) {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        "No predictions found."
                    );

            }
        );


        return;

    }


    const html =
        filtered
            .map(
                createPredictionCard
            )
            .join("");


    containers.forEach(
        (container) => {

            container.innerHTML =
                html;

        }
    );


    setupTeamBadgeObserver();

}


/* ============================================================
   PREDICTION CARD
   ============================================================ */

function createPredictionCard(
    item
) {

    const id =
        Number(item.id || 0);


    const league =
        escapeHTML(
            item.league ||
            "Football"
        );


    const homeTeam =
        escapeHTML(
            item.home_team ||
            "Home Team"
        );


    const awayTeam =
        escapeHTML(
            item.away_team ||
            "Away Team"
        );


    const matchDate =
        escapeHTML(
            item.match_date ||
            ""
        );


    const matchTime =
        escapeHTML(
            item.match_time ||
            ""
        );


    const prediction =
        escapeHTML(
            item.prediction ||
            "Prediction pending"
        );


    const analysis =
        escapeHTML(
            item.analysis ||
            "No analysis available."
        );


    const category =
        escapeHTML(
            String(
                item.category ||
                "regular"
            ).toUpperCase()
        );


    const featured =
        item.featured
            ? `
                <span class="prediction-featured">
                    FEATURED
                </span>
              `
            : "";


    return `
        <article
            class="prediction-card"
            data-prediction-id="${id}"
        >

            <div class="prediction-card-header">

                <div>

                    <span class="prediction-league">
                        ${league}
                    </span>

                    ${featured}

                </div>

                <span class="prediction-category">
                    ${category}
                </span>

            </div>


            <div class="prediction-match">

                <div class="prediction-team">

                    <div
                        class="team-badge"
                        data-team="${homeTeam}"
                    ></div>

                    <span>
                        ${homeTeam}
                    </span>

                </div>


                <div class="prediction-vs">

                    <span>VS</span>

                    <small>
                        ${matchDate}
                        ${matchTime}
                    </small>

                </div>


                <div class="prediction-team">

                    <div
                        class="team-badge"
                        data-team="${awayTeam}"
                    ></div>

                    <span>
                        ${awayTeam}
                    </span>

                </div>

            </div>


            <div class="prediction-selection">

                <span>
                    Prediction
                </span>

                <strong>
                    ${prediction}
                </strong>

            </div>


            <div class="prediction-analysis">

                <span>
                    Match Analysis
                </span>

                <p>
                    ${analysis}
                </p>

            </div>

        </article>
    `;

}


/* ============================================================
   PREDICTION ERROR
   ============================================================ */

function renderPredictionsError() {

    const containers = [

        getElement(
            "predictionsGrid"
        ),

        getElement(
            "predictionGrid"
        ),

        getElement(
            "predictionsContainer"
        ),

        getElement(
            "regularPredictionsGrid"
        )

    ].filter(Boolean);


    containers.forEach(
        (container) => {

            container.innerHTML =
                createEmptyState(
                    "Unable to load predictions right now."
                );

        }
    );

}


/* ============================================================
   PREDICTION STATS
   ============================================================ */

function updatePredictionStats() {

    const predictionCount =
        allPredictions.length;


    const elements = [

        getElement(
            "predictionCount"
        ),

        getElement(
            "totalPredictions"
        ),

        getElement(
            "predictionsStat"
        )

    ].filter(Boolean);


    elements.forEach(
        (element) => {

            element.textContent =
                predictionCount;

        }
    );


    const leagues =
        new Set(
            allPredictions
                .map(
                    (item) =>
                        item.league
                )
                .filter(Boolean)
        );


    const leagueElements = [

        getElement(
            "leagueCount"
        ),

        getElement(
            "totalLeagues"
        ),

        getElement(
            "leaguesStat"
        )

    ].filter(Boolean);


    leagueElements.forEach(
        (element) => {

            element.textContent =
                leagues.size;

        }
    );

}


/* ============================================================
   RESULTS
   ============================================================ */

async function loadResults() {

    try {

        const data =
            await apiRequest(
                "/results",
                {
                    method: "GET"
                }
            );


        allResults =
            Array.isArray(data)
                ? data
                : (
                    data?.results ||
                    data?.data ||
                    []
                );


        renderResults();


        updateResultStats();


        return allResults;

    } catch (error) {

        console.error(
            "Load results error:",
            error
        );


        allResults = [];


        renderResultsError();


        return [];

    }

}


/* ============================================================
   RENDER RESULTS
   ============================================================ */

function renderResults() {

    const containers = [

        getElement(
            "resultsGrid"
        ),

        getElement(
            "resultGrid"
        ),

        getElement(
            "resultsContainer"
        )

    ].filter(Boolean);


    if (!containers.length) {

        return;

    }


    let filtered =
        [...allResults];


    /* SEARCH */

    if (currentSearchTerm) {

        const search =
            currentSearchTerm
                .toLowerCase();


        filtered =
            filtered.filter(
                (item) => {

                    const text = [

                        item.league,
                        item.home_team,
                        item.away_team,
                        item.prediction,
                        item.status

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    /* RESULT FILTER */

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
                            .toLowerCase();


                    return (
                        status ===
                        String(
                            currentResultFilter
                        ).toLowerCase()
                    );

                }
            );

    }


    if (!filtered.length) {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        "No results found."
                    );

            }
        );


        return;

    }


    const html =
        filtered
            .map(
                createResultCard
            )
            .join("");


    containers.forEach(
        (container) => {

            container.innerHTML =
                html;

        }
    );


    setupTeamBadgeObserver();

}


/* ============================================================
   RESULT CARD
   ============================================================ */

function createResultCard(
    item
) {

    const league =
        escapeHTML(
            item.league ||
            "Football"
        );


    const homeTeam =
        escapeHTML(
            item.home_team ||
            "Home Team"
        );


    const awayTeam =
        escapeHTML(
            item.away_team ||
            "Away Team"
        );


    const prediction =
        escapeHTML(
            item.prediction ||
            "—"
        );


    const status =
        String(
            item.status ||
            "pending"
        )
            .toLowerCase();


    let statusLabel =
        status.toUpperCase();


    let statusClass =
        "status-pending";


    if (
        status === "win" ||
        status === "won"
    ) {

        statusLabel =
            "WIN";

        statusClass =
            "status-success";

    } else if (
        status === "loss" ||
        status === "lost"
    ) {

        statusLabel =
            "LOSS";

        statusClass =
            "status-danger";

    } else if (
        status === "void"
    ) {

        statusLabel =
            "VOID";

        statusClass =
            "status-warning";

    }


    return `
        <article class="result-card">

            <div class="result-card-header">

                <span class="result-league">
                    ${league}
                </span>

                <span
                    class="result-status ${statusClass}"
                >
                    ${statusLabel}
                </span>

            </div>


            <div class="result-match">

                <div class="result-team">

                    <div
                        class="team-badge"
                        data-team="${homeTeam}"
                    ></div>

                    <span>
                        ${homeTeam}
                    </span>

                </div>


                <span class="result-vs">
                    VS
                </span>


                <div class="result-team">

                    <div
                        class="team-badge"
                        data-team="${awayTeam}"
                    ></div>

                    <span>
                        ${awayTeam}
                    </span>

                </div>

            </div>


            <div class="result-prediction">

                <span>
                    Prediction
                </span>

                <strong>
                    ${prediction}
                </strong>

            </div>

        </article>
    `;

}


/* ============================================================
   RESULT ERROR
   ============================================================ */

function renderResultsError() {

    const containers = [

        getElement(
            "resultsGrid"
        ),

        getElement(
            "resultGrid"
        ),

        getElement(
            "resultsContainer"
        )

    ].filter(Boolean);


    containers.forEach(
        (container) => {

            container.innerHTML =
                createEmptyState(
                    "Unable to load results right now."
                );

        }
    );

}


/* ============================================================
   RESULT STATS
   ============================================================ */

function updateResultStats() {

    const resultCount =
        allResults.length;


    const elements = [

        getElement(
            "resultCount"
        ),

        getElement(
            "totalResults"
        ),

        getElement(
            "resultsStat"
        )

    ].filter(Boolean);


    elements.forEach(
        (element) => {

            element.textContent =
                resultCount;

        }
    );


    const wins =
        allResults.filter(
            (item) => {

                const status =
                    String(
                        item.status ||
                        ""
                    ).toLowerCase();

                return (
                    status === "win" ||
                    status === "won"
                );

            }
        ).length;


    const winElements = [

        getElement(
            "winCount"
        ),

        getElement(
            "totalWins"
        ),

        getElement(
            "winsStat"
        )

    ].filter(Boolean);


    winElements.forEach(
        (element) => {

            element.textContent =
                wins;

        }
    );

}


/* ============================================================
   SEARCH
   ============================================================ */

function setupSearch() {

    const searchInputs = [

        getElement(
            "predictionSearch"
        ),

        getElement(
            "searchInput"
        ),

        getElement(
            "teamSearch"
        ),

        getElement(
            "mainSearch"
        )

    ].filter(Boolean);


    searchInputs.forEach(
        (input) => {

            input.addEventListener(
                "input",
                () => {

                    currentSearchTerm =
                        input.value
                            .trim();


                    renderPredictions();

                    renderResults();

                }
            );

        }
    );

}


/* ============================================================
   FILTERS
   ============================================================ */

function setupFilters() {

    const leagueFilters =
        document.querySelectorAll(
            "[data-league-filter]"
        );


    leagueFilters.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    currentLeagueFilter =
                        button.dataset
                            .leagueFilter ||
                        "all";


                    leagueFilters.forEach(
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

        }
    );


    const resultFilters =
        document.querySelectorAll(
            "[data-result-filter]"
        );


    resultFilters.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    currentResultFilter =
                        button.dataset
                            .resultFilter ||
                        "all";


                    resultFilters.forEach(
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

        }
    );


    const selectLeague =
        getElement(
            "leagueFilter"
        );


    if (selectLeague) {

        selectLeague.addEventListener(
            "change",
            () => {

                currentLeagueFilter =
                    selectLeague.value ||
                    "all";


                renderPredictions();

            }
        );

    }


    const selectResult =
        getElement(
            "resultFilter"
        );


    if (selectResult) {

        selectResult.addEventListener(
            "change",
            () => {

                currentResultFilter =
                    selectResult.value ||
                    "all";


                renderResults();

            }
        );

    }

}


/* ============================================================
   BOOKING CODES
   ============================================================ */

async function loadBookingCodes(
    category = "regular"
) {

    const normalizedCategory =
        String(
            category ||
            "regular"
        )
            .trim()
            .toLowerCase();


    const containers = [

        getElement(
            "bettingCodesGrid"
        ),

        getElement(
            "bookingCodesContainer"
        ),

        getElement(
            "bookingCodesGrid"
        )

    ].filter(Boolean);


    if (!containers.length) {

        return [];

    }


    try {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createLoadingState(
                        "Loading booking codes..."
                    );

            }
        );


        const data =
            await apiRequest(
                `/betting-codes?category=${encodeURIComponent(
                    normalizedCategory
                )}`,
                {
                    method: "GET",
                    skipAuth: true
                }
            );


        const codes =
            Array.isArray(
                data?.codes
            )
                ? data.codes
                : Array.isArray(data)
                ? data
                : [];


        allBookingCodes =
            codes;


        renderBookingCodes(
            codes,
            normalizedCategory
        );


        return codes;

    } catch (error) {

        console.error(
            "Booking codes error:",
            error
        );


        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        "Unable to load booking codes right now."
                    );

            }
        );


        return [];

    }

}


/* ============================================================
   RENDER BOOKING CODES
   ============================================================ */

function renderBookingCodes(
    codes,
    category = "regular"
) {

    const containers = [

        getElement(
            "bettingCodesGrid"
        ),

        getElement(
            "bookingCodesContainer"
        ),

        getElement(
            "bookingCodesGrid"
        )

    ].filter(Boolean);


    if (!containers.length) {

        return;

    }


    const list =
        Array.isArray(codes)
            ? codes
            : [];


    const activeCodes =
        list.filter(
            (code) => {

                return (
                    String(
                        code.status ||
                        "active"
                    )
                        .toLowerCase() ===
                    "active"
                );

            }
        );


    if (!activeCodes.length) {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        category === "vip"
                            ? "No VIP booking codes are available yet."
                            : "No booking codes are available yet."
                    );

            }
        );


        return;

    }


    const html =
        activeCodes
            .map(
                (code) => {

                    const bookmaker =
                        escapeHTML(
                            code.bookmaker ||
                            "Bookmaker"
                        );


                    const bookingCode =
                        escapeHTML(
                            code.code ||
                            ""
                        );


                    const description =
                        escapeHTML(
                            code.description ||
                            ""
                        );


                    const codeCategory =
                        escapeHTML(
                            String(
                                code.category ||
                                category ||
                                "regular"
                            )
                                .toUpperCase()
                        );


                    const rawCode =
                        String(
                            code.code ||
                            ""
                        );


                    return `
                        <article
                            class="booking-code-card"
                        >

                            <div
                                class="booking-code-top"
                            >

                                <div>

                                    <span
                                        class="booking-code-bookmaker"
                                    >
                                        ${bookmaker}
                                    </span>

                                    <span
                                        class="booking-code-category"
                                    >
                                        ${codeCategory}
                                    </span>

                                </div>

                            </div>


                            <div
                                class="booking-code-value"
                            >
                                ${bookingCode}
                            </div>


                            ${
                                description
                                    ? `
                                        <p
                                            class="booking-code-description"
                                        >
                                            ${description}
                                        </p>
                                      `
                                    : ""
                            }


                            <button
                                type="button"
                                class="booking-code-copy-button"
                                data-booking-code="${escapeAttribute(
                                    rawCode
                                )}"
                            >
                                Copy Code
                            </button>

                        </article>
                    `;

                }
            )
            .join("");


    containers.forEach(
        (container) => {

            container.innerHTML =
                html;


            container
                .querySelectorAll(
                    ".booking-code-copy-button"
                )
                .forEach(
                    (button) => {

                        button.addEventListener(
                            "click",
                            () => {

                                copyBettingCode(
                                    button.dataset
                                        .bookingCode,
                                    button
                                );

                            }
                        );

                    }
                );

        }
    );

}


/* ============================================================
   REGULAR BOOKING CODES
   ============================================================ */

async function loadRegularBettingCodes() {

    return loadBookingCodes(
        "regular"
    );

}


/* ============================================================
   VIP BOOKING CODES
   ============================================================ */

async function loadVipBettingCodes() {

    return loadBookingCodes(
        "vip"
    );

}


/* ============================================================
   COPY BOOKING CODE
   ============================================================ */

async function copyBettingCode(
    code,
    button
) {

    const value =
        String(
            code ||
            ""
        ).trim();


    if (!value) {

        return;

    }


    try {

        await navigator.clipboard.writeText(
            value
        );


        const originalText =
            button?.textContent ||
            "Copy Code";


        if (button) {

            button.textContent =
                "Copied!";

            button.disabled =
                true;


            setTimeout(
                () => {

                    button.textContent =
                        originalText;

                    button.disabled =
                        false;

                },
                1500
            );

        }

    } catch (error) {

        console.error(
            "Copy booking code error:",
            error
        );


        /* Fallback for older browsers */

        try {

            const textarea =
                document.createElement(
                    "textarea"
                );


            textarea.value =
                value;


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


            if (button) {

                const originalText =
                    button.textContent;


                button.textContent =
                    "Copied!";


                setTimeout(
                    () => {

                        button.textContent =
                            originalText;

                    },
                    1500
                );

            }

        } catch (fallbackError) {

            console.error(
                "Copy fallback failed:",
                fallbackError
            );

        }

    }

}


/* ============================================================
   CREATE EMPTY STATE
   ============================================================ */

function createEmptyState(
    message
) {

    return `
        <div class="empty-state">
            ${escapeHTML(
                message ||
                "Nothing available."
            )}
        </div>
    `;

}


/* ============================================================
   CREATE LOADING STATE
   ============================================================ */

function createLoadingState(
    message
) {

    return `
        <div class="loading-state">
            ${escapeHTML(
                message ||
                "Loading..."
            )}
        </div>
    `;

}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHTML(
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


/* ============================================================
   ATTRIBUTE ESCAPE
   ============================================================ */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    )
        .replace(
            /`/g,
            "&#096;"
        );

}


/* ============================================================
   END OF PART 2
   ============================================================ */
/* ============================================================
   FLEX HUB PREDICTIONS
   APP.JS — PART 3/4
   VIP SYSTEM + ACCESS + PAYMENTS
   ============================================================ */


/* ============================================================
   VIP PAGE SETUP
   ============================================================ */

function setupVipPage() {

    console.log(
        "VIP page initialized."
    );


    loadVipStatus()
        .catch(
            (error) => {

                console.error(
                    "VIP status error:",
                    error
                );

            }
        );


    loadVipPredictions()
        .catch(
            (error) => {

                console.error(
                    "VIP prediction loading error:",
                    error
                );

            }
        );


    loadVipBettingCodes()
        .catch(
            (error) => {

                console.error(
                    "VIP booking code loading error:",
                    error
                );

            }
        );


    setupVipRedeemForm();

}


/* ============================================================
   VIP STATUS
   ============================================================ */

async function loadVipStatus() {

    const token =
        getUserToken();


    if (!token) {

        window.vipAccessActive =
            false;

        updateVipInterface();

        return null;

    }


    try {

        const data =
            await apiRequest(
                "/vip/status",
                {
                    method: "GET"
                }
            );


     const active =
    Boolean(
        data?.active ??
        (
            data?.success === true &&
            data?.subscription?.status === "active"
        )
    );

        window.vipAccessActive =
            active;


        window.vipPredictionCount =
            Number(
                data?.predictionCount ||
                data?.vipPredictionCount ||
                0
            );


        updateVipInterface(
            data
        );


        return data;

    } catch (error) {

        console.error(
            "VIP status request failed:",
            error
        );


        window.vipAccessActive =
            false;


        updateVipInterface();


        return null;

    }

}


/* ============================================================
   VIP INTERFACE
   ============================================================ */

function updateVipInterface(
    data = null
) {

    const active =
        Boolean(
            window.vipAccessActive
        );


    const lockedElements =
        document.querySelectorAll(
            "[data-vip-locked]"
        );


    lockedElements.forEach(
        (element) => {

            element.style.display =
                active
                    ? ""
                    : "none";

        }
    );


    const accessElements =
        document.querySelectorAll(
            "[data-vip-access]"
        );


    accessElements.forEach(
        (element) => {

            element.style.display =
                active
                    ? ""
                    : "none";

        }
    );


    const lockMessage =
        getElement(
            "vipLockedMessage"
        );


    if (lockMessage) {

        lockMessage.style.display =
            active
                ? "none"
                : "";

    }


    const statusElements = [

        getElement(
            "vipStatus"
        ),

        getElement(
            "vipAccessStatus"
        ),

        getElement(
            "vipMembershipStatus"
        )

    ].filter(Boolean);


    statusElements.forEach(
        (element) => {

            element.textContent =
                active
                    ? "VIP ACCESS ACTIVE"
                    : "VIP ACCESS LOCKED";


            element.classList.toggle(
                "active",
                active
            );

            element.classList.toggle(
                "locked",
                !active
            );

        }
    );


    const expiry =
        data?.expiresAt ||
        data?.expires_at ||
        data?.subscription?.expires_at ||
        "";


    const expiryElements = [

        getElement(
            "vipExpiry"
        ),

        getElement(
            "vipExpiresAt"
        )

    ].filter(Boolean);


    expiryElements.forEach(
        (element) => {

            element.textContent =
                expiry
                    ? formatDate(
                        expiry
                    )
                    : active
                    ? "Active"
                    : "—";

        }
    );

}


/* ============================================================
   VIP REDEEM FORM
   ============================================================ */

function setupVipRedeemForm() {

    const form =
        getElement(
            "vipRedeemForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        redeemVipCode
    );

}


/* ============================================================
   REDEEM VIP CODE
   ============================================================ */

async function redeemVipCode(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const input =
        getElement(
            "vipCode"
        ) ||
        getElement(
            "vipAccessCode"
        ) ||
        getElement(
            "redeemVipCode"
        );


    const message =
        getElement(
            "vipRedeemMessage"
        ) ||
        getElement(
            "vipMessage"
        );


    const code =
        String(
            input?.value ||
            ""
        ).trim();


    if (!code) {

        showMessage(
            message,
            "Please enter your VIP access code.",
            "error"
        );

        input?.focus();

        return;

    }


    const form =
        event?.currentTarget;


    setFormLoading(
        form,
        true,
        "Activating..."
    );


    showMessage(
        message,
        "Activating your VIP access...",
        "info"
    );


    try {

        const data =
            await apiRequest(
                "/vip/redeem",
                {
                    method: "POST",
                    body: {
                        code
                    }
                }
            );


        window.vipAccessActive =
            true;


        window.vipPredictionCount =
            Number(
                data?.predictionCount ||
                0
            );


        showMessage(
            message,
            data?.message ||
                "VIP access activated successfully.",
            "success"
        );


        if (input) {

            input.value =
                "";

        }


        await loadVipStatus();

        await loadVipPredictions();

        await loadVipBettingCodes();


    } catch (error) {

        console.error(
            "VIP redeem error:",
            error
        );


        showMessage(
            message,
            error.message ||
                "Unable to activate VIP access.",
            "error"
        );


    } finally {

        setFormLoading(
            form,
            false
        );

    }

}


/* ============================================================
   VIP PREDICTIONS
   ============================================================ */

async function loadVipPredictions() {

    const containers = [

        getElement(
            "vipPredictionsGrid"
        ),

        getElement(
            "vipPredictionGrid"
        ),

        getElement(
            "vipPredictionsContainer"
        )

    ].filter(Boolean);


    if (!containers.length) {

        return [];

    }


    if (!window.vipAccessActive) {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        "VIP access is required to view VIP predictions."
                    );

            }
        );


        return [];

    }


    try {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createLoadingState(
                        "Loading VIP predictions..."
                    );

            }
        );


        const data =
            await apiRequest(
                "/vip/predictions",
                {
                    method: "GET"
                }
            );


        const predictions =
            Array.isArray(data)
                ? data
                : (
                    data?.predictions ||
                    data?.data ||
                    []
                );


        renderVipPredictions(
            predictions
        );


        return predictions;

    } catch (error) {

        console.error(
            "VIP predictions error:",
            error
        );


        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        error.status === 401 ||
                        error.status === 403
                            ? "Your VIP access is not active."
                            : "Unable to load VIP predictions right now."
                    );

            }
        );


        return [];

    }

}


/* ============================================================
   RENDER VIP PREDICTIONS
   ============================================================ */

function renderVipPredictions(
    predictions
) {

    const containers = [

        getElement(
            "vipPredictionsGrid"
        ),

        getElement(
            "vipPredictionGrid"
        ),

        getElement(
            "vipPredictionsContainer"
        )

    ].filter(Boolean);


    if (!containers.length) {

        return;

    }


    const list =
        Array.isArray(predictions)
            ? predictions
            : [];


    if (!list.length) {

        containers.forEach(
            (container) => {

                container.innerHTML =
                    createEmptyState(
                        "No VIP predictions are available yet."
                    );

            }
        );


        return;

    }


    const html =
        list
            .map(
                createVipPredictionCard
            )
            .join("");


    containers.forEach(
        (container) => {

            container.innerHTML =
                html;

        }
    );


    setupTeamBadgeObserver();

}


/* ============================================================
   VIP PREDICTION CARD
   ============================================================ */

function createVipPredictionCard(
    item
) {

    const league =
        escapeHTML(
            item.league ||
            "VIP Football"
        );


    const homeTeam =
        escapeHTML(
            item.home_team ||
            "Home Team"
        );


    const awayTeam =
        escapeHTML(
            item.away_team ||
            "Away Team"
        );


    const matchDate =
        escapeHTML(
            item.match_date ||
            ""
        );


    const matchTime =
        escapeHTML(
            item.match_time ||
            ""
        );


    const prediction =
        escapeHTML(
            item.prediction ||
            "Prediction pending"
        );


    const analysis =
        escapeHTML(
            item.analysis ||
            "Premium analysis available."
        );


    const featured =
        item.featured
            ? `
                <span class="prediction-featured">
                    VIP FEATURED
                </span>
              `
            : "";


    return `
        <article
            class="prediction-card vip-prediction-card"
        >

            <div
                class="prediction-card-header"
            >

                <div>

                    <span
                        class="prediction-league"
                    >
                        ${league}
                    </span>

                    ${featured}

                </div>


                <span
                    class="prediction-category vip"
                >
                    VIP
                </span>

            </div>


            <div
                class="prediction-match"
            >

                <div
                    class="prediction-team"
                >

                    <div
                        class="team-badge"
                        data-team="${homeTeam}"
                    ></div>

                    <span>
                        ${homeTeam}
                    </span>

                </div>


                <div
                    class="prediction-vs"
                >

                    <span>
                        VS
                    </span>

                    <small>
                        ${matchDate}
                        ${matchTime}
                    </small>

                </div>


                <div
                    class="prediction-team"
                >

                    <div
                        class="team-badge"
                        data-team="${awayTeam}"
                    ></div>

                    <span>
                        ${awayTeam}
                    </span>

                </div>

            </div>


            <div
                class="prediction-selection"
            >

                <span>
                    VIP Prediction
                </span>

                <strong>
                    ${prediction}
                </strong>

            </div>


            <div
                class="prediction-analysis"
            >

                <span>
                    Premium Analysis
                </span>

                <p>
                    ${analysis}
                </p>

            </div>

        </article>
    `;

}


/* ============================================================
   REGULAR ACCESS
   ============================================================ */

async function refreshRegularAccessStatus() {

    const token =
        getUserToken();


    if (!token) {

        return null;

    }


    try {

        const data =
            await apiRequest(
                "/user/access",
                {
                    method: "GET"
                }
            );


        updateRegularAccessInterface(
            data
        );


        return data;

    } catch (error) {

        console.warn(
            "Regular access status error:",
            error.message
        );


        return null;

    }

}


/* ============================================================
   REGULAR ACCESS UI
   ============================================================ */

function updateRegularAccessInterface(
    data
) {

    if (!data) {

        return;

    }


    const active =
        Boolean(
            data.active ??
            data.hasAccess ??
            data.success
        );


    const expiry =
        data.expiresAt ||
        data.expires_at ||
        "";


    const statusElements = [

        getElement(
            "regularAccessStatus"
        ),

        getElement(
            "accountAccessStatus"
        )

    ].filter(Boolean);


    statusElements.forEach(
        (element) => {

            element.textContent =
                active
                    ? "ACTIVE"
                    : "STANDARD ACCESS";

            element.classList.toggle(
                "active",
                active
            );

        }
    );


    const expiryElements = [

        getElement(
            "regularAccessExpiry"
        ),

        getElement(
            "accountAccessExpiry"
        )

    ].filter(Boolean);


    expiryElements.forEach(
        (element) => {

            element.textContent =
                expiry
                    ? formatDate(
                        expiry
                    )
                    : "No expiry";

        }
    );

}


/* ============================================================
   PAYMENT BUTTONS
   ============================================================ */

function setupPaymentButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-payment]"
        );


    buttons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                handlePaymentButton
            );

        }
    );


    const explicitButtons = [

        getElement(
            "vipPaymentButton"
        ),

        getElement(
            "payVipButton"
        ),

        getElement(
            "upgradeVipButton"
        )

    ].filter(Boolean);


    explicitButtons.forEach(
        (button) => {

            if (
                button.dataset.paymentBound
            ) {

                return;

            }


            button.dataset.paymentBound =
                "true";


            button.addEventListener(
                "click",
                handlePaymentButton
            );

        }
    );

}


/* ============================================================
   PAYMENT HANDLER
   ============================================================ */

function handlePaymentButton(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const button =
        event?.currentTarget;


    const paymentUrl =
        button?.dataset?.paymentUrl ||
        button?.dataset?.url ||
        "";


    if (paymentUrl) {

        window.location.href =
            paymentUrl;

        return;

    }


    const message =
        getElement(
            "paymentMessage"
        ) ||
        getElement(
            "vipMessage"
        );


    if (message) {

        showMessage(
            message,
            "Payment access is not configured yet. Please contact FLEX HUB support.",
            "info"
        );

        return;

    }


    console.log(
        "Payment button clicked."
    );

}


/* ============================================================
   VIP NAVIGATION
   ============================================================ */

function openVipPage() {

    window.location.href =
        "vip.html";

}


/* ============================================================
   END OF PART 3
   ============================================================ */
/* ============================================================
   FLEX HUB PREDICTIONS
   APP.JS — PART 4/4
   NAVIGATION + NOTIFICATIONS + PWA + HELPERS
   ============================================================ */


/* ============================================================
   NAVIGATION
   ============================================================ */

function setupNavigation() {

    const menuButton =
        getElement(
            "menuButton"
        );

    const mainNav =
        getElement(
            "mainNav"
        );


    if (
        menuButton &&
        mainNav
    ) {

        menuButton.addEventListener(
            "click",
            () => {

                const isOpen =
                    mainNav.classList.toggle(
                        "active"
                    );


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

    }


    const navLinks =
        document.querySelectorAll(
            "#mainNav a, .main-nav a, nav a"
        );


    navLinks.forEach(
        (link) => {

            link.addEventListener(
                "click",
                () => {

                    closeMobileMenu();

                }
            );

        }
    );

}


/* ============================================================
   MOBILE MENU
   ============================================================ */

function setupMobileMenu() {

    const menuButton =
        getElement(
            "menuButton"
        );


    if (!menuButton) {

        return;

    }


    menuButton.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Enter" ||
                event.key ===
                " "
            ) {

                event.preventDefault();

                menuButton.click();

            }

        }
    );

}


/* ============================================================
   CLOSE MOBILE MENU
   ============================================================ */

function closeMobileMenu() {

    const mainNav =
        getElement(
            "mainNav"
        );

    const menuButton =
        getElement(
            "menuButton"
        );


    if (mainNav) {

        mainNav.classList.remove(
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


/* ============================================================
   FOOTER
   ============================================================ */

function setupFooter() {

    updateCurrentYear();

}


/* ============================================================
   CURRENT YEAR
   ============================================================ */

function updateCurrentYear() {

    const year =
        new Date()
            .getFullYear();


    const elements =
        document.querySelectorAll(
            "#currentYear, .current-year, [data-current-year]"
        );


    elements.forEach(
        (element) => {

            element.textContent =
                year;

        }
    );

}


/* ============================================================
   WHATSAPP
   ============================================================ */

function setupWhatsApp() {

    const buttons =
        document.querySelectorAll(
            "[data-whatsapp]"
        );


    buttons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();


                    const number =
                        button.dataset
                            .whatsappNumber ||
                        "";


                    const message =
                        button.dataset
                            .whatsappMessage ||
                        "Hello FLEX HUB PREDICTIONS.";


                    const cleanNumber =
                        number.replace(
                            /[^0-9]/g,
                            ""
                        );


                    if (!cleanNumber) {

                        console.warn(
                            "WhatsApp number is not configured."
                        );

                        return;

                    }


                    const url =
                        `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
                            message
                        )}`;


                    window.open(
                        url,
                        "_blank",
                        "noopener,noreferrer"
                    );

                }
            );

        }
    );


    const explicitButtons = [

        getElement(
            "whatsappButton"
        ),

        getElement(
            "contactWhatsApp"
        ),

        getElement(
            "whatsappContactButton"
        )

    ].filter(Boolean);


    explicitButtons.forEach(
        (button) => {

            if (
                button.dataset
                    .whatsappBound
            ) {

                return;

            }


            button.dataset
                .whatsappBound =
                "true";


            button.addEventListener(
                "click",
                () => {

                    const number =
                        button.dataset
                            .whatsappNumber ||
                        button.getAttribute(
                            "data-number"
                        ) ||
                        "";


                    const message =
                        button.dataset
                            .whatsappMessage ||
                        "Hello FLEX HUB PREDICTIONS.";


                    if (!number) {

                        return;

                    }


                    const cleanNumber =
                        number.replace(
                            /[^0-9]/g,
                            ""
                        );


                    window.open(
                        `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
                            message
                        )}`,
                        "_blank",
                        "noopener,noreferrer"
                    );

                }
            );

        }
    );

}


/* ============================================================
   FORGOT PASSWORD
   ============================================================ */

function setupForgotPassword() {

    const button =
        getElement(
            "forgotPasswordButton"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async (event) => {

            event.preventDefault();


            const identifier =
                window.prompt(
                    "Enter your email address:"
                );


            if (!identifier) {

                return;

            }


            try {

                const data =
                    await apiRequest(
                        "/auth/forgot-password",
                        {
                            method: "POST",
                            skipAuth: true,
                            body: {
                                email:
                                    identifier
                                        .trim()
                                        .toLowerCase()
                            }
                        }
                    );


                alert(
                    data?.message ||
                    "If the account exists, password reset instructions have been sent."
                );


            } catch (error) {

                console.error(
                    "Forgot password error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to process the password reset request."
                );

            }

        }
    );

}


/* ============================================================
   NOTIFICATIONS
   ============================================================ */

function setupNotificationCenter() {

    const button =
        getElement(
            "notificationButton"
        );


    const panel =
        getElement(
            "notificationPanel"
        );


    if (
        button &&
        panel
    ) {

        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                event.stopPropagation();


                panel.classList.toggle(
                    "active"
                );

            }
        );


        document.addEventListener(
            "click",
            (event) => {

                if (
                    !panel.contains(
                        event.target
                    ) &&
                    !button.contains(
                        event.target
                    )
                ) {

                    panel.classList.remove(
                        "active"
                    );

                }

            }
        );

    }

}


/* ============================================================
   LOAD NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {

    const container =
        getElement(
            "notificationsContainer"
        ) ||
        getElement(
            "notificationList"
        );


    if (!container) {

        return [];

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
                : (
                    data?.notifications ||
                    data?.data ||
                    []
                );


        renderNotifications(
            notifications
        );


        return notifications;

    } catch (error) {

        console.error(
            "Notification loading error:",
            error
        );


        container.innerHTML =
            createEmptyState(
                "No notifications available."
            );


        return [];

    }

}


/* ============================================================
   RENDER NOTIFICATIONS
   ============================================================ */

function renderNotifications(
    notifications
) {

    const container =
        getElement(
            "notificationsContainer"
        ) ||
        getElement(
            "notificationList"
        );


    if (!container) {

        return;

    }


    const list =
        Array.isArray(
            notifications
        )
            ? notifications
            : [];


    if (!list.length) {

        container.innerHTML =
            createEmptyState(
                "No notifications available."
            );

        return;

    }


    container.innerHTML =
        list
            .map(
                (item) => {

                    const title =
                        escapeHTML(
                            item.title ||
                            "Notification"
                        );


                    const message =
                        escapeHTML(
                            item.message ||
                            ""
                        );


                    const date =
                        item.created_at ||
                        item.createdAt ||
                        "";


                    return `
                        <article
                            class="notification-item"
                        >

                            <div
                                class="notification-title"
                            >
                                ${title}
                            </div>

                            <p
                                class="notification-message"
                            >
                                ${message}
                            </p>

                            ${
                                date
                                    ? `
                                        <small>
                                            ${formatDate(
                                                date
                                            )}
                                        </small>
                                      `
                                    : ""
                            }

                        </article>
                    `;

                }
            )
            .join("");

}


/* ============================================================
   PWA INSTALL
   ============================================================ */

function setupPWAInstall() {

    window.addEventListener(
        "beforeinstallprompt",
        (event) => {

            event.preventDefault();


            deferredInstallPrompt =
                event;


            const installButtons =
                document.querySelectorAll(
                    "#installAppButton, [data-install-app]"
                );


            installButtons.forEach(
                (button) => {

                    button.style.display =
                        "";

                    button.addEventListener(
                        "click",
                        installPWA,
                        {
                            once: true
                        }
                    );

                }
            );

        }
    );


    window.addEventListener(
        "appinstalled",
        () => {

            deferredInstallPrompt =
                null;


            const installButtons =
                document.querySelectorAll(
                    "#installAppButton, [data-install-app]"
                );


            installButtons.forEach(
                (button) => {

                    button.style.display =
                        "none";

                }
            );

        }
    );

}


/* ============================================================
   INSTALL PWA
   ============================================================ */

async function installPWA() {

    if (
        !deferredInstallPrompt
    ) {

        return;

    }


    try {

        deferredInstallPrompt.prompt();


        await deferredInstallPrompt.userChoice;


    } catch (error) {

        console.error(
            "PWA installation error:",
            error
        );

    } finally {

        deferredInstallPrompt =
            null;

    }

}


/* ============================================================
   TEAM BADGES
   ============================================================ */

function setupTeamBadgeObserver() {

    const badges =
        document.querySelectorAll(
            ".team-badge[data-team]"
        );


    if (!badges.length) {

        return;

    }


    badges.forEach(
        (badge) => {

            const team =
                badge.dataset.team;


            if (!team) {

                return;

            }


            /*
             * The badge area remains clean if
             * no external logo is available.
             *
             * A short team abbreviation is
             * generated instead.
             */

            const abbreviation =
                createTeamAbbreviation(
                    team
                );


            badge.textContent =
                abbreviation;


            badge.setAttribute(
                "aria-label",
                team
            );

        }
    );

}


/* ============================================================
   TEAM ABBREVIATION
   ============================================================ */

function createTeamAbbreviation(
    team
) {

    const value =
        String(
            team ||
            ""
        )
            .trim();


    if (!value) {

        return "FC";

    }


    const words =
        value
            .split(/\s+/)
            .filter(Boolean);


    if (
        words.length === 1
    ) {

        return words[0]
            .slice(0, 3)
            .toUpperCase();

    }


    return words
        .slice(0, 3)
        .map(
            (word) =>
                word.charAt(0)
        )
        .join("")
        .toUpperCase();

}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function formatDate(
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

        return String(
            value
        );

    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/* ============================================================
   BUTTON LOADING
   ============================================================ */

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
            !button.dataset
                .originalText
        ) {

            button.dataset
                .originalText =
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
            button.dataset
                .originalText
        ) {

            button.textContent =
                button.dataset
                    .originalText;

        }

    }

}


/* ============================================================
   GLOBAL CLICK HELPERS
   ============================================================ */

document.addEventListener(
    "click",
    (event) => {

        const vipLink =
            event.target.closest(
                "[data-open-vip]"
            );


        if (vipLink) {

            event.preventDefault();

            openVipPage();

        }

    }
);


/* ============================================================
   GLOBAL FUNCTION EXPORTS
   ============================================================ */

window.handleLogin =
    handleLogin;

window.handleRegister =
    handleRegister;

window.handleSignOut =
    handleSignOut;

window.openMainWebsite =
    openMainWebsite;

window.showLoginPanel =
    showLoginPanel;

window.showRegisterPanel =
    showRegisterPanel;

window.loadPredictions =
    loadPredictions;

window.loadResults =
    loadResults;

window.loadBookingCodes =
    loadBookingCodes;

window.loadRegularBettingCodes =
    loadRegularBettingCodes;

window.loadVipBettingCodes =
    loadVipBettingCodes;

window.loadVipPredictions =
    loadVipPredictions;

window.loadVipStatus =
    loadVipStatus;

window.redeemVipCode =
    redeemVipCode;

window.copyBettingCode =
    copyBettingCode;

window.openVipPage =
    openVipPage;

window.installPWA =
    installPWA;


/* ============================================================
   FINAL INITIALIZATION
   ============================================================ */

console.log(
    "FLEX HUB PREDICTIONS app.js loaded successfully."
);


/* ============================================================
   END OF APP.JS
   ============================================================ */
