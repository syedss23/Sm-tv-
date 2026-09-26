// getlink.js - Own shortlink interstitial page
// Stage 1: mandatory ad-gate popup (must click ad + return to this tab)
// Stage 2: 10 second timer (not clickable)
// Stage 3: scroll down to reveal the real Get Link button -> episode.html

(function () {
  'use strict';

  var qs = new URLSearchParams(window.location.search);
  var series = qs.get('series');
  var season = qs.get('season');
  var ep     = qs.get('ep');
  var lang   = qs.get('lang');
  var source = qs.get('source');

  var adGate      = document.getElementById('adGate');
  var timerBtn    = document.getElementById('timerBtn');
  var countdownEl = document.getElementById('countdown');
  var getLinkBtn  = document.getElementById('getLinkBtn');

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
    if (timerBtn) timerBtn.textContent = '⚠️ Invalid Link';
    return;
  }

  var timerDone = false;

  // ── STAGE 1: AD GATE ─────────────────────────────
  // The ad widget itself is the click target (its tiles open in a new tab).
  // We can't see which link inside the widget was clicked, so we detect the
  // generic "tab was left, then came back" pattern instead - this is the
  // same approach virtually all sites like this use.
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
    // Small grace period so the page's own load/render doesn't false-trigger this
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

  // ── STAGE 2: 10 SECOND TIMER ─────────────────────
  function startTimer() {
    var seconds = 10;
    if (countdownEl) countdownEl.textContent = seconds;

    var interval = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        timerDone = true;
        if (timerBtn) {
          timerBtn.innerHTML = '👇 Now scroll down to get your link';
          timerBtn.classList.add('gl-scroll-mode');
        }
        revealFinalButton();
      } else if (countdownEl) {
        countdownEl.textContent = seconds;
      }
    }, 1000);
  }

  // ── STAGE 3: REVEAL REAL GET LINK BUTTON ─────────
  function revealFinalButton() {
    if (!getLinkBtn) return;
    getLinkBtn.href = finalUrl;
    getLinkBtn.classList.remove('gl-hidden');
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
