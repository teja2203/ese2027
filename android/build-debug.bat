@echo off
echo ============================================================
echo ESE2027 Android Debug Build Script
echo ============================================================
echo.
echo This script will:
echo 1. Stop all Gradle daemons
echo 2. Clean build artifacts
echo 3. Build Debug APK with optimized memory settings
echo.
echo System: 8GB RAM
echo Gradle Memory: 1536MB (down from 2048MB)
echo Parallel builds: DISABLED
echo ============================================================
echo.

cd /d "%~dp0"

echo [Step 1/3] Stopping Gradle daemons...
call gradlew.bat --stop
if %ERRORLEVEL% NEQ 0 (
    echo Warning: Failed to stop Gradle daemons, continuing anyway...
)
echo.

echo [Step 2/3] Cleaning build artifacts...
call gradlew.bat clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Clean failed!
    pause
    exit /b 1
)
echo.

echo [Step 3/3] Building Debug APK...
echo This may take 15-30 minutes on an 8GB system...
call gradlew.bat assembleDebug --stacktrace
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo BUILD FAILED!
    echo ============================================================
    echo.
    echo Check for new crash logs in:
    echo %CD%\hs_err_pid*.log
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo BUILD SUCCESSFUL!
echo ============================================================
echo.
echo Debug APK location:
dir /b /s app\build\outputs\apk\debug\*.apk
echo.
pause
