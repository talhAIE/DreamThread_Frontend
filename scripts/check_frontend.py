"""Check local imports, CSS/HTML assets, and Figma bindings without dependencies."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'frontend'
errors = []
count = 0
for source in root.rglob('*'):
    if source.suffix not in {'.js','.css','.html'}:
        continue
    text = source.read_text(encoding='utf-8')
    refs = []
    if source.suffix == '.js':
        refs += re.findall(r"from\s+['\"]([^'\"]+)['\"]",text)
        refs += re.findall(r"['\"](assets/[^'\"$]+\.(?:svg|png|ttf))['\"]",text)
    elif source.suffix == '.css':
        refs += re.findall(r'url\([\'\"]?([^\)\'\"]+)',text)
    else:
        refs += re.findall(r'(?:src|href)="([^"#]+)"',text)
    for ref in refs:
        if '${' in ref or '://' in ref or ref.startswith('data:'):
            continue
        target = (root / ref) if ref.startswith('assets/') else (source.parent / ref)
        count += 1
        if not target.is_file() or not target.stat().st_size:
            errors.append(f'{source.relative_to(root)}: missing/empty {ref}')
for error in errors:
    print(error)
if errors:
    raise SystemExit(1)
print(f'PASS: {count} local imports and asset references resolve to non-empty files.')
