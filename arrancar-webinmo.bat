@echo off
setlocal

cd /d "%~dp0"

set "APP_URL=http://localhost:8090"

echo ==========================================
echo   Arranque local de WebInmobiliaria
echo ==========================================
echo.

where docker >nul 2>nul
if %errorlevel%==0 goto docker_start

where php >nul 2>nul
if %errorlevel%==0 goto php_start

echo No se ha encontrado ni Docker ni PHP en este equipo.
echo.
echo Opciones:
echo 1. Instala y abre Docker Desktop
echo 2. O instala PHP y usa este mismo .bat
echo.
pause
exit /b 1

:docker_start
echo Usando Docker...
docker compose up -d --build
if errorlevel 1 (
  echo.
  echo No se ha podido levantar Docker.
  echo Revisa si Docker Desktop esta abierto.
  echo.
  pause
  exit /b 1
)
echo.
echo Esperando unos segundos...
timeout /t 5 /nobreak >nul
start "" "%APP_URL%"
echo Abriendo %APP_URL%
echo.
echo Para parar el entorno:
echo docker compose down
echo.
pause
exit /b 0

:php_start
echo Usando PHP local...
echo.
echo Se abrira la web en %APP_URL%
echo Deja esta ventana abierta mientras trabajas.
echo.
start "" "%APP_URL%"
php -S localhost:8090
exit /b 0
