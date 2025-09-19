import json

# Map your JSON file names to series names and season numbers
SERIES_INFO = {
    'kurulus-osman-s7.json': {'series': 'kurulus-osman', 'season': 7},
    'sultan-mehmet-fatih-s1.json': {'series': 'sultan-mehmet-fatih', 'season': 1},
    'destan-s1.json': {'series': 'destan', 'season': 1},
    'salauddin-ayyubi-s1.json': {'series': 'salauddin-ayyubi', 'season': 1}
    # Add more files here if needed
}

def check_json(filename, info):
    with open(filename, 'r') as f:
        episodes = json.load(f)
    changed = False
    for ep in episodes:
        ep_num = ep['ep']
        page_url = f"https://www.smtvurdu.site/episode?series={info['series']}&season={info['season']}&ep={ep_num}&lang="
        if ("shortlink" not in ep) or (not ep["shortlink"]) or (not ep["shortlink"].startswith("https://nanolinks.in/")):
            print(f"Missing or invalid shortlink for episode {ep_num}.\nExpected page URL: {page_url}")
    print(f"Checked: {filename}")

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
            check_json(fname, SERIES_INFO[fname])
        except Exception as ex:
            print(f"Error processing {fname}: {ex}")
    else:
        print(f"No series info found for: {fname}")

print("DONE. All JSON files checked for manual shortlinks.")
