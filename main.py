"""仓库统一入口：引导页、两个静态示例和真实 Python API。"""

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "complete-python"

# 复用第三个示例的后端模块，不复制认证逻辑。
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app import __version__
from app.routers import account, debug, passkey

app = FastAPI(title=settings.app_name, version=__version__)
app.include_router(account.router)
app.include_router(passkey.router)
app.include_router(debug.router)


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def guide():
    return FileResponse(ROOT_DIR / "index.html")


@app.get("/i18n.js", include_in_schema=False)
def translations():
    return FileResponse(ROOT_DIR / "i18n.js", media_type="text/javascript")


@app.get("/health")
def health():
    return {"status": "ok"}


# 前两个版本需要同时提供 web 和 mock；Python 版本只公开 web。
app.mount("/simple", StaticFiles(directory=ROOT_DIR / "simple", html=True), name="simple")
app.mount("/complete", StaticFiles(directory=ROOT_DIR / "complete", html=True), name="complete")
app.mount("/complete-python", StaticFiles(directory=BACKEND_DIR / "web", html=True), name="complete-python")


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="启动引导页及三个 Passkey 示例")
    parser.add_argument("--host", default="localhost", help="监听地址（默认：localhost）")
    parser.add_argument("--port", type=int, default=8000, help="监听端口（默认：8000）")
    args = parser.parse_args()

    # 直接传入应用，避免与 complete-python/main.py 的同名模块混淆。
    uvicorn.run(app, host=args.host, port=args.port)
