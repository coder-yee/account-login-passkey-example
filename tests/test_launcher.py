"""统一入口的页面路由、资源路径和配置加载测试，不连接 MySQL。"""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('demo_launcher', ROOT / 'main.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)

from fastapi.testclient import TestClient
from app.config import Settings


class LauncherTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(launcher.app)
        self.addCleanup(self.client.close)

    def test_guide_links_to_all_examples(self):
        for path in ('/', '/index.html'):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            for link in ('./simple/web/index.html', './complete/web/index.html', './complete-python/'):
                self.assertIn(f'href="{link}"', response.text)

    def test_pages_and_assets(self):
        for prefix in ('/simple', '/complete'):
            for path in ('/', '/web/index.html', '/web/login.html', '/web/passkey.html', '/web/app.js', '/web/i18n.js', '/web/style.css', '/mock/api.js'):
                self.assertEqual(self.client.get(prefix + path).status_code, 200, prefix + path)
        for path in ('/', '/index.html', '/login.html', '/register.html', '/passkey.html', '/app.js', '/api.js', '/i18n.js', '/style.css'):
            self.assertEqual(self.client.get('/complete-python' + path).status_code, 200, path)

    def test_api_routes_are_available_at_origin_root(self):
        self.assertEqual(self.client.get('/api/account/me').status_code, 401)
        self.assertEqual(self.client.get('/api/debug/database').status_code, 401)
        self.assertEqual(self.client.get('/health').json(), {'status': 'ok'})
        self.assertEqual(self.client.get('/docs').status_code, 200)
        schema = self.client.get('/openapi.json').json()
        self.assertEqual(schema['info']['version'], '0.1.0')
        self.assertEqual(self.client.get('/i18n.js').status_code, 200)
        for path in ('/api/account/login', '/api/passkey/register/options', '/api/passkey/login/verify'):
            self.assertIn(path, schema['paths'])

    def test_backend_files_are_not_public(self):
        for path in ('/.env', '/.git/config', '/complete-python/.env', '/complete-python/main.py', '/complete-python/app/config.py', '/complete-python/sql/schema.sql'):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_env_file_is_independent_of_working_directory(self):
        self.assertEqual(Settings.model_config['env_file'], ROOT / 'complete-python' / '.env')


if __name__ == '__main__':
    unittest.main()
