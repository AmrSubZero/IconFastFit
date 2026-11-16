@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "PACKAGE_ROOT=%~dp0"
set "INSTALLER=%PACKAGE_ROOT%Install-CEP.ps1"
set "LOG=%TEMP%\IconFastFit-install.log"

cls
echo.
echo  ICON FAST FIT - WINDOWS INSTALLER 1.1.3
echo  -------------------------------------
echo.

echo Checking the extracted package...
if not exist "%PACKAGE_ROOT%CSXS\manifest.xml" (
    echo ERROR: CSXS\manifest.xml was not found.
    echo Extract the complete ZIP, then run Install-Windows.bat from the IconFastFit folder.
    pause
    exit /b 2
)
if not exist "%PACKAGE_ROOT%index.html" (
    echo ERROR: index.html was not found. The extracted package is incomplete.
    pause
    exit /b 2
)
if not exist "%INSTALLER%" (
    echo ERROR: Install-CEP.ps1 was not found.
    pause
    exit /b 2
)

echo.
echo Installing the CEP panel...
echo The installer will first try your Windows user profile.
echo If Windows blocks that location, it will request administrator permission
necho and try Adobe's machine-wide CEP extension folders instead.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%INSTALLER%"
if errorlevel 1 (
    echo.
    echo ERROR: Icon Fast Fit could not be installed.
    echo Check the diagnostic log:
    echo "%LOG%"
    echo.
    pause
    exit /b 3
)

echo.
echo Installing the global Photoshop Scripts-menu command...
echo Windows may request administrator permission for this separate step.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PACKAGE_ROOT%Install-Global-Shortcut.ps1"
if errorlevel 1 (
    echo.
    echo WARNING: The CEP panel is installed, but the global shortcut script was not copied.
    echo You can retry later by running Install-Global-Shortcut.ps1.
)

echo.
echo INSTALLATION FINISHED
echo.
echo 1. Restart Photoshop.
echo 2. Open Window ^> Extensions (Legacy) ^> Icon Fast Fit.
echo 3. Assign a shortcut under Edit ^> Keyboard Shortcuts ^> Application Menus ^> File ^> Scripts.
echo.
echo Diagnostic log: "%LOG%"
echo.
pause
exit /b 0
