export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { title, message, url, image } = req.body;

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic os_v2_app_vvefqymihfe6fpjb6iogrbti62t6bkqjqjdevced3uyvaiytyb5inoz53uirmuv4ktizwtkxeqhlz4xh4hv6libbr3wfb4zror5xr2a"
      },
      body: JSON.stringify({
        app_id: "ad485861-8839-49e2-bd21-f21c688668f6",
        headings: { en: title },
        contents: { en: message },
        url: url,
        big_picture: image,
        included_segments: ["All"]
      })
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
