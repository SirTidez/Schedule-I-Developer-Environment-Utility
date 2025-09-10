@echo off
REM Schedule I Developer Environment Utility - Manual Release Packaging
REM This batch file allows manual packaging of published files

echo === Schedule I Developer Environment Utility - Manual Packaging ===
echo.

REM Check if PowerShell is available
powershell.exe -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is not available
    pause
    exit /b 1
)

REM Run the PowerShell packaging script
echo Running packaging script...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0Package-Release.ps1" -Configuration "Release" -RuntimeIdentifier "win-x64"

if %errorlevel% equ 0 (
    echo.
    echo === Packaging completed successfully! ===
) else (
    echo.
    echo === Packaging completed with warnings/errors ===
)

echo.
pause

