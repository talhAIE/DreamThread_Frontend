"""Loopback static frontend, public configuration and fixed-target FastAPI proxy."""
import argparse
import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler
from urllib.parse import urlsplit


def configuration(env_path):
    values = {}
    if env_path.is_file():
        for line in env_path.read_text(encoding='utf-8-sig').splitlines():
            name, sep, value = line.partition('=')
            if sep and not name.strip().startswith('#'):
                values[name.strip()] = value.strip().strip('\"\'')
    values.update(os.environ)
    # Explicit allowlist: never send database, provider or Supabase secret keys.
    return {'apiBase': values.get('API_PREFIX', '/api/v1'),
            'supabaseUrl': values.get('SUPABASE_URL', ''),
            'supabasePublishableKey': values.get('SUPABASE_PUBLISHABLE_KEY', ''),
            'voiceEnabled': values.get('VOICE_ENABLED', 'false').lower() == 'true'}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Frontend(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Never log private search text, signed upload URLs or auth headers.

    def do_GET(self):
        if self.path == '/config.json':
            body = json.dumps(self.server.public_config).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.is_api():
            self.proxy()
        else:
            super().do_GET()

    def is_api(self):
        path = self.path.split('?', 1)[0]
        prefix = self.server.public_config['apiBase']
        return path.startswith(prefix + '/') or path in {'/health/live', '/health/ready'}

    def proxy(self):
        if not self.is_api():
            self.send_error(404)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size < 0 or size > 10485760:
                self.send_error(413)
                return
            body = self.rfile.read(size) if size else None
            headers = {k: v for k, v in self.headers.items() if k.lower() in {
                'authorization', 'content-type', 'idempotency-key', 'x-request-id'}}
            req = Request(self.server.api_origin + self.path, data=body,
                          headers=headers, method=self.command)
            try:
                response = build_opener(ProxyHandler({}), NoRedirect()).open(req, timeout=180)
            except HTTPError as error:
                response = error
            with response:
                payload = response.read()
                self.send_response(response.status)
                for k in ('Content-Type', 'Content-Disposition', 'X-Request-ID', 'Retry-After'):
                    if response.headers.get(k):
                        self.send_header(k, response.headers[k])
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
        except (URLError, TimeoutError, OSError, ValueError):
            payload = json.dumps({'error': {'code': 'backend_unavailable',
                'message': 'Backend unavailable. Start the API on port 8000.'}}).encode()
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(payload)

    do_POST = proxy
    do_PUT = proxy
    do_PATCH = proxy
    do_DELETE = proxy

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=int(os.environ.get('PORT', '5173')))
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--backend-url', default=os.environ.get('BACKEND_URL'))
    parser.add_argument('--backend-port', type=int, default=8000)
    parser.add_argument('--env-file', type=Path, default=Path(__file__).resolve().parents[2] / 'backend' / '.env')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / 'frontend'
    origin = args.backend_url or f'http://127.0.0.1:{args.backend_port}'
    parsed = urlsplit(origin)
    if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.path not in {'', '/'} or parsed.username or parsed.query or parsed.fragment:
        parser.error('--backend-url must be an HTTP(S) origin without credentials or an API path')
    server = ThreadingHTTPServer((args.host, args.port), partial(Frontend, directory=str(root)))
    server.public_config = configuration(args.env_file)
    server.api_origin = origin.rstrip('/')
    print(f'DreamThread: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
