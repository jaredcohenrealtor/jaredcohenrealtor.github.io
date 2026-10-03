/*
 * Turns on analytics only on the real website, not in local preview.
 *
 * Each page keeps the Microsoft Clarity and Cloudflare Web Analytics snippets
 * VERBATIM inside <template id="analytics-head"> and <template id="analytics-body">.
 * Browsers don't run code inside a <template>, so nothing loads until this
 * script copies the snippets into the page.
 *
 * Why: in local preview (localhost) Cloudflare rejects the report and logs a
 * CORS error, and Clarity would record our own preview and test visits as real
 * sessions. Owner-approved 2026-10-03.
 */
(function () {
  "use strict";

  var host = window.location.hostname;
  var isLocal = host === "" || host === "localhost" || host === "127.0.0.1" ||
    host === "[::1]" || /\.local$/.test(host);
  if (isLocal) return;

  var targets = { "analytics-head": document.head, "analytics-body": document.body };
  Object.keys(targets).forEach(function (id) {
    var tpl = document.getElementById(id);
    if (tpl && targets[id]) targets[id].appendChild(document.importNode(tpl.content, true));
  });
})();
