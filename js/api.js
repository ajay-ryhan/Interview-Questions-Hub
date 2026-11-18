/* =========================================================
   QA INTERVIEW HUB — API CLIENT
   A thin wrapper around fetch() for the Worker's /api routes.
   Every call is same-origin and sends the session cookie.
========================================================= */

(function () {
    "use strict";

    var BASE = "/api";

    function request(path, options) {
        var config = options || {};
        var headers = { Accept: "application/json" };

        if (config.body !== undefined) {
            headers["Content-Type"] = "application/json";
        }

        return fetch(BASE + path, {
            method: config.method || "GET",
            headers: headers,
            credentials: "same-origin",
            cache: "no-store",
            body: config.body !== undefined ? JSON.stringify(config.body) : undefined
        })
            .then(function (response) {
                if (response.status === 204) {
                    return { ok: response.ok, status: response.status, data: null };
                }

                return response.text().then(function (text) {
                    var data = null;

                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch (error) {
                            data = null;
                        }
                    }

                    return { ok: response.ok, status: response.status, data: data };
                });
            });
    }

    function messageOf(result, fallback) {
        if (result && result.data && typeof result.data.error === "string") {
            return result.data.error;
        }

        return fallback || "Something went wrong. Please try again.";
    }

    window.QAAPI = {
        request: request,
        messageOf: messageOf,

        /* ----- auth ----- */

        register: function (payload) {
            return request("/auth/register", { method: "POST", body: payload });
        },

        login: function (payload) {
            return request("/auth/login", { method: "POST", body: payload });
        },

        logout: function () {
            return request("/auth/logout", { method: "POST", body: {} });
        },

        me: function () {
            return request("/auth/me");
        },

        /* ----- progress ----- */

        getProgress: function () {
            return request("/progress");
        },

        complete: function (questionKey) {
            return request("/progress/complete", {
                method: "POST",
                body: { questionKey: questionKey }
            });
        },

        completeMany: function (questionKeys) {
            return request("/progress/complete", {
                method: "POST",
                body: { questionKeys: questionKeys }
            });
        },

        reset: function (questionKey) {
            return request("/progress/" + encodeURIComponent(questionKey), {
                method: "DELETE"
            });
        },

        /* ----- bookmarks ----- */

        getBookmarks: function () {
            return request("/bookmarks");
        },

        addBookmark: function (questionKey) {
            return request("/bookmarks", {
                method: "POST",
                body: { questionKey: questionKey }
            });
        },

        removeBookmark: function (questionKey) {
            return request("/bookmarks/" + encodeURIComponent(questionKey), {
                method: "DELETE"
            });
        },

        /* ----- dashboard ----- */

        getDashboard: function () {
            return request("/dashboard");
        }
    };
})();
