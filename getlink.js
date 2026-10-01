// getlink.js - Own shortlink interstitial page
// Stage 1: mandatory ad-gate popup (must CLICK the ad, leave the tab, and return)
// Stage 2: 10 second timer shown in a widget near the top of the page
// Stage 3: real Get Link button at the bottom of the page unlocks -> episode.html

(function () {
  'use strict';

  var qs = new URLSearchParams(window.location.search);
  var series    = qs.get('series');
  var season    = qs.get('season');
  var ep        = qs.get('ep');
  var lang      = qs.get('lang');
  var source    = qs.get('source');
  var movieSlug = qs.get('movie');

  var adGate       = document.getElementById('adGate');
  var timerWidget  = document.getElementById('timerWidget');
  var getLinkBtn   = document.getElementById('getLinkBtn');

  // Build the final destination URL up front
  var finalUrl = null;
  if (movieSlug) {
    finalUrl = 'episode.html?movie=' + encodeURIComponent(movieSlug);
  } else if (series && ep) {
    finalUrl = 'episode.html?series=' + encodeURIComponent(series) + '&ep=' + encodeURIComponent(ep);
    if (season) finalUrl += '&season=' + encodeURIComponent(season);
    if (lang)   finalUrl += '&lang=' + encodeURIComponent(lang);
    if (source) finalUrl += '&source=' + encodeURIComponent(source);
  }

  if (!finalUrl) {
    // Broken/incomplete link - don't lock the user behind a gate for nothing
    if (adGate) adGate.classList.add('gl-hidden');
    document.body.classList.remove('gl-locked');
    if (timerWidget) timerWidget.textContent = '⚠️ Invalid Link';
    return;
  }

  var trackLabel = movieSlug ? ('movie_' + movieSlug) : (series + '_s' + (season || '0') + 'e' + ep);

  var timerDone = false;

  // ── POPUP AD ALTERNATION ──────────────────────────
  // Odd visits show ad network 1, even visits show ad network 2, so the
  // same user doesn't see the same popup ad every single episode.
  (function alternatePopupAd() {
    var KEY = 'gl_popup_ad_count';
    var count = 1;
    try {
      count = parseInt(localStorage.getItem(KEY) || '0', 10) + 1;
      localStorage.setItem(KEY, String(count));
    } catch (e) {}

    var opt1 = document.getElementById('gateAdOption1');
    var opt2 = document.getElementById('gateAdOption2');
    if (!opt1 || !opt2) return;

    var showFirst = (count % 2 === 1);
    opt1.style.display = showFirst ? 'block' : 'none';
    opt2.style.display = showFirst ? 'none' : 'block';
  })();

  // ── STAGE 1: AD GATE ─────────────────────────────
  // The popup only unlocks when BOTH are true:
  //   1) the user actually clicked the ad inside the popup, AND
  //   2) they then left this tab and came back.
  // Just minimizing/reopening the browser does NOT unlock it.
  var gateSlot = document.getElementById('gateAdSlot');
  var adClicked = false;
  var hasLeft = false;
  var gateResolved = false;

  function closeAdGate() {
    if (gateResolved) return;
    gateResolved = true;
    if (adGate) adGate.classList.add('gl-hidden');
    document.body.classList.remove('gl-locked');

    if (typeof gtag !== 'undefined') {
      gtag('event', 'getlink_gate_verified', {
        episode: trackLabel
      });
    }

    startTimer();
  }

  function markAdClicked() {
    if (gateResolved) return;
    adClicked = true;
  }

  // Works for our own <a> link/image AND for third-party ad widgets
  // (capture phase, so it fires even if the widget stops propagation).
  if (gateSlot) {
    gateSlot.addEventListener('click', markAdClicked, true);
    gateSlot.addEventListener('touchend', markAdClicked, true);
  }

  function markLeft() {
    // Only counts as "leaving via the ad" if the ad was clicked first
    if (!gateResolved && adClicked) {
      hasLeft = true;
    }
  }

  function tryResolve() {
    if (!gateResolved && adClicked && hasLeft) {
      closeAdGate();
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      markLeft();
    } else {
      tryResolve();
    }
  });

  window.addEventListener('blur', function () {
    // Ad widgets rendered in an <iframe> swallow the click event, but the
    // window blurs and the iframe becomes the active element. Treat that as a click.
    try {
      var ae = document.activeElement;
      if (gateSlot && ae && ae.tagName === 'IFRAME' && gateSlot.contains(ae)) {
        markAdClicked();
      }
    } catch (e) {}
    markLeft();
  });

  window.addEventListener('focus', tryResolve);

  // ── STAGE 2: 10 SECOND TIMER (top widget) ────────
  function startTimer() {
    var seconds = 10;
    if (timerWidget) timerWidget.textContent = '⏳ Please wait ' + seconds + ' seconds...';

    var interval = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        timerDone = true;
        if (timerWidget) {
          timerWidget.textContent = '✅ Verified! Scroll down to get your link.';
          timerWidget.classList.add('gl-timer-ready');
        }
        unlockFinalButton();
      } else if (timerWidget) {
        timerWidget.textContent = '⏳ Please wait ' + seconds + ' seconds...';
      }
    }, 1000);
  }

  // ── STAGE 3: UNLOCK THE REAL GET LINK BUTTON ─────
  function unlockFinalButton() {
    if (!getLinkBtn) return;
    getLinkBtn.href = finalUrl;
    getLinkBtn.textContent = '🔓 Get Link';
    getLinkBtn.classList.add('gl-ready');
  }

  if (getLinkBtn) {
    getLinkBtn.addEventListener('click', function (e) {
      if (!timerDone) {
        e.preventDefault();
        return;
      }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'getlink_click', {
          episode: trackLabel
        });
      }
    });
  }
})();
