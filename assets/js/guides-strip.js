/*
 * Turns the homepage guide list into a scrolling strip (index.html, "Guides for
 * every step"). Runs after guides-render.js has filled the track.
 *
 *   <div data-guides-strip>
 *     <div data-guides-list>…cards…</div>        (cards come from guides-data.js)
 *     <div data-guides-controls hidden>          (shown only when the strip scrolls)
 *       <button data-guides-prev> <button data-guides-pause> <button data-guides-next>
 *
 * Adding a guide to guides-data.js adds one card; nothing here needs to change.
 *   - Swipe and keyboard scrolling are native (overflow + scroll-snap, in CSS).
 *   - Every 5 seconds the strip moves one card on and loops back to the start.
 *   - It pauses while the pointer is over the strip, while focus is on a card,
 *     and when the reader presses Pause (WCAG 2.2.2).
 *   - Under prefers-reduced-motion nothing moves by itself; the arrows still work.
 */
(function () {
  "use strict";

  var INTERVAL_MS = 5000;

  var root = document.querySelector("[data-guides-strip]");
  if (!root) return;
  var track = root.querySelector("[data-guides-list]");
  var controls = root.querySelector("[data-guides-controls]");
  var prev = root.querySelector("[data-guides-prev]");
  var next = root.querySelector("[data-guides-next]");
  var pause = root.querySelector("[data-guides-pause]");
  if (!track || !controls || !prev || !next || !pause) return;

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var userPaused = false;   // the Pause button
  var hovered = false;      // pointer over the strip
  var focusedInTrack = false;

  function maxScroll() {
    return track.scrollWidth - track.clientWidth;
  }

  function overflows() {
    return maxScroll() > 2;
  }

  // Scroll position of each card's left edge (offsetLeft is measured from the
  // track, which is position: relative, and does not change while scrolling)
  function cardStarts() {
    var starts = [];
    for (var i = 0; i < track.children.length; i++) starts.push(track.children[i].offsetLeft);
    return starts;
  }

  function go(left, instant) {
    var smooth = !instant && !reduceQuery.matches;
    track.scrollTo({ left: left, behavior: smooth ? "smooth" : "auto" });
  }

  function showNext() {
    var max = maxScroll();
    var x = track.scrollLeft;
    if (x >= max - 2) return go(0, true);          // at the end: loop to the start
    var starts = cardStarts();
    for (var i = 0; i < starts.length; i++) {
      if (starts[i] > x + 2) return go(Math.min(starts[i], max));
    }
    go(max);
  }

  function showPrev() {
    var max = maxScroll();
    var x = track.scrollLeft;
    if (x <= 2) return go(max, true);              // at the start: loop to the end
    var starts = cardStarts();
    for (var i = starts.length - 1; i >= 0; i--) {
      if (starts[i] < x - 2) return go(starts[i]);
    }
    go(0);
  }

  function canAutoAdvance() {
    return !reduceQuery.matches && !userPaused && !hovered && !focusedInTrack &&
      !document.hidden && overflows();
  }

  function renderControls() {
    var show = overflows();
    controls.hidden = !show;
    pause.hidden = !show || reduceQuery.matches;
    pause.classList.toggle("is-paused", userPaused);
    pause.setAttribute("aria-label", userPaused ? "Play guide rotation" : "Pause guide rotation");
  }

  prev.addEventListener("click", showPrev);
  next.addEventListener("click", showNext);

  pause.addEventListener("click", function () {
    userPaused = !userPaused;
    renderControls();
  });

  root.addEventListener("mouseenter", function () { hovered = true; });
  root.addEventListener("mouseleave", function () { hovered = false; });

  // Pause while a card (not an arrow button) has keyboard focus
  track.addEventListener("focusin", function () { focusedInTrack = true; });
  track.addEventListener("focusout", function (event) {
    if (event.relatedTarget && track.contains(event.relatedTarget)) return;
    focusedInTrack = false;
  });

  window.addEventListener("resize", renderControls);
  if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", renderControls);

  renderControls();
  // Arrows and rotation are the same whether 3 cards or 30 are in the track
  window.setInterval(function () {
    if (canAutoAdvance()) showNext();
  }, INTERVAL_MS);
})();
