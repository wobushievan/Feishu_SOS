@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo Traffic Fine Deduction Runner (Windows)
echo Working directory: %cd%
echo ========================================
echo.

set "PYTHON_CMD="
where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=py -3"
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=python"
    )
)

if not defined PYTHON_CMD (
    echo Python 3 is not installed or not added to PATH.
    echo Please install Python 3 first, then run this file again.
    echo.
    pause
    exit /b 1
)

echo Using: %PYTHON_CMD%
echo.
call %PYTHON_CMD% traffic_fine_deduction.py
set "EXIT_CODE=%errorlevel%"

echo.
if "%EXIT_CODE%"=="0" (
    echo Done. Please check the generated Excel output in this folder.
) else (
    echo Run failed with exit code %EXIT_CODE%.
)

echo.
pause
exit /b %EXIT_CODE%
