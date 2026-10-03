/*
 * Small shared behaviors for every page: mobile menu, visit tracking,
 * footer year, and motion (header shadow on scroll, reveal-on-scroll,
 * town-ticker pause button).
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

    // Town ticker pause/play button
    var pause = event.target.closest(".marquee__toggle");
    if (pause) {
      var paused = pause.getAttribute("aria-pressed") !== "true";
      pause.setAttribute("aria-pressed", paused ? "true" : "false");
      pause.closest(".marquee").classList.toggle("is-paused", paused);
    }
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

  // ---- Motion --------------------------------------------------------------
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header: a soft shadow once the page has scrolled
  var scrollQueued = false;
  function updateHeader() {
    scrollQueued = false;
    var header = document.querySelector(".site-header");
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", function () {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateHeader);
  }, { passive: true });
  document.addEventListener("partials:loaded", updateHeader);

  // Reveal on scroll: elements marked data-reveal (or the children of
  // data-reveal-stagger) fade in as they come into view; the CSS is in
  // styles.css → "Reveal on scroll". Nothing is hidden unless this runs, and
  // never under reduced motion, so content can't get stuck invisible.
  var REVEAL = "[data-reveal], [data-reveal-stagger]";
  var revealer = null;

  function watchReveals() {
    var els = document.querySelectorAll(REVEAL);
    for (var i = 0; i < els.length; i++) {
      if (els[i].classList.contains("is-revealed") || els[i].hasAttribute("data-reveal-watched")) continue;
      if (!revealer) { els[i].classList.add("is-revealed"); continue; }
      els[i].setAttribute("data-reveal-watched", "");
      revealer.observe(els[i]);
    }
  }

  if (!reduceMotion && "IntersectionObserver" in window) {
    revealer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        entries[i].target.classList.add("is-revealed");
        revealer.unobserve(entries[i].target);
      }
    }, { rootMargin: "0px 0px -8% 0px" });

    // Already on screen at load: show straight away, without animating
    var initial = document.querySelectorAll(REVEAL);
    for (var j = 0; j < initial.length; j++) {
      if (initial[j].getBoundingClientRect().top < window.innerHeight) {
        initial[j].classList.add("is-revealed", "reveal-skip");
      }
    }
    document.documentElement.classList.add("reveal-ready");
  }
  watchReveals();
  // The footer arrives later (include.js), and may hold reveal targets too
  document.addEventListener("partials:loaded", watchReveals);

  // Town ticker: start it moving and show its pause button (WCAG 2.2.2).
  // Without JS or under reduced motion it stays still, with no button.
  if (!reduceMotion) {
    var tickers = document.querySelectorAll(".marquee");
    for (var k = 0; k < tickers.length; k++) {
      tickers[k].classList.add("marquee--live");
      var toggle = tickers[k].querySelector(".marquee__toggle");
      if (toggle) toggle.hidden = false;
    }
  }
})();
