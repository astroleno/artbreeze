#!/usr/bin/env python3
"""Serve only this extension's developer fixture locally; no extension installation."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8767)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]

class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?', 1)[0] in ('/tests/popup.html', '/tests/options.html'):
            # The production popup is unchanged; only this local response injects the test API shim.
            html = (root / ('options.html' if self.path.split('?', 1)[0].endswith('options.html') else 'popup.html')).read_text().replace('</title>', '</title><base href="/"><script src="tests/fixture-chrome.js"></script>')
            if self.path.split('?', 1)[0].endswith('options.html'):
                html = html.replace('<script src="options.js"></script>', '<script src="providers.js"></script><script src="background.js"></script><script src="options.js"></script>')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode())
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *_):
        pass

print(f"Preview: http://127.0.0.1:{args.port}/tests/preview.html", flush=True)
ThreadingHTTPServer(("127.0.0.1", args.port), partial(PreviewHandler, directory=str(root))).serve_forever()
