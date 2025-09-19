import json
import requests

API_KEY = '1e9c15ef4c7e5d1cda14440ee88b3ee050761100'
API_ENDPOINT = 'https://nanolinks.in/api?api={}&url={}'

# Map of your JSON filenames to their series/season parameters
SERIES_INFO = {
    'kurulus-osman-s7.json': {'series': 'kurulus-osman', 'season': 7},
    'sultan-mehmet-fatih-s1.json': {'series': 'sultan-mehmet-fatih', 'season': 1},
    'destan-s1.json': {'series': 'destan', 'season': 1},
    'salauddin-ayyubi-s1.json': {'series': 'salauddin-ayyubi', 'season': 1},
    # Add new filenames with info here if you add more series!
}

def get_shortlink(long_url):
    try:
        api_url = API_ENDPOINT.format(API_KEY, long_url)
        response = requests.get(api_url)
        data = response.json()
        if data.get("status") == "success" and data.get("shortenedUrl"):
            return data["shortenedUrl"]
        else:
            print(f"Shortener error for {long_url}: {data.get('message')}")
            return None
    except Exception as e:
        print(f"Failed shortening {long_url}: {e}")
        return None

def update_json(filename, series_info):
    with open(filename, 'r') as f:
        episodes = json.load(f)
    changed = False
    for ep in episodes:
        ep_num = ep['ep']
        # Generate your streaming landing page URL for this episode
        long_url = f"https://www.smtvurdu.site/episode?series={series_info['series']}&season={series_info['season']}&ep={ep_num}&lang="
        # Skip if already has correct shortened link (optional: you can remove this check if you want to always refresh)
        if ("shortlink" not in ep) or (not ep["shortlink"]) or (not ep["shortlink"].startswith("https://nanolinks.in/")):
            print(f"Creating shortlink for: {long_url}")
            shortlink = get_shortlink(long_url)
            if shortlink:
                ep["shortlink"] = shortlink
                print(f"Added shortlink: {shortlink}")
                changed = True
            else:
                print(f"Shortlink creation failed for: {long_url}")
    if changed:
        with open(filename, 'w') as f:
            json.dump(episodes, f, indent=2)
        print(f"Updated: {filename}")
    else:
        print(f"No changes needed for: {filename}")

# List all your JSON files here
json_files = [
    'kurulus-osman-s7.json',
    'sultan-mehmet-fatih-s1.json',
    'destan-s1.json',
    'salauddin-ayyubi-s1.json',
    # Add more filenames as your projects grow
]

for fname in json_files:
    if fname in SERIES_INFO:
        try:
            update_json(fname, SERIES_INFO[fname])
        except Exception as ex:
            print(f"Error processing {fname}: {ex}")
    else:
        print(f"Series info missing for: {fname}")

print("All done. Your JSON files now have correct shortlinks to your streaming pages!")
