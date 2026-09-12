"""把根目录语言脚本同步到三个示例，保持各目录可以独立部署。"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = (root / 'i18n.js').read_bytes()
for name in ('simple', 'complete', 'complete-python'):
    (root / name / 'web' / 'i18n.js').write_bytes(source)
    print(f'Synced {name}/web/i18n.js')
