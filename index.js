let lang = localStorage.getItem('lang') || 'en';
let allSeries = [];

function highlightText(text, term) {
  if (!term) return text;
  const pattern = new RegExp('(' + term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')', 'ig');
  return text.replace(pattern, '<span class="marked">$1</span>');
}

document.addEventListener('DOMContentLoaded', () => {
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener('change', e => {
      lang = e.target.value;
      localStorage.setItem('lang', lang);
      renderGrid();
    });
  }

  fetch('series.json')
    .then(r => r.json())
    .then(data => {
      allSeries = data;
      renderGrid();
    });

  loadAd();

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  const sidebarClose = document.getElementById('sidebarClose');
  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Accessible/professional search bar
  const searchInput = document.getElementById('seriesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      renderGrid(this.value.trim());
    });
    searchInput.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        this.value = '';
        renderGrid('');
        this.blur();
      }
    });
  }
});

function renderGrid(searchTerm = '') {
  const grid = document.getElementById('seriesGrid');
  let filteredSeries = allSeries;
  const q = searchTerm.trim().toLowerCase();
  if (q.length > 0) {
    filteredSeries = allSeries.filter(series =>
      series.title.toLowerCase().includes(q)
    );
  }
  grid.innerHTML = '';
  if (filteredSeries.length === 0) {
    grid.innerHTML = '<div style="padding:2em; color:#ff6565; text-align:center;">No series found.</div>';
    return;
  }
  filteredSeries.forEach(series => {
    const highlightTitle = searchTerm
      ? highlightText(series.title, searchTerm)
      : series.title;
    const item = document.createElement('div');
    item.className = 'poster-item';
    // Change to clickable div for ad show and navigation
    item.innerHTML = `
      <div class="series-card-link" style="cursor:pointer;">
        <img src="${series.poster}" alt="${series.title}">
        <div class="title">${highlightTitle}</div>
      </div>
    `;
    item.querySelector('.series-card-link').addEventListener('click', function () {
      let redirected = false;
      if (window.show_9623557) {
        show_9623557({
          type: 'inApp',
          onClose: function() {
            redirected = true;
            console.log('Monetag ad closed! Redirecting...');
            window.location.href = 'series.html?slug=' + series.slug;
          },
          inAppSettings: {
            frequency: 2,
            capping: 0.1,
            interval: 30,
            timeout: 0, // show ad instantly
            everyPage: false
          }
        });
        setTimeout(function() {
          if (!redirected) {
            console.log('Fallback: Redirecting due to Monetag not firing onClose.');
            window.location.href = 'series.html?slug=' + series.slug;
          }
        }, 15000); // 15s fallback in case Monetag fails
      } else {
        window.location.href = 'series.html?slug=' + series.slug;
      }
    });
    grid.appendChild(item);
  });
}

async function loadAd() {
  const adSpace = document.getElementById('adSpace');
  try {
    const resp = await fetch('data.json');
    const data = await resp.json();
    adSpace.innerHTML = data.adCode || 'Ad Area';
  } catch {
    adSpace.innerText = "Ad Area";
  }
}
