@echo off
REM Quick Start Script for Coolify Build Server on Windows
REM This script performs the minimal setup needed

echo ========================================
echo Coolify Build Server Quick Setup
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Create coolify directory
if not exist "C:\coolify" (
    mkdir C:\coolify
    echo [OK] Created C:\coolify directory
) else (
    echo [OK] C:\coolify directory exists
)

REM Create docker-compose.yml
echo Creating Docker Compose configuration...
(
echo version: '3.8'
echo.
echo services:
echo   coolify-agent:
echo     image: coollabsio/coolify-agent:latest
echo     container_name: coolify-build-agent
echo     restart: unless-stopped
echo     environment:
echo       - COOLIFY_MODE=build
echo       - DOCKER_HOST=tcp://host.docker.internal:2375
echo     volumes:
echo       - //var/run/docker.sock:/var/run/docker.sock
echo       - C:/coolify/data:/data
echo     ports:
echo       - "8000:8000"
echo     extra_hosts:
echo       - "host.docker.internal:host-gateway"
echo     networks:
echo       - coolify-network
echo.
echo networks:
echo   coolify-network:
echo     driver: bridge
) > C:\coolify\docker-compose.yml

echo [OK] Docker Compose file created
echo.

REM Start the Coolify agent
echo Starting Coolify Build Agent...
cd /d C:\coolify
docker-compose down >nul 2>&1
docker-compose pull
docker-compose up -d

if %errorlevel% equ 0 (
    echo [OK] Coolify Build Agent started successfully!
) else (
    echo [ERROR] Failed to start Coolify Build Agent
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.

REM Get IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%

echo Your Build Server Information:
echo ------------------------------
echo IP Address: %IP%
echo Agent Port: 8000
echo Docker API: 2375
echo.
echo Next Steps:
echo 1. Open Windows Firewall and allow port 8000
echo 2. In your Coolify dashboard, add this server:
echo    - Type: Build Server
echo    - IP: %IP%
echo    - Port: 8000
echo.
echo To check agent status:
echo   docker logs coolify-build-agent
echo.
echo To stop the agent:
echo   docker stop coolify-build-agent
echo.

pause