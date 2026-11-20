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
    var forgotPanel = document.getElementById("forgot-panel");
    var resetPanel = document.getElementById("reset-panel");

    var loginForm = document.getElementById("login-form");
    var registerForm = document.getElementById("register-form");
    var forgotForm = document.getElementById("forgot-form");
    var resetForm = document.getElementById("reset-form");

    /**
     * The token carried by the emailed #reset?token=… link. It is kept in
     * memory only and dropped as soon as the password has been changed.
     */
    var resetToken = "";

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

    /**
     * Masks or reveals the password in the field that owns this button.
     * Returns the input so the caller can put the caret back in it.
     */
    function setPasswordVisible(button, visible) {
        var input = button.parentNode.querySelector("input");

        if (!input) {
            return null;
        }

        input.type = visible ? "text" : "password";
        button.textContent = visible ? "Hide" : "Show";
        button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
        button.setAttribute("aria-pressed", visible ? "true" : "false");

        return input;
    }

    /** Puts a form's password fields back to their masked state. */
    function maskPasswords(form) {
        var buttons = form.querySelectorAll(".password-toggle");

        for (var i = 0; i < buttons.length; i++) {
            setPasswordVisible(buttons[i], false);
        }
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
        trigger.title = (user.name || "Account") + " · Online";

        var avatar = document.createElement("span");
        avatar.className = "user-avatar-wrap";
        avatar.setAttribute("aria-hidden", "true");

        var initial = document.createElement("span");
        initial.className = "user-avatar";
        initial.textContent = (user.name || "?").trim().charAt(0).toUpperCase();

        var presence = document.createElement("span");
        presence.className = "user-presence";

        avatar.appendChild(initial);
        avatar.appendChild(presence);

        var details = document.createElement("span");
        details.className = "user-details";

        var name = document.createElement("span");
        name.className = "user-name";
        name.textContent = user.name;

        var status = document.createElement("span");
        status.className = "user-status";
        status.textContent = "Online";

        details.appendChild(name);
        details.appendChild(status);

        var chevron = document.createElement("span");
        chevron.className = "user-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "▾";

        trigger.appendChild(avatar);
        trigger.appendChild(details);
        trigger.appendChild(chevron);

        var dropdown = document.createElement("div");
        dropdown.className = "user-dropdown";
        dropdown.hidden = true;

        /* Navigation lives in the sidebar, so this menu only carries the
           account action. */
        var logout = document.createElement("button");
        logout.type = "button";
        logout.className = "user-menu-item is-danger";
        logout.textContent = "Log out";

        logout.addEventListener("click", function () {
            doLogout();
        });

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

    /** Splits "#reset?token=abc" into its route name and query string. */
    function routeParts(hash) {
        var value = hash || currentHash();
        var mark = value.indexOf("?");

        return {
            name: mark === -1 ? value : value.slice(0, mark),
            query: mark === -1 ? "" : value.slice(mark + 1)
        };
    }

    /** Reads one value out of a "#route?key=value" query string. */
    function queryValue(query, key) {
        var pairs = query.split("&");

        for (var i = 0; i < pairs.length; i++) {
            var equals = pairs[i].indexOf("=");

            if (equals !== -1 && pairs[i].slice(0, equals) === key) {
                return decodeURIComponent(pairs[i].slice(equals + 1));
            }
        }

        return "";
    }

    /**
     * Shows a single auth panel and clears its messages, so an error from one
     * form never follows you onto the next.
     */
    function panelFor(name) {
        var panels = [
            { node: loginPanel, name: "login" },
            { node: registerPanel, name: "register" },
            { node: forgotPanel, name: "forgot" },
            { node: resetPanel, name: "reset" }
        ];

        for (var i = 0; i < panels.length; i++) {
            if (panels[i].node) {
                panels[i].node.hidden = panels[i].name !== name;
            }
        }

        showFormError(document.getElementById(name + "-error"), "");
        showFormError(document.getElementById(name + "-notice"), "");
    }

    /** Reads the token out of a reset link and prepares the panel for it. */
    function prepareResetForm(query) {
        resetToken = queryValue(query, "token");
        panelFor("reset");

        var button = resetForm ? resetForm.querySelector("button[type=submit]") : null;

        if (button) {
            button.disabled = !resetToken;
        }

        if (!resetToken) {
            showFormError(
                document.getElementById("reset-error"),
                "This link is missing its reset token. Please request a new one."
            );
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
            maskPasswords(form);
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
            maskPasswords(form);
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

    function submitForgotPassword(event) {
        event.preventDefault();

        var form = event.currentTarget;
        var errorNode = document.getElementById("forgot-error");
        var noticeNode = document.getElementById("forgot-notice");

        showFormError(errorNode, "");
        showFormError(noticeNode, "");
        setBusy(form, true);

        api.forgotPassword({ email: form.elements.email.value.trim() })
            .then(function (result) {
                setBusy(form, false);

                if (!result.ok) {
                    showFormError(
                        errorNode,
                        api.messageOf(result, "Unable to send the reset link.")
                    );
                    return;
                }

                form.reset();
                showFormError(
                    noticeNode,
                    (result.data && result.data.message) ||
                        "Check your inbox for the reset link."
                );
            })
            .catch(function () {
                setBusy(form, false);
                showFormError(errorNode, "Network error. Please try again.");
            });
    }

    function submitResetPassword(event) {
        event.preventDefault();

        var form = event.currentTarget;
        var errorNode = document.getElementById("reset-error");
        var noticeNode = document.getElementById("reset-notice");

        showFormError(errorNode, "");
        showFormError(noticeNode, "");

        if (!resetToken) {
            showFormError(
                errorNode,
                "This link is missing its reset token. Please request a new one."
            );
            return;
        }

        setBusy(form, true);

        api.resetPassword({
            token: resetToken,
            password: form.elements.password.value
        }).then(function (result) {
            setBusy(form, false);

            if (!result.ok) {
                showFormError(
                    errorNode,
                    api.messageOf(result, "Unable to update your password.")
                );
                return;
            }

            form.reset();
            maskPasswords(form);

            // The token is single use, and the server has already ended every
            // session for this account, so drop the local one too.
            resetToken = "";
            setUser(null);
            showFormError(
                noticeNode,
                "Password updated. You can now log in with your new password."
            );
        }).catch(function () {
            setBusy(form, false);
            showFormError(errorNode, "Network error. Please try again.");
        });
    }

    /* =========================================================
       Routing (called by app.js and on load)
    ========================================================= */

    function handleRoute(hash) {
        var parts = routeParts(hash);

        if (parts.name === "login" || parts.name === "register") {
            if (user) {
                navigate("dashboard");
                return;
            }

            panelFor(parts.name);
            return;
        }

        if (parts.name === "forgot") {
            panelFor("forgot");
            return;
        }

        if (parts.name === "reset") {
            prepareResetForm(parts.query);
            return;
        }

        if (parts.name === "dashboard") {
            // Guests are not bounced away any more: progress.js renders the
            // personal dashboard for signed-in users and a friendly sign-in
            // invitation for everyone else.
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

    if (forgotForm) {
        forgotForm.addEventListener("submit", submitForgotPassword);
    }

    if (resetForm) {
        resetForm.addEventListener("submit", submitResetPassword);
    }

    var passwordToggles = document.querySelectorAll(".password-toggle");

    for (var t = 0; t < passwordToggles.length; t++) {
        passwordToggles[t].addEventListener("click", function (event) {
            // The button sits inside <label>, so keep the label from
            // forwarding this click to the input it points at.
            event.preventDefault();

            var input = setPasswordVisible(this, this.getAttribute("aria-pressed") !== "true");

            // Clicking the button moves focus off the field; put it back.
            if (input) {
                input.focus();
            }
        });
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
