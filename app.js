/* =========================================================
   FLEX HUB PREDICTIONS
   COMPLETE APP.JS
   PART 1/3
   ========================================================= */

"use strict";

/* =========================================================
   API CONFIGURATION
   ========================================================= */

const API_BASE_URL =
    "https://flex-hub-prediction.onrender.com/api";


/* =========================================================
   STORAGE KEYS
   ========================================================= */

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

let notificationTimer = null;

let deferredInstallPrompt = null;

window.vipPredictionCount = 0;

window.vipAccessActive = false;


/* =========================================================
   PAGE READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        try {

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

            loadTeamBadges();

            const isVipPage =
                document.body &&
                (
                    document.body.dataset.page === "vip" ||
                    window.location.pathname
                        .toLowerCase()
                        .includes("vip.html")
                );

            if (isVipPage) {

                setupVipPage();

            } else {

                checkUserSession();

            }

        } catch (error) {

            console.error(
                "FLEX HUB initialization error:",
                error
            );

        }

    }
);


/* =========================================================
   STORAGE HELPERS
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

        console.warn(
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


/*
   IMPORTANT:
   All authenticated functions use this same helper.
*/

function getAuthToken() {

    return getUserToken();

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

    window.vipPredictionCount = 0;

}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const requestOptions = {
        ...options
    };

    const headers = {
        ...(options.headers || {})
    };


    if (
        requestOptions.body &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";

    }


    const token =
        getUserToken();


    if (
        token &&
        !requestOptions.skipAuth &&
        !headers.Authorization
    ) {

        headers.Authorization =
            `Bearer ${token}`;

    }


    requestOptions.headers =
        headers;


    delete requestOptions.skipAuth;


    const response =
        await fetch(
            `${API_BASE_URL}${endpoint}`,
            requestOptions
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch (error) {

        data = null;

    }


    if (!response.ok) {

        const error =
            new Error(
                (
                    data &&
                    (
                        data.message ||
                        data.error
                    )
                ) ||
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


/* =========================================================
   LOGIN / REGISTER PANEL SWITCHING
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
            "";

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
            "";

    }

}


/* =========================================================
   HANDLE LOGIN
   ========================================================= */

async function handleLogin(
    event
) {

    if (event) {

        event.preventDefault();

    }


    const identifier =
        getFormValue(
            "loginIdentifier"
        );


    const password =
        getFormValue(
            "loginPassword"
        );


    const rememberMe =
        document.getElementById(
            "rememberMe"
        );


    const messageElement =
        document.getElementById(
            "loginMessage"
        );


    const form =
        document.getElementById(
            "loginForm"
        );


    const submitButton =
        form
            ? form.querySelector(
                'button[type="submit"]'
            )
            : null;


    if (!identifier) {

        showElementMessage(
            messageElement,
            "Enter your username or email.",
            "error"
        );

        return;

    }


    if (!password) {

        showElementMessage(
            messageElement,
            "Enter your password.",
            "error"
        );

        return;

    }


    try {

        setButtonLoading(
            submitButton,
            true,
            "Signing in..."
        );


        showElementMessage(
            messageElement,
            "Signing in...",
            "info"
        );


        /*
           Login itself does NOT use an existing token.
        */

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
           Save the session BEFORE doing anything else.
        */

        saveUser(
            data.user,
            data.token
        );


        if (rememberMe && rememberMe.checked) {

            localStorage.setItem(
                STORAGE_KEYS.REMEMBER_ME,
                "true"
            );

        } else {

            localStorage.removeItem(
                STORAGE_KEYS.REMEMBER_ME
            );

        }


        /*
           Verify the new token.

           IMPORTANT:
           We do NOT immediately destroy the session
           just because verification fails.
        */

        const verified =
            await verifyCurrentUserSession(
                true
            );


        if (!verified) {

            /*
               The login endpoint already returned a
               valid user + token.

               Keep the session so the user is not
               unnecessarily thrown back to the gate.
            */

            currentUser =
                data.user;

        }


        updateUserUI(
            currentUser ||
            data.user
        );


        showElementMessage(
            messageElement,
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
            700
        );


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        /*
           Only clear the session if the actual
           /login request failed.

           This prevents the old login-loop problem.
        */

        clearUserSession();


        showElementMessage(
            messageElement,
            error.message ||
            "Unable to sign in. Please check your details.",
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
   HANDLE REGISTER
   ========================================================= */

async function handleRegister(
    event
) {

    if (event) {

        event.preventDefault();

    }


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
        getFormValue(
            "registerPassword"
        );


    const confirmPassword =
        getFormValue(
            "registerConfirmPassword"
        );


    const terms =
        document.getElementById(
            "registerTerms"
        );


    const messageElement =
        document.getElementById(
            "registerMessage"
        );


    const form =
        document.getElementById(
            "registerForm"
        );


    const submitButton =
        form
            ? form.querySelector(
                'button[type="submit"]'
            )
            : null;


    if (!name) {

        showElementMessage(
            messageElement,
            "Enter your full name.",
            "error"
        );

        return;

    }


    if (!username) {

        showElementMessage(
            messageElement,
            "Choose a username.",
            "error"
        );

        return;

    }


    if (!email) {

        showElementMessage(
            messageElement,
            "Enter your email address.",
            "error"
        );

        return;

    }


    if (!password) {

        showElementMessage(
            messageElement,
            "Create a password.",
            "error"
        );

        return;

    }


    if (password.length < 6) {

        showElementMessage(
            messageElement,
            "Password must be at least 6 characters.",
            "error"
        );

        return;

    }


    if (
        password !==
        confirmPassword
    ) {

        showElementMessage(
            messageElement,
            "Passwords do not match.",
            "error"
        );

        return;

    }


    if (
        terms &&
        !terms.checked
    ) {

        showElementMessage(
            messageElement,
            "Please accept the terms before creating your account.",
            "error"
        );

        return;

    }


    try {

        setButtonLoading(
            submitButton,
            true,
            "Creating account..."
        );


        showElementMessage(
            messageElement,
            "Creating your account...",
            "info"
        );


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
                "Account was created, but the server did not return a valid session."
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


        const verified =
            await verifyCurrentUserSession(
                true
            );


        if (!verified) {

            currentUser =
                data.user;

        }


        updateUserUI(
            currentUser ||
            data.user
        );


        showElementMessage(
            messageElement,
            "Account created successfully.",
            "success"
        );


        showFlexHubAnimation(
            "Welcome to FLEX HUB PREDICTIONS"
        );


        setTimeout(
            () => {

                openMainWebsite();

            },
            700
        );


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        showElementMessage(
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
   VERIFY CURRENT USER SESSION
   ========================================================= */

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
                "/user/me"
            );


        if (
            data &&
            data.user
        ) {

            currentUser =
                data.user;


            /*
               Keep the existing token.
            */

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
            "Session verification failed:",
            error
        );


        /*
           Only destroy the session when we know the
           server rejected the token.

           For network/server errors, preserve it.
        */

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


    const storedUser =
        getStoredUser();


    if (storedUser) {

        currentUser =
            storedUser;

    }


    const valid =
        await verifyCurrentUserSession(
            false
        );


    if (valid) {

        updateUserUI(
            currentUser
        );

        openMainWebsite();

        return true;

    }


    /*
       If verification failed because of a temporary
       network/server problem, keep the local session
       and try to show the main site when possible.
    */

    if (
        getUserToken() &&
        currentUser &&
        !(
            storedUser === null
        )
    ) {

        updateUserUI(
            currentUser
        );

        openMainWebsite();

        return true;

    }


    clearUserSession();

    showAccountGate();

    showLoginPanel();

    return false;

}


/* =========================================================
   ACCOUNT GATE
   ========================================================= */

function showAccountGate() {

    const gate =
        document.getElementById(
            "accountGate"
        );


    const main =
        document.getElementById(
            "mainWebsite"
        );


    if (gate) {

        gate.style.display =
            "";

    }


    if (main) {

        main.style.display =
            "none";

    }

}


/* =========================================================
   OPEN MAIN WEBSITE
   ========================================================= */

function openMainWebsite() {

    const gate =
        document.getElementById(
            "accountGate"
        );


    const main =
        document.getElementById(
            "mainWebsite"
        );


    if (gate) {

        gate.style.display =
            "none";

    }


    if (main) {

        main.style.display =
            "";

    }


    updateUserUI(
        currentUser ||
        getStoredUser()
    );


    closeMobileMenu();


    /*
       These functions intentionally run independently.
       One failed optional request must not prevent the
       main website from opening.
    */

    loadPredictions().catch(
        (error) => console.warn(
            "Predictions loading failed:",
            error
        )
    );


    loadRegularBettingCodes().catch(
        (error) => console.warn(
            "Betting codes loading failed:",
            error
        )
    );


    loadResults().catch(
        (error) => console.warn(
            "Results loading failed:",
            error
        )
    );


    refreshRegularAccessStatus().catch(
        (error) => console.warn(
            "Access status loading failed:",
            error
        )
    );


    loadNotifications().catch(
        (error) => console.warn(
            "Notifications loading failed:",
            error
        )
    );

}


/* =========================================================
   UPDATE USER UI
   ========================================================= */

function updateUserUI(
    user
) {

    if (!user) {

        return;

    }


    const possibleNames = [
        user.name,
        user.username,
        user.email
    ];


    const displayName =
        possibleNames.find(
            (value) =>
                value &&
                String(value).trim()
        ) ||
        "User";


    const elements =
        document.querySelectorAll(
            "#userName, #headerUserName, [data-user-name]"
        );


    elements.forEach(
        (element) => {

            element.textContent =
                displayName;

        }
    );


    const emailElements =
        document.querySelectorAll(
            "[data-user-email]"
        );


    emailElements.forEach(
        (element) => {

            element.textContent =
                user.email ||
                "";

        }
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const links =
        document.querySelectorAll(
            "a[href]"
        );


    links.forEach(
        (link) => {

            if (
                link.dataset.navigationInitialized
            ) {

                return;

            }


            const href =
                link.getAttribute(
                    "href"
                );


            if (!href) {

                return;

            }


            link.addEventListener(
                "click",
                () => {

                    closeMobileMenu();

                }
            );


            link.dataset.navigationInitialized =
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


    if (!button || !nav) {

        return;

    }


    if (
        button.dataset.initialized
    ) {

        return;

    }


    button.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            const open =
                nav.classList.toggle(
                    "open"
                );


            button.setAttribute(
                "aria-expanded",
                open
                    ? "true"
                    : "false"
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


    if (!button) {

        return;

    }


    if (
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


function handleSignOut(
    event
) {

    if (event) {

        event.preventDefault();

    }


    clearUserSession();


    const main =
        document.getElementById(
            "mainWebsite"
        );


    if (main) {

        main.style.display =
            "none";

    }


    showAccountGate();

    showLoginPanel();


    const loginMessage =
        document.getElementById(
            "loginMessage"
        );


    showElementMessage(
        loginMessage,
        "You have been signed out.",
        "info"
    );


    closeMobileMenu();

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


    if (!input) {

        return;

    }


    if (
        input.dataset.initialized
    ) {

        return;

    }


    input.addEventListener(
        "input",
        () => {

            currentSearchTerm =
                String(
                    input.value || ""
                )
                .trim()
                .toLowerCase();


            renderPredictions();

        }
    );


    input.dataset.initialized =
        "true";

}


/* =========================================================
   LEAGUE FILTERS
   ========================================================= */

function setupLeagueFilters() {

    const filters =
        document.querySelectorAll(
            "[data-league-filter]"
        );


    filters.forEach(
        (button) => {

            if (
                button.dataset.initialized
            ) {

                return;

            }


            button.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();


                    currentLeagueFilter =
                        String(
                            button.dataset.leagueFilter ||
                            "all"
                        )
                        .toLowerCase();


                    filters.forEach(
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
   RESULT FILTERS
   ========================================================= */

function setupResultFilters() {

    const filters =
        document.querySelectorAll(
            "[data-result-filter]"
        );


    filters.forEach(
        (button) => {

            if (
                button.dataset.initialized
            ) {

                return;

            }


            button.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();


                    currentResultFilter =
                        String(
                            button.dataset.resultFilter ||
                            "all"
                        )
                        .toLowerCase();


                    filters.forEach(
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
   WHATSAPP LINKS
   ========================================================= */

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


/* =========================================================
   GET FORM VALUE
   ========================================================= */

function getFormValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return "";

    }


    return String(
        element.value || ""
    ).trim();

}


/* =========================================================
   ELEMENT MESSAGE
   ========================================================= */

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


/* =========================================================
   BUTTON LOADING
   ========================================================= */

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


/* =========================================================
   ESCAPE HTML
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


/* =========================================================
   ESCAPE JAVASCRIPT STRING
   ========================================================= */

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


/* =========================================================
   CAPITALIZE
   ========================================================= */

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


/* =========================================================
   FORMAT STATUS
   ========================================================= */

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
        capitalize(normalized)
    );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

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


/* =========================================================
   FORMAT DATE/TIME
   ========================================================= */

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


/* =========================================================
   FORMAT PLAN
   ========================================================= */

function formatPlan(
    plan
) {

    if (!plan) {

        return "VIP";

    }


    return capitalize(
        String(plan)
            .trim()
    );

}


/* =========================================================
   TEMPORARY TOAST
   ========================================================= */

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

            if (toast) {

                toast.remove();

            }

        },
        3000
    );

}


/* =========================================================
   FLEX HUB SUCCESS ANIMATION
   ========================================================= */

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


    const oldStyle =
        document.getElementById(
            "flexHubSuccessAnimationStyles"
        );


    if (oldStyle) {

        oldStyle.remove();

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "flexHubSuccessAnimation";


    overlay.innerHTML = `
        <div class="flex-success-box">
            <div class="flex-success-logo">⚽</div>
            <h2>FLEX HUB</h2>
            <p>${escapeHtml(message)}</p>
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
        }

        .flex-success-box {
            width: min(90%, 430px);
            padding: 34px;
            text-align: center;
            border-radius: 24px;
            background: #080c14;
            border: 1px solid rgba(245,185,66,.45);
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
/* =========================================================
   FLEX HUB PREDICTIONS
   COMPLETE APP.JS
   PART 2/3
   ========================================================= */


/* =========================================================
   REGULAR ACCESS STATUS
   ========================================================= */

async function refreshRegularAccessStatus() {

    const token =
        getUserToken();


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
            "Regular access status could not be loaded:",
            error
        );

    }

}


/* =========================================================
   UPDATE REGULAR ACCESS UI
   ========================================================= */

function updateRegularAccessUI(
    data
) {

    if (!data) {

        return;

    }


    const active =
        data.active === true ||
        data.hasAccess === true;


    const expiry =
        data.expires_at ||
        data.expiresAt ||
        data.expiry ||
        null;


    const elements =
        document.querySelectorAll(
            "[data-regular-access-status]"
        );


    elements.forEach(
        (element) => {

            if (active) {

                element.textContent =
                    expiry
                        ? `Active until ${formatExpiry(expiry)}`
                        : "Active";

                element.classList.add(
                    "active"
                );

                element.classList.remove(
                    "expired"
                );

            } else {

                element.textContent =
                    "Free access";

                element.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   LOAD REGULAR PREDICTIONS
   ========================================================= */

async function loadPredictions() {

    try {

        const data =
            await apiRequest(
                "/predictions"
            );


        if (Array.isArray(data)) {

            allPredictions =
                data;

        } else if (
            data &&
            Array.isArray(
                data.predictions
            )
        ) {

            allPredictions =
                data.predictions;

        } else {

            allPredictions =
                [];

        }


        renderPredictions();

        updatePredictionStats();

        /*
           Load badges after prediction cards exist.
        */

        loadTeamBadges();

        return allPredictions;

    } catch (error) {

        console.error(
            "Unable to load predictions:",
            error
        );


        allPredictions =
            [];


        renderPredictions();


        const grid =
            document.getElementById(
                "predictionsGrid"
            );


        if (
            grid &&
            !grid.children.length
        ) {

            grid.innerHTML = `
                <div class="empty-state">
                    <strong>Predictions unavailable</strong>
                    <p>
                        Please refresh the page and try again.
                    </p>
                </div>
            `;

        }


        return [];

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
       Optional homepage feature-only mode.
    */

    const featuredOnly =
        grid.dataset.homeFeaturedOnly ===
        "true";


    if (featuredOnly) {

        predictions =
            predictions.filter(
                (prediction) =>
                    prediction.featured === true ||
                    prediction.is_featured === true
            );

    }


    /*
       League filter.
    */

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
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    return (
                        league ===
                        currentLeagueFilter
                    );

                }
            );

    }


    /*
       Search filter.
    */

    if (currentSearchTerm) {

        predictions =
            predictions.filter(
                (prediction) => {

                    const searchable = [

                        prediction.league,

                        prediction.home_team,

                        prediction.homeTeam,

                        prediction.away_team,

                        prediction.awayTeam,

                        prediction.prediction,

                        prediction.analysis,

                        prediction.category

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


    if (!predictions.length) {

        grid.innerHTML = `
            <div class="empty-state">
                <strong>No predictions found</strong>
                <p>
                    Try another team, league or search term.
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
   CREATE PREDICTION CARD
   ========================================================= */

function createPredictionCard(
    prediction
) {

    const id =
        prediction.id ||
        "";


    const league =
        prediction.league ||
        "Football";


    const homeTeam =
        prediction.home_team ||
        prediction.homeTeam ||
        "Home Team";


    const awayTeam =
        prediction.away_team ||
        prediction.awayTeam ||
        "Away Team";


    const matchDate =
        prediction.match_date ||
        prediction.matchDate ||
        "";


    const matchTime =
        prediction.match_time ||
        prediction.matchTime ||
        "";


    const predictionText =
        prediction.prediction ||
        "Prediction unavailable";


    const analysis =
        prediction.analysis ||
        "";


    const category =
        prediction.category ||
        "regular";


    const status =
        formatStatus(
            prediction.status
        );


    const homeInitials =
        getTeamInitials(
            homeTeam
        );


    const awayInitials =
        getTeamInitials(
            awayTeam
        );


    const countdown =
        getMatchCountdown(
            matchDate,
            matchTime
        );


    return `
        <article
            class="prediction-card"
            data-prediction-id="${escapeHtml(id)}"
        >

            <div class="prediction-card-top">

                <span class="prediction-league">
                    ${escapeHtml(league)}
                </span>

                <span class="prediction-status">
                    ${escapeHtml(status)}
                </span>

            </div>


            <div class="prediction-match">

                <div class="team-block">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(homeTeam)}"
                    >
                        <span>
                            ${escapeHtml(homeInitials)}
                        </span>
                    </div>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>


                <div class="match-middle">

                    <span class="match-date">
                        ${escapeHtml(
                            formatMatchDate(matchDate)
                        )}
                    </span>

                    <strong class="match-time">
                        ${escapeHtml(
                            matchTime || "TBA"
                        )}
                    </strong>

                    ${
                        countdown
                            ? `
                                <small class="match-countdown">
                                    ${escapeHtml(countdown)}
                                </small>
                            `
                            : ""
                    }

                </div>


                <div class="team-block">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(awayTeam)}"
                    >
                        <span>
                            ${escapeHtml(awayInitials)}
                        </span>
                    </div>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>


            <div class="prediction-selection">

                <span>
                    Prediction
                </span>

                <strong>
                    ${escapeHtml(predictionText)}
                </strong>

            </div>


            ${
                analysis
                    ? `
                        <div class="prediction-analysis">
                            <strong>Analysis</strong>
                            <p>
                                ${escapeHtml(analysis)}
                            </p>
                        </div>
                    `
                    : ""
            }


            <div class="prediction-card-bottom">

                <span class="prediction-category">
                    ${escapeHtml(
                        formatPlan(category)
                    )}
                </span>

                <span class="prediction-id">
                    #${escapeHtml(id)}
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
            .slice(0, 2)
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    )
        .toUpperCase();

}


/* =========================================================
   MATCH COUNTDOWN
   ========================================================= */

function getMatchCountdown(
    date,
    time
) {

    if (!date || !time) {

        return "";

    }


    const matchDate =
        new Date(
            `${date}T${time}`
        );


    if (
        Number.isNaN(
            matchDate.getTime()
        )
    ) {

        return "";

    }


    const difference =
        matchDate.getTime() -
        Date.now();


    if (difference <= 0) {

        return "Match started";

    }


    const totalMinutes =
        Math.floor(
            difference /
            60000
        );


    const days =
        Math.floor(
            totalMinutes /
            1440
        );


    const hours =
        Math.floor(
            (
                totalMinutes %
                1440
            ) /
            60
        );


    const minutes =
        totalMinutes %
        60;


    if (days > 0) {

        return `${days}d ${hours}h`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    return `${minutes}m`;

}


/* =========================================================
   UPDATE PREDICTION STATS
   ========================================================= */

function updatePredictionStats() {

    const predictionCount =
        document.querySelectorAll(
            "[data-prediction-count]"
        );


    predictionCount.forEach(
        (element) => {

            element.textContent =
                String(
                    allPredictions.length
                );

        }
    );


    const majorLeagueCount =
        document.querySelectorAll(
            "[data-league-count]"
        );


    if (majorLeagueCount.length) {

        const leagues =
            new Set(
                allPredictions
                    .map(
                        (item) =>
                            item.league
                    )
                    .filter(Boolean)
            );


        majorLeagueCount.forEach(
            (element) => {

                element.textContent =
                    String(
                        leagues.size
                    );

            }
        );

    }

}


/* =========================================================
   LOAD RESULTS
   ========================================================= */

async function loadResults() {

    try {

        const data =
            await apiRequest(
                "/results"
            );


        if (Array.isArray(data)) {

            allResults =
                data;

        } else if (
            data &&
            Array.isArray(
                data.results
            )
        ) {

            allResults =
                data.results;

        } else {

            allResults =
                [];

        }


        renderResults();

        return allResults;

    } catch (error) {

        console.warn(
            "Results loading failed:",
            error
        );


        allResults =
            [];


        renderResults();


        return [];

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
        Array.isArray(allResults)
            ? [...allResults]
            : [];


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
                            ""
                        )
                        .trim()
                        .toLowerCase();


                    if (
                        currentResultFilter ===
                        "won"
                    ) {

                        return [
                            "won",
                            "win",
                            "winning"
                        ].includes(
                            status
                        );

                    }


                    if (
                        currentResultFilter ===
                        "lost"
                    ) {

                        return [
                            "lost",
                            "loss",
                            "losing"
                        ].includes(
                            status
                        );

                    }


                    return (
                        status ===
                        currentResultFilter
                    );

                }
            );

    }


    const html =
        results.length
            ? results
                .map(
                    createResultCard
                )
                .join("")
            : `
                <div class="empty-state">
                    <strong>No results available</strong>
                    <p>
                        Results will appear here after matches are checked.
                    </p>
                </div>
            `;


    containers.forEach(
        (container) => {

            container.innerHTML =
                html;

        }
    );

}


/* =========================================================
   CREATE RESULT CARD
   ========================================================= */

function createResultCard(
    result
) {

    const league =
        result.league ||
        "Football";


    const homeTeam =
        result.home_team ||
        result.homeTeam ||
        "Home Team";


    const awayTeam =
        result.away_team ||
        result.awayTeam ||
        "Away Team";


    const date =
        result.match_date ||
        result.matchDate ||
        "";


    const time =
        result.match_time ||
        result.matchTime ||
        "";


    const prediction =
        result.prediction ||
        "Prediction unavailable";


    const status =
        formatStatus(
            result.status
        );


    const statusClass =
        String(
            result.status ||
            "pending"
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9_-]/g,
            ""
        );


    return `
        <article
            class="result-card"
            data-result-status="${escapeHtml(statusClass)}"
        >

            <div class="result-card-top">

                <span>
                    ${escapeHtml(league)}
                </span>

                <strong class="result-status ${escapeHtml(statusClass)}">
                    ${escapeHtml(status)}
                </strong>

            </div>


            <div class="result-teams">

                <strong>
                    ${escapeHtml(homeTeam)}
                </strong>

                <span>
                    vs
                </span>

                <strong>
                    ${escapeHtml(awayTeam)}
                </strong>

            </div>


            <div class="result-info">

                <span>
                    ${escapeHtml(
                        formatMatchDate(date)
                    )}
                </span>

                <span>
                    ${escapeHtml(
                        time || "TBA"
                    )}
                </span>

            </div>


            <div class="result-prediction">

                <span>
                    Prediction
                </span>

                <strong>
                    ${escapeHtml(prediction)}
                </strong>

            </div>

        </article>
    `;

}


/* =========================================================
   REGULAR BETTING / CODE CONTENT
   ========================================================= */

async function loadRegularBettingCodes() {

    const grid =
        document.getElementById(
            "bettingCodesGrid"
        );


    if (!grid) {

        return [];

    }


    try {

        const data =
            await apiRequest(
                "/betting-codes"
            );


        let codes = [];


        if (Array.isArray(data)) {

            codes =
                data;

        } else if (
            data &&
            Array.isArray(data.codes)
        ) {

            codes =
                data.codes;

        }


        if (!codes.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <strong>No codes available</strong>
                    <p>
                        New content will appear here when available.
                    </p>
                </div>
            `;

            return [];

        }


        grid.innerHTML =
            codes
                .map(
                    createBettingCodeCard
                )
                .join("");


        return codes;

    } catch (error) {

        console.warn(
            "Regular betting code loading failed:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <strong>Content unavailable</strong>
                <p>
                    Please try again later.
                </p>
            </div>
        `;


        return [];

    }

}


/* =========================================================
   CREATE CODE CARD
   ========================================================= */

function createBettingCodeCard(
    item
) {

    const bookmaker =
        item.bookmaker ||
        "Bookmaker";


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
        <article class="code-card">

            <div class="code-card-header">

                <strong>
                    ${escapeHtml(bookmaker)}
                </strong>

                <span>
                    ${escapeHtml(
                        formatPlan(category)
                    )}
                </span>

            </div>


            <div class="code-value">

                <code>
                    ${escapeHtml(code)}
                </code>

                ${
                    code
                        ? `
                            <button
                                type="button"
                                onclick="copyBettingCode('${escapeJs(code)}')"
                            >
                                Copy
                            </button>
                        `
                        : ""
                }

            </div>


            ${
                description
                    ? `
                        <p>
                            ${escapeHtml(description)}
                        </p>
                    `
                    : ""
            }

        </article>
    `;

}


/* =========================================================
   COPY BETTING CODE
   ========================================================= */

async function copyBettingCode(
    code
) {

    if (!code) {

        return;

    }


    try {

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {

            await navigator.clipboard.writeText(
                code
            );

        } else {

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


        showTemporaryToast(
            "Code copied.",
            "success"
        );

    } catch (error) {

        console.warn(
            "Unable to copy code:",
            error
        );


        showTemporaryToast(
            "Unable to copy the code.",
            "error"
        );

    }

}


/* =========================================================
   REGULAR PAYMENT GATE
   ========================================================= */

function setupRegularPaymentGate() {

    const buttons =
        document.querySelectorAll(
            "[data-regular-payment], #regularPaymentButton"
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
                initializeRegularPayment
            );


            button.dataset.initialized =
                "true";

        }
    );

}


/* =========================================================
   INITIALIZE REGULAR PAYMENT
   ========================================================= */

async function initializeRegularPayment(
    event
) {

    if (event) {

        event.preventDefault();

    }


    try {

        showTemporaryToast(
            "Payment service is being prepared.",
            "info"
        );


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
            data &&
            (
                data.paymentUrl ||
                data.authorization_url ||
                data.url
            );


        if (paymentUrl) {

            window.location.href =
                paymentUrl;

            return;

        }


        showTemporaryToast(
            data.message ||
            "Payment service is not available yet.",
            "error"
        );

    } catch (error) {

        console.warn(
            "Payment initialization failed:",
            error
        );


        showTemporaryToast(
            error.message ||
            "Payment service is not available yet.",
            "error"
        );

    }

}


/* =========================================================
   VIP PAGE SETUP
   ========================================================= */

function setupVipPage() {

    verifyUserForVipPage()
        .then(
            (valid) => {

                if (!valid) {

                    showVipLockedState(
                        "Please sign in to access VIP."
                    );

                    return;

                }


                setupVipAccessForm();

                checkVipStatus();

            }
        )
        .catch(
            (error) => {

                console.error(
                    "VIP initialization error:",
                    error
                );

            }
        );

}


/* =========================================================
   VERIFY USER FOR VIP
   ========================================================= */

async function verifyUserForVipPage() {

    const token =
        getUserToken();


    if (!token) {

        return false;

    }


    const storedUser =
        getStoredUser();


    if (storedUser) {

        currentUser =
            storedUser;

    }


    const valid =
        await verifyCurrentUserSession(
            false
        );


    return valid;

}


/* =========================================================
   VIP ACCESS FORM
   ========================================================= */

function setupVipAccessForm() {

    const form =
        document.getElementById(
            "vipAccessForm"
        );


    if (!form) {

        return;

    }


    if (
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


/* =========================================================
   HANDLE VIP ACCESS
   ========================================================= */

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
            ? String(
                input.value || ""
            ).trim()
            : "";


    if (!code) {

        showVipMessage(
            "Enter your VIP access code.",
            "error"
        );

        return;

    }


    const form =
        document.getElementById(
            "vipAccessForm"
        );


    const button =
        form
            ? form.querySelector(
                'button[type="submit"]'
            )
            : null;


    try {

        setButtonLoading(
            button,
            true,
            "Checking..."
        );


        showVipMessage(
            "Checking your VIP access code...",
            "info"
        );


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
                data.token ||
                data.vipToken ||
                data.accessToken
            );


        if (!vipToken) {

            throw new Error(
                "VIP access was not returned by the server."
            );

        }


        localStorage.setItem(
            STORAGE_KEYS.VIP_TOKEN,
            vipToken
        );


        window.vipAccessActive =
            true;


        showVipMessage(
            data.message ||
            "VIP access activated successfully.",
            "success"
        );


        await checkVipStatus();

    } catch (error) {

        console.error(
            "VIP access error:",
            error
        );


        showVipMessage(
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
   CHECK VIP STATUS
   ========================================================= */

async function checkVipStatus() {

    const token =
        getUserToken();


    const vipToken =
        getVipToken();


    if (!token) {

        updateVipStatusUI({
            active: false
        });

        return false;

    }


    if (!vipToken) {

        updateVipStatusUI({
            active: false
        });

        return false;

    }


    try {

        const data =
            await apiRequest(
                "/vip/status",
                {
                    headers: {
                        Authorization:
                            `Bearer ${vipToken}`
                    }
                }
            );


        const active =
            data &&
            (
                data.active === true ||
                data.hasAccess === true ||
                data.status === "active"
            );


        window.vipAccessActive =
            active;


        updateVipStatusUI(
            data
        );


        if (active) {

            await loadVipPredictions();

            await loadVipBettingCodes();

        }


        return active;

    } catch (error) {

        console.warn(
            "VIP status check failed:",
            error
        );


        if (
            error.status === 401 ||
            error.status === 403
        ) {

            localStorage.removeItem(
                STORAGE_KEYS.VIP_TOKEN
            );

            window.vipAccessActive =
                false;

        }


        updateVipStatusUI({
            active: false
        });


        return false;

    }

}


/* =========================================================
   UPDATE VIP STATUS UI
   ========================================================= */

function updateVipStatusUI(
    data
) {

    const active =
        data &&
        (
            data.active === true ||
            data.hasAccess === true ||
            data.status === "active"
        );


    const locked =
        document.getElementById(
            "vipLocked"
        );


    const content =
        document.getElementById(
            "vipContent"
        );


    if (active) {

        if (locked) {

            locked.style.display =
                "none";

        }


        if (content) {

            content.style.display =
                "";

        }

    } else {

        if (locked) {

            locked.style.display =
                "";

        }


        if (content) {

            content.style.display =
                "none";

        }

    }


    const statusElements =
        document.querySelectorAll(
            "[data-vip-status]"
        );


    statusElements.forEach(
        (element) => {

            if (active) {

                const expiry =
                    data &&
                    (
                        data.expires_at ||
                        data.expiresAt ||
                        data.expiry
                    );


                element.textContent =
                    expiry
                        ? `VIP active until ${formatExpiry(expiry)}`
                        : "VIP Active";


                element.classList.add(
                    "active"
                );

            } else {

                element.textContent =
                    "VIP Locked";

                element.classList.remove(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   SHOW VIP LOCKED STATE
   ========================================================= */

function showVipLockedState(
    message
) {

    const locked =
        document.getElementById(
            "vipLocked"
        );


    const content =
        document.getElementById(
            "vipContent"
        );


    if (content) {

        content.style.display =
            "none";

    }


    if (locked) {

        locked.style.display =
            "";

    }


    showVipMessage(
        message,
        "warning"
    );

}
 /* =========================================================
    FLEX HUB PREDICTIONS
    COMPLETE APP.JS
    PART 3/3
    ========================================================= */


/* =========================================================
   LOAD VIP PREDICTIONS
   ========================================================= */

async function loadVipPredictions() {

    const grid =
        document.getElementById(
            "vipPredictionsGrid"
        );


    if (!grid) {

        return [];

    }


    const vipToken =
        getVipToken();


    if (!vipToken) {

        return [];

    }


    try {

        const data =
            await apiRequest(
                "/vip/predictions",
                {
                    headers: {
                        Authorization:
                            `Bearer ${vipToken}`
                    }
                }
            );


        let predictions = [];


        if (Array.isArray(data)) {

            predictions =
                data;

        } else if (
            data &&
            Array.isArray(
                data.predictions
            )
        ) {

            predictions =
                data.predictions;

        }


        window.vipPredictionCount =
            predictions.length;


        if (!predictions.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <strong>No VIP predictions available</strong>
                    <p>
                        New VIP predictions will appear here.
                    </p>
                </div>
            `;

            return [];

        }


        grid.innerHTML =
            predictions
                .map(
                    createVipPredictionCard
                )
                .join("");


        loadTeamBadges();


        return predictions;

    } catch (error) {

        console.warn(
            "VIP predictions loading failed:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <strong>VIP predictions unavailable</strong>
                <p>
                    Your VIP access may have expired.
                </p>
            </div>
        `;


        return [];

    }

}


/* =========================================================
   CREATE VIP PREDICTION CARD
   ========================================================= */

function createVipPredictionCard(
    prediction
) {

    const id =
        prediction.id ||
        "";


    const league =
        prediction.league ||
        "Football";


    const homeTeam =
        prediction.home_team ||
        prediction.homeTeam ||
        "Home Team";


    const awayTeam =
        prediction.away_team ||
        prediction.awayTeam ||
        "Away Team";


    const matchDate =
        prediction.match_date ||
        prediction.matchDate ||
        "";


    const matchTime =
        prediction.match_time ||
        prediction.matchTime ||
        "";


    const predictionText =
        prediction.prediction ||
        "Prediction unavailable";


    const analysis =
        prediction.analysis ||
        "";


    const status =
        formatStatus(
            prediction.status
        );


    return `
        <article
            class="prediction-card vip-prediction-card"
            data-vip-prediction-id="${escapeHtml(id)}"
        >

            <div class="prediction-card-top">

                <span class="prediction-league">
                    ${escapeHtml(league)}
                </span>

                <span class="prediction-status vip-status">
                    VIP
                </span>

            </div>


            <div class="prediction-match">

                <div class="team-block">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(homeTeam)}"
                    >
                        <span>
                            ${escapeHtml(
                                getTeamInitials(homeTeam)
                            )}
                        </span>
                    </div>

                    <strong>
                        ${escapeHtml(homeTeam)}
                    </strong>

                </div>


                <div class="match-middle">

                    <span class="match-date">
                        ${escapeHtml(
                            formatMatchDate(matchDate)
                        )}
                    </span>

                    <strong class="match-time">
                        ${escapeHtml(
                            matchTime || "TBA"
                        )}
                    </strong>

                </div>


                <div class="team-block">

                    <div
                        class="team-badge"
                        data-team-name="${escapeHtml(awayTeam)}"
                    >
                        <span>
                            ${escapeHtml(
                                getTeamInitials(awayTeam)
                            )}
                        </span>
                    </div>

                    <strong>
                        ${escapeHtml(awayTeam)}
                    </strong>

                </div>

            </div>


            <div class="prediction-selection">

                <span>
                    VIP Prediction
                </span>

                <strong>
                    ${escapeHtml(predictionText)}
                </strong>

            </div>


            ${
                analysis
                    ? `
                        <div class="prediction-analysis">

                            <strong>
                                Analysis
                            </strong>

                            <p>
                                ${escapeHtml(analysis)}
                            </p>

                        </div>
                    `
                    : ""
            }


            <div class="prediction-card-bottom">

                <span class="prediction-category">
                    ${escapeHtml(status)}
                </span>

                <span class="prediction-id">
                    #${escapeHtml(id)}
                </span>

            </div>

        </article>
    `;

}


/* =========================================================
   LOAD VIP BETTING CODES
   ========================================================= */

async function loadVipBettingCodes() {

    const grid =
        document.getElementById(
            "vipBettingCodesGrid"
        );


    if (!grid) {

        return [];

    }


    const vipToken =
        getVipToken();


    if (!vipToken) {

        return [];

    }


    try {

        const data =
            await apiRequest(
                "/vip/betting-codes",
                {
                    headers: {
                        Authorization:
                            `Bearer ${vipToken}`
                    }
                }
            );


        let codes = [];


        if (Array.isArray(data)) {

            codes =
                data;

        } else if (
            data &&
            Array.isArray(data.codes)
        ) {

            codes =
                data.codes;

        }


        if (!codes.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    <strong>No VIP codes available</strong>
                    <p>
                        New VIP content will appear here.
                    </p>
                </div>
            `;

            return [];

        }


        grid.innerHTML =
            codes
                .map(
                    createVipBettingCodeCard
                )
                .join("");


        return codes;

    } catch (error) {

        console.warn(
            "VIP code loading failed:",
            error
        );


        grid.innerHTML = `
            <div class="empty-state">
                <strong>VIP codes unavailable</strong>
                <p>
                    Please check your VIP access.
                </p>
            </div>
        `;


        return [];

    }

}


/* =========================================================
   CREATE VIP BETTING CODE CARD
   ========================================================= */

function createVipBettingCodeCard(
    item
) {

    const bookmaker =
        item.bookmaker ||
        "Bookmaker";


    const code =
        item.code ||
        "";


    const description =
        item.description ||
        "";


    return `
        <article class="code-card vip-code-card">

            <div class="code-card-header">

                <strong>
                    ${escapeHtml(bookmaker)}
                </strong>

                <span>
                    VIP
                </span>

            </div>


            <div class="code-value">

                <code>
                    ${escapeHtml(code)}
                </code>

                ${
                    code
                        ? `
                            <button
                                type="button"
                                onclick="copyBettingCode('${escapeJs(code)}')"
                            >
                                Copy
                            </button>
                        `
                        : ""
                }

            </div>


            ${
                description
                    ? `
                        <p>
                            ${escapeHtml(description)}
                        </p>
                    `
                    : ""
            }

        </article>
    `;

}


/* =========================================================
   VIP MESSAGE
   ========================================================= */

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


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

function setupForgotPassword() {

    const button =
        document.getElementById(
            "forgotPasswordButton"
        );


    if (!button) {

        return;

    }


    if (
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


/* =========================================================
   SHOW FORGOT PASSWORD
   ========================================================= */

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


/* =========================================================
   HANDLE FORGOT PASSWORD
   ========================================================= */

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

                    skipAuth: true,

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


/* =========================================================
   NOTIFICATION CENTER
   ========================================================= */

function setupNotificationCenter() {

    const buttons =
        document.querySelectorAll(
            "[data-notification-toggle], #notificationButton, #notificationBell"
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
                toggleNotificationPanel
            );


            button.dataset.initialized =
                "true";

        }
    );


    injectNotificationStyles();

    startNotificationPolling();


    /*
       Only load notifications when a user token
       already exists.
    */

    if (getUserToken()) {

        loadNotifications();

    }

}


/* =========================================================
   NOTIFICATION POLLING
   ========================================================= */

function startNotificationPolling() {

    if (notificationTimer) {

        clearInterval(
            notificationTimer
        );

    }


    notificationTimer =
        setInterval(
            () => {

                if (
                    getUserToken()
                ) {

                    loadNotifications();

                }

            },
            60000
        );

}


/* =========================================================
   LOAD NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {

    if (!getUserToken()) {

        updateNotificationBadge(
            0
        );

        return;

    }


    try {

        const data =
            await apiRequest(
                "/notifications"
            );


        let notifications = [];


        if (Array.isArray(data)) {

            notifications =
                data;

        } else if (
            data &&
            Array.isArray(
                data.notifications
            )
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


/* =========================================================
   RENDER NOTIFICATIONS
   ========================================================= */

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

                <strong>
                    No notifications
                </strong>

                <p>
                    You're all caught up.
                </p>

            </div>
        `;


        updateNotificationBadge(
            0
        );


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
                .map(
                    createNotificationHTML
                )
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


/* =========================================================
   CREATE NOTIFICATION HTML
   ========================================================= */

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
            data-notification-id="${escapeHtml(id)}"
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
                                    formatExpiry(createdAt)
                                )}
                            </small>
                        `
                        : ""
                }

            </div>

        </div>
    `;

}


/* =========================================================
   TOGGLE NOTIFICATION PANEL
   ========================================================= */

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


/* =========================================================
   MARK NOTIFICATION READ
   ========================================================= */

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


        await loadNotifications();

    } catch (error) {

        console.warn(
            "Unable to mark notification as read:",
            error
        );

    }

}


/* =========================================================
   MARK ALL NOTIFICATIONS READ
   ========================================================= */

async function markAllNotificationsRead() {

    try {

        await apiRequest(
            "/notifications/read-all",
            {
                method: "POST"
            }
        );


        await loadNotifications();


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


/* =========================================================
   NOTIFICATION BADGE
   ========================================================= */

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


/* =========================================================
   NOTIFICATION STYLES
   ========================================================= */

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
                await fetch(
                    url
                );


            if (!response.ok) {

                continue;

            }


            const data =
                await response.json();


            const team =
                data &&
                Array.isArray(
                    data.teams
                ) &&
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


/* =========================================================
   PWA INSTALL
   ========================================================= */

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

        if (
            installButton.dataset.initialized
        ) {

            return;

        }


        installButton.addEventListener(
            "click",
            installPWA
        );


        installButton.dataset.initialized =
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


/* =========================================================
   INSTALL PWA
   ========================================================= */

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


/* =========================================================
   HIDE INSTALL BUTTON
   ========================================================= */

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


window.installPWA =
    installPWA;


/* =========================================================
   FLEX HUB GLOBAL APP OBJECT
   ========================================================= */

window.FLEX_HUB_APP = {

    version: "4.0",

    apiBaseUrl:
        API_BASE_URL,

    getUserToken,

    getAuthToken,

    getVipToken,

    getStoredUser,

    checkUserSession,

    verifyCurrentUserSession,

    handleLogin,

    handleRegister,

    handleSignOut,

    loadPredictions,

    loadResults,

    loadVipPredictions,

    loadVipBettingCodes,

    checkVipStatus,

    loadNotifications

};


/* =========================================================
   FINAL SAFETY CHECK
   ========================================================= */

console.log(
    "FLEX HUB PREDICTIONS app.js loaded successfully."
);


/* =========================================================
   END OF APP.JS
   ========================================================= */
