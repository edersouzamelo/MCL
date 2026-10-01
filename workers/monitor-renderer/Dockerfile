FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-impress libreoffice-writer poppler-utils fonts-crosextra-carlito fonts-crosextra-caladea fonts-liberation fonts-noto-core && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 renderer
COPY server.py /app/server.py
USER renderer
EXPOSE 8090
CMD ["python", "/app/server.py"]
