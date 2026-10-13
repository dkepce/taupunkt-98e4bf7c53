#!/usr/bin/env python3
"""Tiny local web server for Taupunkt (no caching, so edits show on reload).  Run:  python tools/serve.py   → http://localhost:8130"""
import http.server, socketserver, os, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8130
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), H) as s:
    print("Taupunkt on http://localhost:%d  (Ctrl+C to stop)" % PORT)
    s.serve_forever()
