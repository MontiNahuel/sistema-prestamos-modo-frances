@echo off
title Backend - Sistema Frances (0.0.0.0:8001)
echo ========================================================
echo   Iniciando Backend Sistema Frances
echo   Escuchando en: http://0.0.0.0:8001
echo   Acceso local: http://localhost:8001/docs
echo   Acceso LAN:   http://10.16.2.18:8001/docs
echo ========================================================
cd /d "%~dp0backend"
.\.venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8001 --reload
pause
