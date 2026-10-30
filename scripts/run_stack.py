"""Launch the sibling DreamThread backend, worker and frontend; Ctrl+C stops them."""
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time


def main():
    frontend = Path(__file__).resolve().parents[1]
    backend = frontend.parent / 'backend'
    if not (backend / '.env').is_file():
        raise SystemExit('Configure backend/.env before starting DreamThread.')
    for port in (8000, 5173):
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                raise SystemExit(f'Port {port} is already in use. Stop the previous server first.')
    children = []
    def stop(*_):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    try:
        commands = [
            (backend, ['-m', 'uvicorn', 'app.main:create_app', '--factory',
                       '--loop', 'app.loop:create_loop', '--host', '127.0.0.1',
                       '--port', '8000', '--no-access-log']),
            (backend, ['-m', 'app.workers.main']),
            (frontend, ['scripts/serve_frontend.py']),
        ]
        flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        for cwd, args in commands:
            children.append(subprocess.Popen([sys.executable, *args], cwd=cwd,
                                              creationflags=flags))
        print('DreamThread: http://127.0.0.1:5173 — Ctrl+C stops all services.', flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        for child in children:
            if child.poll() is None:
                try:
                    child.send_signal(signal.CTRL_BREAK_EVENT if os.name == 'nt' else signal.SIGTERM)
                except OSError:
                    pass
        for child in children:
            try:
                child.wait(timeout=12)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == '__main__':
    main()
