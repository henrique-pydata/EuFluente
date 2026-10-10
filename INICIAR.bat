@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo             EuFluente
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale o Node.js 22 ou mais recente e tente novamente.
  echo https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando as dependencias do projeto...
  call npm install
  if errorlevel 1 (
    echo.
    echo Nao foi possivel instalar as dependencias. Confira a conexao e tente novamente.
    pause
    exit /b 1
  )
)

echo Iniciando o EuFluente no navegador...
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.
call npm run dev -- --open
pause
