# Microservicio de Préstamos — Sistema Francés

Sistema integral (Backend FastAPI + Frontend React/TypeScript) para el cálculo, simulación y administración de préstamos bajo el **Sistema Francés con IVA**, alineado e integrado al sistema central monolito (CoopYa).

---

## 🏛️ Arquitectura del Sistema

* **Backend:** FastAPI (Python 3.13)
* **Frontend:** React + TypeScript (Vite)
* **Base de Datos:** SQL Server (`PrestamosDB`)
* **Integración:** Cliente HTTP desacoplado hacia el monolito CoopYa para autenticación y consulta de personas/cuentas corrientes (modo lectura).
* **Manejo Monetario:** Estándar de enteros en **centavos** (`BIGINT` en DB / `int` en Python y JSON), eliminando cualquier error de punto flotante.

---

## 🚀 Puesta en Marcha Local

### 1. Backend (FastAPI)

```bash
cd backend

# Crear y activar entorno virtual
python -m venv .venv
.\.venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (opcional)
copy .env.example .env

# Iniciar servidor
uvicorn main:app --reload --port 8001
```

* **Swagger / Documentación interactiva:** `http://localhost:8001/docs`
* **Health Check:** `http://localhost:8001/health`

### 2. Frontend (React + TypeScript)

```bash
cd frontend

# Instalar paquetes
npm install

# Iniciar servidor de desarrollo
npm run dev
```

* **Aplicación Web:** `http://localhost:5173`

---

## 🧪 Pruebas Unitarias

Para ejecutar la suite de pruebas del motor de amortización y endpoints:

```bash
cd backend
$env:PYTHONPATH="."
.\.venv\Scripts\pytest
```

---

## 🔒 Seguridad y Buenas Prácticas

* Los importes monetarios se manejan 100% en centavos.
* Las llamadas al monolito no mutan cuentas corrientes ni datos del sistema central (operación en modo solo lectura).
* El token de sesión de CoopYa se delega a través del login de operadores y se envía en los encabezados `Authorization: Bearer <token>`.
