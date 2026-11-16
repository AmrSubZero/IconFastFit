param(
    [switch]$MachineWide
)

$ErrorActionPreference = 'Stop'
$sourceRoot = $PSScriptRoot
$logPath = Join-Path $env:TEMP 'IconFastFit-install.log'

function Write-InstallLog {
    param([string]$Message)
    $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
    Write-Host $Message
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Copy-IconFastFitExtension {
    param(
        [Parameter(Mandatory = $true)][string]$ExtensionsFolder,
        [Parameter(Mandatory = $true)][string]$InstallScope
    )

    # CreateDirectory handles every missing parent folder and throws the real
    # Windows exception if this location is blocked by permissions or policy.
    [System.IO.Directory]::CreateDirectory($ExtensionsFolder) | Out-Null
    if (-not [System.IO.Directory]::Exists($ExtensionsFolder)) {
        throw "Windows did not create or expose the target directory: $ExtensionsFolder"
    }

    # Verify write access explicitly instead of relying on CMD's NUL directory test.
    $probe = Join-Path $ExtensionsFolder ('.IconFastFit-write-test-' + [Guid]::NewGuid().ToString('N'))
    [System.IO.File]::WriteAllText($probe, 'Icon Fast Fit write test')
    [System.IO.File]::Delete($probe)

    $target = Join-Path $ExtensionsFolder 'IconFastFit'
    $staging = Join-Path $ExtensionsFolder ('.IconFastFit-installing-' + [Guid]::NewGuid().ToString('N'))
    $backup = Join-Path $ExtensionsFolder ('.IconFastFit-backup-' + [Guid]::NewGuid().ToString('N'))

    try {
        [System.IO.Directory]::CreateDirectory($staging) | Out-Null

        foreach ($folderName in @('CSXS', 'icons', 'host', 'js')) {
            $sourceFolder = Join-Path $sourceRoot $folderName
            if (-not (Test-Path -LiteralPath $sourceFolder -PathType Container)) {
                throw "Required package folder is missing: $sourceFolder"
            }

            $destinationFolder = Join-Path $staging $folderName
            [System.IO.Directory]::CreateDirectory($destinationFolder) | Out-Null
            Get-ChildItem -LiteralPath $sourceFolder -Force | ForEach-Object {
                Copy-Item -LiteralPath $_.FullName -Destination $destinationFolder -Recurse -Force -ErrorAction Stop
            }
        }

        foreach ($fileName in @('index.html', 'styles.css')) {
            $sourceFile = Join-Path $sourceRoot $fileName
            if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
                throw "Required package file is missing: $sourceFile"
            }
            Copy-Item -LiteralPath $sourceFile -Destination (Join-Path $staging $fileName) -Force -ErrorAction Stop
        }

        $stagedManifest = Join-Path $staging 'CSXS\manifest.xml'
        if (-not (Test-Path -LiteralPath $stagedManifest -PathType Leaf)) {
            throw 'The CEP manifest was not copied into the staging folder.'
        }

        # Replace an existing installation only after the new copy is verified.
        if ([System.IO.Directory]::Exists($target)) {
            [System.IO.Directory]::Move($target, $backup)
        }

        try {
            [System.IO.Directory]::Move($staging, $target)
        }
        catch {
            if ([System.IO.Directory]::Exists($backup) -and -not [System.IO.Directory]::Exists($target)) {
                [System.IO.Directory]::Move($backup, $target)
            }
            throw
        }

        if ([System.IO.Directory]::Exists($backup)) {
            Remove-Item -LiteralPath $backup -Recurse -Force -ErrorAction SilentlyContinue
        }

        $installedManifest = Join-Path $target 'CSXS\manifest.xml'
        if (-not (Test-Path -LiteralPath $installedManifest -PathType Leaf)) {
            throw "Installation verification failed. Manifest not found: $installedManifest"
        }

        Write-InstallLog "SUCCESS: CEP extension installed ($InstallScope): $target"
        return $target
    }
    finally {
        if ([System.IO.Directory]::Exists($staging)) {
            Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'CSXS\manifest.xml') -PathType Leaf)) {
        throw 'CSXS\manifest.xml is missing. Extract the entire ZIP and run Install-Windows.bat from the IconFastFit folder.'
    }

    if ($MachineWide) {
        Add-Content -LiteralPath $logPath -Value "`r`n--- Administrator-assisted machine-wide installation ---" -Encoding UTF8
    }
    else {
        Set-Content -LiteralPath $logPath -Value "Icon Fast Fit 1.1.3 installation log" -Encoding UTF8
    }

    if ($MachineWide) {
        if (-not (Test-IsAdministrator)) {
            throw 'The machine-wide installation was started without administrator privileges.'
        }

        Write-InstallLog 'Trying machine-wide CEP installation because the per-user AppData location was unavailable.'
        $commonRoots = @()
        $commonX86 = [Environment]::GetEnvironmentVariable('CommonProgramFiles(x86)')
        $common64 = [Environment]::GetEnvironmentVariable('CommonProgramFiles')
        if ($commonX86) { $commonRoots += (Join-Path $commonX86 'Adobe\CEP\extensions') }
        if ($common64) { $commonRoots += (Join-Path $common64 'Adobe\CEP\extensions') }
        $commonRoots = $commonRoots | Select-Object -Unique

        $installed = $false
        $lastError = $null
        foreach ($candidate in $commonRoots) {
            try {
                $destination = Copy-IconFastFitExtension -ExtensionsFolder $candidate -InstallScope 'machine-wide'
                $installed = $true
                break
            }
            catch {
                $lastError = $_
                Write-InstallLog "Could not use machine-wide destination '$candidate': $($_.Exception.Message)"
            }
        }

        if (-not $installed) {
            if ($lastError) { throw "Machine-wide installation failed. $($lastError.Exception.Message)" }
            throw 'Windows did not provide a standard Common Files folder for the machine-wide CEP installation.'
        }
    }
    else {
        $appData = [Environment]::GetFolderPath([Environment+SpecialFolder]::ApplicationData)
        if ([string]::IsNullOrWhiteSpace($appData)) {
            throw 'Windows did not return the current user ApplicationData folder.'
        }

        $userDestination = Join-Path $appData 'Adobe\CEP\extensions'
        Write-InstallLog "Attempting per-user CEP installation: $userDestination"
        try {
            $null = Copy-IconFastFitExtension -ExtensionsFolder $userDestination -InstallScope 'per-user'
        }
        catch {
            $userError = $_.Exception.Message
            Write-InstallLog "Per-user installation failed: $userError"
            Write-InstallLog 'Requesting administrator permission to try the standard machine-wide CEP folders.'

            try {
                $powershellExe = Join-Path $PSHOME 'powershell.exe'
                $argumentLine = '-NoLogo -NoProfile -ExecutionPolicy Bypass -File "{0}" -MachineWide' -f $PSCommandPath
                $elevated = Start-Process -FilePath $powershellExe -ArgumentList $argumentLine -Verb RunAs -Wait -PassThru
                if ($elevated.ExitCode -ne 0) {
                    throw "Elevated installer returned exit code $($elevated.ExitCode)."
                }
            }
            catch {
                throw "Per-user installation failed: $userError. The administrator-assisted fallback was not completed: $($_.Exception.Message)"
            }
        }
    }

    # Enable loading of manually installed unsigned CEP panels for supported runtimes.
    foreach ($runtimeVersion in 9..14) {
        $registryPath = "HKCU:\Software\Adobe\CSXS.$runtimeVersion"
        New-Item -Path $registryPath -Force | Out-Null
        New-ItemProperty -Path $registryPath -Name 'PlayerDebugMode' -PropertyType String -Value '1' -Force | Out-Null
    }

    Write-InstallLog 'SUCCESS: CEP installation and runtime configuration completed.'
    exit 0
}
catch {
    $message = $_.Exception.Message
    try { Write-InstallLog "FATAL ERROR: $message" } catch {}
    Write-Host ''
    Write-Host 'ICON FAST FIT INSTALLATION FAILED' -ForegroundColor Red
    Write-Host $message -ForegroundColor Red
    Write-Host "Diagnostic log: $logPath" -ForegroundColor Yellow
    exit 1
}
