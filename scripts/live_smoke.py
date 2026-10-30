"""Opt-in frontend-adapter smoke using a temporary synthetic user and only its jobs."""
import argparse
import asyncio
import json
import secrets
import sys
import subprocess
from pathlib import Path
from uuid import UUID, uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))

import httpx
from sqlalchemy import delete
from app.config import Settings
from app.db import Database
from app.db.models import tables
from app.loop import create_loop
from app.workers.queue import Queue
from app.workers.runner import Worker
from scripts.run_live_smoke import drain


async def main(origin):
    settings = Settings(_env_file=ROOT / 'backend' / '.env')
    db, queue = Database(settings), Queue(settings)
    uid, process = None, None
    headers = {'apikey': settings.supabase_secret_key.get_secret_value()}
    async with httpx.AsyncClient(trust_env=False, timeout=40) as client:
        try:
            config = (await client.get(origin + '/config.json')).json()
            assert set(config) == {'apiBase', 'supabaseUrl', 'supabasePublishableKey', 'voiceEnabled'}
            email, password = f'dreamthread-frontend-{uuid4().hex}@example.com', secrets.token_urlsafe(32)
            created = await client.post(settings.supabase_url + '/auth/v1/admin/users', headers=headers,
                json={'email': email, 'password': password, 'email_confirm': True,
                      'app_metadata': {'dreamthread_synthetic_smoke': True}})
            if created.status_code not in {200, 201}:
                raise RuntimeError('synthetic_user_creation_failed')
            uid = UUID(created.json()['id'])
            process = subprocess.Popen(['node', str(ROOT / 'frontend/tests/live-api.mjs')],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE)
            process.stdin.write((json.dumps({'origin': origin, 'config': config, 'email': email, 'password': password})+'\n').encode())
            process.stdin.flush()
            worker = Worker(settings, db, queue)
            while line := await asyncio.to_thread(process.stdout.readline):
                event = json.loads(line)
                print(json.dumps(event), flush=True)
                if event.get('drain'):
                    await drain(db, worker, uid)
                    process.stdin.write(b'continue\n')
                    process.stdin.flush()
            if await asyncio.to_thread(process.wait) != 0:
                raise RuntimeError('frontend_adapter_smoke_failed')
        finally:
            if process and process.poll() is None:
                process.kill()
                await asyncio.to_thread(process.wait)
            if uid:
                async with db.tenant_transaction(uid) as c:
                    await c.execute(delete(tables['app.accounts']).where(tables['app.accounts'].c.id == uid))
                result = await client.delete(settings.supabase_url + f'/auth/v1/admin/users/{uid}', headers=headers)
                if result.status_code not in {200, 204}:
                    raise RuntimeError('synthetic_auth_cleanup_failed')
                print('{"synthetic_user_cleanup":true}', flush=True)
            await queue.close()
            await db.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true')
    parser.add_argument('--origin', default='http://127.0.0.1:5173')
    args = parser.parse_args()
    if not args.live:
        parser.error('--live creates/removes synthetic data and incurs model charges')
    try:
        with asyncio.Runner(loop_factory=create_loop) as runner:
            runner.run(main(args.origin))
    except Exception as error:
        print(json.dumps({'frontend_smoke': False, 'error_type': type(error).__name__,
                          'code': str(error) if type(error) is RuntimeError else 'dependency_or_assertion_failure'}))
        raise SystemExit(1) from None
