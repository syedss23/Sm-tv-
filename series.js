// --- series.js ---
const params = new URLSearchParams(window.location.search);
const slug = params.get('series');

// Load series meta (from series.json)
fetch('series.json')
  .then(r => r.json())
  .then(seriesList => {
    const meta = seriesList.find(s => s.slug === slug);
    if (!meta) {
      document.getElementById('series-details').innerHTML = `<div style="color:#fff;">Series not found.</div>`;
      return;
    }

    // ----------- SEO: SET DYNAMIC TITLE & DESCRIPTION -----------
    document.title = meta.title + " – SmTv Urdu";
    const metaDescTag = document.querySelector('meta[name="description"]');
    if (metaDescTag) {
      metaDescTag.setAttribute(
        'content',
        `${meta.title} - Watch all episodes of ${meta.title} in Urdu on SmTv Urdu. Turkish historical drama complete series.`
      );
    }
    // -----------------------------------------------------------

    // --- Modern header with poster, back, desc ---
    let html = `
      <section class="pro-series-header-pro">
        <a href="index.html" class="pro-series-back-btn-pro" title="Back">
          <svg width="24" height="24" viewBox="0 0 20 20" style="vertical-align: middle;">
            <polyline points="12 4 6 10 12 16" fill="none" stroke="#23c6ed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <img class="pro-series-poster-pro" src="${meta.poster}" alt="${meta.title}">
        <div class="pro-series-meta-pro">
          <h2 class="pro-series-title-pro">${meta.title}</h2>
          <div class="pro-series-desc-pro">${meta.desc && meta.desc.en ? meta.desc.en : ""}</div>
        </div>
      </section>
      <nav class="pro-seasons-tabs-pro" id="pro-seasons-tabs"></nav>
      <section class="pro-episodes-row-wrap-pro" id="pro-episodes-row-wrap"></section>
    `;
    document.getElementById('series-details').innerHTML = html;

    // Figure out season list: use meta.seasons count if number, else array, else ["1"]
    let seasonNums = [];
    if (typeof meta.seasons === "number") {
      for (let i = 1; i <= meta.seasons; i++) seasonNums.push(String(i));
    } else if (Array.isArray(meta.seasons)) {
      seasonNums = meta.seasons.map(s => String(s));
    } else {
      seasonNums = ["1"];
    }
    // Render tabs
    document.getElementById('pro-seasons-tabs').innerHTML =
      seasonNums.map(season =>
        `<button data-season="${season}" class="pro-season-tab-pro${season == seasonNums[0] ? ' active' : ''}">Season ${season}</button>`
      ).join('');
    document.querySelectorAll('.pro-season-tab-pro').forEach(btn => {
      btn.onclick = function () {
        document.querySelectorAll('.pro-season-tab-pro').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProEpisodesRow(btn.dataset.season);
      };
    });

    // Show first season by default
    renderProEpisodesRow(seasonNums[0]);

    // Get filename for episodes for this series and season
    function getEpisodeFile(slug, season) {
      return `episode-data/${slug}-s${season}.json`;
    }

    // Modular episode loader: loads array and renders episode cards
    function renderProEpisodesRow(seasonNumber) {
      fetch(getEpisodeFile(slug, seasonNumber))
        .then(r => {
          if (!r.ok) throw new Error("File not found");
          return r.json();
        })
        .then(episodes => {
          let row = '';
          if (!episodes || !episodes.length) {
            row = `<div style='color:#fff;padding:28px 0 0 0;'>No episodes for this season.</div>`;
          } else {
            row = `<div class="pro-episodes-row-pro">` +
              episodes.map(ep => `
                <a class="pro-episode-card-pro" href="episode.html?series=${slug}&season=${seasonNumber}&ep=${ep.ep}">
                  <div class="pro-ep-thumb-wrap-pro">
                    <img src="${ep.thumb || 'default-thumb.jpg'}" class="pro-ep-thumb-pro" alt="Ep ${ep.ep}">
                    <span class="pro-ep-num-pro">Ep ${ep.ep}</span>
                  </div>
                  <div class="pro-ep-title-pro">${ep.title ? ep.title : `Episode ${ep.ep}`}</div>
                </a>
              `).join('') + '</div>';
          }
          document.getElementById('pro-episodes-row-wrap').innerHTML = row;
        })
        .catch(() => {
          document.getElementById('pro-episodes-row-wrap').innerHTML =
            `<div style='color:#fff;padding:28px 0 0 0;'>No episodes for this season.</div>`;
        });
    }
  })
  .catch(() => {
    document.getElementById('series-details').innerHTML =
      `<div style="color:#fff;padding:30px;">Could not load series info. Try again later.</div>`;
  });
