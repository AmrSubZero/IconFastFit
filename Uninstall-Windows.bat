@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "DEST=%APPDATA%\Adobe\CEP\extensions\IconFastFit"
set "PF86=%ProgramFiles(x86)%"
"%SYSTEMROOT%\System32\fltmc.exe" >nul 2>&1
if errorlevel 1 (
  echo Requesting administrator permission to remove the Photoshop Scripts-menu command...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if exist "%DEST%" rmdir /s /q "%DEST%"
for /d %%P in ("%ProgramFiles%\Adobe\Adobe Photoshop*") do (
  if exist "%%~fP\Presets\Scripts\Icon Fast Fit.jsx" del /q "%%~fP\Presets\Scripts\Icon Fast Fit.jsx"
)
if not "%PF86%"=="" (
  for /d %%P in ("%PF86%\Adobe\Adobe Photoshop*") do (
    if exist "%%~fP\Presets\Scripts\Icon Fast Fit.jsx" del /q "%%~fP\Presets\Scripts\Icon Fast Fit.jsx"
  )
)
echo Icon Fast Fit CEP panel and global script were removed.
echo Photoshop's keyboard shortcut set is not modified; remove its shortcut manually if desired.
pause
