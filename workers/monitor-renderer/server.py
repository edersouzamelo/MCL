"""Native Office/PDF rendering oracle. No document is written outside a job dir."""
import base64
import hashlib
import hmac
import json
import os
import pathlib
import signal
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = "libreoffice-pdf-png-v1"
LIMIT = 24 * 1024 * 1024
OUTPUT_LIMIT = 48 * 1024 * 1024
JOBS = threading.BoundedSemaphore(2)


def run(args, timeout=35):
    process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    try:
        output, error = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        raise ValueError("Conversão nativa excedeu o tempo permitido.")
    if process.returncode:
        raise ValueError("Conversão nativa falhou.")
    return output


def render(data, extension):
    if extension not in {"pptx", "docx", "pdf"}:
        raise ValueError("Formato não permitido.")
    if not data or len(data) > LIMIT:
        raise ValueError("Tamanho do documento inválido.")
    with tempfile.TemporaryDirectory(prefix="mcl-render-") as name:
        folder = pathlib.Path(name)
        source = folder / ("source." + extension)
        source.write_bytes(data)
        pdf = source if extension == "pdf" else folder / "source.pdf"
        if extension != "pdf":
            run(["soffice", "-env:UserInstallation=" + (folder / "profile").as_uri(), "--headless", "--nologo", "--nodefault", "--nofirststartwizard", "--convert-to", "pdf", "--outdir", name, str(source)])
        if not pdf.is_file():
            raise ValueError("A conversão não produziu um PDF.")
        info = run(["pdfinfo", str(pdf)]).decode("utf-8", "replace")
        count = int(next(line.split(":", 1)[1].strip() for line in info.splitlines() if line.startswith("Pages:")))
        if count < 1 or count > 80:
            raise ValueError("Quantidade de páginas fora do limite.")
        run(["pdftoppm", "-png", "-scale-to", "1920", str(pdf), str(folder / "page")])
        pages, total = [], 0
        for index, image in enumerate(sorted(folder.glob("page-*.png"), key=lambda path: int(path.stem.split("-")[-1])), 1):
            png = image.read_bytes()
            total += len(png)
            if total > OUTPUT_LIMIT:
                raise ValueError("Imagens nativas excedem o limite seguro.")
            text = run(["pdftotext", "-f", str(index), "-l", str(index), "-layout", str(pdf), "-"]).decode("utf-8", "replace")
            pages.append({"page": index, "png": base64.b64encode(png).decode(), "text": text, "sha256": hashlib.sha256(png).hexdigest()})
        if len(pages) != count:
            raise ValueError("Quantidade de imagens difere das páginas do original.")
        return {"rawHash": hashlib.sha256(data).hexdigest(), "rendererVersion": VERSION, "pages": pages}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log user documents, paths or authorization headers.

    def do_GET(self):
        if self.path != "/health":
            self.send_error(404)
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(VERSION.encode())

    def do_POST(self):
        token = os.environ.get("MCL_RENDERER_TOKEN", "")
        authorization = self.headers.get("Authorization", "")
        if not token or not hmac.compare_digest(authorization, "Bearer " + token):
            self.send_error(401)
            return
        if self.path != "/render" or self.headers.get("X-MCL-Format") not in {"pptx", "docx", "pdf"}:
            self.send_error(400)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > LIMIT:
                self.send_error(413)
                return
            if not JOBS.acquire(blocking=False):
                self.send_error(429)
                return
            try:
                self.connection.settimeout(40)
                data = self.rfile.read(size)
                if len(data) != size:
                    raise ValueError("Carga incompleta.")
                result = render(data, self.headers["X-MCL-Format"])
            finally:
                JOBS.release()
            response = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
        except (ValueError, OSError, StopIteration):
            self.send_error(422, "Native conversion unavailable")


if __name__ == "__main__":
    ThreadingHTTPServer((os.environ.get("MCL_RENDERER_HOST", "0.0.0.0"), int(os.environ.get("PORT", "8090"))), Handler).serve_forever()
