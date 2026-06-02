<#
.SYNOPSIS
    Build and package AGV Configuration (Backend + Frontend) into a single distributable folder.

.DESCRIPTION
    1. Builds the React frontend (Web.React) with npm.
    2. Publishes the .NET backend (Server.Api) in Release mode.
    3. Copies the frontend build output into server/wwwroot/ (served as SPA by .NET).
    4. Copies deploy.ps1, setup.ps1, and GUIDE.md into the output folder.

    Run from the repository root or directly from the deploy/ folder.

.PARAMETER OutputDir
    Path for the packaged output. Default: dist

.PARAMETER Configuration
    .NET build configuration. Default: Release

.PARAMETER SelfContained
    Publish as a self-contained executable (no .NET runtime required on target).

.PARAMETER Runtime
    RID (Runtime Identifier) when publishing self-contained.
    e.g. win-x64, linux-x64

.EXAMPLE
    # Framework-dependent publish (requires .NET 10 on target machine)
    .\deploy\build.ps1

.EXAMPLE
    # Self-contained for Windows 64-bit
    .\deploy\build.ps1 -SelfContained -Runtime win-x64
#>

param(
    [string]$OutputDir     = 'dist-sti-agv-config',
    [string]$Configuration = 'Release',
    [switch]$SelfContained,
    [string]$Runtime       = 'win-x64'
)

$ErrorActionPreference = 'Stop'

# --- Resolve paths ------------------------------------------------------------
$ScriptDir    = $PSScriptRoot                           # deploy/
$RepoRoot     = $ScriptDir | Split-Path -Parent         # repository root
$FrontendPath = Join-Path $RepoRoot 'src\Web.React'
$BackendPath  = Join-Path $RepoRoot 'src\Server.Api'
$OutPath      = if ([System.IO.Path]::IsPathRooted($OutputDir)) { $OutputDir } else { Join-Path $RepoRoot $OutputDir }
$ServerOut    = Join-Path $OutPath 'server'
$WebDest      = Join-Path $ServerOut 'wwwroot'

Write-Host ''
Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '|    STI Agv System Config - Build and Package Script  |' -ForegroundColor Cyan
Write-Host '========================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "  Repo        : $RepoRoot"
Write-Host "  Output      : $OutPath"
Write-Host "  Config      : $Configuration"
if ($SelfContained) {
    Write-Host "  Mode        : Self-contained ($Runtime)"
} else {
    Write-Host '  Mode        : Framework-dependent'
}
Write-Host ''

# --- Step 1 : Build React frontend -------------------------------------------
Write-Host '[1/4] Building React frontend...' -ForegroundColor Yellow

Push-Location $FrontendPath
try {
    if (-not (Test-Path 'node_modules')) {
        Write-Host '      Installing npm dependencies (this may take a while)...'
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
    }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
    Write-Host '      Frontend build complete.' -ForegroundColor Green
} finally {
    Pop-Location
}

# --- Step 2 : Publish .NET backend -------------------------------------------
Write-Host ''
Write-Host '[2/4] Publishing .NET backend...' -ForegroundColor Yellow

if (Test-Path $ServerOut) { Remove-Item $ServerOut -Recurse -Force }

$publishArgs = @(
    'publish', $BackendPath,
    '-c', $Configuration,
    '-o', $ServerOut
)

if ($SelfContained) {
    $publishArgs += '--self-contained', 'true', '-r', $Runtime
} else {
    $publishArgs += '--self-contained', 'false'
}

dotnet @publishArgs
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed' }
Write-Host '      Backend publish complete.' -ForegroundColor Green

# --- Step 3 : Embed frontend into wwwroot ------------------------------------
Write-Host ''
Write-Host '[3/4] Embedding frontend into server/wwwroot...' -ForegroundColor Yellow

$FrontendBuild = Join-Path $FrontendPath 'build'
if (-not (Test-Path $FrontendBuild)) {
    throw "React build output not found at: $FrontendBuild. Ensure 'npm run build' succeeded."
}

New-Item -ItemType Directory -Force -Path $WebDest | Out-Null
Copy-Item -Path (Join-Path $FrontendBuild '*') -Destination $WebDest -Recurse -Force

Write-Host '      Frontend embedded.' -ForegroundColor Green

# --- Step 4 : Copy scripts and GUIDE -----------------------------------------
Write-Host ''
Write-Host '[4/4] Copying deployment scripts...' -ForegroundColor Yellow

foreach ($file in @('deploy.ps1', 'setup.ps1', 'GUIDE.md')) {
    $src = Join-Path $ScriptDir $file
    if (Test-Path $src) {
        Copy-Item $src -Destination $OutPath -Force
        Write-Host "      Copied $file" -ForegroundColor DarkGray
    } else {
        Write-Warning "Script not found, skipping: $src"
    }
}

Write-Host ''
Write-Host '========================================================' -ForegroundColor Green
Write-Host '|               BUILD COMPLETE!                        |' -ForegroundColor Green
Write-Host '========================================================' -ForegroundColor Green
Write-Host ''
Write-Host "  Package location : $OutPath"
Write-Host ''
Write-Host '  Dist folder structure:' -ForegroundColor Cyan
Write-Host '    dist/'
Write-Host '    |-- server/'
Write-Host '    |   |-- Server.Api.exe'
Write-Host '    |   |-- appsettings.json'
Write-Host '    |   \-- wwwroot/'
Write-Host '    |       \-- index.html  (React SPA)'
Write-Host '    |-- deploy.ps1'
Write-Host '    |-- setup.ps1'
Write-Host '    \-- GUIDE.md'
Write-Host ''
Write-Host '  Next steps:' -ForegroundColor Cyan
Write-Host ("    cd `"$OutPath`"")
Write-Host '    powershell -ExecutionPolicy Bypass -File deploy.ps1'
Write-Host ''
