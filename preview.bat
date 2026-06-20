@echo off
cd /d "%~dp0"
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo npm nao encontrado no PATH.
  echo Instale Node.js e npm antes de usar este script.
  pause
  exit /b 1
)

echo Instalando dependencias...
npm install

echo Executando build e iniciando preview...
npm run preview
