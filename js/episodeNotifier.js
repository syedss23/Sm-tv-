async function checkNewEpisodes() {
  try {
    const res = await fetch("/episode-data/index.json");
    if (!res.ok) return;

    const files = await res.json();

    for (const file of files) {
      const epRes = await fetch("/episode-data/" + file);
      const episodes = await epRes.json();

      for (const ep of episodes) {
        if (ep.notification === false) {
          console.log("New episode:", ep.title);
        }
      }
    }
  } catch (err) {
    console.log("Notifier error:", err);
  }
}

checkNewEpisodes();
