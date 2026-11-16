@echo off
setlocal

:: Get the current folder path without the trailing backslash
set "CURRENT_DIR=%~dp0"
set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

:: Configuration variables
set "ExtensionName=IconFastFit"
set "PASSWORD=123"
set "CERT_FILE=%CURRENT_DIR%\selfsigned.p12"
set "OUTPUT_ZXP=%CURRENT_DIR%\%ExtensionName%.zxp"


echo Generating self-signed certificate...
zxpsigncmd -selfSignedCert US "New York" "AmrSubZero" "%ExtensionName%" "%PASSWORD%" "%CERT_FILE%"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate certificate. Make sure zxpsigncmd is in your system PATH.
    pause
    exit /b %errorlevel%
)

echo Signing extension...
zxpsigncmd -sign "%CURRENT_DIR%" "%OUTPUT_ZXP%" "%CERT_FILE%" "%PASSWORD%"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to sign the ZXP package.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Created: "%OUTPUT_ZXP%"
pause