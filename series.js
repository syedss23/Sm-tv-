(function() {
  const qs = new URLSearchParams(location.search);
  const slug = (qs.get('series') || '').trim();
  const lang = (qs.get('lang') || '').toLowerCase();
  const season = qs.get('season') || '1';

  function jsonFor(season) {
    if (lang === 'dub') {
      return `episode-data/${slug}-s${season}.json`;
    } else if (['en', 'hi', 'ur'].includes(lang)) {
      return `episode-data/${slug}-s${season}-${lang}.json`;
    } else {
      return `episode-data/${slug}-s${season}.json`;
    }
  }

  function bust(url) {
    const v = (qs.get('v') || '1');
    return url + (url.includes('?') ? '&' : '?') + 'v=' + v;
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#122231;color:#9fe6ff;padding:10px 14px;border-radius:9px;border:1px solid #2d4b6a;font-weight:700;z-index:9999;font-family:Montserrat,sans-serif;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // Premium message styles
  const premiumStyles = `
    .premium-channel-message {
      margin-top: 18px;
      padding: 16px;
      background: linear-gradient(135deg, #101a24 90%, #23c6ed30 100%);
      border: 2px solid #23c6ed;
      border-radius: 14px;
      color: #23c6ed;
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 600;
      font-size: 1.09em;
      max-width: 540px;
      box-shadow: 0 2px 18px #1a232b18;
      letter-spacing: 0.03em;
    }
    .premium-channel-message strong {
      color: #ffd700;
      font-weight: 800;
      letter-spacing: 0.01em;
    }
    .premium-btn-row {
      display: flex;
      gap: 18px;
      margin-top: 11px;
    }
    .premium-btn {
      display: inline-flex;
      align-items: center;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 1em;
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.18s, color 0.18s, box-shadow 0.18s;
      box-shadow: 0 2px 11px #1a232b20;
      border: 0;
      cursor: pointer;
    }
    .premium-btn-blue {
      background: linear-gradient(90deg, #23c6ed 85%, #198fff 100%);
      color: #fff;
    }
    .premium-btn-blue:hover {
      background: linear-gradient(90deg,#167abd 40%,#198fff 100%);
      color: #ffd700;
    }
    .premium-btn-gold {
      background: linear-gradient(90deg, #ffd700 70%, #ffd700c0 100%);
      color: #232f3e;
    }
    .premium-btn-gold:hover {
      background: linear-gradient(90deg,#ffe493 40%,#ffd700 100%);
      color: #23c6ed;
    }
    .premium-btn-icon {
      margin-right: 7px;
      font-size: 1.23em;
      vertical-align: middle;
    }
  `;
  const styleTag = document.createElement('style');
  styleTag.textContent = premiumStyles;
  document.head.appendChild(styleTag);

  fetch('series.json')
    .then(r => r.json())
    .then(arr => {
      const meta = Array.isArray(arr) ? arr.find(s => s.slug === slug) : null;
      if (!meta) {
        document.getElementById('series-details').innerHTML = `<div style="color:#fff;padding:20px;">Series not found.</div>`;
        return;
      }
      document.title = `${meta.title} – SmTv Urdu`;

      // Premium channel message HTML: two modern buttons
      const premiumMsg = `
        <div class="premium-channel-message">
          <strong>Go Ad-Free!</strong> Get direct access to all episodes by joining our <strong>Premium Channel</strong>.<br>
          <div class="premium-btn-row">
            <a href="https://t.me/Shaikhyder7861" target="_blank" rel="noopener" class="premium-btn premium-btn-blue">
              📱 Contact on Telegram
            </a>
            <a href="https://t.me/itzmezain1/2905" target="_blank" rel="noopener" class="premium-btn premium-btn-gold">
              <span class="premium-btn-icon">🎥</span>
              Details Video
            </a>
          </div>
        </div>
      `;

      document.getElementById('series-details').innerHTML = `
        <section class="pro-series-header-pro">
          <a href="index.html" class="pro-series-back-btn-pro" title="Back">
            <svg width="24" height="24" viewBox="0 0 20 20" style="vertical-align: middle;">
              <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
          </a>
          <img class="pro-series-poster-pro" src="${meta.poster}" alt="${meta.title}">
          <div class="pro-series-meta-pro">
            <h2 class="pro-series-title-pro">${meta.title}</h2>
            <div class="pro-series-desc-pro">${meta.desc && meta.desc.en ? meta.desc.en : ""}</div>
            ${premiumMsg}
          </div>
        </section>
        <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
        <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
      `;

      let seasons = [];
      if (typeof meta.seasons === 'number') {
        for (let i = 1; i <= meta.seasons; i++) seasons.push(String(i));
      } else if (Array.isArray(meta.seasons)) {
        seasons = meta.seasons.map(s => String(s));
      } else {
        seasons = ['1'];
      }
      const tabs = document.getElementById('pro-seasons-tabs');
      tabs.innerHTML = seasons.map(s =>
        `<button data-season="${s}" class="pro-season-tab-pro${s == season ? ' active' : ''}">Season ${s}</button>`
      ).join('');
      tabs.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderSeason(btn.dataset.season);
        });
      });

      renderSeason(season);

      function renderSeason(season) {
        const url = bust(jsonFor(season));
        fetch(url)
          .then(r => { if (!r.ok) throw new Error(url); return r.json(); })
          .then(episodes => {
            if (!Array.isArray(episodes) || episodes.length === 0) {
              document.getElementById('pro-episodes-row-wrap').innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
              return;
            }
            const html = `<div class="pro-episodes-row-pro">` + episodes.map(ep => {
              const episodeUrl = ep.shortlink
                ? ep.shortlink
                : `episode.html?series=${slug}&season=${season}&ep=${ep.ep}&lang=${lang}`;
              const extra = ep.shortlink
                ? 'target="_blank" rel="noopener"'
                : '';
              return `
                <a class="pro-episode-card-pro" href="${episodeUrl}" ${extra}>
                  <div class="pro-ep-thumb-wrap-pro">
                    <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
                    <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                  </div>
                  <div class="pro-ep-title-pro">${ep.title || ('Episode ' + ep.ep)}</div>
                </a>
              `;
            }).join('') + `</div>`;

            const tutorialTitle = `
              <section class="pro-highlight-section">
                <div class="pro-highlight-title">How to Watch Episodes</div>
              </section>
            `;
            const tutorialVideo = `
              <section class="pro-video-card">
                <div class="pro-video-frame-wrap">
                 <div style='position:relative;width:100%;height:0;padding-bottom:56.25%;'><iframe class='rumble' src='https://rumble.com/embed/v6yd16u/?pub=4ni0h4' style='position:absolute;top:0;left:0;width:100%;height:100%;' frameborder='0' allowfullscreen></iframe></div>
              </section>
            `;
            document.getElementById('pro-episodes-row-wrap').innerHTML = html + tutorialTitle + tutorialVideo;
          })
          .catch(e => {
            document.getElementById('pro-episodes-row-wrap').innerHTML = `<div style="color:#fff;padding:28px 0 0 0;">No episodes for this season.</div>`;
            toast('Missing file: ' + e.message);
          });
      }
    })
    .catch(() => {
      document.getElementById('series-details').innerHTML = `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
    });
})();
