/*
 * Picks the BoldTrail property-search widget that fits the screen.
 *
 * listings.html holds both widgets, verbatim, inside <template> tags (which
 * browsers don't load). This copies just one of them into the
 * [data-embed="property-search"] slot:
 *   - 1000px and wider -> #embed-search-wide   (960px-wide widget)
 *   - narrower         -> #embed-search-narrow (280px-wide widget)
 * index.html holds its own copy the same way, in the [data-embed="home-search"]
 * slot, using #home-search-wide and #home-search-narrow.
 * If the screen crosses 1000px (e.g. rotating a tablet), it swaps widgets.
 * Keep 62.5em in sync with .embed--search in styles.css.
 */
(function () {
  "use strict";

  // Slot name -> prefix of its two <template> ids (<prefix>-wide, <prefix>-narrow)
  var SLOTS = {
    "property-search": "embed-search",
    "home-search": "home-search"
  };

  function mount(slot, prefix) {
    var wide = window.matchMedia("(min-width: 62.5em)");
    var current = null;

    function render() {
      var id = wide.matches ? prefix + "-wide" : prefix + "-narrow";
      if (id === current) return;
      var tpl = document.getElementById(id);
      if (!tpl) return;
      slot.replaceChildren(tpl.content.cloneNode(true));
      current = id;
    }

    render();
    if (wide.addEventListener) wide.addEventListener("change", render);
  }

  Object.keys(SLOTS).forEach(function (name) {
    var slot = document.querySelector('[data-embed="' + name + '"]');
    if (slot) mount(slot, SLOTS[name]);
  });
})();
