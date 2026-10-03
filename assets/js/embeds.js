/*
 * Picks the BoldTrail property-search widget that fits the screen.
 *
 * listings.html holds both widgets, verbatim, inside <template> tags (which
 * browsers don't load). This copies just one of them into the
 * [data-embed="property-search"] slot:
 *   - 1000px and wider -> #embed-search-wide   (960px-wide widget)
 *   - narrower         -> #embed-search-narrow (280px-wide widget)
 * If the screen crosses 1000px (e.g. rotating a tablet), it swaps widgets.
 * Keep 62.5em in sync with .embed--search in styles.css.
 */
(function () {
  "use strict";

  var slot = document.querySelector('[data-embed="property-search"]');
  if (!slot) return;

  var wide = window.matchMedia("(min-width: 62.5em)");
  var current = null;

  function render() {
    var id = wide.matches ? "embed-search-wide" : "embed-search-narrow";
    if (id === current) return;
    var tpl = document.getElementById(id);
    if (!tpl) return;
    slot.replaceChildren(tpl.content.cloneNode(true));
    current = id;
  }

  render();
  if (wide.addEventListener) wide.addEventListener("change", render);
})();
