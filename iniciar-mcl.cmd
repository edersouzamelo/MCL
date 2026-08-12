@echo off
setlocal
cd /d "%~dp0"
if "%AUTH_SECRET%"=="" (
  echo AUTH_SECRET nao configurado. Defina a variavel antes de iniciar.
  pause
  exit /b 1
)
if /I not "%DEMO_AUTH_ENABLED%"=="true" (
  echo DEMO_AUTH_ENABLED precisa ser true para o acesso demonstrativo local.
  pause
  exit /b 1
)
if "%DEMO_USER_PASSWORD%"=="" (
  echo DEMO_USER_PASSWORD nao configurada. Use uma senha exclusiva e rotacionavel.
  pause
  exit /b 1
)
set NODE_OPTIONS=--use-system-ca
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
