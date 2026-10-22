@echo off
title Frontend - Sistema Frances (0.0.0.0:5173)
echo ========================================================
echo   Iniciando Frontend Vite
echo   Escuchando en: http://0.0.0.0:5173
echo   Acceso local: http://localhost:5173
echo   Acceso LAN:   http://10.16.2.19:5173
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
