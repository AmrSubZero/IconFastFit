$ErrorActionPreference = 'Stop'

$scriptSource = Join-Path $PSScriptRoot 'global\Icon Fast Fit.jsx'
if (-not (Test-Path -LiteralPath $scriptSource -PathType Leaf)) {
    Write-Host "Global command not found: $scriptSource" -ForegroundColor Red
    exit 2
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdministrator) {
    Write-Host 'Requesting administrator permission to copy the Photoshop Scripts-menu command...'
    try {
        $powershellExe = Join-Path $PSHOME 'powershell.exe'
        $argumentLine = '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $PSCommandPath
        $process = Start-Process -FilePath $powershellExe -ArgumentList $argumentLine -Verb RunAs -Wait -PassThru
        exit $process.ExitCode
    }
    catch {
        Write-Host ('Administrator permission was not granted: ' + $_.Exception.Message) -ForegroundColor Yellow
        exit 1
    }
}

$roots = @()
if ($env:ProgramFiles) { $roots += $env:ProgramFiles }
$programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
if ($programFilesX86) { $roots += $programFilesX86 }
$roots = $roots | Select-Object -Unique

$photoshopFolders = @()
foreach ($root in $roots) {
    $adobeFolder = Join-Path $root 'Adobe'
    if (Test-Path -LiteralPath $adobeFolder -PathType Container) {
        $photoshopFolders += Get-ChildItem -LiteralPath $adobeFolder -Directory -Filter 'Adobe Photoshop*' -ErrorAction SilentlyContinue
    }
}

$installedCount = 0
foreach ($photoshop in ($photoshopFolders | Sort-Object -Property FullName -Unique)) {
    $scriptsFolder = Join-Path $photoshop.FullName 'Presets\Scripts'
    if (Test-Path -LiteralPath $scriptsFolder -PathType Container) {
        $destination = Join-Path $scriptsFolder 'Icon Fast Fit.jsx'
        try {
            Copy-Item -LiteralPath $scriptSource -Destination $destination -Force -ErrorAction Stop
            Write-Host "Installed global command: $destination" -ForegroundColor Green
            $installedCount++
        }
        catch {
            Write-Host ("Could not copy to $scriptsFolder : " + $_.Exception.Message) -ForegroundColor Red
        }
    }
}

if ($installedCount -eq 0) {
    Write-Host 'No standard Photoshop Presets\Scripts folder was detected.' -ForegroundColor Yellow
    Write-Host 'Copy this file manually:'
    Write-Host $scriptSource
    Write-Host 'Into [Photoshop installation]\Presets\Scripts\'
    exit 1
}

Write-Host "Global command installed in $installedCount Photoshop installation(s)." -ForegroundColor Green
exit 0
