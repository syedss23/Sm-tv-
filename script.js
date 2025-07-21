function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function changeLanguage(lang) {
  alert('Language changed to: ' + lang);
}
fetch("series.json")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("series-container");
    for (const series in data) {
      const div = document.createElement("div");
      div.innerHTML = \`
        <h2>\${data[series].title}</h2>
        <img src="\${data[series].poster}" style="width: 100%; max-width: 300px" />
        <p><a href="watch.html?series=\${series}">Watch Now</a></p>
      \`;
      container.appendChild(div);
    }
  });