# =============================================================================
# DOCKERFILE - FASTAPI BACKEND (SISTEMA PRÉSTAMOS FRANCÉS)
# =============================================================================
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    LD_LIBRARY_PATH=/opt/oracle/instantclient_19_24

WORKDIR /app

# Instalar dependencias del sistema, ODBC Driver 18 para SQL Server y Oracle Instant Client 19
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    unixodbc \
    unixodbc-dev \
    libaio1 \
    unzip \
    gcc \
    g++ \
    && mkdir -p /usr/share/keyrings \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && mkdir -p /opt/oracle \
    && curl -fsSL https://download.oracle.com/otn_software/linux/instantclient/1924000/instantclient-basic-linux.x64-19.24.0.0.0dbru.zip -o /opt/oracle/instantclient.zip \
    && unzip -q /opt/oracle/instantclient.zip -d /opt/oracle \
    && rm /opt/oracle/instantclient.zip \
    && echo "/opt/oracle/instantclient_19_24" > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig \
    && apt-get purge -y --auto-remove gcc g++ gnupg2 unzip \
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
