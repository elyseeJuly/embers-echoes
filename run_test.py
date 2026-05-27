import urllib.request
import time
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import threading

def run_server():
    server = HTTPServer(('127.0.0.1', 8000), SimpleHTTPRequestHandler)
    server.serve_forever()

threading.Thread(target=run_server, daemon=True).start()
time.sleep(1)
