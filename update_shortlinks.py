import json
import requests
import urllib.parse

API_KEY = '1e9c15ef4c7e5d1cda14440ee88b3ee050761100'
API_ENDPOINT = 'https://nanolinks.in/api?api={}&url={}'

# Map your JSON file names to series names and season numbers
SERIES_INFO = {
    'kurulus-osman-s7.json': {'series': 'kurulus-osman', 'season': 7},
    'sultan-mehmet-fatih-s1.json': {'series': 'sultan-mehmet-fatih', 'season': 1},
    'destan-s1.json': {'series': 'destan', 'season': 1},
    'salauddin-ayyubi-s1.json': {'series': 'salauddin-ayyubi', 'season': 1}
    # Add more files here if needed
}

def get_shortlink(long_url):
    try:
        encoded_url = urllib.parse.quote_plus(long_url)
        api_url = API_ENDPOINT.format(API_KEY, encoded_url)
        res = requests.get(api_url)
        data = res.json()
        if data.get("status") == "success" and data.get("shortenedUrl"):
            return data["shortenedUrl"]
        elif data.get("status") == "error" and "already exists" in str(data.get("message")).lower():
            # Try to fetch the existing shortlink — fallback logic if your service/API provides a way to retrieve it.
            print(f"Alias already exists for: {long_url}. Skipping.")
            return None
        else:
            print(f"Shortener error for {long_url}: {data.get('message')}")
            return None
    except Exception as e:
        print(f"Failed shortening {long_url}: {e}")
        return None

def update_json(filename, info):
    with open(filename, 'r') as f:
        episodes = json.load(f)
    changed = False
    for ep in episodes:
        ep_num = ep['ep']
        page_url = f"https://www.smtvurdu.site/episode?series={info['series']}&season={info['season']}&ep={ep_num}&lang="
        if ("shortlink" not in ep) or (not ep["shortlink"]) or (not ep["shortlink"].startswith("https://nanolinks.in/")):
            print(f"Generating shortlink for: {page_url}")
            shortlink = get_shortlink(page_url)
            if shortlink:
                ep["shortlink"] = shortlink
                print(f"Added shortlink: {shortlink}")
                changed = True
            else:
                print(f"Shortlink creation failed for: {page_url}")
    if changed:
        with open(filename, 'w') as f:
            json.dump(episodes, f, indent=2)
        print(f"File updated: {filename}")
    else:
        print(f"No changes needed for: {filename}")

json_files = [
    'kurulus-osman-s7.json',
    'sultan-mehmet-fatih-s1.json',
    'destan-s1.json',
    'salauddin-ayyubi-s1.json',
    # Add your JSON files here as needed
]

for fname in json_files:
    if fname in SERIES_INFO:
        try:
            update_json(fname, SERIES_INFO[fname])
        except Exception as ex:
            print(f"Error processing {fname}: {ex}")
    else:
        print(f"No series info found for: {fname}")

print("DONE. All JSON files processed and updated with correct shortlinks.")
