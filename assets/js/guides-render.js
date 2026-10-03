/*
 * Renders guide cards from guides-data.js (window.GUIDES) into any element
 * with a data-guides-list attribute, newest first.
 *
 *   <div class="grid grid--4" data-guides-list data-limit="4"></div>
 *
 * data-limit is optional (the homepage uses 4; resources.html shows all).
 * With fewer guides than the limit, it shows however many exist.
 */
(function () {
  "use strict";

  var guides = (window.GUIDES || []).slice().sort(function (a, b) {
    return b.date.localeCompare(a.date);
  });

  var dateFormat = new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
  });

  function card(guide) {
    var article = document.createElement("article");
    article.className = "card card--link";

    var meta = document.createElement("p");
    meta.className = "card__eyebrow";
    var time = document.createElement("time");
    time.dateTime = guide.date;
    time.textContent = dateFormat.format(new Date(guide.date + "T00:00:00Z"));
    meta.append("Guide · ", time);

    var title = document.createElement("h3");
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
    for (var j = 0; j < shown.length; j++) lists[i].appendChild(card(shown[j]));
  }
})();
