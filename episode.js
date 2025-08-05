const params = new URLSearchParams(window.location.search);
const slug = params.get('series');
const epNum = params.get('ep');
const container = document.getElementById('episode-view') || document.body;

container.innerText = `series: ${slug}, ep: ${epNum}`;

if (!slug || !epNum) {
  container.innerHTML += "\nERROR: missing series or ep";
  throw new Error("Missing param");
}

fetch(`episode-data/${slug}.json`)
  .then(r => {
    if (!r.ok) throw new Error("JSON not found!");
    return r.json();
  })
  .then(data => {
    container.innerHTML += `\nLoaded ${data.length} episodes: ${JSON.stringify(data, null, 2)}`;
    const found = data.find(e => String(e.ep) === String(epNum));
    if (found) {
      container.innerHTML += `\nFOUND! Title: ${found.title}`;
    } else {
      container.innerHTML += "\nNOT FOUND: ep number not in JSON";
    }
  })
  .catch(e => container.innerHTML += `\nFetch error: ${e.message}`);
