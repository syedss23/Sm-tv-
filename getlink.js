// getlink.js - PAGE 1 of the two-page getlink flow
// Stage 1: mandatory ad-gate popup (must CLICK the ad, leave the tab, and return)
// Stage 2: 10 second timer
// Stage 3: "Continue" button unlocks -> getlink2.html (page 2), carrying the same params

(function () {
  'use strict';

  var PAGE_IMAGE = 'https://i.ibb.co/39LN7qL8/IMG-20260928-110900.png';
  var DIRECT_A_URL = 'https://www.profitableratecpmnetwork.com/xz00sz75jz?key=4696a15a64a0b6e65f84c1bd7512bf0e';
  var DIRECT_B_URL = 'https://omg10.com/4/11914764';
  var DIRECT_C_URL = 'https://idealistic-revenue.com/xautkb';

  var qs = new URLSearchParams(window.location.search);
  var series    = qs.get('series');
  var season    = qs.get('season');
  var ep        = qs.get('ep');
  var lang      = qs.get('lang');
  var source    = qs.get('source');
  var movieSlug = qs.get('movie');

  var adGate      = document.getElementById('adGate');
  var gateSlot    = document.getElementById('gateAdSlot');
  var timerWidget = document.getElementById('timerWidget');
  var continueBtn = document.getElementById('continueBtn');

  // Carry the same params forward to page 2
  var carryQS = '';
  if (movieSlug) {
    carryQS = 'movie=' + encodeURIComponent(movieSlug);
  } else if (series && ep) {
    carryQS = 'series=' + encodeURIComponent(series) + '&ep=' + encodeURIComponent(ep);
    if (season) carryQS += '&season=' + encodeURIComponent(season);
    if (lang)   carryQS += '&lang=' + encodeURIComponent(lang);
    if (source) carryQS += '&source=' + encodeURIComponent(source);
  }

  if (!carryQS) {
    if (adGate) adGate.classList.add('gl-hidden');
    document.body.classList.remove('gl-locked');
    if (timerWidget) timerWidget.textContent = '⚠️ Invalid Link';
    return;
  }

  var nextPageUrl = 'getlink2.html?' + carryQS;
  var trackLabel = movieSlug ? ('movie_' + movieSlug) : (series + '_s' + (season || '0') + 'e' + ep);

  var timerDone = false;

  // ── SHARED POPUP AD ROTATION (3-ad cycle, synced across page 1 & 2) ──
  // 1: direct link A (Adsterra) | 2: direct link B (Monetag) | 3: direct link C (Hilltop) - then repeats.
  function renderPopupAd() {
    if (!gateSlot) return;
    var count = 1;
    try {
      count = parseInt(localStorage.getItem('gl_popup_ad_seq') || '0', 10) + 1;
      localStorage.setItem('gl_popup_ad_seq', String(count));
    } catch (e) {}

    var idx = ((count - 1) % 3) + 1;
    var url = idx === 1 ? DIRECT_A_URL : (idx === 2 ? DIRECT_B_URL : DIRECT_C_URL);

    gateSlot.innerHTML =
      '<a href="' + url + '" target="_blank" rel="noopener" style="display:block;">' +
      '<img src="' + PAGE_IMAGE + '" alt="Verify and Continue" style="width:100%;height:auto;display:block;border-radius:10px;"></a>';
  }

  renderPopupAd();

  // ── STAGE 1: AD GATE ─────────────────────────────
  var adClicked = false;
  var hasLeft = false;
  var gateResolved = false;

  function closeAdGate() {
    if (gateResolved) return;
    gateResolved = true;
    if (adGate) adGate.classList.add('gl-hidden');
    document.body.classList.remove('gl-locked');

    if (typeof gtag !== 'undefined') {
      gtag('event', 'getlink_gate_verified', { episode: trackLabel, page: 1 });
    }

    startTimer();
  }

  function markAdClicked() {
    if (gateResolved) return;
    adClicked = true;
  }

  if (gateSlot) {
    gateSlot.addEventListener('click', markAdClicked, true);
    gateSlot.addEventListener('touchend', markAdClicked, true);
  }

  function markLeft() {
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
    try {
      var ae = document.activeElement;
      if (gateSlot && ae && ae.tagName === 'IFRAME' && gateSlot.contains(ae)) {
        markAdClicked();
      }
    } catch (e) {}
    markLeft();
  });

  window.addEventListener('focus', tryResolve);

  // ── STAGE 2: 10 SECOND TIMER ──────────────────────
  function startTimer() {
    var seconds = 10;
    if (timerWidget) timerWidget.textContent = '⏳ Please wait ' + seconds + ' seconds...';

    var interval = setInterval(function () {
      seconds--;
      if (seconds <= 0) {
        clearInterval(interval);
        timerDone = true;
        if (timerWidget) {
          timerWidget.textContent = '✅ Verified! Scroll down to continue.';
          timerWidget.classList.add('gl-timer-ready');
        }
        unlockContinueButton();
      } else if (timerWidget) {
        timerWidget.textContent = '⏳ Please wait ' + seconds + ' seconds...';
      }
    }, 1000);
  }

  // ── STAGE 3: UNLOCK CONTINUE -> PAGE 2 ───────────
  function unlockContinueButton() {
    if (!continueBtn) return;
    continueBtn.href = nextPageUrl;
    continueBtn.textContent = '➡️ Continue';
    continueBtn.classList.add('gl-ready');
  }

  if (continueBtn) {
    continueBtn.addEventListener('click', function (e) {
      if (!timerDone) {
        e.preventDefault();
        return;
      }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'getlink_continue_click', { episode: trackLabel });
      }
    });
  }
})();
