@echo off
chcp 65001 >nul
echo ====================================================
echo   FootballRisk - Injury Analytics Platform
echo   Lucrare de Licenta 2025
echo ====================================================
echo.

:: Schimba directorul la folderul unde se afla bat-ul
cd /d "%~dp0"

:: Check Python
echo [CHECK] Verificare Python...
python --version
if errorlevel 1 (
    echo [EROARE] Python nu este instalat sau nu e in PATH!
    echo Descarca de la: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check Node
echo [CHECK] Verificare Node.js...
node --version
if errorlevel 1 (
    echo [EROARE] Node.js nu este instalat sau nu e in PATH!
    echo Descarca de la: https://nodejs.org/
    pause
    exit /b 1
)

:: Install backend dependencies
echo.
echo [1/5] Instalare dependinte Python...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo [EROARE] Nu s-au putut instala dependintele Python!
    pause
    exit /b 1
)
cd ..

:: Install frontend dependencies
echo.
echo [2/5] Instalare dependinte React...
cd frontend
if not exist node_modules (
    echo Instalare npm packages...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [EROARE] Nu s-au putut instala dependintele npm!
        pause
        exit /b 1
    )
) else (
    echo node_modules deja exista - skip
)
cd ..

:: Seed database if not exists
echo.
if not exist backend\football_risk.db (
    echo [3/5] Populare baza de date SQLite...
    cd backend
    python -m scripts.seed_db
    if errorlevel 1 (
        echo [EROARE] Seed database a esuat!
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [3/5] Baza de date deja exista - skip
)

:: Train models if not exist
echo.
if not exist backend\app\ml\saved_models\best_model.joblib (
    echo [4/5] Antrenare modele ML (4 algoritmi) - poate dura 1-2 minute...
    cd backend
    python -m scripts.train_models
    if errorlevel 1 (
        echo [EROARE] Antrenarea modelelor a esuat!
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [4/5] Modele deja antrenate - skip
)

:: Start servers
echo.
echo ====================================================
echo [5/5] Pornire servere...
echo.
echo   Backend API:  http://localhost:8080
echo   Frontend:     http://localhost:5173
echo.
echo   Deschide browserul la: http://localhost:5173
echo ====================================================
echo.

:: Start backend in new window
cd backend
start "FootballRisk Backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload"
cd ..

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
cd frontend
start "FootballRisk Frontend" cmd /k "npm run dev"
cd ..

echo.
echo Ambele servere au fost pornite in ferestre separate.
echo Asteapta 5-10 secunde apoi deschide: http://localhost:5173
echo.
pause
