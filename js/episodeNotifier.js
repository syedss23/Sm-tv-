async function checkNewEpisodes() {
  try {
    const listRes = await fetch("episode-data/index.json");
    const files = await listRes.json();

    let newestEpisode = null;
    let seriesName = "";

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
          seriesName = file.replace(".json", "");
        }
      }
    }

    if (!newestEpisode) return;

    const lastNotified = localStorage.getItem("lastNotifiedEpisode");

    if (lastNotified === newestEpisode.timestamp) {
      console.log("Notification already sent");
      return;
    }

    console.log("Sending notification:", newestEpisode.title);

    await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "🎬 New Episode Uploaded",
        message: newestEpisode.title + " now available!",
        url: window.location.origin + "/series.html?series=" + seriesName,
        image: newestEpisode.thumb
      })
    });

    localStorage.setItem(
      "lastNotifiedEpisode",
      newestEpisode.timestamp
    );

  } catch (err) {
    console.log("Notifier error:", err);
  }
}

checkNewEpisodes();
