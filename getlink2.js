// getlink2.js - PAGE 2 of the two-page getlink flow
// Stage 1: mandatory ad-gate popup (must CLICK the ad, leave the tab, and return)
// Stage 2: 10 second timer (highlighted)
// Stage 3: real "Get Link" button unlocks -> episode.html / movie page

(function () {
  'use strict';

  var PAGE_IMAGE = 'https://i.ibb.co/8DrPvbH4/file-0000000022cc82068671104d1eea58c5.png';
  var DIRECT_A_URL = 'https://www.profitableratecpmnetwork.com/xz00sz75jz?key=4696a15a64a0b6e65f84c1bd7512bf0e';
  var DIRECT_B_URL = 'https://omg10.com/4/11914764';

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
  var getLinkBtn  = document.getElementById('getLinkBtn');

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
    if (adGate) adGate.classList.add('gl-hidden');
    document.body.classList.remove('gl-locked');
    if (timerWidget) timerWidget.textContent = '⚠️ Invalid Link';
    return;
  }

  var trackLabel = movieSlug ? ('movie_' + movieSlug) : (series + '_s' + (season || '0') + 'e' + ep);
  var timerDone = false;

  // ── SHARED POPUP AD ROTATION (same counter as page 1, so the 3-ad
  // cycle continues seamlessly between page 1 and page 2) ──
  function renderPopupAd() {
    if (!gateSlot) return;
    var count = 1;
    try {
      count = parseInt(localStorage.getItem('gl_popup_ad_seq') || '0', 10) + 1;
      localStorage.setItem('gl_popup_ad_seq', String(count));
    } catch (e) {}

    var idx = ((count - 1) % 2) + 1;
    var url = idx === 1 ? DIRECT_A_URL : DIRECT_B_URL;

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
      gtag('event', 'getlink_gate_verified', { episode: trackLabel, page: 2 });
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

  // ── STAGE 2: 10 SECOND TIMER (highlighted on this page) ──
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
        gtag('event', 'getlink_click', { episode: trackLabel });
      }
    });
  }
})();
