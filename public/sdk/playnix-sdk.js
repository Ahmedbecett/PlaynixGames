/**
 * Playnix Game SDK — drop-in browser client for games hosted on Playnix.
 *
 * A game includes this one file and gets leaderboards, achievements and cloud
 * saves bound to the player's Telegram account, with no backend of its own:
 *
 *   <script src="/sdk/playnix-sdk.js"></script>
 *   <script>
 *     const playnix = Playnix.create({ game: "my-game" });
 *     await playnix.score(1200);                       // leaderboard
 *     await playnix.unlock("first-blood");             // achievement
 *     await playnix.save({ level: 4, coins: 90 });     // cloud save
 *   </script>
 *
 * Design notes:
 *   - No dependencies, ~4 KB, works offline: every call fails soft and the game
 *     keeps running. A missing network must never freeze a player's session.
 *   - The player is identified by the platform's HttpOnly session cookie, which
 *     the browser sends automatically because the game runs on the same origin.
 *   - The game never sees or stores a token.
 */
(function (global) {
  "use strict";

  var DEFAULT_TIMEOUT = 8000;

  function normalizeSlug(value) {
    return String(value || "").trim().toLowerCase();
  }

  function PlaynixError(message, status, code) {
    var error = new Error(message);
    error.name = "PlaynixError";
    error.status = status || 0;
    error.code = code || "sdk_error";
    return error;
  }

  function request(path, options) {
    var opts = options || {};
    var url = "/api/sdk/" + encodeURIComponent(opts.game) + path;
    var controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, opts.timeout || DEFAULT_TIMEOUT)
      : null;

    var init = {
      method: opts.method || "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    };
    if (opts.body !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
    if (controller) init.signal = controller.signal;

    return fetch(url, init)
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return null;
          })
          .then(function (payload) {
            if (!response.ok) {
              var detail = (payload && payload.error) || {};
              throw PlaynixError(
                detail.message || "Request failed with status " + response.status,
                response.status,
                detail.code || "http_error"
              );
            }
            return payload;
          });
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function create(config) {
    var cfg = config || {};
    var game = normalizeSlug(cfg.game);
    if (!game) throw PlaynixError("Playnix.create({ game }) needs the game slug.", 0, "config");
    var debug = Boolean(cfg.debug);

    /** Logs failures without interrupting gameplay. */
    function soft(promise, label) {
      return promise.catch(function (error) {
        if (debug) console.warn("[playnix] " + label + " failed:", error.message);
        return { ok: false, error: error.message, code: error.code };
      });
    }

    var api = {
      /** The game slug this client is bound to. */
      game: game,

      /**
       * Submits a score. Only a personal best is stored, so calling this on
       * every attempt is safe and cheap.
       * Resolves { score, best, rank, total, board }.
       */
      score: function (value, options) {
        var opts = options || {};
        return soft(
          request("/scores", {
            game: game,
            method: "POST",
            timeout: opts.timeout,
            body: {
              score: Number(value),
              board: opts.board,
              direction: opts.direction,
            },
          }),
          "score"
        );
      },

      /** Reads the leaderboard. Resolves { entries, me, board, direction }. */
      leaderboard: function (options) {
        var opts = options || {};
        var query = [];
        if (opts.board) query.push("board=" + encodeURIComponent(opts.board));
        if (opts.limit) query.push("limit=" + encodeURIComponent(opts.limit));
        return soft(request("/scores" + (query.length ? "?" + query.join("&") : ""), { game: game }), "leaderboard");
      },

      /** Declares the achievement catalogue so the platform knows the names. */
      defineAchievements: function (list, options) {
        var opts = options || {};
        return soft(
          request("/achievements", {
            game: game,
            method: "PUT",
            timeout: opts.timeout,
            body: { achievements: list || [] },
          }),
          "defineAchievements"
        );
      },

      /** Unlocks an achievement. Resolves { new, total, points }. */
      unlock: function (key, options) {
        var opts = options || {};
        return soft(
          request("/achievements", {
            game: game,
            method: "POST",
            timeout: opts.timeout,
            body: { key: String(key) },
          }),
          "unlock"
        );
      },

      /** The achievement list for this game, with the player's progress. */
      achievements: function () {
        return soft(request("/achievements", { game: game }), "achievements");
      },

      /** Reads cloud save data. Resolves { save } or { save: null }. */
      load: function (options) {
        var opts = options || {};
        var query = opts.slot ? "?slot=" + encodeURIComponent(opts.slot) : "";
        return soft(request("/save" + query, { game: game }), "load");
      },

      /** Writes cloud save data. Pass `expectedRevision` to detect conflicts. */
      save: function (payload, options) {
        var opts = options || {};
        return soft(
          request("/save", {
            game: game,
            method: "PUT",
            timeout: opts.timeout,
            body: { payload: payload, slot: opts.slot, expectedRevision: opts.expectedRevision },
          }),
          "save"
        );
      },

      /** Deletes a save slot. */
      clearSave: function (options) {
        var opts = options || {};
        var query = opts.slot ? "?slot=" + encodeURIComponent(opts.slot) : "";
        return soft(request("/save" + query, { game: game, method: "DELETE" }), "clearSave");
      },

      /**
       * Local-first helper: writes to localStorage immediately and mirrors to
       * the cloud in the background, so a flaky connection never loses progress.
       */
      saveLocalFirst: function (payload, options) {
        var opts = options || {};
        var key = "playnix:save:" + game + ":" + (opts.slot || "default");
        try {
          if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(payload));
        } catch (error) {
          /* private mode / quota — ignore */
        }
        return api.save(payload, opts);
      },

      /** Reads the local copy written by saveLocalFirst (synchronous). */
      loadLocal: function (options) {
        var opts = options || {};
        var key = "playnix:save:" + game + ":" + (opts.slot || "default");
        try {
          var raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
          return raw ? JSON.parse(raw) : null;
        } catch (error) {
          return null;
        }
      },

      /** True inside the iframe shell; the player is authenticated by cookie. */
      isReady: function () {
        return true;
      },
    };

    return api;
  }

  var Playnix = { create: create, version: "1.0.0" };

  if (typeof module !== "undefined" && module.exports) module.exports = Playnix;
  global.Playnix = Playnix;
})(typeof window !== "undefined" ? window : this);
