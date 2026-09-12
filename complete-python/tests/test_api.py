"""HTTP 回归测试使用独立内存数据库，不连接或修改开发 MySQL。"""
import os
import json
import hashlib
from base64 import urlsafe_b64encode
import unittest

import cbor2
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

os.environ["DATABASE_URL"] = "sqlite://"

from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.config import settings
from app.database import get_db
from app.models import Base, Passkey, User
from app.security import utcnow


@compiles(BigInteger, "sqlite")
def sqlite_bigint(element, compiler, **kw):
    # SQLite 只有 INTEGER PRIMARY KEY 才支持自增；生产模型仍使用 BIGINT。
    return "INTEGER"


class APITests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine, autoflush=False)

        def override_db():
            with self.sessions() as db:
                yield db

        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)
        self.addCleanup(self.cleanup)
        self.assertEqual(self.client.post("/api/account/register", json={"username": "alice", "password": "secret123"}).status_code, 200)

    def cleanup(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def login(self, client=None):
        client = client or self.client
        self.assertEqual(client.post("/api/account/login", json={"username": "alice", "password": "secret123"}).status_code, 200)

    def test_account_lifecycle(self):
        self.assertEqual(self.client.get("/api/account/me").status_code, 401)
        self.assertEqual(self.client.post("/api/account/login", json={"username": "alice", "password": "wrong"}).status_code, 401)
        self.login()
        self.assertEqual(self.client.get("/api/account/me").json()["account"]["username"], "alice")
        self.assertEqual(self.client.post("/api/account/logout").status_code, 200)
        self.assertEqual(self.client.get("/api/account/me").status_code, 401)

    def test_username_validated_after_trimming(self):
        self.assertEqual(self.client.post("/api/account/register", json={"username": " a ", "password": "secret123"}).status_code, 422)

    def test_password_verification_belongs_to_current_session(self):
        self.login()
        with TestClient(app) as other:
            self.login(other)
            self.client.post("/api/account/password/verify", json={"password": "secret123"})
            response = self.client.post("/api/passkey/register/options")
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(other.post("/api/passkey/register/options").status_code, 403)
            # 即使同账户复制了 Challenge Cookie，也不能换 Session 完成注册。
            other.cookies.set("webauthn_challenge_id", self.client.cookies.get("webauthn_challenge_id"))
            response = other.post("/api/passkey/register/verify", json={"credential": {}})
            self.assertEqual(response.status_code, 400)
            self.assertIn("已失效", response.json()["detail"])

    def test_invalid_challenge_cookie_is_client_error(self):
        self.login()
        for value in ("invalid", "-1", "9" * 100):
            self.client.cookies.set("webauthn_challenge_id", value)
            for kind in ("register", "login"):
                response = self.client.post(f"/api/passkey/{kind}/verify", json={"credential": {}})
                self.assertEqual(response.status_code, 400)

    def test_passkey_list_and_enable_state(self):
        self.login()
        with self.sessions() as db:
            user = db.query(User).one()
            user.passkey_enabled = True
            now = utcnow()
            key = Passkey(user_id=user.id, credential_id=b"credential", public_key=b"key", enabled=True, created_at=now, updated_at=now)
            db.add(key)
            db.commit()
            key_id = key.id
        row = self.client.get("/api/passkey/list").json()[0]
        self.assertEqual(row["credentialId"], "Y3JlZGVudGlhbA")
        for enabled in (False, False, True):
            action = "enable" if enabled else "disable"
            self.assertEqual(self.client.post(f"/api/passkey/{key_id}/{action}").json()["enabled"], enabled)
            self.assertEqual(self.client.get("/api/account/me").json()["account"]["passkeyEnabled"], enabled)

    def test_debug_requires_login_and_scopes_data(self):
        self.assertEqual(self.client.get("/api/debug/database").status_code, 401)
        self.client.post("/api/account/register", json={"username": "bob", "password": "secret123"})
        self.login()
        self.assertEqual([u["username"] for u in self.client.get("/api/debug/database").json()["users"]], ["alice"])

    def test_real_webauthn_registration_and_authentication(self):
        # 使用测试私钥构造标准响应，实际调用 py_webauthn 验签，不 mock 验证函数。
        def b64(value):
            return urlsafe_b64encode(value).rstrip(b"=").decode("ascii")

        self.login()
        self.client.post("/api/account/password/verify", json={"password": "secret123"})
        options = self.client.post("/api/passkey/register/options").json()
        private = ec.generate_private_key(ec.SECP256R1())
        public = private.public_key().public_numbers()
        cose = cbor2.dumps({1: 2, 3: -7, -1: 1, -2: public.x.to_bytes(32, "big"), -3: public.y.to_bytes(32, "big")})
        credential_id = b"test-credential-id"
        rp_hash = hashlib.sha256(settings.webauthn_rp_id.encode()).digest()
        auth_data = rp_hash + b"\x41" + bytes(4) + bytes(16) + len(credential_id).to_bytes(2, "big") + credential_id + cose
        client_data = json.dumps({"type": "webauthn.create", "challenge": options["challenge"], "origin": settings.webauthn_origin}).encode()
        registration = {"id": b64(credential_id), "rawId": b64(credential_id), "type": "public-key", "response": {
            "clientDataJSON": b64(client_data),
            "attestationObject": b64(cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": auth_data})),
        }}
        response = self.client.post("/api/passkey/register/verify", json={"credential": registration})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["passkey"]["credentialId"], b64(credential_id))
        self.assertEqual(self.client.post("/api/passkey/register/verify", json={"credential": registration}).status_code, 400)
        options2 = self.client.post("/api/passkey/register/options").json()
        self.assertEqual(options2["excludeCredentials"][0]["id"], b64(credential_id))
        self.client.post("/api/account/logout")
        login_options = self.client.post("/api/passkey/login/options").json()
        client_data = json.dumps({"type": "webauthn.get", "challenge": login_options["challenge"], "origin": settings.webauthn_origin}).encode()
        auth_data = rp_hash + b"\x01" + (1).to_bytes(4, "big")
        signature = private.sign(auth_data + hashlib.sha256(client_data).digest(), ec.ECDSA(hashes.SHA256()))
        authentication = {"id": b64(credential_id), "rawId": b64(credential_id), "type": "public-key", "response": {
            "clientDataJSON": b64(client_data), "authenticatorData": b64(auth_data),
            "signature": b64(b"invalid-signature"), "userHandle": options["user"]["id"],
        }}
        self.assertEqual(self.client.post("/api/passkey/login/verify", json={"credential": authentication}).status_code, 401)
        authentication["response"]["signature"] = b64(signature)
        response = self.client.post("/api/passkey/login/verify", json={"credential": authentication})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/account/me").json()["account"]["username"], "alice")
        with self.sessions() as db:
            self.assertEqual(db.query(Passkey).one().sign_count, 1)
        self.assertEqual(self.client.post("/api/passkey/login/verify", json={"credential": authentication}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
