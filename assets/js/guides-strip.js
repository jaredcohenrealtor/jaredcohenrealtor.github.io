/*
 * Turns the homepage guide list into a continuous strip (index.html, "Guides for
 * every step"). Runs after guides-render.js has filled the track.
 *
 *   <div data-guides-strip>
 *     <div class="guides-strip__row">
 *       <button data-guides-prev> <div data-guides-list>…cards…</div> <button data-guides-next>
 *     </div>
 *     <div data-guides-controls>
 *       <button data-guides-pause> (visible label: Pause / Play)
 *
 * Cards come from guides-data.js; adding a guide adds one card and nothing here
 * needs to change.
 *   - Only when the guides overflow (more cards than fit on screen) does the strip
 *     drift slowly (SPEED_PX_PER_S) and loop seamlessly: copies of the set of
 *     cards follow the originals, and the position wraps back by exactly one set,
 *     so the join can't be seen. The copies are inert (no focus, hidden from
 *     assistive technology). When all the guides fit, no copies are made and the
 *     strip sits still.
 *   - It stops while the mouse pointer is over the strip, while a card or control
 *     has keyboard focus, and while the reader touches, swipes or scrolls it. It
 *     resumes RESUME_AFTER_MS after the last touch or scroll.
 *   - The Pause button is shown only when the strip overflows, and stops the strip
 *     until Play is pressed; hover and touch can't resume it.
 *   - The arrows show only when the guides don't all fit on screen. They step one
 *     card at a time, and work under reduced motion too.
 *   - Under prefers-reduced-motion nothing moves by itself, and the Pause button
 *     is hidden.
 *   - Resizing re-checks the fit: a wide window stops the strip and hides the
 *     controls, a narrow one brings them back.
 */
(function () {
  "use strict";

  var SPEED_PX_PER_S = 25;
  var RESUME_AFTER_MS = 3000;
  var STEP_MS = 450;
  var SCROLL_SLACK_PX = 6;   // a scroll event this far from our own position is the reader

  var root = document.querySelector("[data-guides-strip]");
  if (!root) return;
  var track = root.querySelector("[data-guides-list]");
  var controls = root.querySelector("[data-guides-controls]");
  var prev = root.querySelector("[data-guides-prev]");
  var next = root.querySelector("[data-guides-next]");
  var pause = root.querySelector("[data-guides-pause]");
  if (!track || !controls || !prev || !next || !pause) return;
  var pauseLabel = pause.querySelector("[data-pause-label]");

  var REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
  // A fresh query each time, so a change of the setting is never read from a stale object
  function reducedMotion() { return window.matchMedia(REDUCE_QUERY).matches; }
  var userPaused = false;        // the Pause button
  var hovered = false;           // a mouse pointer is over the strip
  var lastActivity = -Infinity;  // last touch, sideways wheel or reader scroll
  var overflowing = false;       // the originals are wider than the track (arrows show)
  var setWidth = 0;              // distance from one copy of the set to the next
  var starts = [];               // each original card's offset within the set
  var pos = 0;                   // where the strip is; our own float, since scrollLeft rounds
  var step = null;               // { from, to, start, dur } while an arrow is animating
  var lastFrame = 0;
  var resizeQueued = false;

  function now() { return performance.now(); }

  function mod(n, m) { return ((n % m) + m) % m; }

  function write(p) {
    pos = p;
    track.scrollLeft = p;
  }

  function originalCards() {
    return Array.prototype.filter.call(track.children, function (el) {
      return !el.hasAttribute("data-clone");
    });
  }

  // Builds the copies and measures one set. Called on load and after resizes.
  function build() {
    var current = track.scrollLeft;
    var ratio = setWidth ? mod(current, setWidth) / setWidth : 0;
    step = null;

    var clones = track.querySelectorAll("[data-clone]");
    for (var c = 0; c < clones.length; c++) clones[c].remove();

    // Measure in the layout the reader sees: the arrow columns are part of it.
    // Only the originals count, so the arrows show exactly when they don't all fit.
    setArrows(true);
    var clientW = track.clientWidth;
    overflowing = track.scrollWidth - clientW > 2;
    var cards = originalCards();
    // Everything fits (or there is nothing to show): no copies, no motion, sit still
    if (!cards.length || !overflowing) {
      setWidth = 0;
      starts = [];
      pos = 0;
      track.scrollLeft = 0;
      return;
    }

    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    var first = cards[0];
    var last = cards[cards.length - 1];
    setWidth = last.offsetLeft + last.offsetWidth + gap - first.offsetLeft;
    starts = cards.map(function (card) { return card.offsetLeft - first.offsetLeft; });

    // Enough copies that the strip never runs out of cards, even for one guide
    // on a phone or all three on a wide desktop, while it drifts or an arrow jumps ahead
    var sets = 3 + Math.ceil((clientW + gap) / setWidth);
    for (var s = 1; s < sets; s++) {
      for (var i = 0; i < cards.length; i++) {
        var copy = cards[i].cloneNode(true);
        copy.setAttribute("data-clone", "");
        copy.setAttribute("aria-hidden", "true");
        copy.setAttribute("inert", "");
        track.appendChild(copy);
      }
    }
    write(ratio * setWidth);
  }

  // The nearest card start after (or before) a position, within a few sets
  function nextStop(from) {
    var best = Infinity;
    for (var m = 0; m < 4; m++) {
      for (var i = 0; i < starts.length; i++) {
        var v = starts[i] + m * setWidth;
        if (v > from + 2 && v < best) best = v;
      }
    }
    return best;
  }

  function prevStop(from) {
    var best = -Infinity;
    for (var m = 0; m < 4; m++) {
      for (var i = 0; i < starts.length; i++) {
        var v = starts[i] + m * setWidth;
        if (v < from - 2 && v > best) best = v;
      }
    }
    return best;
  }

  function stepBy(dir) {
    if (!overflowing || !setWidth) return;
    // Move into the middle band first (identical copies, so this can't be seen)
    var from = mod(pos, setWidth) + setWidth;
    // Land on a card edge at least half a card away, so every click is a real step
    var card = starts.length > 1 ? starts[1] - starts[0] : setWidth;
    var target = dir > 0 ? nextStop(from + card / 2) : prevStop(from - card / 2);
    write(from);
    if (reducedMotion()) {
      write(mod(target, setWidth));
      step = null;
      return;
    }
    step = { from: from, to: target, start: now(), dur: STEP_MS };
  }

  function keyboardFocusInside() {
    var active = document.activeElement;
    if (!active || !root.contains(active)) return false;
    try {
      return active.matches(":focus-visible");
    } catch (e) {
      return true;
    }
  }

  function canDrift() {
    return !reducedMotion() && !userPaused && !hovered && !keyboardFocusInside() &&
      !document.hidden && overflowing && setWidth > 0 && now() - lastActivity >= RESUME_AFTER_MS;
  }

  // The arrows sit beside the track (grid columns) only when the guides overflow
  function setArrows(show) {
    root.classList.toggle("is-scrolling", show);
    prev.hidden = !show;
    next.hidden = !show;
  }

  function renderControls() {
    var reduce = reducedMotion();
    setArrows(overflowing);
    // Pause shows only when the strip overflows (it's the only thing that moves); hidden under reduced motion too
    controls.hidden = reduce || !overflowing;
    pause.hidden = reduce || !overflowing;
    pause.classList.toggle("is-paused", userPaused);
    pauseLabel.textContent = userPaused ? "Play" : "Pause";
    pause.setAttribute("aria-label", userPaused ? "Play guide rotation" : "Pause guide rotation");
  }

  function frame(t) {
    var dt = lastFrame ? Math.min(t - lastFrame, 100) : 0;
    lastFrame = t;

    if (setWidth) {
      if (step) {
        var p = Math.min(1, (t - step.start) / step.dur);
        var eased = 1 - Math.pow(1 - p, 3);
        write(step.from + (step.to - step.from) * eased);
        if (p >= 1) {
          step = null;
          write(mod(pos, setWidth));
        }
      } else if (canDrift()) {
        write(mod(pos + SPEED_PX_PER_S * dt / 1000, setWidth));
      } else {
        pos = track.scrollLeft;   // paused, or the reader is moving the strip
      }
    }
    requestAnimationFrame(frame);
  }

  prev.addEventListener("click", function () { stepBy(-1); });
  next.addEventListener("click", function () { stepBy(1); });

  pause.addEventListener("click", function () {
    userPaused = !userPaused;
    renderControls();
  });

  // Mouse only: a tap on a phone also fires pointer events, and must not count as hover
  root.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "mouse") hovered = true;
  });
  root.addEventListener("pointerleave", function (event) {
    if (event.pointerType === "mouse") hovered = false;
  });

  // Touch and sideways wheel are the reader moving the strip
  function touched() { lastActivity = now(); }
  track.addEventListener("touchstart", touched, { passive: true });
  track.addEventListener("touchmove", touched, { passive: true });
  track.addEventListener("wheel", function (event) {
    if (Math.abs(event.deltaX) > 0) touched();
  }, { passive: true });

  // Any other scroll that isn't where we put the strip is the reader's
  track.addEventListener("scroll", function () {
    if (Math.abs(track.scrollLeft - pos) > SCROLL_SLACK_PX) touched();
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      build();
      renderControls();
    });
  });
  var reduceQuery = window.matchMedia(REDUCE_QUERY);
  if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", renderControls);

  build();
  renderControls();
  requestAnimationFrame(frame);
})();
