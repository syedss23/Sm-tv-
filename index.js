document.addEventListener('DOMContentLoaded', function() {

  /* ─────────────────────────────
     LANG LABEL — reads filename parts
     kurulus-orhan-s1.json       → DUB
     kurulus-orhan-en-s1.json    → ENG SUB
     kurulus-orhan-ur-s1.json    → URDU SUB
     sultan-mehmet-fatih-en-sub-s3.json → ENG SUB
     alp-arslan-ar-s1.json       → ARABIC SUB
  ───────────────────────────── */
  function getLangLabel(ep) {
    var map = { en:'ENG SUB', ur:'URDU SUB', hi:'HINDI SUB', ar:'ARABIC SUB', sp:'ESP SUB' };
    try {
      var name = (ep._src||'').toLowerCase().replace('episode-data/','').replace('.json','');
      var parts = name.split('-');
      for (var i=0;i<parts.length;i++) { if (map[parts[i]]) return map[parts[i]]; }
    } catch(e){}
    return 'DUB';
  }

  /* ─────────────────────────────
     BUILD WATCH URL
  ───────────────────────────── */
  function buildWatchUrl(ep) {
    try {
      var name = (ep._src||'').replace('episode-data/','').replace('.json','');
      var parts = name.split('-');
      var sIdx = -1;
      for (var i=0;i<parts.length;i++) { if (/^s\d+$/i.test(parts[i])) { sIdx=i; break; } }
      if (sIdx===-1) return ep.shortlink||ep.download||'#';
      var season = parts[sIdx].replace(/s/i,'');
      var langMap = {en:1,ur:1,hi:1,ar:1,sp:1};
      var lang='', slugEnd=sIdx;
      for (var j=sIdx-1;j>=0;j--) {
        if (langMap[parts[j]]) { lang=parts[j]; slugEnd=j; break; }
        if (parts[j]==='sub') { slugEnd=j; }
        else break;
      }
      var slug = parts.slice(0,slugEnd).join('-');
      var p = new URLSearchParams();
      p.set('series',slug); p.set('season',season);
      if (ep.ep!=null) p.set('ep',ep.ep);
      if (lang) p.set('lang',lang);
      return 'episode.html?'+p.toString();
    } catch(e) { return ep.shortlink||ep.download||'#'; }
  }

  /* ─────────────────────────────
     SHARED DATA PROMISES
  ───────────────────────────── */
  var episodesReady = fetch('episode-data/index.json')
    .then(function(r){return r.json();})
    .then(function(files){
      return Promise.all(files.map(function(path){
        return fetch(path)
          .then(function(r){return r.ok?r.json():[];})
          .then(function(d){return Array.isArray(d)?d.map(function(ep){return Object.assign({},ep,{_src:path});}):[];})
          .catch(function(){return[];});
      }));
    })
    .then(function(arrays){
      var all=[].concat.apply([],arrays).filter(function(ep){return !!ep.timestamp;});
      all.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
      return all;
    })
    .catch(function(){return[];});

  var seriesReady = fetch('series.json')
    .then(function(r){return r.ok?r.json():[];})
    .then(function(d){return Array.isArray(d)?d:[];})
    .catch(function(){return[];});

  /* ─────────────────────────────
     HERO — cinematic banner
     Auto-rotates, touch swipe, dot nav
     No DUB/SUB label shown
  ───────────────────────────── */
  var heroEl    = document.getElementById('hero');
  var heroInner = document.getElementById('hero-inner');

  episodesReady.then(function(all){
    var latest = all.slice(0,5);
    if (!latest.length||!heroInner) return;
    heroInner.innerHTML='';
    latest.forEach(function(ep,i){
      var url    = buildWatchUrl(ep);
      var bg     = ep.thumb||ep.poster||ep.banner||'';
      var series = ep.series||'';
      var title  = ep.title||('Episode '+(ep.ep||''));
      var slide  = document.createElement('div');
      slide.className='h-slide'+(i===0?' on':'');
      slide.innerHTML=
        '<div class="h-bg" style="background-image:url(\''+bg+'\')"></div>'+
        '<div class="h-vig"></div>'+
        '<div class="h-top-label"><span class="h-new-badge">NEW EPISODE</span></div>'+
        '<div class="h-body">'+
          (series?'<div class="h-series">'+series+'</div>':'')+
          '<div class="h-title">'+title+'</div>'+
          '<a href="'+url+'" class="h-watch-btn">&#9654; Watch Now</a>'+
          (i===0?'<div id="h-dots"></div>':'')+
        '</div>';
      heroInner.appendChild(slide);
    });
    var dotsEl=document.getElementById('h-dots');
    if (dotsEl) {
      dotsEl.innerHTML=latest.map(function(_,i){
        return '<div class="h-dot'+(i===0?' on':'')+'" data-i="'+i+'"></div>';
      }).join('');
    }
    var slides=Array.from(heroInner.querySelectorAll('.h-slide'));
    var dots=Array.from(heroInner.querySelectorAll('.h-dot'));
    var cur=0,timer;
    function goTo(n){
      slides[cur].classList.remove('on'); if(dots[cur])dots[cur].classList.remove('on');
      cur=((n%slides.length)+slides.length)%slides.length;
      slides[cur].classList.add('on'); if(dots[cur])dots[cur].classList.add('on');
    }
    function startAuto(){clearInterval(timer);timer=setInterval(function(){goTo(cur+1);},5000);}
    dots.forEach(function(d){d.addEventListener('click',function(){goTo(parseInt(d.dataset.i));startAuto();});});
    var tx=0;
    if(heroEl){
      heroEl.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;},{passive:true});
      heroEl.addEventListener('touchend',function(e){
        var dx=e.changedTouches[0].clientX-tx;
        if(Math.abs(dx)>38){goTo(cur+(dx<0?1:-1));startAuto();}
      },{passive:true});
    }
    startAuto();
  });

  /* ─────────────────────────────
     SCHEDULE
  ───────────────────────────── */
  var schedList=document.getElementById('sched-list');
  if(schedList){
    fetch('shedule.json').then(function(r){return r.json();})
      .then(function(schedule){
        if(!Array.isArray(schedule)||!schedule.length){
          schedList.innerHTML='<div style="color:var(--muted);padding:.7em 1em;font-size:.86rem;">No upcoming schedule.</div>';
          return;
        }
        schedList.innerHTML=schedule.map(function(item){
          return '<div class="sc-card'+(item.live?' live-c':'')+'">'+
            (item.poster?'<img src="'+item.poster+'" class="sc-img" loading="lazy">':'')+
            '<div class="sc-body">'+
              '<div class="sc-title">'+(item.title||'')+'</div>'+
              '<div class="sc-meta">'+
                (item.day?'<span class="sc-day">'+item.day+'</span>':'')+
                (item.day&&item.time?'<span class="sc-dot">&bull;</span>':'')+
                (item.time?'<span class="sc-time">'+item.time+'</span>':'')+
                (item.type?'<span class="sc-dot">&bull;</span><span class="sc-type">'+item.type+'</span>':'')+
                (item.live?'<span class="sc-live">LIVE</span>':'')+
              '</div>'+
            '</div>'+
            (item.countdown?'<div class="sc-cd" data-time="'+item.countdown+'">...</div>':'')+
          '</div>';
        }).join('');
        schedList.querySelectorAll('.sc-cd').forEach(function(el){
          var target=Date.parse(el.dataset.time);
          if(isNaN(target)){el.textContent='';return;}
          var id;
          function tick(){
            var d=target-Date.now();
            if(d<=0){el.textContent='Now';clearInterval(id);return;}
            el.textContent=Math.floor(d/3600000)+'h '+Math.floor((d%3600000)/60000)+'m '+Math.floor((d%60000)/1000)+'s';
          }
          tick();id=setInterval(tick,1000);
        });
        // animate schedule cards in
        var scCards=Array.from(schedList.querySelectorAll('.sc-card'));
        scCards.forEach(function(el){el.style.opacity='1';el.style.transform='none';});
      })
      .catch(function(){schedList.innerHTML='<div style="color:var(--muted);padding:.7em 1em;font-size:.86rem;">Schedule unavailable.</div>';});
  }

  /* ─────────────────────────────
     RECOMMENDED — horizontal scroll
     Uses .poster-item class from style.css
     which already has correct portrait image sizing
  ───────────────────────────── */
  var recInner=document.getElementById('rec-inner');
  if(recInner){
    seriesReady.then(function(allSeries){
      if(!allSeries.length) return;
      fetch('recommended.json')
        .then(function(r){return r.ok?r.json():null;})
        .then(function(slugs){
          var list;
          if(Array.isArray(slugs)&&slugs.length){
            list=slugs.map(function(slug){
              return allSeries.find(function(s){return s.slug===slug;});
            }).filter(Boolean).slice(0,5);
          }
          if(!list||!list.length) list=allSeries.slice(0,5);
          renderRec(list);
        })
        .catch(function(){renderRec(allSeries.slice(0,5));});
    });
  }

  function renderRec(list){
    if(!recInner||!list.length) return;
    // Use .poster-item — style.css already styles it correctly with proper image sizing
    recInner.innerHTML=list.map(function(s){
      return '<a class="poster-item rec-item" href="series.html?series='+s.slug+'">'+
        '<img src="'+s.poster+'" alt="'+s.title+'" loading="lazy" decoding="async">'+
        '<div class="title">'+s.title+'</div>'+
      '</a>';
    }).join('');
  }

  /* ─────────────────────────────
     SERIES GRID
     Uses .card class — style.css handles all styling
     We just need max-height override (done in HTML)
  ───────────────────────────── */
  var grid    =document.getElementById('series-grid');
  var pillDub =document.getElementById('pill-dub');
  var pillSub =document.getElementById('pill-sub');
  var subLangs=document.getElementById('sub-langs');
  var SERIES  =[];

  if(grid){
    var qs=new URLSearchParams(location.search);
    var state={
      track:qs.get('track')||localStorage.getItem('track')||'dubbed',
      lang: qs.get('lang') ||localStorage.getItem('subLang')||'en'
    };
    seriesReady.then(function(data){
      SERIES=data;
      grid.querySelectorAll('.skel').forEach(function(s){s.remove();});
      hydrateUI();render();
    }).catch(function(){
      grid.querySelectorAll('.skel').forEach(function(s){s.remove();});
      grid.innerHTML='<div style="color:#f87171;padding:1.2em;grid-column:1/-1;">Could not load series.</div>';
    });

    function hydrateUI(){
      setPrimary(state.track);toggleSubLangs();
      if(subLangs)subLangs.querySelectorAll('.pill').forEach(function(b){
        var a=b.dataset.lang===state.lang;
        b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));
      });
    }
    function setPrimary(track){
      state.track=track;localStorage.setItem('track',track);
      if(pillDub){pillDub.classList.toggle('active',track==='dubbed');pillDub.setAttribute('aria-pressed',String(track==='dubbed'));}
      if(pillSub){pillSub.classList.toggle('active',track==='sub');pillSub.setAttribute('aria-pressed',String(track==='sub'));}
    }
    function toggleSubLangs(){if(subLangs)subLangs.classList.toggle('hidden',state.track!=='sub');}
    function setLang(lang){
      state.lang=lang;localStorage.setItem('subLang',lang);
      if(subLangs)subLangs.querySelectorAll('.pill').forEach(function(b){
        var a=b.dataset.lang===lang;
        b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));
      });
    }
    if(pillDub)pillDub.addEventListener('click',function(){setPrimary('dubbed');toggleSubLangs();render();});
    if(pillSub)pillSub.addEventListener('click',function(){setPrimary('sub');toggleSubLangs();render();});
    if(subLangs)subLangs.addEventListener('click',function(e){
      var t=e.target;if(t&&t.matches('.pill')&&t.dataset.lang){setLang(t.dataset.lang);render();}
    });

    function render(){
      var list=SERIES;
      if(state.track==='dubbed') list=list.filter(function(s){return s.track==='dubbed';});
      else list=list.filter(function(s){return s.track==='sub'&&s.subLang===state.lang;});
      if(!list.length){
        grid.innerHTML='<div style="color:var(--muted);padding:1.5em;grid-column:1/-1;text-align:center;">No series found.</div>';
        return;
      }
      // EXACT same HTML as original index.js - simple .card with img + .title
      grid.innerHTML=list.map(function(s){
        return '<a class="card" href="series.html?series='+s.slug+'">'+
          '<img src="'+s.poster+'" alt="'+s.title+'" loading="lazy" decoding="async">'+
          '<div class="title">'+s.title+'</div>'+
        '</a>';
      }).join('');
    }
  }

  /* ─────────────────────────────
     SEARCH OVERLAY
     Results use same .card HTML as series grid
     so they look identical
  ───────────────────────────── */
  var srchInp    =document.getElementById('srch-inp');
  var srchClear  =document.getElementById('srch-clear');
  var srchResults=document.getElementById('srch-results');
  var srchStatus =document.getElementById('srch-status');

  function showHint(){
    if(srchResults)srchResults.innerHTML=
      '<div class="srch-empty">'+
        '<div class="srch-empty-icon">&#128269;</div>'+
        '<div class="srch-empty-title">Search SmTv Urdu</div>'+
        '<div class="srch-empty-sub">Find your favourite Turkish series</div>'+
      '</div>';
    if(srchStatus)srchStatus.innerHTML='';
  }

  if(srchInp){
    srchInp.addEventListener('input',function(){
      var q=srchInp.value.trim().toLowerCase();
      if(srchClear)srchClear.classList.toggle('show',q.length>0);
      if(!q){showHint();return;}
      seriesReady.then(function(series){
        var results=series.filter(function(s){return(s.title||'').toLowerCase().indexOf(q)>=0;});
        if(srchStatus){
          srchStatus.innerHTML=results.length
            ?'Found <span>'+results.length+'</span> result'+(results.length!==1?'s':'')+' for <span>"'+q+'"</span>'
            :'';
        }
        if(!results.length){
          srchResults.innerHTML=
            '<div class="srch-empty">'+
              '<div class="srch-empty-icon">&#128532;</div>'+
              '<div class="srch-empty-title">No results found</div>'+
              '<div class="srch-empty-sub">Try a different search term</div>'+
            '</div>';
          return;
        }
        // Exact same .card HTML — search results look identical to series grid
        srchResults.innerHTML=results.map(function(s){
          return '<a class="card" href="series.html?series='+s.slug+'">'+
            '<img src="'+s.poster+'" alt="'+s.title+'" loading="lazy" decoding="async">'+
            '<div class="title">'+s.title+'</div>'+
          '</a>';
        }).join('');
      });
    });
  }

});
