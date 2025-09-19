import json
import requests

API_KEY = '1e9c15ef4c7e5d1cda14440ee88b3ee050761100'
# API endpoint for nanolinks.in (no alias by default)
API_ENDPOINT = 'https://nanolinks.in/api?api={}&url={}'

def get_shortlink(long_url):
    try:
        api_url = API_ENDPOINT.format(API_KEY, long_url)
        res = requests.get(api_url)
        data = res.json()
        if data.get("status") == "success" and data.get("shortenedUrl"):
            return data["shortenedUrl"]
        else:
            print(f"Shortener error for {long_url}: {data.get('message')}")
            return None
    except Exception as e:
        print(f"Failed shortening {long_url}: {e}")
        return None

def update_json(filename):
    with open(filename, 'r') as f:
        episodes = json.load(f)
    changed = False
    for ep in episodes:
        url = ep.get('download')
        if url and ("shortlink" not in ep or not ep["shortlink"]):
            shortlink = get_shortlink(url)
            if shortlink:
                ep["shortlink"] = shortlink
                print(f"Updated: {ep.get('title', '')} - {shortlink}")
                changed = True
    if changed:
        with open(filename, 'w') as f:
            json.dump(episodes, f, indent=2)
        print(f"File updated: {filename}")
    else:
        print(f"No changes needed in {filename}")

# List your JSON episode files below
json_files = [
    'kurulus-osman-s7.json',
    'sultan-mehmet-fatih-s1.json',
    'destan-s1.json',
    'salauddin-ayyubi-s1.json',
    # Add more filenames as needed
]

for fname in json_files:
    try:
        update_json(fname)
    except Exception as ex:
        print(f"Error processing {fname}: {ex}")

print("All done.")
