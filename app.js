"use strict";

/* ============================================================
   FLEX HUB PREDICTIONS
   FRONTEND APPLICATION
   MATCHED TO CURRENT EXPRESS BACKEND
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

document.addEventListener("DOMContentLoaded", () => {
    console.log("FLEX HUB PREDICTIONS app starting...");

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
});

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

function saveUser(user, token) {
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
        requestHeaders["Content-Type"] =
            "application/json";

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

        error.data = data;

        throw error;
    }

    return data;
}

/* ============================================================
   ACCOUNT GATE
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}

function showAccountGate() {
    const gate =
        getElement("accountGate");

    const website =
        getElement("mainWebsite");

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
        getElement("accountGate");

    const website =
        getElement("mainWebsite");

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
        getElement("loginPanel");

    const registerPanel =
        getElement("registerPanel");

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
        getElement("loginPanel");

    const registerPanel =
        getElement("registerPanel");

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
        getElement("loginForm");

    const registerForm =
        getElement("registerForm");

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

async function handleLogin(event) {
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
        /*
         * IMPORTANT:
         * Backend route is:
         * POST /api/auth/login
         */

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

        /*
         * Verify the token, but do not
         * destroy a successful login if
         * the profile check temporarily fails.
         */

        const verified =
            await verifyCurrentUserSession(
                true
            );

        if (!verified) {
            console.warn(
                "Login succeeded, but /user/me verification did not complete."
            );
        }

        showMessage(
            messageElement,
            "Login successful. Opening FLEX HUB...",
            "success"
        );

        currentUser =
            data.user;

        updateUserInterface();

        setTimeout(() => {
            openMainWebsite();
        }, 500);

    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        /*
         * Only clear the session when
         * the actual login request failed.
         */
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

async function handleRegister(event) {
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
        ).trim()
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
        /*
         * IMPORTANT:
         * Backend route is:
         * POST /api/auth/register
         */

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

        const verified =
            await verifyCurrentUserSession(
                true
            );

        if (!verified) {
            console.warn(
                "Registration succeeded, but /user/me verification did not complete."
            );
        }

        showMessage(
            messageElement,
            "Account created successfully. Opening FLEX HUB...",
            "success"
        );

        currentUser =
            data.user;

        updateUserInterface();

        setTimeout(() => {
            openMainWebsite();
        }, 500);

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

        /*
         * Do not immediately destroy
         * a session during login/register.
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

/* ============================================================
   CHECK SESSION ON PAGE LOAD
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

    /*
     * Verify the token with the backend.
     */

    const verified =
        await verifyCurrentUserSession(
            false
        );

    if (verified) {
        openMainWebsite();
        return;
    }

    /*
     * If there is a stored user and
     * verification failed because of
     * a temporary/network problem,
     * allow the user into the site.
     *
     * A true 401/403 clears the session
     * inside verifyCurrentUserSession().
     */

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

    /*
     * Load each section independently.
     * One failed request must not prevent
     * the rest of the website from opening.
     */

    loadPredictions()
        .catch((error) => {
            console.error(
                "Prediction loading error:",
                error
            );
        });

    loadResults()
        .catch((error) => {
            console.error(
                "Results loading error:",
                error
            );
        });

    loadRegularBettingCodes()
        .catch((error) => {
            console.error(
                "Betting code loading error:",
                error
            );
        });

    refreshRegularAccessStatus()
        .catch((error) => {
            console.error(
                "Regular access error:",
                error
            );
        });

    loadNotifications()
        .catch((error) => {
            console.error(
                "Notification loading error:",
                error
            );
        });
}
// ============================================================
// BOOKING CODES
// ============================================================

async function loadBookingCodes() {
    try {

        const response = await fetch(
            `${API_BASE_URL}/betting-codes`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to load booking codes."
            );
        }

        const bookingCodes =
            Array.isArray(data)
                ? data
                : (
                    data.codes ||
                    data.bettingCodes ||
                    []
                );

        renderBookingCodes(bookingCodes);

        return bookingCodes;

    } catch (error) {

        console.error(
            "Booking codes error:",
            error
        );

        renderBookingCodes([]);

        return [];
    }
}
function renderBookingCodes(codes) {

    const container =
        document.getElementById(
            "bookingCodesContainer"
        );

    if (!container) {
        return;
    }

    if (!codes || !codes.length) {

        container.innerHTML = `
            <div class="empty-state">
                No booking codes available at the moment.
            </div>
        `;

        return;
    }

    container.innerHTML = codes.map(code => {

        return `
            <div class="booking-code-card">

                <div class="booking-code-top">

                    <span class="booking-code-bookmaker">
                        ${escapeHTML(
                            code.bookmaker || ""
                        )}
                    </span>

                    <span class="booking-code-category">
                        ${escapeHTML(
                            String(
                                code.category || "regular"
                            ).toUpperCase()
                        )}
                    </span>

                </div>

                <div class="booking-code-value">
                    ${escapeHTML(
                        code.code || ""
                    )}
                </div>

                ${
                    code.description
                        ? `
                            <p class="booking-code-description">
                                ${escapeHTML(
                                    code.description
                                )}
                            </p>
                          `
                        : ""
                }

            </div>
        `;

    }).join("");
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

    const elements = [
        getElement("userName"),
        getElement("headerUserName"),
        getElement("accountUserName")
    ];

    elements.forEach(
        (element) => {
            if (element) {
                element.textContent =
                    displayName;
            }
        }
    );

    const usernameElements = [
        getElement("usernameDisplay"),
        getElement("profileUsername")
    ];

    usernameElements.forEach(
        (element) => {
            if (element) {
                element.textContent =
                    user.username ||
                    "";
            }
        }
    );

    const emailElements = [
        getElement("emailDisplay"),
        getElement("profileEmail")
    ];

    emailElements.forEach(
        (element) => {
            if (element) {
                element.textContent =
                    user.email ||
                    "";
            }
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

async function handleSignOut(event) {
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
   NAVIGATION
   ============================================================ */

function setupNavigation() {
    const navLinks =
        document.querySelectorAll(
            'a[href^="#"]'
        );

    navLinks.forEach(
        (link) => {
            link.addEventListener(
                "click",
                (event) => {
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

                    target.scrollIntoView({
                        behavior:
                            "smooth",
                        block:
                            "start"
                    });

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

    const mainNav =
        getElement(
            "mainNav"
        );

    if (
        !menuButton ||
        !mainNav
    ) {
        return;
    }

    menuButton.addEventListener(
        "click",
        () => {
            const isOpen =
                mainNav.classList.toggle(
                    "open"
                );

            mainNav.classList.toggle(
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
            "open",
            "active"
        );
    }

    if (menuButton) {
        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}

/* ============================================================
   SEARCH
   ============================================================ */

function setupSearch() {
    const searchInputs =
        document.querySelectorAll(
            "#predictionSearch, #searchInput, [data-prediction-search]"
        );

    searchInputs.forEach(
        (input) => {
            input.addEventListener(
                "input",
                () => {
                    currentSearchTerm =
                        String(
                            input.value ||
                            ""
                        )
                            .trim()
                            .toLowerCase();

                    renderPredictions();
                }
            );
        }
    );
}

/* ============================================================
   FILTERS
   ============================================================ */

function setupFilters() {
    const leagueButtons =
        document.querySelectorAll(
            "[data-league]"
        );

    leagueButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    currentLeagueFilter =
                        String(
                            button.dataset
                                .league ||
                            "all"
                        )
                            .trim()
                            .toLowerCase();

                    document
                        .querySelectorAll(
                            "[data-league]"
                        )
                        .forEach(
                            (item) =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    renderPredictions();
                }
            );
        }
    );

    const resultButtons =
        document.querySelectorAll(
            "[data-result-filter]"
        );

    resultButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    currentResultFilter =
                        String(
                            button.dataset
                                .resultFilter ||
                            "all"
                        )
                            .trim()
                            .toLowerCase();

                    resultButtons.forEach(
                        (item) =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    button.classList.add(
                        "active"
                    );

                    renderResults();
                }
            );
        }
    );
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
        message ? "" : "none";
}

function clearMessage(id) {
    const element =
        getElement(id);

    if (!element) {
        return;
    }

    element.textContent = "";

    element.classList.remove(
        "success",
        "error",
        "info",
        "warning"
    );

    element.style.display =
        "none";
}

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
   FOOTER
   ============================================================ */

function setupFooter() {
    updateCurrentYear();
}

function updateCurrentYear() {
    const year =
        getElement(
            "currentYear"
        );

    if (year) {
        year.textContent =
            new Date().getFullYear();
    }
}

/* ============================================================
   WHATSAPP
   ============================================================ */

function setupWhatsApp() {
    const buttons =
        document.querySelectorAll(
            "[data-whatsapp], #whatsappButton, .whatsapp-button"
        );

    buttons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    const number =
                        button.dataset
                            .whatsapp ||
                        "";

                    if (!number) {
                        return;
                    }

                    const cleanNumber =
                        number.replace(
                            /[^0-9]/g,
                            ""
                        );

                    window.open(
                        `https://wa.me/${cleanNumber}`,
                        "_blank",
                        "noopener,noreferrer"
                    );
                }
            );
        }
    );
}

/* ============================================================
   PAYMENT BUTTONS
   ============================================================ */

function setupPaymentButtons() {
    const paymentButtons =
        document.querySelectorAll(
            "[data-payment-plan], #paymentButton, .payment-button"
        );

    paymentButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                handlePaymentInitialization
            );
        }
    );
}

async function handlePaymentInitialization(
    event
) {
    event.preventDefault();

    const button =
        event.currentTarget;

    const plan =
        button.dataset
            .paymentPlan ||
        button.dataset.plan ||
        "regular";

    try {
        button.disabled = true;

        const data =
            await apiRequest(
                "/payments/initialize",
                {
                    method: "POST",
                    body: {
                        plan
                    }
                }
            );

        if (
            data?.authorization_url
        ) {
            window.location.href =
                data.authorization_url;

            return;
        }

        if (
            data?.authorizationUrl
        ) {
            window.location.href =
                data.authorizationUrl;

            return;
        }

        showTemporaryNotice(
            data?.message ||
                "Payment service is not currently available."
        );

    } catch (error) {
        console.warn(
            "Payment initialization:",
            error.message
        );

        showTemporaryNotice(
            "Payment service is not currently available. Please contact FLEX HUB support."
        );
    } finally {
        button.disabled = false;
    }
}

/* ============================================================
   TEMPORARY NOTICE
   ============================================================ */

function showTemporaryNotice(
    message
) {
    const existing =
        getElement(
            "flexTemporaryNotice"
        );

    if (existing) {
        existing.remove();
    }

    const notice =
        document.createElement(
            "div"
        );

    notice.id =
        "flexTemporaryNotice";

    notice.textContent =
        message;

    notice.style.position =
        "fixed";

    notice.style.left =
        "50%";

    notice.style.bottom =
        "24px";

    notice.style.transform =
        "translateX(-50%)";

    notice.style.zIndex =
        "99999";

    notice.style.padding =
        "14px 20px";

    notice.style.borderRadius =
        "12px";

    notice.style.maxWidth =
        "90%";

    notice.style.textAlign =
        "center";

    notice.style.background =
        "#05070b";

    notice.style.color =
        "#ffffff";

    notice.style.border =
        "1px solid #f5b942";

    document.body.appendChild(
        notice
    );

    setTimeout(() => {
        notice.remove();
    }, 4000);
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

            const email =
                window.prompt(
                    "Enter the email address connected to your FLEX HUB account:"
                );

            if (!email) {
                return;
            }

            try {
                const data =
                    await apiRequest(
                        "/auth/forgot-password",
                        {
                            method:
                                "POST",
                            skipAuth:
                                true,
                            body: {
                                email:
                                    email
                                        .trim()
                                        .toLowerCase()
                            }
                        }
                    );

                if (
                    data?.resetToken
                ) {
                    window.prompt(
                        "Your password reset token is:",
                        data.resetToken
                    );
                } else {
                    showTemporaryNotice(
                        data?.message ||
                            "If an account exists, reset instructions have been generated."
                    );
                }
            } catch (error) {
                showTemporaryNotice(
                    error.message ||
                        "Unable to start password reset."
                );
            }
        }
    );
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

        const active =
            Boolean(
                data?.regularAccessActive
            );

        document
            .querySelectorAll(
                "[data-regular-access-status]"
            )
            .forEach(
                (element) => {
                    element.textContent =
                        active
                            ? "Active"
                            : "Expired";
                }
            );

        return data;
    } catch (error) {
        console.warn(
            "Unable to check regular access:",
            error.message
        );

        return null;
    }
}

/* ============================================================
   END OF PART 1
   ============================================================ */
/* ============================================================
   FLEX HUB PREDICTIONS
   PART 2/3
   PREDICTIONS • RESULTS • VIP
   ============================================================ */

/* ============================================================
   LOAD PREDICTIONS
   ============================================================ */

async function loadPredictions() {
    const container =
        getElement("predictionsGrid");

    if (!container) {
        return;
    }

    try {
        container.innerHTML =
            createLoadingState(
                "Loading predictions..."
            );

        const data =
            await apiRequest(
                "/predictions",
                {
                    method: "GET"
                }
            );

        allPredictions =
            Array.isArray(
                data?.predictions
            )
                ? data.predictions
                : Array.isArray(data)
                ? data
                : [];

        renderPredictions();
        updatePredictionStats();

        /*
         * Team badges are loaded after
         * the prediction cards are rendered.
         */
        loadPredictionTeamBadges();

        return allPredictions;

    } catch (error) {
        console.error(
            "loadPredictions error:",
            error
        );

        allPredictions = [];

        container.innerHTML =
            createEmptyState(
                "Unable to load predictions right now."
            );

        throw error;
    }
}

/* ============================================================
   RENDER PREDICTIONS
   ============================================================ */

function renderPredictions() {
    const container =
        getElement("predictionsGrid");

    if (!container) {
        return;
    }

    let predictions =
        Array.isArray(allPredictions)
            ? [...allPredictions]
            : [];

    /*
     * Optional homepage feature:
     * If the HTML element has:
     *
     * data-home-featured-only="true"
     *
     * only featured predictions are shown there.
     */
    if (
        container.dataset
            .homeFeaturedOnly ===
        "true"
    ) {
        predictions =
            predictions.filter(
                (prediction) =>
                    Boolean(
                        prediction.featured
                    )
            );
    }

    /* League filter */
    if (
        currentLeagueFilter &&
        currentLeagueFilter !== "all"
    ) {
        predictions =
            predictions.filter(
                (prediction) => {
                    const league =
                        normalizeText(
                            prediction.league
                        );

                    return (
                        league ===
                            currentLeagueFilter ||
                        league.includes(
                            currentLeagueFilter
                        )
                    );
                }
            );
    }

    /* Search */
    if (currentSearchTerm) {
        predictions =
            predictions.filter(
                (prediction) => {
                    const searchable =
                        [
                            prediction.league,
                            prediction.home_team,
                            prediction.away_team,
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
        container.innerHTML =
            createEmptyState(
                currentSearchTerm ||
                    currentLeagueFilter !==
                        "all"
                    ? "No predictions match your current filter."
                    : "No predictions are available yet."
            );

        return;
    }

    /*
     * Sort newest match dates first.
     */
    predictions.sort(
        comparePredictionDates
    );

    container.innerHTML =
        predictions
            .map(
                createPredictionCard
            )
            .join("");

    loadPredictionTeamBadges();
}

/* ============================================================
   PREDICTION CARD
   ============================================================ */

function createPredictionCard(
    prediction
) {
    const league =
        escapeHTML(
            prediction.league ||
                "Football"
        );

    const homeTeam =
        escapeHTML(
            prediction.home_team ||
                "Home Team"
        );

    const awayTeam =
        escapeHTML(
            prediction.away_team ||
                "Away Team"
        );

    const matchDate =
        prediction.match_date ||
        "";

    const matchTime =
        prediction.match_time ||
        "";

    const predictionText =
        escapeHTML(
            prediction.prediction ||
                "Prediction pending"
        );

    const analysis =
        escapeHTML(
            prediction.analysis ||
                "No analysis available."
        );

    const category =
        escapeHTML(
            formatCategory(
                prediction.category
            )
        );

    const status =
        normalizeText(
            prediction.status ||
                "pending"
        );

    const statusClass =
        getStatusClass(status);

    const statusLabel =
        formatStatus(status);

    const countdown =
        getMatchCountdown(
            matchDate,
            matchTime
        );

    const featured =
        Boolean(
            prediction.featured
        );

    return `
        <article
            class="prediction-card"
            data-prediction-id="${escapeHTML(
                prediction.id ?? ""
            )}"
            data-home-team="${homeTeam}"
            data-away-team="${awayTeam}"
        >

            <div class="prediction-card-top">
                <span class="prediction-league">
                    ${league}
                </span>

                ${
                    featured
                        ? `
                            <span class="prediction-featured">
                                ★ FEATURED
                            </span>
                        `
                        : ""
                }
            </div>

            <div class="prediction-match">

                <div class="team-block">
                    <div
                        class="team-badge"
                        data-team-name="${homeTeam}"
                    >
                        <span>
                            ${getTeamInitials(
                                prediction.home_team
                            )}
                        </span>
                    </div>

                    <strong>
                        ${homeTeam}
                    </strong>
                </div>

                <div class="match-center">

                    <span class="match-date">
                        ${escapeHTML(
                            formatMatchDate(
                                matchDate
                            )
                        )}
                    </span>

                    <span class="match-time">
                        ${escapeHTML(
                            matchTime
                        )}
                    </span>

                    <span
                        class="match-countdown"
                        data-countdown-date="${escapeHTML(
                            matchDate
                        )}"
                        data-countdown-time="${escapeHTML(
                            matchTime
                        )}"
                    >
                        ${escapeHTML(
                            countdown
                        )}
                    </span>

                </div>

                <div class="team-block">
                    <div
                        class="team-badge"
                        data-team-name="${awayTeam}"
                    >
                        <span>
                            ${getTeamInitials(
                                prediction.away_team
                            )}
                        </span>
                    </div>

                    <strong>
                        ${awayTeam}
                    </strong>
                </div>

            </div>

            <div class="prediction-details">

                <div class="prediction-row">
                    <span>Prediction</span>

                    <strong>
                        ${predictionText}
                    </strong>
                </div>

                <div class="prediction-row">
                    <span>Category</span>

                    <strong>
                        ${category}
                    </strong>
                </div>

                <div class="prediction-analysis">
                    <span>Analysis</span>

                    <p>
                        ${analysis}
                    </p>
                </div>

            </div>

            <div class="prediction-card-bottom">

                <span class="prediction-status ${statusClass}">
                    ${statusLabel}
                </span>

                <span class="prediction-id">
                    #${escapeHTML(
                        String(
                            prediction.id ??
                                ""
                        )
                    )}
                </span>

            </div>

        </article>
    `;
}

/* ============================================================
   PREDICTION STATS
   ============================================================ */

function updatePredictionStats() {
    const predictions =
        Array.isArray(
            allPredictions
        )
            ? allPredictions
            : [];

    const count =
        predictions.length;

    const predictionCountElements =
        document.querySelectorAll(
            "[data-prediction-count], #predictionCount"
        );

    predictionCountElements.forEach(
        (element) => {
            element.textContent =
                count;
        }
    );

    /*
     * Update common stat cards if
     * they exist in index.html.
     */
    const stats =
        document.querySelectorAll(
            ".stat-number[data-stat='predictions'], [data-stat-predictions]"
        );

    stats.forEach(
        (element) => {
            element.textContent =
                count;
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
            Array.isArray(
                data?.results
            )
                ? data.results
                : Array.isArray(data)
                ? data
                : [];

        renderResults();

        return allResults;

    } catch (error) {
        console.error(
            "loadResults error:",
            error
        );

        allResults = [];

        renderResultsError();

        throw error;
    }
}

/* ============================================================
   RENDER RESULTS
   ============================================================ */

function renderResults() {
    const containers = [
        getElement("resultsGrid"),
        getElement("recentResultsGrid"),
        getElement("resultsContainer")
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
                        normalizeText(
                            result.status
                        );

                    return (
                        status ===
                        currentResultFilter
                    );
                }
            );
    }

    results.sort(
        comparePredictionDates
    );

    if (!results.length) {
        const html =
            createEmptyState(
                "No results available yet."
            );

        containers.forEach(
            (container) => {
                container.innerHTML =
                    html;
            }
        );

        return;
    }

    /*
     * recentResultsGrid may be intended
     * to show only a small number.
     */
    containers.forEach(
        (container) => {
            let output =
                results;

            if (
                container.id ===
                "recentResultsGrid"
            ) {
                output =
                    results.slice(0, 6);
            }

            container.innerHTML =
                output
                    .map(
                        createResultCard
                    )
                    .join("");
        }
    );

    updateResultStats();
}

/* ============================================================
   RESULT CARD
   ============================================================ */

function createResultCard(
    result
) {
    const league =
        escapeHTML(
            result.league ||
                "Football"
        );

    const homeTeam =
        escapeHTML(
            result.home_team ||
                "Home Team"
        );

    const awayTeam =
        escapeHTML(
            result.away_team ||
                "Away Team"
        );

    const prediction =
        escapeHTML(
            result.prediction ||
                "Prediction"
        );

    const analysis =
        escapeHTML(
            result.analysis ||
                ""
        );

    const status =
        normalizeText(
            result.status ||
                "pending"
        );

    const statusClass =
        getStatusClass(status);

    const statusLabel =
        formatStatus(status);

    const date =
        escapeHTML(
            formatMatchDate(
                result.match_date
            )
        );

    const time =
        escapeHTML(
            result.match_time ||
                ""
        );

    return `
        <article
            class="result-card"
            data-result-id="${escapeHTML(
                result.id ??
                    result.prediction_id ??
                    ""
            )}"
        >

            <div class="result-card-top">
                <span>
                    ${league}
                </span>

                <span
                    class="result-status ${statusClass}"
                >
                    ${statusLabel}
                </span>
            </div>

            <div class="result-match">

                <strong>
                    ${homeTeam}
                </strong>

                <span class="result-vs">
                    VS
                </span>

                <strong>
                    ${awayTeam}
                </strong>

            </div>

            <div class="result-meta">
                <span>
                    ${date}
                </span>

                <span>
                    ${time}
                </span>
            </div>

            <div class="result-prediction">
                <span>Prediction</span>

                <strong>
                    ${prediction}
                </strong>
            </div>

            ${
                analysis
                    ? `
                        <p class="result-analysis">
                            ${analysis}
                        </p>
                    `
                    : ""
            }

        </article>
    `;
}

/* ============================================================
   RESULT STATS
   ============================================================ */

function updateResultStats() {
    const results =
        Array.isArray(allResults)
            ? allResults
            : [];

    const count =
        results.length;

    document
        .querySelectorAll(
            "[data-result-count], #resultCount"
        )
        .forEach(
            (element) => {
                element.textContent =
                    count;
            }
        );

    const wins =
        results.filter(
            (result) =>
                normalizeText(
                    result.status
                ) === "win"
        ).length;

    const losses =
        results.filter(
            (result) =>
                normalizeText(
                    result.status
                ) === "loss"
        ).length;

    document
        .querySelectorAll(
            "[data-win-count], #winCount"
        )
        .forEach(
            (element) => {
                element.textContent =
                    wins;
            }
        );

    document
        .querySelectorAll(
            "[data-loss-count], #lossCount"
        )
        .forEach(
            (element) => {
                element.textContent =
                    losses;
            }
        );
}

/* ============================================================
   RESULT ERROR
   ============================================================ */

function renderResultsError() {
    const containers = [
        getElement("resultsGrid"),
        getElement("recentResultsGrid"),
        getElement("resultsContainer")
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
   VIP PAGE
   ============================================================ */

function setupVipPage() {
    console.log(
        "FLEX HUB VIP page detected."
    );

    setupVipAccessForm();

    verifyUserForVipPage()
        .then(() =>
            checkVipStatus()
        )
        .catch((error) => {
            console.error(
                "VIP initialization error:",
                error
            );
        });
}

/* ============================================================
   VERIFY USER BEFORE VIP
   ============================================================ */

async function verifyUserForVipPage() {
    const token =
        getUserToken();

    if (!token) {
        showVipLockedState(
            "Please log in to access FLEX HUB VIP."
        );

        return false;
    }

    const verified =
        await verifyCurrentUserSession(
            false
        );

    if (!verified) {
        showVipLockedState(
            "Your session has expired. Please log in again."
        );

        return false;
    }

    return true;
}

/* ============================================================
   VIP ACCESS FORM
   ============================================================ */

function setupVipAccessForm() {
    const form =
        getElement(
            "vipAccessForm"
        );

    if (!form) {
        return;
    }

    /*
     * Prevent duplicate listeners.
     */
    if (
        form.dataset
            .vipListenerAttached ===
        "true"
    ) {
        return;
    }

    form.dataset
        .vipListenerAttached =
        "true";

    form.addEventListener(
        "submit",
        handleVipAccess
    );
}

/* ============================================================
   REDEEM VIP CODE
   ============================================================ */

async function handleVipAccess(
    event
) {
    if (event) {
        event.preventDefault();
    }

    const input =
        getElement(
            "vipAccessCode"
        ) ||
        getElement(
            "accessCode"
        );

    const message =
        getElement(
            "vipAccessMessage"
        ) ||
        getElement(
            "vipMessage"
        );

    const form =
        event?.currentTarget ||
        getElement(
            "vipAccessForm"
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

    if (!getUserToken()) {
        showMessage(
            message,
            "Please log in before redeeming a VIP code.",
            "error"
        );

        return;
    }

    setFormLoading(
        form,
        true,
        "Verifying code..."
    );

    showMessage(
        message,
        "Verifying your VIP access code...",
        "info"
    );

    try {
        /*
         * IMPORTANT:
         *
         * Current backend route:
         *
         * POST /api/vip/redeem
         *
         * It uses the NORMAL USER JWT.
         *
         * There is no /vip/access route
         * and no separate VIP JWT.
         */

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

        if (
            data?.subscription
        ) {
            window.vipAccessActive =
                true;

            showMessage(
                message,
                data.message ||
                    "VIP access activated successfully.",
                "success"
            );

            if (input) {
                input.value = "";
            }

            updateVipStatusUI(
                data.subscription
            );

            await checkVipStatus();

            return;
        }

        /*
         * Some backend responses may
         * return a direct message.
         */

        if (data?.message) {
            showMessage(
                message,
                data.message,
                "success"
            );

            await checkVipStatus();

            return;
        }

        throw new Error(
            "The server did not confirm VIP activation."
        );

    } catch (error) {
        console.error(
            "VIP redemption error:",
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
   VIP STATUS
   ============================================================ */

async function checkVipStatus() {
    if (!getUserToken()) {
        showVipLockedState(
            "Please log in to access VIP."
        );

        return null;
    }

    try {
        /*
         * Current backend:
         * GET /api/vip/status
         *
         * Uses normal user JWT.
         */

        const data =
            await apiRequest(
                "/vip/status",
                {
                    method: "GET"
                }
            );

        const subscription =
            data?.subscription ||
            data?.vip ||
            null;

        const active =
            Boolean(
                data?.active ??
                data?.vipActive ??
                subscription
                    ?.status === "active"
            );

        window.vipAccessActive =
            active;

        updateVipStatusUI(
            subscription,
            data
        );

        if (active) {
            await loadVipPredictions();

            return data;
        }

        showVipLockedState(
            data?.message ||
                "Enter a valid VIP access code to unlock VIP predictions."
        );

        return data;

    } catch (error) {
        console.error(
            "VIP status error:",
            error
        );

        /*
         * A VIP status failure should
         * never log the user out.
         */

        showVipLockedState(
            error.status === 401 ||
                error.status === 403
                ? "Please log in again to access VIP."
                : "VIP status is temporarily unavailable."
        );

        return null;
    }
}

/* ============================================================
   VIP STATUS UI
   ============================================================ */

function updateVipStatusUI(
    subscription,
    statusData = null
) {
    const active =
        Boolean(
            window.vipAccessActive
        );

    const locked =
        getElement(
            "vipLocked"
        );

    const content =
        getElement(
            "vipContent"
        );

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
        subscription?.expires_at ||
        statusData?.expiresAt ||
        statusData?.expires_at;

    document
        .querySelectorAll(
            "[data-vip-expiry]"
        )
        .forEach(
            (element) => {
                if (expiry) {
                    element.textContent =
                        formatDateTime(
                            expiry
                        );
                } else {
                    element.textContent =
                        active
                            ? "Active"
                            : "Not active";
                }
            }
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
    }
}

/* ============================================================
   VIP LOCKED STATE
   ============================================================ */

function showVipLockedState(
    message
) {
    const locked =
        getElement(
            "vipLocked"
        );

    const content =
        getElement(
            "vipContent"
        );

    const messageElements = [
        getElement(
            "vipAccessMessage"
        ),
        getElement(
            "vipMessage"
        )
    ].filter(Boolean);

    if (locked) {
        locked.style.display =
            "";
    }

    if (content) {
        content.style.display =
            "none";
    }

    messageElements.forEach(
        (element) => {
            showMessage(
                element,
                message,
                "info"
            );
        }
    );

    window.vipAccessActive =
        false;
}

/* ============================================================
   LOAD VIP PREDICTIONS
   ============================================================ */

async function loadVipPredictions() {
    const container =
        getElement(
            "vipPredictionsGrid"
        );

    if (!container) {
        return [];
    }

    if (
        !window.vipAccessActive
    ) {
        showVipLockedState(
            "VIP access is required to view these predictions."
        );

        return [];
    }

    try {
        container.innerHTML =
            createLoadingState(
                "Loading VIP predictions..."
            );

        const data =
            await apiRequest(
                "/vip/predictions",
                {
                    method: "GET"
                }
            );

        const predictions =
            Array.isArray(
                data?.predictions
            )
                ? data.predictions
                : Array.isArray(data)
                ? data
                : [];

        window.vipPredictionCount =
            predictions.length;

        if (!predictions.length) {
            container.innerHTML =
                createEmptyState(
                    "No VIP predictions are available yet."
                );

            return predictions;
        }

        container.innerHTML =
            predictions
                .sort(
                    comparePredictionDates
                )
                .map(
                    createPredictionCard
                )
                .join("");

        loadPredictionTeamBadges();

        return predictions;

    } catch (error) {
        console.error(
            "VIP predictions error:",
            error
        );

        if (
            error.status === 401 ||
            error.status === 403
        ) {
            showVipLockedState(
                "Your VIP access is no longer active."
            );
        } else {
            container.innerHTML =
                createEmptyState(
                    "Unable to load VIP predictions."
                );
        }

        return [];
    }
}

/* ============================================================
   VIP BETTING CODES
   ============================================================ */

async function loadVipBettingCodes() {
    /*
     * The current server.js does NOT expose
     * /api/vip/betting-codes.
     *
     * Do not make a request to a nonexistent
     * endpoint.
     *
     * This function is intentionally safe so
     * existing HTML/inline calls do not crash.
     */

    const container =
        getElement(
            "vipBettingCodesGrid"
        );

    if (container) {
        container.innerHTML =
            createEmptyState(
                "VIP betting codes are not currently available."
            );
    }

    return [];
}

/* ============================================================
   REGULAR BETTING CODES
   ============================================================ */

async function loadRegularBettingCodes() {
    /*
     * The current server.js does NOT have:
     *
     * GET /api/betting-codes
     *
     * The database table exists, but there is
     * currently no public API route.
     *
     * Therefore we intentionally do not
     * generate a 404 request here.
     */

    const container =
        getElement(
            "bettingCodesGrid"
        );

    if (!container) {
        return [];
    }

    container.innerHTML =
        createEmptyState(
            "Betting codes are not currently available."
        );

    return [];
}

/* ============================================================
   COPY BETTING CODE
   ============================================================ */

async function copyBettingCode(
    code,
    button = null
) {
    const value =
        String(
            code || ""
        ).trim();

    if (!value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(
            value
        );

        if (button) {
            const original =
                button.textContent;

            button.textContent =
                "Copied ✓";

            setTimeout(() => {
                button.textContent =
                    original;
            }, 1800);
        }

        showTemporaryNotice(
            "Code copied successfully."
        );

    } catch (error) {
        console.warn(
            "Clipboard error:",
            error
        );

        /*
         * Fallback for browsers where
         * Clipboard API is unavailable.
         */

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

        try {
            document.execCommand(
                "copy"
            );

            showTemporaryNotice(
                "Code copied successfully."
            );
        } catch (_) {
            showTemporaryNotice(
                "Unable to copy the code automatically."
            );
        }

        textarea.remove();
    }
}

/* ============================================================
   END OF PART 2
   ============================================================ */
/* ============================================================
   FLEX HUB PREDICTIONS
   PART 3/3
   NOTIFICATIONS • TEAM BADGES • PWA • HELPERS
   ============================================================ */

/* ============================================================
   NOTIFICATIONS
   ============================================================ */

function setupNotificationCenter() {
    const notificationButtons =
        document.querySelectorAll(
            "#notificationButton, [data-notifications-button]"
        );

    notificationButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    toggleNotificationPanel();
                }
            );
        }
    );

    if (getUserToken()) {
        loadNotifications().catch(
            (error) => {
                console.warn(
                    "Initial notifications could not be loaded:",
                    error.message
                );
            }
        );

        /*
         * Poll every 60 seconds.
         */
        notificationTimer =
            setInterval(() => {
                if (getUserToken()) {
                    loadNotifications().catch(
                        () => {}
                    );
                }
            }, 60000);
    }
}

/* ============================================================
   LOAD NOTIFICATIONS
   ============================================================ */

async function loadNotifications() {
    const token =
        getUserToken();

    if (!token) {
        return [];
    }

    try {
        /*
         * Current backend:
         * GET /api/notifications
         */

        const data =
            await apiRequest(
                "/notifications",
                {
                    method: "GET"
                }
            );

        const notifications =
            Array.isArray(
                data?.notifications
            )
                ? data.notifications
                : Array.isArray(data)
                ? data
                : [];

        renderNotifications(
            notifications
        );

        updateNotificationBadge(
            notifications
        );

        return notifications;

    } catch (error) {
        console.warn(
            "Notification request failed:",
            error.message
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
    const containers =
        document.querySelectorAll(
            "#notificationList, [data-notification-list]"
        );

    if (!containers.length) {
        return;
    }

    const list =
        Array.isArray(
            notifications
        )
            ? notifications
            : [];

    containers.forEach(
        (container) => {
            if (!list.length) {
                container.innerHTML = `
                    <div class="notification-empty">
                        <strong>No notifications</strong>
                        <span>You're all caught up.</span>
                    </div>
                `;

                return;
            }

            container.innerHTML =
                list
                    .map(
                        createNotificationItem
                    )
                    .join("");
        }
    );
}

/* ============================================================
   NOTIFICATION ITEM
   ============================================================ */

function createNotificationItem(
    notification
) {
    const id =
        notification.id ??
        "";

    const title =
        escapeHTML(
            notification.title ||
                "Notification"
        );

    const message =
        escapeHTML(
            notification.message ||
                ""
        );

    const createdAt =
        formatDateTime(
            notification.created_at ||
                notification.createdAt
        );

    const read =
        Boolean(
            notification.read ||
            notification.is_read ||
            notification.read_at
        );

    return `
        <article
            class="notification-item ${
                read
                    ? "is-read"
                    : "is-unread"
            }"
            data-notification-id="${escapeHTML(
                String(id)
            )}"
        >

            <div class="notification-content">

                <strong>
                    ${title}
                </strong>

                <p>
                    ${message}
                </p>

                <small>
                    ${escapeHTML(
                        createdAt
                    )}
                </small>

            </div>

            ${
                !read
                    ? `
                        <button
                            type="button"
                            class="notification-read-button"
                            onclick="markNotificationRead('${escapeHTML(
                                String(id)
                            )}')"
                        >
                            Mark read
                        </button>
                    `
                    : ""
            }

        </article>
    `;
}

/* ============================================================
   MARK ONE NOTIFICATION AS READ
   ============================================================ */

async function markNotificationRead(
    notificationId
) {
    if (!notificationId) {
        return;
    }

    try {
        /*
         * Current backend:
         * POST /api/notifications/:id/read
         */

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
        console.error(
            "Unable to mark notification as read:",
            error
        );
    }
}

/* ============================================================
   MARK ALL NOTIFICATIONS AS READ
   ============================================================ */

async function markAllNotificationsRead() {
    /*
     * The current server.js does NOT have:
     *
     * POST /api/notifications/read-all
     *
     * Therefore we intentionally do not
     * call that nonexistent route.
     *
     * Instead, load the current notifications
     * and mark each unread notification
     * individually using the existing route.
     */

    try {
        const data =
            await apiRequest(
                "/notifications",
                {
                    method: "GET"
                }
            );

        const notifications =
            Array.isArray(
                data?.notifications
            )
                ? data.notifications
                : Array.isArray(data)
                ? data
                : [];

        const unread =
            notifications.filter(
                (notification) =>
                    !notification.read &&
                    !notification.is_read &&
                    !notification.read_at
            );

        for (
            const notification of unread
        ) {
            if (!notification.id) {
                continue;
            }

            try {
                await apiRequest(
                    `/notifications/${encodeURIComponent(
                        notification.id
                    )}/read`,
                    {
                        method: "POST"
                    }
                );
            } catch (error) {
                console.warn(
                    `Could not mark notification ${notification.id} as read.`,
                    error.message
                );
            }
        }

        await loadNotifications();

    } catch (error) {
        console.error(
            "Unable to mark notifications as read:",
            error
        );
    }
}

/* ============================================================
   NOTIFICATION BADGE
   ============================================================ */

function updateNotificationBadge(
    notifications
) {
    const list =
        Array.isArray(
            notifications
        )
            ? notifications
            : [];

    const unreadCount =
        list.filter(
            (notification) =>
                !notification.read &&
                !notification.is_read &&
                !notification.read_at
        ).length;

    document
        .querySelectorAll(
            "#notificationBadge, [data-notification-badge]"
        )
        .forEach(
            (badge) => {
                badge.textContent =
                    unreadCount > 99
                        ? "99+"
                        : unreadCount;

                badge.style.display =
                    unreadCount > 0
                        ? ""
                        : "none";
            }
        );
}

/* ============================================================
   NOTIFICATION PANEL
   ============================================================ */

function toggleNotificationPanel() {
    const panel =
        getElement(
            "notificationPanel"
        ) ||
        document.querySelector(
            "[data-notification-panel]"
        );

    if (!panel) {
        return;
    }

    panel.classList.toggle(
        "open"
    );

    panel.classList.toggle(
        "active"
    );

    const isOpen =
        panel.classList.contains(
            "open"
        ) ||
        panel.classList.contains(
            "active"
        );

    panel.setAttribute(
        "aria-hidden",
        String(!isOpen)
    );
}

/* ============================================================
   TEAM BADGES
   ============================================================ */

function setupTeamBadgeObserver() {
    /*
     * Observe dynamically created
     * prediction cards.
     */

    if (
        typeof MutationObserver ===
        "undefined"
    ) {
        return;
    }

    const observer =
        new MutationObserver(
            () => {
                loadPredictionTeamBadges();
                updateCountdowns();
            }
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

    /*
     * Prevent unnecessary constant
     * observer-triggered loops.
     */
    window.flexTeamBadgeObserver =
        observer;
}

async function loadPredictionTeamBadges() {
    const badges =
        document.querySelectorAll(
            ".team-badge[data-team-name]"
        );

    if (!badges.length) {
        return;
    }

    /*
     * Limit requests to unique team names.
     */
    const names =
        [
            ...new Set(
                Array.from(
                    badges
                )
                    .map(
                        (badge) =>
                            badge.dataset
                                .teamName
                    )
                    .filter(Boolean)
            )
        ];

    for (
        const teamName of names
    ) {
        const matchingBadges =
            Array.from(
                badges
            ).filter(
                (badge) =>
                    badge.dataset
                        .teamName ===
                    teamName
            );

        /*
         * Don't repeatedly search the
         * same team during DOM updates.
         */
        if (
            matchingBadges.some(
                (badge) =>
                    badge.dataset
                        .badgeLoaded ===
                    "true"
            )
        ) {
            continue;
        }

        try {
            const logo =
                await findTeamLogo(
                    teamName
                );

            matchingBadges.forEach(
                (badge) => {
                    if (logo) {
                        badge.innerHTML = `
                            <img
                                src="${escapeAttribute(
                                    logo
                                )}"
                                alt="${escapeAttribute(
                                    teamName
                                )}"
                                loading="lazy"
                            >
                        `;
                    }

                    badge.dataset
                        .badgeLoaded =
                        "true";
                }
            );

        } catch (error) {
            matchingBadges.forEach(
                (badge) => {
                    badge.dataset
                        .badgeLoaded =
                        "true";
                }
            );
        }
    }
}

/* ============================================================
   TEAM LOGO SEARCH
   ============================================================ */

async function findTeamLogo(
    teamName
) {
    if (!teamName) {
        return "";
    }

    const url =
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(
            teamName
        )}`;

    try {
        const response =
            await fetch(url);

        if (!response.ok) {
            return "";
        }

        const data =
            await response.json();

        const teams =
            Array.isArray(
                data?.teams
            )
                ? data.teams
                : [];

        const team =
            teams[0];

        return (
            team?.strBadge ||
            team?.strLogo ||
            ""
        );

    } catch (error) {
        console.warn(
            `Could not find badge for ${teamName}:`,
            error.message
        );

        return "";
    }
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

            showInstallButton();
        }
    );

    window.addEventListener(
        "appinstalled",
        () => {
            deferredInstallPrompt =
                null;

            hideInstallButton();
        }
    );

    const installButton =
        getElement(
            "installAppBtn"
        );

    if (installButton) {
        installButton.addEventListener(
            "click",
            installPWA
        );
    }
}

/* ============================================================
   INSTALL PWA
   ============================================================ */

async function installPWA(
    event
) {
    if (event) {
        event.preventDefault();
    }

    if (!deferredInstallPrompt) {
        showTemporaryNotice(
            "Install is not available on this device or browser yet."
        );

        return;
    }

    try {
        deferredInstallPrompt.prompt();

        const choice =
            await deferredInstallPrompt
                .userChoice;

        console.log(
            "PWA install result:",
            choice?.outcome
        );

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

/* ============================================================
   INSTALL BUTTON UI
   ============================================================ */

function showInstallButton() {
    document
        .querySelectorAll(
            "#installAppBtn, [data-install-app]"
        )
        .forEach(
            (button) => {
                button.style.display =
                    "";
            }
        );
}

function hideInstallButton() {
    document
        .querySelectorAll(
            "#installAppBtn, [data-install-app]"
        )
        .forEach(
            (button) => {
                button.style.display =
                    "none";
            }
        );
}

/* ============================================================
   COUNTDOWN
   ============================================================ */

function getMatchCountdown(
    matchDate,
    matchTime
) {
    if (!matchDate) {
        return "Date unavailable";
    }

    const target =
        parseMatchDate(
            matchDate,
            matchTime
        );

    if (!target) {
        return "Time unavailable";
    }

    const difference =
        target.getTime() -
        Date.now();

    if (
        difference <= 0
    ) {
        return "Match started";
    }

    const totalSeconds =
        Math.floor(
            difference / 1000
        );

    const days =
        Math.floor(
            totalSeconds /
                86400
        );

    const hours =
        Math.floor(
            (
                totalSeconds %
                86400
            ) / 3600
        );

    const minutes =
        Math.floor(
            (
                totalSeconds %
                3600
            ) / 60
        );

    if (days > 0) {
        return `${days}d ${hours}h`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}

/* ============================================================
   LIVE COUNTDOWN UPDATES
   ============================================================ */

function updateCountdowns() {
    document
        .querySelectorAll(
            "[data-countdown-date]"
        )
        .forEach(
            (element) => {
                const date =
                    element.dataset
                        .countdownDate ||
                    "";

                const time =
                    element.dataset
                        .countdownTime ||
                    "";

                element.textContent =
                    getMatchCountdown(
                        date,
                        time
                    );
            }
        );
}

setInterval(
    updateCountdowns,
    30000
);

/* ============================================================
   DATE HELPERS
   ============================================================ */

function parseMatchDate(
    matchDate,
    matchTime
) {
    if (!matchDate) {
        return null;
    }

    const dateString =
        String(
            matchDate
        ).trim();

    const timeString =
        String(
            matchTime ||
                "00:00"
        ).trim();

    /*
     * Handles:
     * YYYY-MM-DD
     * DD-MM-YYYY
     * YYYY/MM/DD
     */
    let normalizedDate =
        dateString;

    if (
        /^\d{2}-\d{2}-\d{4}$/.test(
            dateString
        )
    ) {
        const parts =
            dateString.split(
                "-"
            );

        normalizedDate =
            `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const date =
        new Date(
            `${normalizedDate}T${timeString}`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}

function formatMatchDate(
    value
) {
    if (!value) {
        return "Date TBA";
    }

    const date =
        new Date(
            String(value).includes(
                "T"
            )
                ? value
                : `${value}T00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function formatDateTime(
    value
) {
    if (!value) {
        return "Unknown";
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

/* ============================================================
   SORTING
   ============================================================ */

function comparePredictionDates(
    a,
    b
) {
    const aDate =
        parseMatchDate(
            a?.match_date,
            a?.match_time
        );

    const bDate =
        parseMatchDate(
            b?.match_date,
            b?.match_time
        );

    const aTime =
        aDate
            ? aDate.getTime()
            : 0;

    const bTime =
        bDate
            ? bDate.getTime()
            : 0;

    /*
     * Upcoming matches first.
     */
    return aTime - bTime;
}

/* ============================================================
   STATUS HELPERS
   ============================================================ */

function getStatusClass(
    status
) {
    const normalized =
        normalizeText(
            status
        );

    if (
        normalized === "win" ||
        normalized === "won" ||
        normalized === "success"
    ) {
        return "status-win";
    }

    if (
        normalized === "loss" ||
        normalized === "lost" ||
        normalized === "failed"
    ) {
        return "status-loss";
    }

    if (
        normalized === "void" ||
        normalized === "cancelled" ||
        normalized === "canceled"
    ) {
        return "status-void";
    }

    return "status-pending";
}

function formatStatus(
    status
) {
    const normalized =
        normalizeText(
            status
        );

    switch (normalized) {
        case "win":
        case "won":
            return "WIN";

        case "loss":
        case "lost":
            return "LOSS";

        case "void":
            return "VOID";

        case "cancelled":
        case "canceled":
            return "CANCELLED";

        case "pending":
            return "PENDING";

        default:
            return String(
                status ||
                    "PENDING"
            ).toUpperCase();
    }
}

function formatCategory(
    category
) {
    const normalized =
        normalizeText(
            category
        );

    if (!normalized) {
        return "Regular";
    }

    if (
        normalized ===
        "home"
    ) {
        return "Home Advantage";
    }

    if (
        normalized ===
        "away"
    ) {
        return "Away Advantage";
    }

    if (
        normalized ===
        "competitive"
    ) {
        return "Competitive Match";
    }

    if (
        normalized ===
        "regular"
    ) {
        return "Regular";
    }

    return String(
        category
    );
}

/* ============================================================
   TEAM INITIALS
   ============================================================ */

function getTeamInitials(
    teamName
) {
    const name =
        String(
            teamName ||
                "Team"
        ).trim();

    if (!name) {
        return "FC";
    }

    const words =
        name.split(
            /\s+/
        );

    if (
        words.length === 1
    ) {
        return words[0]
            .slice(0, 2)
            .toUpperCase();
    }

    return (
        words[0][0] +
        words[
            words.length - 1
        ][0]
    ).toUpperCase();
}

/* ============================================================
   NORMALIZE TEXT
   ============================================================ */

function normalizeText(
    value
) {
    return String(
        value || ""
    )
        .trim()
        .toLowerCase();
}

/* ============================================================
   ESCAPING
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

function escapeAttribute(
    value
) {
    return escapeHTML(
        value
    );
}

/* ============================================================
   LOADING / EMPTY STATES
   ============================================================ */

function createLoadingState(
    message
) {
    return `
        <div class="loading-state">
            <div class="loading-spinner"></div>

            <p>
                ${escapeHTML(
                    message ||
                        "Loading..."
                )}
            </p>
        </div>
    `;
}

function createEmptyState(
    message
) {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">
                ⚽
            </div>

            <strong>
                ${escapeHTML(
                    message ||
                        "Nothing available."
                )}
            </strong>
        </div>
    `;
}

/* ============================================================
   GLOBAL FUNCTIONS
   These are required by inline HTML
   onclick handlers and other scripts.
   ============================================================ */

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

window.loadPredictions =
    loadPredictions;

window.loadResults =
    loadResults;

window.loadVipPredictions =
    loadVipPredictions;

window.checkVipStatus =
    checkVipStatus;

/* ============================================================
   PUBLIC FLEX HUB APP OBJECT
   ============================================================ */

window.FLEX_HUB_APP = {
    version: "5.0",

    apiBaseUrl:
        API_BASE_URL,

    getUserToken,
    getAuthToken,
    getStoredUser,

    checkUserSession,
    verifyCurrentUserSession,

    handleLogin,
    handleRegister,
    handleSignOut,

    loadPredictions,
    loadResults,

    loadVipPredictions,
    checkVipStatus,

    loadNotifications
};

/* ============================================================
   FINAL STARTUP MESSAGE
   ============================================================ */

console.log(
    "FLEX HUB PREDICTIONS app.js loaded successfully."
);

console.log(
    "API:",
    API_BASE_URL
);

/* ============================================================
   END OF APP.JS
   ============================================================ */
