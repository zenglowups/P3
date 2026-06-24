/* ZEN Clinics — premium micro-interactions (isolated, no dependencies).
   Adds a gold scroll-progress bar and a pointer-tracked spotlight on
   procedure tiles. Respects prefers-reduced-motion and pointer capability. */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init() {
    /* --- Scroll progress bar ------------------------------------------ */
    var bar = document.createElement("div");
    bar.className = "zen-scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var ticking = false;
    function updateBar() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight || 1;
      var scrolled = window.scrollY || doc.scrollTop || 0;
      var pct = Math.min(1, Math.max(0, scrolled / max));
      bar.style.width = pct * 100 + "%";
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateBar);
          ticking = true;
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", updateBar, { passive: true });
    updateBar();

    /* --- Pointer spotlight on procedure tiles ------------------------- */
    var fineHover =
      window.matchMedia && window.matchMedia("(hover: hover)").matches;
    if (reduceMotion || !fineHover) return;

    var tiles = document.querySelectorAll(".zen-procedure-tile");
    Array.prototype.forEach.call(tiles, function (tile) {
      tile.addEventListener(
        "pointermove",
        function (e) {
          var r = tile.getBoundingClientRect();
          tile.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
          tile.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
        },
        { passive: true }
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
