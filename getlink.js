// getlink.js - Own shortlink interstitial page
// Stage 1: mandatory ad-gate popup (must leave tab via the ad + return)
// Stage 2: 10 second timer shown in a widget near the top of the page
// Stage 3: real Get Link button at the bottom of the page unlocks -> episode.html

(function () {
  'use strict';

  var qs = new URLSearchParams(window.location.search);
  var series = qs.get('series');
  var season = qs.get('season');
  var ep     = qs.get('ep');
  var lang   = qs.get('lang');
  var source = qs.get('source');

  var adGate       = document.getElementById('adGate');
  var timerWidget  = document.getElementById('timerWidget');
  var getLinkBtn   = document.getElementById('getLinkBtn');

  // Build the final destination URL up front
  var finalUrl = null;
  if (series && ep) {
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

  var timerDone = false;

  // ── STAGE 1: AD GATE ─────────────────────────────
  // The ad widget itself is the click target (its tile opens in a new tab).
  // We detect the generic "tab was left, then came back" pattern.
  var pageReadyAt = Date.now();
  var hasLeft = false;
  var gateResolved = false;

  function closeAdGate() {
    if (gateResolved) return;
    gateResolved = true;
    if (adGate) adGate.classList.add('gl-hidden');
    document.body.classList.remove('gl-locked');

    if (typeof gtag !== 'undefined') {
      gtag('event', 'getlink_gate_verified', {
        episode: series + '_s' + (season || '0') + 'e' + ep
      });
    }

    startTimer();
  }

  function markLeft() {
    if (!gateResolved && (Date.now() - pageReadyAt) > 800) {
      hasLeft = true;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      markLeft();
    } else if (document.visibilityState === 'visible' && hasLeft && !gateResolved) {
      closeAdGate();
    }
  });

  window.addEventListener('blur', markLeft);

  window.addEventListener('focus', function () {
    if (hasLeft && !gateResolved) {
      closeAdGate();
    }
  });

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
          episode: series + '_s' + (season || '0') + 'e' + ep
        });
      }
    });
  }
})();
