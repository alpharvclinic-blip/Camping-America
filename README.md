# Campground Map

An interactive U.S. map of **Thousand Trails** (green), **Encore** (blue) and **Passport America** (red) campgrounds.

- Click a network's name to add it to or remove it from the map and the counts.
- Type a state name or abbreviation (Texas, TX) and press Enter to jump to that state.
- Pins group into donut clusters showing the mix of networks inside. Zoom in or click one to split it.
- Click a pin for the name, address and a Google Maps link.

## Run it locally

1. Extract the ZIP first. The file `index.html` is at the top level of the extracted folder.
2. Open a terminal in that folder and run:

   - macOS/Linux: `python3 start-map.py`
   - Windows: `py start-map.py`

The script starts a local web server and opens the map in your browser. Leave the terminal open while using it; press Ctrl+C to stop the server. Python 3.7 or newer is required.

The campground data and map code are included in this ZIP. An internet connection is required for the background map tiles.

## Publish

This is a plain static site. Upload the contents of the extracted folder, with `index.html` at the site root. No build step or framework settings are needed.

- **Vercel:** import the repo and deploy. If asked for a framework, choose **Other** and leave every build setting empty.
- **GitHub Pages:** Settings > Pages > Deploy from a branch > `main` / `(root)`.

## Update the data

The Excel files are in `source/`. After editing them:

```
pip install -r tools/requirements.txt
python tools/build_data.py
```

This rewrites `data/campgrounds.js`. Columns used: Name, State, Address, City, Zipcode, and optionally `Latitude` and `Longitude`, which override the ZIP location and give exact pins.

## Accuracy

- Pins are placed at the center of each ZIP code, so they can be a few miles from the real spot. Add Latitude/Longitude columns for exact pins.
- U.S. only: Canadian and Mexican rows (54) are skipped.
- Skipped as duplicates or annexes: Whitten Inn / Whalers Rest Annex, Oakzanita Springs Annex, and the second Virginia Landing row.
- One Passport America park (Stillwaters Creek Campground & Cabins, Spencer, TN) is not drawn because its ZIP (85385) is an Arizona ZIP.
- Passport America's list could not be verified against its official directory.

Map tiles are served by Esri; required data-provider attribution is displayed on the map. Built with Leaflet and Leaflet.markercluster (bundled in `vendor/`).
