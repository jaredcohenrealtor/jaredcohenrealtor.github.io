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

  // ---- Current year in the footer ----------------------------------------
  document.addEventListener("partials:loaded", function () {
    var year = String(new Date().getFullYear());
    var spans = document.querySelectorAll("[data-year]");
    for (var i = 0; i < spans.length; i++) spans[i].textContent = year;
  });
})();
