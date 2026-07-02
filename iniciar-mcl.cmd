@echo off
setlocal
cd /d "%~dp0"
set AUTH_SECRET=dev-secret-local
set DEMO_AUTH_ENABLED=true
set DEMO_ACCESS_CODE=MCL-DEMO-2026
if not exist ".next\BUILD_ID" (
  echo Preparando build de producao do MCL...
  "C:\Program Files\nodejs\npm.cmd" run build
  if errorlevel 1 (
    echo Falha ao preparar o build. Verifique as mensagens acima.
    pause
    exit /b 1
  )
)
echo.
echo MCL Piloto Classe II iniciado em:
echo http://localhost:3010/entrar
echo.
echo Deixe esta janela aberta enquanto estiver testando.
"C:\Program Files\nodejs\npm.cmd" run start -- -p 3010
