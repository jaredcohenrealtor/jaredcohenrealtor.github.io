/*
 * Lead forms → Cloudflare Worker → BoldTrail.
 * Full spec: docs/lead-capture.md (local only). Handles every
 * <form data-lead-form="contact|guide">.
 *
 * - Validates fields in the browser and shows errors next to each field.
 * - Spam: drops submissions that fill the hidden "website" field or arrive
 *   under 3 seconds after the page loaded (shown a normal "thanks").
 * - Sends JSON to the Worker; success only when the reply has success === true.
 * - Guide forms: on success, hide the form, reveal [data-guide-unlock], and
 *   remember the unlock in this browser (localStorage).
 * - Never put API tokens here. The Worker URL is the only integration value.
 */
(function () {
  "use strict";

  var WORKER_URL = "https://jared-realtor-leads.jaredcohenrealtor.workers.dev/";
  var MIN_FILL_MS = 3000;
  var TIMEOUT_MS = 20000;
  var DEAL_TYPES = ["buyer", "seller", "buyer,seller", "renter"];

  // Friendly names for ?from= values, used in capture_method / the lead note
  var PAGE_NAMES = {
    "index": "Home", "about": "About", "listings": "Search Homes",
    "resources": "Guides", "contact": "Contact", "404": "Page not found",
    "fair-housing": "Fair Housing", "privacy": "Privacy Policy", "accessibility": "Accessibility"
  };

  function pageName(slug) {
    if (!slug) return "";
    if (PAGE_NAMES[slug]) return PAGE_NAMES[slug] + " page";
    if (slug.indexOf("guide-") === 0) {
      return slug.slice(6).split("-").map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }).join(" ") + " guide page";
    }
    return slug + " page";
  }

  // BoldTrail turns #words in notes into contact hashtags, so keep '#' out of
  // anything the site adds to the note.
  function noHash(s) { return String(s).replace(/#/g, ""); }

  function visitInfo() {
    try { return JSON.parse(sessionStorage.getItem("jc-visit")) || {}; }
    catch (e) { return {}; }
  }

  function storageGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function storageSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* ignore */ } }

  // ---- Validation --------------------------------------------------------
  function digits(s) { return String(s || "").replace(/\D/g, ""); }

  function normalizePhone(s) {
    var d = digits(s);
    return d.length === 11 && d.charAt(0) === "1" ? d.slice(1) : d;
  }

  var MESSAGES = {
    first_name: "Please enter your first name.",
    last_name: "Please enter your last name.",
    email: "Please enter a valid email address, like name@example.com.",
    cell_phone_1: "Please enter a 10-digit phone number.",
    consent: "Please check this box to continue."
  };

  function fieldError(form, input, message) {
    var id = input.id + "-error";
    var err = document.getElementById(id);
    if (!message) {
      if (err) err.remove();
      input.removeAttribute("aria-invalid");
      var described = (input.getAttribute("aria-describedby") || "").replace(id, "").trim();
      if (described) input.setAttribute("aria-describedby", described);
      else input.removeAttribute("aria-describedby");
      return;
    }
    if (!err) {
      err = document.createElement("p");
      err.className = "field__error";
      err.id = id;
      var container = input.closest(".field, .checkbox") || input.parentNode;
      // For the checkbox row, put the error under the whole row
      if (container.classList.contains("checkbox")) container.after(err);
      else container.appendChild(err);
    }
    err.textContent = message;
    input.setAttribute("aria-invalid", "true");
    var ids = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    if (ids.indexOf(id) === -1) ids.push(id);
    input.setAttribute("aria-describedby", ids.join(" "));
  }

  function checkField(form, input) {
    var name = input.name;
    var value = (input.value || "").trim();
    var problem = "";
    if (name === "consent") problem = input.checked ? "" : MESSAGES.consent;
    else if (input.required && !value) problem = MESSAGES[name] || "This field is required.";
    else if (name === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) problem = MESSAGES.email;
    else if (name === "cell_phone_1" && value && normalizePhone(value).length !== 10) problem = MESSAGES.cell_phone_1;
    fieldError(form, input, problem);
    return !problem;
  }

  function validate(form) {
    var inputs = form.querySelectorAll("input[required], select[required], textarea[required]");
    var firstBad = null;
    for (var i = 0; i < inputs.length; i++) {
      if (!checkField(form, inputs[i]) && !firstBad) firstBad = inputs[i];
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  // ---- Payload -----------------------------------------------------------
  // The page on this site the visitor was on just before this one, if any
  function previousPage() {
    try {
      var ref = new URL(document.referrer);
      if (ref.host !== window.location.host) return "";
      var file = ref.pathname.split("/").pop().replace(/\.html$/, "") || "index";
      return pageName(ref.pathname.indexOf("/guides/") === 0 ? "guide-" + file : file);
    } catch (e) { return ""; }
  }

  function contextBlock(extraLines) {
    var visit = visitInfo();
    var from = new URLSearchParams(window.location.search).get("from");
    var lines = ["---", "Submitted from: " + window.location.origin + window.location.pathname];
    lines.push("Came from: " + (from ? pageName(from) : (previousPage() || "direct")));
    lines.push("Found the site via: " + (visit.referrer || "direct") +
      (visit.landing ? " (landed on " + visit.landing + ")" : ""));
    if (visit.utm) lines.push("Campaign: " + visit.utm);
    return lines.concat(extraLines || []).map(noHash).join("\n");
  }

  function buildPayload(form) {
    var kind = form.getAttribute("data-lead-form");
    var data = new FormData(form);
    var get = function (k) { return String(data.get(k) || "").trim(); };
    var from = new URLSearchParams(window.location.search).get("from");

    var payload = {
      first_name: get("first_name"),
      last_name: get("last_name"),
      email: get("email"),
      cell_phone_1: normalizePhone(get("cell_phone_1")),
      email_optin: 1,
      phone_on: 1,
      text_on: 1
    };

    if (kind === "guide") {
      var title = form.getAttribute("data-guide-title") || "Guide";
      payload.source = "Website - Guide Download - " + title;
      payload.capture_method = "Guide gate: " + window.location.pathname;
      payload.message = contextBlock(["Requested guide: " + title]);
    } else {
      payload.source = "Website - Contact Form";
      payload.capture_method = "Contact page form" + (from ? " (via " + pageName(from) + " 'Let's talk' link)" : "");
      var looking = get("looking_to");
      var extra = [];
      if (DEAL_TYPES.indexOf(looking) !== -1) payload.deal_type = looking;
      else if (looking === "exploring") extra.push("Looking to: Just exploring");
      var userMessage = get("message");
      payload.message = (userMessage ? userMessage + "\n\n" : "") + contextBlock(extra);
    }
    return payload;
  }

  // ---- UI states ---------------------------------------------------------
  function setStatus(form, html) {
    var status = form.querySelector(".form-status");
    if (status) status.innerHTML = html;
    return status;
  }

  var ERROR_HTML =
    '<div class="alert alert--error"><p><strong>Something went wrong and your request wasn\'t sent.</strong> ' +
    'Please call or text me at <a href="tel:+16176583035">617&#8209;658&#8209;3035</a> or email ' +
    '<a href="mailto:jared.cohen@exprealty.com">jared.cohen@exprealty.com</a>.</p></div>';

  function showSuccess(form) {
    var kind = form.getAttribute("data-lead-form");
    if (kind === "guide") {
      unlockGuide(form, true);
      storageSet("jc-guide:" + form.getAttribute("data-guide-pdf"), "1");
      return;
    }
    var box = document.createElement("div");
    box.className = "alert alert--success";
    box.setAttribute("role", "status");
    box.setAttribute("tabindex", "-1");
    box.innerHTML = "<p><strong>Thanks, your message is on its way.</strong> I'll be in touch soon.</p>";
    form.replaceWith(box);
    box.focus();
  }

  function unlockGuide(form, moveFocus) {
    var unlock = form.parentNode.querySelector("[data-guide-unlock]");
    if (!unlock) return;
    form.hidden = true;
    unlock.hidden = false;
    var intro = form.parentNode.querySelector("[data-gate-intro]");
    if (intro) intro.hidden = true;
    if (moveFocus) {
      var link = unlock.querySelector("a");
      if (link) link.focus();
    }
  }

  // ---- Submit --------------------------------------------------------------
  function onSubmit(event) {
    var form = event.target;
    event.preventDefault();
    setStatus(form, "");

    if (!validate(form)) return;

    var honeypot = form.querySelector('input[name="website"]');
    var started = Number(form.querySelector('input[name="form_started"]').value) || 0;
    if ((honeypot && honeypot.value) || Date.now() - started < MIN_FILL_MS) {
      showSuccess(form);   // quietly drop likely spam
      return;
    }

    var button = form.querySelector('button[type="submit"]');
    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";

    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

    fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(form)),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (data) {
        if (data && data.success === true) showSuccess(form);
        else throw new Error("not successful");
      })
      .catch(function () {
        setStatus(form, ERROR_HTML);
        button.disabled = false;
        button.textContent = label;
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  // ---- Wire up -------------------------------------------------------------
  var forms = document.querySelectorAll("form[data-lead-form]");
  for (var i = 0; i < forms.length; i++) {
    var form = forms[i];
    var started = form.querySelector('input[name="form_started"]');
    if (started) started.value = String(Date.now());

    // Re-check a field once the visitor leaves it, if it was already flagged
    form.addEventListener("focusout", function (e) {
      if (e.target.getAttribute && e.target.getAttribute("aria-invalid") === "true") {
        checkField(e.currentTarget, e.target);
      }
    });
    form.addEventListener("change", function (e) {
      if (e.target.type === "checkbox" && e.target.getAttribute("aria-invalid") === "true") {
        checkField(e.currentTarget, e.target);
      }
    });
    form.addEventListener("submit", onSubmit);

    // Already unlocked this guide in this browser? Skip the form.
    if (form.getAttribute("data-lead-form") === "guide" &&
        storageGet("jc-guide:" + form.getAttribute("data-guide-pdf"))) {
      unlockGuide(form, false);
    }
  }
})();
