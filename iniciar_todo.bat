@echo off
title Sistema Frances - Lanzador
echo ========================================================
echo   Lanzando Backend y Frontend expuestos a la red local
echo ========================================================
start "Backend (0.0.0.0:8001)" cmd /k "%~dp0iniciar_backend.bat"
start "Frontend (0.0.0.0:5173)" cmd /k "%~dp0iniciar_frontend.bat"
echo Servidores iniciados en ventanas separadas.
