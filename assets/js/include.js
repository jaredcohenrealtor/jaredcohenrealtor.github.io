/*
 * Loads the shared header and footer into every page.
 *
 * Each page has placeholders like:
 *   <div data-include="header"></div>
 *   <div data-include="footer"></div>
 * which are replaced with /partials/header.html and /partials/footer.html.
 * Edit those two files to change the header/footer site-wide.
 *
 * After loading, this script:
 *  - marks the current page's menu link (aria-current="page")
 *  - adds ?from=<page> to "contact" links marked data-from-link, so the
 *    contact form can record which page the visitor came from
 *  - fires a "partials:loaded" event on document
 */
(function () {
  "use strict";

  // "/" and "/index.html" are the same page; "/about.html" -> "about"
  function pageSlug(pathname) {
    var file = pathname.split("/").pop() || "index.html";
    var slug = file.replace(/\.html$/, "") || "index";
    var dir = pathname.split("/").slice(-2, -1)[0];
    return dir === "guides" ? "guide-" + slug : slug;
  }

  // Links inside a <template> aren't attached to the page yet, so resolve
  // their href attribute against the current page address ourselves.
  function urlOf(link) {
    return new URL(link.getAttribute("href"), window.location.href);
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/index\.html$/, "/");
  }

  function markCurrentLink(root) {
    var here = normalizePath(window.location.pathname);
    // Menu links, plus the header "Let's talk" button (it IS the Contact page link)
    var links = root.querySelectorAll(".site-nav__link, .site-nav__cta a");
    for (var i = 0; i < links.length; i++) {
      var linkPath = normalizePath(urlOf(links[i]).pathname);
      // Guide pages live under /guides/ but belong to the "Guides" menu item
      var isGuide = here.indexOf("/guides/") === 0 && linkPath === "/resources.html";
      if (linkPath === here || isGuide) {
        links[i].setAttribute("aria-current", "page");
      }
    }
  }

  function addFromParam(root) {
    var from = pageSlug(window.location.pathname);
    if (from === "contact") return;
    var links = root.querySelectorAll("a[data-from-link]");
    for (var i = 0; i < links.length; i++) {
      var url = urlOf(links[i]);
      url.searchParams.set("from", from);
      links[i].setAttribute("href", url.pathname + url.search);
    }
  }

  function load(slot) {
    var name = slot.getAttribute("data-include");
    return fetch("/partials/" + name + ".html")
      .then(function (res) {
        if (!res.ok) throw new Error(res.status + " loading " + name);
        return res.text();
      })
      .then(function (html) {
        var tpl = document.createElement("template");
        tpl.innerHTML = html;
        markCurrentLink(tpl.content);
        addFromParam(tpl.content);
        slot.replaceWith(tpl.content);
      })
      .catch(function (err) {
        // The page's <noscript>-style fallback links still exist in the
        // markup; just leave the empty slot and report the problem.
        slot.removeAttribute("data-include");
        console.error("[include.js]", err);
      });
  }

  var slots = document.querySelectorAll("[data-include]");
  var jobs = [];
  for (var i = 0; i < slots.length; i++) jobs.push(load(slots[i]));

  Promise.all(jobs).then(function () {
    document.dispatchEvent(new CustomEvent("partials:loaded"));
  });
})();
