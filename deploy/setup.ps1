#Requires -Version 5.1
<#
.SYNOPSIS
    AGV Configuration Server - Interactive Setup / Configuration Wizard (Windows)

.DESCRIPTION
    Configures the Server by writing appsettings.Production.json,
    then optionally installs and starts the StiAgvConfig.Server Windows Service.

    Automatically copies deployment files to C:\StiAgvConfig (or custom -InstallDir).
    If StiAgvConfig.Server is running, it will be stopped before copy and restarted after.

    Run as Administrator.

.PARAMETER InstallDir
    Target installation directory. Default: C:\StiAgvConfig
#>

param(
    [string]$InstallDir = 'C:\StiAgvConfig'
)

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'AGV Configuration Setup'

# --- Helper functions ---------------------------------------------------------
function Write-Banner {
    Write-Host ''
    Write-Host '================================================================' -ForegroundColor Cyan
    Write-Host '|    AGV Configuration - Setup and Configuration    |' -ForegroundColor Cyan
    Write-Host '================================================================' -ForegroundColor Cyan
    Write-Host ''
}

function Read-Input {
    param(
        [string]$Prompt,
        [string]$Default = '',
        [switch]$IsPassword
    )
    $display = if ($Default) { "$Prompt [$Default]" } else { $Prompt }
    Write-Host "  $display : " -NoNewline -ForegroundColor White
    if ($IsPassword) {
        $secure = Read-Host -AsSecureString
        $plain  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
        if ([string]::IsNullOrWhiteSpace($plain)) { return $Default }
        return $plain
    }
    $val = Read-Host
    if ([string]::IsNullOrWhiteSpace($val)) { return $Default }
    return $val.Trim()
}

function Read-YesNo {
    param([string]$Prompt, [bool]$Default = $true)
    $hint = if ($Default) { 'Y/n' } else { 'y/N' }
    Write-Host "  $Prompt [$hint] : " -NoNewline -ForegroundColor White
    $val = Read-Host
    if ([string]::IsNullOrWhiteSpace($val)) { return $Default }
    return $val -match '^[Yy]'
}

function Write-Section {
    param([string]$Title)
    Write-Host ''
    $line = '-- ' + $Title + ' ' + ('-' * [math]::Max(0, 55 - $Title.Length))
    Write-Host $line -ForegroundColor DarkCyan
}

function Write-OK   { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  [!!] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "  [XX] $Msg" -ForegroundColor Red }

function Get-PrimaryIPv4 {
    try {
        $defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
            Sort-Object RouteMetric |
            Select-Object -First 1
        if ($defaultRoute) {
            $ip = Get-NetIPAddress -InterfaceIndex $defaultRoute.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.IPAddress -and
                    $_.IPAddress -notlike '169.254.*' -and
                    $_.IPAddress -ne '127.0.0.1'
                } |
                Select-Object -ExpandProperty IPAddress -First 1
            if ($ip) { return $ip }
        }
    } catch { }

    try {
        $fallbackIp = [System.Net.Dns]::GetHostAddresses($env:COMPUTERNAME) |
            Where-Object {
                $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                $_.IPAddressToString -ne '127.0.0.1' -and
                $_.IPAddressToString -notlike '169.254.*'
            } |
            Select-Object -ExpandProperty IPAddressToString -First 1
        if ($fallbackIp) { return $fallbackIp }
    } catch { }

    return '127.0.0.1'
}

function Test-PortAvailable {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

function Test-WebApiBaseUrlValue {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    if ($Value -eq 'auto') {
        return $true
    }

    try {
        $uri = [System.Uri]::new($Value)
        return $uri.IsAbsoluteUri -and ($uri.Scheme -in @('http', 'https'))
    } catch {
        return $false
    }
}

# --- Check Administrator privileges -------------------------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
             [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err 'This script must be run as Administrator.'
    Write-Host "  Right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    exit 1
}

# --- Stop existing service if running -----------------------------------------
$svcName = 'StiAgvConfig.Server'
$existingSvc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
if ($existingSvc -and $existingSvc.Status -eq 'Running') {
    Write-Host "  Stopping $svcName service before reconfiguration..." -ForegroundColor Yellow
    Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-OK "$svcName stopped."
}

# --- Deploy to install directory ----------------------------------------------
$SourceDir       = $PSScriptRoot
$resolvedSource  = (Resolve-Path $SourceDir).Path.TrimEnd('\')
$resolvedInstall = $InstallDir.TrimEnd('\')

# --- Pre-read installed web config before robocopy overwrites it --------------
$preExistingWebCfg = @{}
$preWebConfigPath  = Join-Path $resolvedInstall 'server\wwwroot\config.json'
if (($resolvedSource -ne $resolvedInstall) -and (Test-Path $preWebConfigPath)) {
    try {
        $preExistingWebCfgJson = Get-Content $preWebConfigPath -Raw | ConvertFrom-Json
        $preExistingWebCfg = @{
            ApiBaseUrl = if ($preExistingWebCfgJson.API_BASE_URL) { $preExistingWebCfgJson.API_BASE_URL } else { $null }
            AppName    = if ($preExistingWebCfgJson.APP_NAME) { $preExistingWebCfgJson.APP_NAME } else { $null }
        }
    } catch { }
}

if ($resolvedSource -ne $resolvedInstall) {
    Write-Host ''
    Write-Host "  Deploying package to $InstallDir ..." -ForegroundColor Yellow
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Force $InstallDir | Out-Null
    }
    robocopy $resolvedSource $resolvedInstall /E /IS /IT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
        Write-Err 'Copy failed. Check folder permissions.'
        exit 1
    }
    Write-OK "Package deployed to $InstallDir"
}

$SetupDir    = $InstallDir
$ServerDir   = Join-Path $SetupDir 'server'
$AppSettings = Join-Path $ServerDir 'appsettings.Production.json'
$WebConfig   = Join-Path $ServerDir 'wwwroot\config.json'
$Executable  = Join-Path $ServerDir 'Server.Api.exe'

if (-not (Test-Path $ServerDir)) {
    Write-Err "Cannot find 'server' folder at: $ServerDir"
    Write-Host '  Make sure the dist package contains a server/ subfolder.' -ForegroundColor Yellow
    exit 1
}

Write-Banner
Write-Host "  Install Dir : $InstallDir" -ForegroundColor Gray

# --- Load existing Production overrides (if any) -----------------------------
$cfg = @{}
if (Test-Path $AppSettings) {
    try {
        $existing = Get-Content $AppSettings -Raw | ConvertFrom-Json
        $cfg = @{
            ApiPort      = $existing.Urls -replace 'http://\*:', ''
            DbConn       = $existing.ConnectionStrings.DefaultConnection
            JwtKey       = $existing.Jwt.SigningKey
            AdminUser    = if ($existing.SeedData) { $existing.SeedData.AdminUsername }    else { $null }
            AdminPwd     = if ($existing.SeedData) { $existing.SeedData.AdminPassword }    else { $null }
            TechUser     = if ($existing.SeedData) { $existing.SeedData.TechnicianUsername } else { $null }
            TechPwd      = if ($existing.SeedData) { $existing.SeedData.TechnicianPassword } else { $null }
        }
    } catch {
        Write-Warn 'Could not parse existing appsettings.Production.json - will use defaults.'
    }
}

$webCfgExisting = @{}
if (Test-Path $WebConfig) {
    try {
        $existingWebCfg = Get-Content $WebConfig -Raw | ConvertFrom-Json
        $webCfgExisting = @{
            ApiBaseUrl = if ($existingWebCfg.API_BASE_URL) { $existingWebCfg.API_BASE_URL } else { $null }
            AppName    = if ($existingWebCfg.APP_NAME) { $existingWebCfg.APP_NAME } else { $null }
        }
    } catch {
        Write-Warn 'Could not parse existing web config.json - will use defaults.'
    }
}

# Prefer pre-robocopy values if available
if ($preExistingWebCfg.ApiBaseUrl) { $webCfgExisting.ApiBaseUrl = $preExistingWebCfg.ApiBaseUrl }
if ($preExistingWebCfg.AppName)   { $webCfgExisting.AppName    = $preExistingWebCfg.AppName }

# --- Defaults ----------------------------------------------------------------
$def_port       = if ($cfg.ApiPort)     { $cfg.ApiPort }     else { '5000' }
$def_dbconn     = if ($cfg.DbConn)      { $cfg.DbConn }      else { 'Server=127.0.0.1;Database=STI_TRANSPORT_34;User Id=sti;Password=66668888;TrustServerCertificate=True' }
$def_jwtkey     = if ($cfg.JwtKey)      { $cfg.JwtKey }      else { "StiAgvConfig.SigningKey.$(Get-Random -Maximum 99999).ReplaceInProduction" }
$def_adminuser  = if ($cfg.AdminUser)   { $cfg.AdminUser }   else { 'admin' }
$def_adminpwd   = if ($cfg.AdminPwd)    { $cfg.AdminPwd }    else { '09052016' }
$def_techuser   = if ($cfg.TechUser)    { $cfg.TechUser }    else { 'technician' }
$def_techpwd    = if ($cfg.TechPwd)     { $cfg.TechPwd }     else { '09052016' }
$def_webapi     = if ($webCfgExisting.ApiBaseUrl) { $webCfgExisting.ApiBaseUrl } else { 'auto' }
$def_webappname = if ($webCfgExisting.AppName)    { $webCfgExisting.AppName }    else { 'STI Agv Configuration' }
$hostIp         = Get-PrimaryIPv4

# --- Interactive prompts -----------------------------------------------------
Write-Section 'Server Settings'
Write-Host '  (Press Enter to keep current/default value)'
Write-Host ''

# API Port
do {
    $apiPort   = Read-Input 'API Server Port' $def_port
    $portInUse = $false
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, [int]$apiPort)
        $listener.Start()
        $listener.Stop()
    } catch {
        $proc = Get-NetTCPConnection -LocalPort ([int]$apiPort) -ErrorAction SilentlyContinue | Select-Object -First 1
        $procName = ''
        if ($proc) {
            $procName = (Get-Process -Id $proc.OwningProcess -ErrorAction SilentlyContinue).ProcessName
        }
        if ($procName -eq 'Server.Api') {
            Write-Warn "Port $apiPort is used by StiAgvConfig.Server (will be restarted). OK."
        } else {
            $portInUse = $true
            $ownerInfo = if ($procName) { " (used by: $procName)" } else { '' }
            Write-Err "Port $apiPort is already in use$ownerInfo. Please choose a different port."
        }
    }
} while ($portInUse)

# SQL Connection String (with connectivity test)
do {
    $dbConn = Read-Input 'SQL Server Connection String' $def_dbconn
    $sqlOk  = $false
    Write-Host '         Testing SQL Server connection...' -ForegroundColor Gray -NoNewline
    try {
        $testConn = $dbConn -replace 'Database=[^;]*;?', 'Database=master;'
        if ($testConn -notmatch 'Connect Timeout|Connection Timeout') {
            $testConn = $testConn.TrimEnd(';') + ';Connection Timeout=5;'
        }
        $conn = New-Object System.Data.SqlClient.SqlConnection($testConn)
        $conn.Open()
        $conn.Close()
        $conn.Dispose()
        Write-Host ''
        Write-OK 'SQL Server connection successful.'
        $sqlOk = $true
    } catch {
        Write-Host ''
        $errMsg = if ($_.Exception.InnerException) { $_.Exception.InnerException.Message } else { $_.Exception.Message }
        Write-Err "Cannot connect to SQL Server: $errMsg"
        Write-Warn 'Ensure SQL Server is running and credentials are correct.'
        Write-Host ''
    }
} while (-not $sqlOk)

Write-Host ''
$changeJwt = Read-YesNo 'Change JWT signing key (recommended for production)?' $false
$jwtKey    = $def_jwtkey
if ($changeJwt) {
    $jwtKey = Read-Input 'JWT Signing Key (min 32 chars)' $def_jwtkey -IsPassword
}

Write-Section 'Seed Accounts'
Write-Host '  Default login accounts created on first startup.'
Write-Host ''
$adminUser = Read-Input 'Admin Username'  $def_adminuser
$adminPwd  = Read-Input 'Admin Password'  $def_adminpwd  -IsPassword
$techUser  = Read-Input 'Technician Username' $def_techuser
$techPwd   = Read-Input 'Technician Password' $def_techpwd -IsPassword

Write-Section 'Web Client'
Write-Host "  Use 'auto' to serve API from the same origin as the web app."
do {
    $webApiBaseUrl = Read-Input 'Web API Base URL (auto|http://host:port)' $def_webapi
    $isWebApiBaseUrlValid = Test-WebApiBaseUrlValue $webApiBaseUrl
    if (-not $isWebApiBaseUrlValid) {
        Write-Err "Invalid value '$webApiBaseUrl'. Enter 'auto' or an absolute http/https URL."
    }
} while (-not $isWebApiBaseUrlValid)
$webAppName = Read-Input 'Web App Name' $def_webappname

# --- Build appsettings.Production.json ----------------------------------------
Write-Section 'Writing Configuration'

$production = [ordered]@{
    Urls = "http://*:$apiPort"
    ConnectionStrings = [ordered]@{
        DefaultConnection = $dbConn
    }
    Jwt = [ordered]@{
        Issuer            = 'StiAgvConfig.Server'
        Audience          = 'StiAgvConfig.Web'
        SigningKey        = $jwtKey
        ExpirationMinutes = 480
    }
    Cors = [ordered]@{
        AllowedOrigins = @()
    }
    SeedData = [ordered]@{
        AdminUsername       = $adminUser
        AdminPassword       = $adminPwd
        AdminFullName       = 'System Administrator'
        TechnicianUsername  = $techUser
        TechnicianPassword  = $techPwd
        TechnicianFullName  = 'Maintenance Technician'
    }
    AllowedHosts = '*'
}

$productionJson = $production | ConvertTo-Json -Depth 10
Set-Content -Path $AppSettings -Value $productionJson -Encoding UTF8
Write-OK "Written: $AppSettings"

if (Test-Path $WebConfig) {
    $webCfg = @{
        API_BASE_URL = $webApiBaseUrl
        APP_NAME     = $webAppName
    }

    $webConfigJson = $webCfg | ConvertTo-Json -Depth 5
    Set-Content -Path $WebConfig -Value $webConfigJson -Encoding UTF8
    Write-OK "Written: $WebConfig"
}

# --- Windows Service management -----------------------------------------------
Write-Section 'Windows Service'

$existingService = Get-Service -Name $svcName -ErrorAction SilentlyContinue

if ($null -eq $existingService) {
    $installService = Read-YesNo "Install '$svcName' as a Windows Service?" $true
    if ($installService) {
        if (-not (Test-Path $Executable)) {
            Write-Err "Executable not found: $Executable"
            Write-Warn 'Run build.ps1 first to generate the package.'
        } else {
            sc.exe create $svcName binPath= "`"$Executable`"" start= auto DisplayName= 'AGV Configuration Server' | Out-Null
            sc.exe description $svcName 'STI AGV system processes configuration manager service' | Out-Null
            Write-OK "Service '$svcName' installed (auto-start)."
        }
    }
} else {
    Write-OK "Service '$svcName' already exists (Status: $($existingService.Status))."

    # Always update binPath on existing service
    sc.exe config $svcName binPath= "`"$Executable`"" | Out-Null
    Write-OK "Updated service binPath to $Executable"

    if ($existingService.Status -eq 'Running') {
        $restart = Read-YesNo 'Restart service to apply new configuration?' $true
        if ($restart) {
            Write-Host '  Stopping service...'
            Stop-Service -Name $svcName -Force
            Start-Sleep -Seconds 3
            Write-Host '  Starting service...'
            Start-Service -Name $svcName
            Write-OK 'Service restarted.'
        }
    }
}

$svcAfterSetup = Get-Service -Name $svcName -ErrorAction SilentlyContinue
if ($null -ne $svcAfterSetup) {
    sc.exe config $svcName start= auto | Out-Null
    Write-OK "Service '$svcName' startup mode set to Automatic."
}

# Start if not running and service exists
$svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
if ($null -ne $svc -and $svc.Status -ne 'Running') {
    $startNow = Read-YesNo "Start '$svcName' service now?" $true
    if ($startNow) {
        Start-Service -Name $svcName
        Start-Sleep -Seconds 2
        $svc.Refresh()
        if ($svc.Status -eq 'Running') {
            Write-OK 'Service is running.'
        } else {
            Write-Warn "Service status: $($svc.Status). Check Event Viewer for details."
        }
    }
}

# --- Summary ------------------------------------------------------------------
Write-Section 'Setup Complete'
Write-Host ''
Write-Host "  Server URL    : http://${hostIp}:$apiPort" -ForegroundColor Cyan
Write-Host "  Web UI        : http://${hostIp}:$apiPort" -ForegroundColor Cyan
Write-Host "  Web API base  : $webApiBaseUrl"            -ForegroundColor Gray
Write-Host "  Config file   : $AppSettings"              -ForegroundColor Gray
Write-Host ''
Write-Host '  To manage the service:' -ForegroundColor DarkGray
Write-Host "    Start-Service   $svcName" -ForegroundColor DarkGray
Write-Host "    Stop-Service    $svcName" -ForegroundColor DarkGray
Write-Host "    Restart-Service $svcName" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  To view service logs:' -ForegroundColor DarkGray
Write-Host "    Get-EventLog -LogName Application -Source $svcName -Newest 20" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  To run manually (without Service):' -ForegroundColor DarkGray
Write-Host "    `$env:ASPNETCORE_ENVIRONMENT = 'Production'" -ForegroundColor DarkGray
Write-Host "    & `"$Executable`"" -ForegroundColor DarkGray
Write-Host ''
