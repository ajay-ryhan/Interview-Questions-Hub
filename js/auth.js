/* =========================================================
   QA INTERVIEW HUB — AUTHENTICATION
   Account registration, sign-in, the header account control
   and the routes for #login, #register and #dashboard.

   Guests can still browse, search and read every question —
   an account is only needed to save progress and bookmarks.
========================================================= */

(function () {
    "use strict";

    var api = window.QAAPI;

    var user = null;

    var authArea = document.getElementById("auth-area");
    var loginPanel = document.getElementById("login-panel");
    var registerPanel = document.getElementById("register-panel");

    var loginForm = document.getElementById("login-form");
    var registerForm = document.getElementById("register-form");

    var homePrimary = document.getElementById("home-primary");
    var homeSecondary = document.getElementById("home-secondary");

    /* =========================================================
       Helpers
    ========================================================= */

    function currentHash() {
        return window.location.hash.replace(/^#\/?/, "");
    }

    function navigate(hash) {
        if (window.QAHub && window.QAHub.goTo) {
            window.QAHub.goTo(hash);
        } else {
            window.location.hash = hash;
        }
    }

    function showFormError(node, message) {
        if (!node) {
            return;
        }

        if (message) {
            node.textContent = message;
            node.hidden = false;
        } else {
            node.textContent = "";
            node.hidden = true;
        }
    }

    function setBusy(form, busy) {
        var button = form.querySelector("button[type=submit]");

        if (!button) {
            return;
        }

        button.disabled = busy;
        button.classList.toggle("is-busy", busy);
    }

    /* =========================================================
       Session state
    ========================================================= */

    /**
     * The home hero offers the two ways in: log in, or browse as a guest.
     * Once signed in those become shortcuts to the dashboard and the topics.
     */
    function renderHomeActions() {
        if (!homePrimary || !homeSecondary) {
            return;
        }

        if (user) {
            homePrimary.textContent = "Go to Dashboard";
            homePrimary.href = "#dashboard";

            homeSecondary.textContent = "Browse Topics";
            homeSecondary.href = "#topics";
            return;
        }

        homePrimary.textContent = "Log in";
        homePrimary.href = "#login";

        homeSecondary.textContent = "Continue as Guest";
        homeSecondary.href = "#topics";
    }

    function setUser(next, options) {
        user = next || null;

        renderHeader();
        renderHomeActions();

        document.dispatchEvent(
            new CustomEvent("qahub:auth", {
                detail: {
                    user: user,
                    initial: Boolean(options && options.initial)
                }
            })
        );
    }

    function renderHeader() {
        if (!authArea) {
            return;
        }

        authArea.textContent = "";

        // Guests get the Log in / Continue as Guest choice on the home page
        // hero, so the header stays empty for them.
        if (!user) {
            return;
        }

        var menu = document.createElement("div");
        menu.className = "user-menu";

        var trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "user-button";
        trigger.setAttribute("aria-haspopup", "true");
        trigger.setAttribute("aria-expanded", "false");

        var avatar = document.createElement("span");
        avatar.className = "user-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = (user.name || "?").trim().charAt(0).toUpperCase();

        var name = document.createElement("span");
        name.className = "user-name";
        name.textContent = user.name;

        var chevron = document.createElement("span");
        chevron.className = "user-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "▾";

        trigger.appendChild(avatar);
        trigger.appendChild(name);
        trigger.appendChild(chevron);

        var dropdown = document.createElement("div");
        dropdown.className = "user-dropdown";
        dropdown.hidden = true;

        var dashboard = document.createElement("a");
        dashboard.className = "user-menu-item";
        dashboard.href = "#dashboard";
        dashboard.textContent = "Dashboard";

        var topics = document.createElement("a");
        topics.className = "user-menu-item";
        topics.href = "#topics";
        topics.textContent = "Browse topics";

        var logout = document.createElement("button");
        logout.type = "button";
        logout.className = "user-menu-item is-danger";
        logout.textContent = "Log out";

        logout.addEventListener("click", function () {
            doLogout();
        });

        dropdown.appendChild(dashboard);
        dropdown.appendChild(topics);
        dropdown.appendChild(logout);

        trigger.addEventListener("click", function (event) {
            event.stopPropagation();
            dropdown.hidden = !dropdown.hidden;
            trigger.setAttribute("aria-expanded", dropdown.hidden ? "false" : "true");
        });

        menu.appendChild(trigger);
        menu.appendChild(dropdown);
        authArea.appendChild(menu);
    }

    /* =========================================================
       Forms
    ========================================================= */

    function panelFor(hash) {
        if (loginPanel) {
            loginPanel.hidden = hash !== "login";
        }

        if (registerPanel) {
            registerPanel.hidden = hash !== "register";
        }

        if (hash === "login") {
            showFormError(document.getElementById("login-error"), "");
        }

        if (hash === "register") {
            showFormError(document.getElementById("register-error"), "");
        }
    }

    function submitLogin(event) {
        event.preventDefault();

        var form = event.currentTarget;
        var errorNode = document.getElementById("login-error");

        showFormError(errorNode, "");
        setBusy(form, true);

        api.login({
            email: form.elements.email.value.trim(),
            password: form.elements.password.value
        }).then(function (result) {
            setBusy(form, false);

            if (!result.ok || !result.data || !result.data.user) {
                showFormError(
                    errorNode,
                    api.messageOf(result, "Unable to sign in.")
                );
                return;
            }

            form.reset();
            setUser(result.data.user);
            navigate("dashboard");
        }).catch(function () {
            setBusy(form, false);
            showFormError(errorNode, "Network error. Please try again.");
        });
    }

    function submitRegister(event) {
        event.preventDefault();

        var form = event.currentTarget;
        var errorNode = document.getElementById("register-error");

        showFormError(errorNode, "");
        setBusy(form, true);

        api.register({
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            password: form.elements.password.value
        }).then(function (result) {
            setBusy(form, false);

            if (!result.ok || !result.data || !result.data.user) {
                showFormError(
                    errorNode,
                    api.messageOf(result, "Unable to create your account.")
                );
                return;
            }

            form.reset();
            setUser(result.data.user);
            navigate("dashboard");
        }).catch(function () {
            setBusy(form, false);
            showFormError(errorNode, "Network error. Please try again.");
        });
    }

    function doLogout() {
        api.logout().then(function () {
            setUser(null);
            navigate("home");

            if (window.QAProgress) {
                window.QAProgress.toast("You have been signed out.");
            }
        });
    }

    /* =========================================================
       Routing (called by app.js and on load)
    ========================================================= */

    function handleRoute(hash) {
        var value = hash || currentHash();

        if (value === "login" || value === "register") {
            if (user) {
                navigate("dashboard");
                return;
            }

            panelFor(value);
            return;
        }

        if (value === "dashboard") {
            if (!user) {
                navigate("login");
                return;
            }

            if (window.QAProgress) {
                window.QAProgress.renderDashboard();
            }
        }
    }

    /* =========================================================
       Wiring
    ========================================================= */

    if (loginForm) {
        loginForm.addEventListener("submit", submitLogin);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", submitRegister);
    }

    // A single outside-click listener closes the account dropdown.
    document.addEventListener("click", function () {
        var dropdowns = document.querySelectorAll(".user-dropdown");
        var triggers = document.querySelectorAll(".user-button");

        for (var i = 0; i < dropdowns.length; i++) {
            dropdowns[i].hidden = true;
        }

        for (var j = 0; j < triggers.length; j++) {
            triggers[j].setAttribute("aria-expanded", "false");
        }
    });

    function init() {
        api.me().then(function (result) {
            var currentUser = result.ok && result.data ? result.data.user : null;

            setUser(currentUser, { initial: true });
            handleRoute();
        }).catch(function () {
            setUser(null, { initial: true });
            handleRoute();
        });
    }

    init();

    window.QAAuth = {
        get user() {
            return user;
        },
        handleRoute: handleRoute,
        logout: doLogout
    };
})();
