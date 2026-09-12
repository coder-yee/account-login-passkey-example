from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app import __version__
from app.routers import account, debug, passkey

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"

app = FastAPI(
    title=settings.app_name,
    version=__version__,
)

app.include_router(account.router)
app.include_router(passkey.router)
app.include_router(debug.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def index():
    return RedirectResponse(url="/index.html")


app.mount(
    "/",
    StaticFiles(directory=WEB_DIR, html=True),
    name="web",
)


if __name__ == "__main__":
    import argparse

    import uvicorn

    parser = argparse.ArgumentParser(description="启动账户与 Passkey 演示服务")
    parser.add_argument("--host", default="localhost", help="监听地址（默认：localhost）")
    parser.add_argument("--port", type=int, default=8000, help="监听端口（默认：8000）")
    parser.add_argument("--reload", action="store_true", help="开发时自动重载代码")
    args = parser.parse_args()

    # 使用模块路径，使自动重载进程也能正确加载 FastAPI 应用。
    uvicorn.run("main:app", host=args.host, port=args.port, reload=args.reload)
