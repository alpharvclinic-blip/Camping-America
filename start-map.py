#!/usr/bin/env python3
"""Start the campground map on a free localhost port and open it in a browser."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import webbrowser


ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

server = ThreadingHTTPServer(("127.0.0.1", 0), SimpleHTTPRequestHandler)
url = f"http://127.0.0.1:{server.server_port}/"

print(f"Campground Map is running at {url}", flush=True)
print("Keep this window open while using the map. Press Ctrl+C to stop.", flush=True)
webbrowser.open(url)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nCampground Map stopped.", flush=True)
finally:
    server.server_close()
