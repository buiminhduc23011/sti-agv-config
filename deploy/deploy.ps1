#Requires -Version 5.1
<#
.SYNOPSIS
    STI AGV Configuration Server - Full Deployment (wraps setup.ps1)

.DESCRIPTION
    Convenience wrapper that runs setup.ps1 to configure and install
    the AGV Configuration Server as a Windows Service.

    Run as Administrator.
#>

param(
    [string]$InstallDir = 'C:\StiAgvConfig',
    [switch]$SetupOnly
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot

# --- Check Administrator privileges ------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
             [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host ''
    Write-Host '  Error: This script must be run as Administrator.' -ForegroundColor Red
    Write-Host "  Right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    exit 1
}

# --- Banner -------------------------------------------------------------------
Write-Host ''
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host '|    STI AGV Configuration Server - Deployment Script           |' -ForegroundColor Cyan
Write-Host '================================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host "  Install Dir : $InstallDir" -ForegroundColor Gray

if ($SetupOnly) {
    Write-Host '  Mode        : Setup/Configure only' -ForegroundColor Gray
} else {
    Write-Host '  Mode        : Full deploy' -ForegroundColor Gray
}
Write-Host ''

# --- Run setup ----------------------------------------------------------------
$setupScript = Join-Path $ScriptDir 'setup.ps1'
if (-not (Test-Path $setupScript)) {
    Write-Host "  [FAIL] setup.ps1 not found at: $setupScript" -ForegroundColor Red
    exit 1
}

& powershell -ExecutionPolicy Bypass -File $setupScript -InstallDir $InstallDir

if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host '  [FAIL] Setup script reported an error.' -ForegroundColor Red
    exit 1
}

# --- Final summary ------------------------------------------------------------
Write-Host ''
Write-Host '================================================================' -ForegroundColor Green
Write-Host '|           STI AGV Deployment Complete!                       |' -ForegroundColor Green
Write-Host '================================================================' -ForegroundColor Green
Write-Host ''
