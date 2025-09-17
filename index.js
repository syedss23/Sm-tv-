<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SmTv Urdu - Watch Turkish Series in Urdu | SMTV Urdu</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="SmTv Urdu: Watch Turkish historical series, Islamic serials, and new releases (like Salahuddin Ayyubi Season 2 and Mehmet Fatih Season 2) in Urdu language.">
  <meta name="theme-color" content="#0d171f">

  <!-- Open Graph -->
  <meta property="og:title" content="SmTv Urdu">
  <meta property="og:site_name" content="SmTv Urdu">
  <meta property="og:description" content="Watch Urdu dubbed Turkish Series, Islamic serials & new Turkish drama releases. Join SmTv Urdu for all episodes with Urdu subtitles.">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://smtvurdu.site/assets/posters/smtv_promo.jpg">
  <meta property="og:url" content="https://smtvurdu.site">

  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="canonical" href="https://smtvurdu.site/">

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SmTv Urdu",
    "url": "https://smtvurdu.site",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://smtvurdu.site/?s={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SmTv Urdu",
    "url": "https://smtvurdu.site",
    "logo": "https://smtvurdu.site/assets/logo.png"
  }
  </script>

  <!-- Monetag SDK -->
  <script src="//libtl.com/sdk.js" data-zone="9623557" data-sdk="show_9623557"></script>

  <!-- Fonts & Styles -->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script defer src="index.js"></script>
</head>
<body>
  <!-- Sidebar -->
  <div id="sidebar" class="sidebar">
    <button id="sidebarClose" class="sidebar-close-btn" aria-label="Close menu">&times;</button>
    <div class="brand">SmTv Urdu</div>
    <nav>
      <a href="index.html" id="navHome">Home</a>
      <a href="index.html">All Series</a>
      <a href="https://t.me/smtv_official1" target="_blank" rel="noopener">Join Telegram Channel</a>
      <div class="lang-label">Language</div>
      <select id="langSelect" aria-label="Site language">
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="ur">Urdu</option>
      </select>
    </nav>
  </div>

  <div id="main-content">
    <header>
      <button id="sidebarToggle" aria-label="Open menu">&#9776;</button>
      <h1 id="mainTitle" style="display:inline-block; font-family:'Montserrat',sans-serif; font-weight:600; color:#fff; margin:0;">
        SmTv Urdu
      </h1>
      <div class="searchbar-container">
        <span class="search-icon">&#128269;</span>
        <input type="text" id="search" placeholder="Search SmTv Urdu..." autocomplete="off" aria-label="Search series">
      </div>
    </header>

    <!-- Filter bar: show only Dubbed/Subtitles by default -->
    <div class="filter-bar">
      <div class="primary">
        <button id="pill-dub" class="pill active" aria-pressed="true">Dubbed</button>
        <button id="pill-sub" class="pill" aria-pressed="false">Subtitles</button>
      </div>
      <!-- Language pills are hidden initially; index.js reveals this only when Subtitles is active -->
      <div id="sub-langs" class="secondary hidden" aria-label="Subtitle languages">
        <button class="pill" data-lang="en" aria-pressed="true">English</button>
        <button class="pill" data-lang="hi" aria-pressed="false">Hindi</button>
        <button class="pill" data-lang="ur" aria-pressed="false">Urdu</button>
      </div>
    </div>

    <!-- 320x50 ad banner -->
    <div class="ad-space" id="adSpace">
      <script type="text/javascript">
        atOptions = { key: 'c91a82435d260630918ecc80c95125ac', format: 'iframe', height: 50, width: 320, params: {} };
      </script>
      <script type="text/javascript" src="//www.highperformanceformat.com/c91a82435d260630918ecc80c95125ac/invoke.js"></script>
    </div>

    <!-- Series grid -->
    <div id="series-grid" class="series-grid" aria-live="polite"></div>
  </div>
</body>
</html>
