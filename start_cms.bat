@echo off
title Chapai Fresh CMS Local Server
echo ========================================================
echo Starting Chapai Fresh local e-commerce CMS server...
echo ========================================================
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "cms_server.ps1"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start CMS server. Ensure PowerShell is installed and port 8085 is not in use.
    pause
)
