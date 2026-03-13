@echo off
echo Запуск локального HTTP сервера для DayZ карты...
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python не найден. Попробуем использовать Node.js...
    
    REM Проверяем Node.js
    node --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ОШИБКА: Ни Python ни Node.js не найдены!
        echo.
        echo Установите один из них:
        echo 1. Python: https://www.python.org/downloads/
        echo 2. Node.js: https://nodejs.org/
        echo.
        echo Или используйте любой другой HTTP сервер:
        echo - Live Server в VS Code
        echo - XAMPP
        echo - WampServer
        echo.
        pause
        exit /b 1
    ) else (
        echo Запуск Node.js HTTP сервера на порту 8000...
        echo Откройте в браузере: http://localhost:8000
        echo.
        echo Для остановки сервера нажмите Ctrl+C1
        echo.
        npx http-server -p 8000 -c-1
    )
) else (
    echo Запуск Python HTTP сервера на порту 8000...
    echo Откройте в браузере: http://localhost:8000
    echo.
    echo Для остановки сервера нажмите Ctrl+C2
    echo.
    python -m http.server 8000 --bind 0.0.0.0
)
