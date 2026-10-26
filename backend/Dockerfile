# =============================================================================
# DOCKERFILE - FASTAPI BACKEND (SISTEMA PRÉSTAMOS FRANCÉS)
# =============================================================================
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Instalar dependencias del sistema y ODBC Driver 18 para Microsoft SQL Server (requerido por pyodbc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    unixodbc \
    unixodbc-dev \
    gcc \
    g++ \
    && mkdir -p /usr/share/keyrings \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && apt-get purge -y --auto-remove gcc g++ gnupg2 \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Práctica 1: Usuario no privilegiado (prevenir escalada de privilegios)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Copiar código fuente
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8001

# Práctica 4: Healthcheck activo
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
