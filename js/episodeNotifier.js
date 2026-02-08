async function checkNewEpisodes() {
  try {
    const listRes = await fetch("episode-data/index.json");
    const files = await listRes.json();

    let newestEpisode = null;

    for (const file of files) {
      const res = await fetch("episode-data/" + file);
      const episodes = await res.json();

      for (const ep of episodes) {
        if (!ep.timestamp) continue;

        if (
          !newestEpisode ||
          new Date(ep.timestamp) > new Date(newestEpisode.timestamp)
        ) {
          newestEpisode = ep;
        }
      }
    }

    if (newestEpisode) {
      console.log("Latest episode:", newestEpisode.title);
      // future: send notification here
    }
  } catch (err) {
    console.log("Notifier error:", err);
  }
}

checkNewEpisodes();
