// getlink.js - Own shortlink interstitial page
// Reads series/season/ep/lang/source from the URL and points the
// "Get Link" button to the real episode.html streaming page.

(function () {
  'use strict';

  var qs = new URLSearchParams(window.location.search);
  var series = qs.get('series');
  var season = qs.get('season');
  var ep     = qs.get('ep');
  var lang   = qs.get('lang');
  var source = qs.get('source');

  var btn = document.getElementById('getLinkBtn');
  if (!btn) return;

  // Guard against a broken/incomplete link
  if (!series || !ep) {
    btn.textContent = '⚠️ Invalid Link';
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '.5';
    return;
  }

  var url = 'episode.html?series=' + encodeURIComponent(series) + '&ep=' + encodeURIComponent(ep);
  if (season) url += '&season=' + encodeURIComponent(season);
  if (lang)   url += '&lang=' + encodeURIComponent(lang);
  if (source) url += '&source=' + encodeURIComponent(source);

  btn.href = url;

  btn.addEventListener('click', function () {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'getlink_click', {
        episode: series + '_s' + (season || '0') + 'e' + ep
      });
    }
  });
})();
