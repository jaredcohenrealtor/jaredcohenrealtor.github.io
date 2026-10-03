/*
 * Renders guide cards from guides-data.js (window.GUIDES) into any element
 * with a data-guides-list attribute, newest first.
 *
 *   <div class="grid grid--4" data-guides-list data-limit="4"></div>
 *
 * data-limit is optional (the homepage uses 4; resources.html shows all).
 * data-heading-level is optional (default 3): the card titles' heading level, so
 * the outline stays correct (h2 on resources.html, where cards sit under the h1).
 * With fewer guides than the limit, it shows however many exist.
 * A guide with an `image` gets a photo across the top of its card
 * (decorative, so alt="": the title link already says where it goes).
 */
(function () {
  "use strict";

  var guides = (window.GUIDES || []).slice().sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  var dateFormat = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
  });

  function media(guide) {
    var base = "/assets/images/" + guide.image;
    var wrap = document.createElement("div");
    wrap.className = "card__media";
    var img = document.createElement("img");
    img.src = base + "-800.webp";
    img.srcset = base + "-400.webp 400w, " + base + "-800.webp 800w";
    img.sizes = "(min-width: 56em) 41rem, 100vw";
    img.width = 800;
    img.height = 500;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    wrap.appendChild(img);
    return wrap;
  }

  function card(guide, level) {
    var article = document.createElement("article");
    article.className = "card card--link";
    if (guide.image) article.appendChild(media(guide));

    var meta = document.createElement("p");
    meta.className = "card__eyebrow";
    var time = document.createElement("time");
    time.dateTime = guide.date;
    time.textContent = dateFormat.format(new Date(guide.date + "T00:00:00Z"));
    meta.append("Guide · ", time);

    var title = document.createElement("h" + level);
    title.className = "card__title";
    var link = document.createElement("a");
    link.href = "/guides/" + guide.slug + ".html";
    link.textContent = guide.title;
    title.appendChild(link);

    var body = document.createElement("p");
    body.className = "card__body";
    body.textContent = guide.description;

    var footer = document.createElement("p");
    footer.className = "card__footer";
    var cta = document.createElement("span");
    cta.className = "link-arrow";
    cta.setAttribute("aria-hidden", "true");
    cta.textContent = "Get the guide";
    footer.appendChild(cta);

    article.append(meta, title, body, footer);
    return article;
  }

  var lists = document.querySelectorAll("[data-guides-list]");
  for (var i = 0; i < lists.length; i++) {
    var limit = parseInt(lists[i].getAttribute("data-limit"), 10) || guides.length;
    var shown = guides.slice(0, limit);
    lists[i].textContent = "";
    var level = parseInt(lists[i].getAttribute("data-heading-level"), 10) || 3;
    for (var j = 0; j < shown.length; j++) lists[i].appendChild(card(shown[j], level));
  }
})();
