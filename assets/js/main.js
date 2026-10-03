/*
 * Small shared behaviors for every page.
 * Uses event delegation, so it works even though the header/footer are
 * inserted later by include.js.
 */
(function () {
  "use strict";

  // ---- Mobile menu toggle ------------------------------------------------
  function setMenu(open) {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
  }

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest(".nav-toggle");
    if (toggle) {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
      return;
    }
    // Close the menu after choosing a link (e.g. "/#home-value" on the homepage)
    if (event.target.closest(".site-nav a")) setMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var toggle = document.querySelector('.nav-toggle[aria-expanded="true"]');
    if (toggle) {
      setMenu(false);
      toggle.focus();
    }
  });

  // Close the menu when keyboard focus leaves the header, so the open panel
  // never covers whatever is focused next
  document.addEventListener("focusout", function (event) {
    var header = event.target.closest && event.target.closest(".site-header");
    if (!header) return;
    if (event.relatedTarget && header.contains(event.relatedTarget)) return;
    if (document.querySelector('.nav-toggle[aria-expanded="true"]')) setMenu(false);
  });

  // Reset the menu when growing to the desktop layout
  var desktop = window.matchMedia("(min-width: 60em)");
  var onChange = function (e) { if (e.matches) setMenu(false); };
  if (desktop.addEventListener) desktop.addEventListener("change", onChange);

  // ---- Remember how this visit started (for lead-source details) ---------
  // On the first page of a browser session, note the external referrer, the
  // landing page, and any utm_ campaign tags. forms.js adds them to the lead's
  // note so it's clear where the lead came from. Kept in sessionStorage only.
  try {
    if (!sessionStorage.getItem("jc-visit")) {
      var ref = "";
      if (document.referrer) {
        var refUrl = new URL(document.referrer);
        if (refUrl.host !== window.location.host) ref = refUrl.host.replace(/^www\./, "");
      }
      var params = new URLSearchParams(window.location.search);
      var utm = ["utm_source", "utm_medium", "utm_campaign"]
        .filter(function (k) { return params.get(k); })
        .map(function (k) { return k.replace("utm_", "") + ": " + params.get(k); })
        .join(", ");
      sessionStorage.setItem("jc-visit", JSON.stringify({
        referrer: ref || "direct",
        landing: window.location.pathname,
        utm: utm
      }));
    }
  } catch (e) { /* storage unavailable: forms still work without it */ }

  // ---- Current year in the footer ----------------------------------------
  document.addEventListener("partials:loaded", function () {
    var year = String(new Date().getFullYear());
    var spans = document.querySelectorAll("[data-year]");
    for (var i = 0; i < spans.length; i++) spans[i].textContent = year;
  });
})();
