# PowerShell deployment script for Coolify
# Simple git-based deployment without API complexity
# 
# Usage:
#   .\deploy-to-coolify.ps1              # Build, deploy, and trigger (default)
#   .\deploy-to-coolify.ps1 -SkipBuild   # Deploy without building (still triggers)
#   .\deploy-to-coolify.ps1 -NoTrigger   # Deploy without triggering Coolify

param(
    [switch]$SkipBuild,   # Skip the build step and just deploy existing files
    [switch]$NoTrigger,   # Skip triggering Coolify deployment (default: false - triggers by default)
    [switch]$ForceFullCopy,  # Force complete file sync (clears cache)
    [switch]$CleanCache,  # Remove deployment cache completely  
    [switch]$Help         # Show help message
)

if ($Help) {
    Write-Host "Chess App Deployment Script for Coolify" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-to-coolify.ps1              # Build, deploy, and trigger (default)"
    Write-Host "  .\deploy-to-coolify.ps1 -SkipBuild   # Deploy without building (still triggers)"
    Write-Host "  .\deploy-to-coolify.ps1 -NoTrigger   # Deploy without triggering Coolify"
    Write-Host "  .\deploy-to-coolify.ps1 -ForceFullCopy  # Force complete file sync"
    Write-Host "  .\deploy-to-coolify.ps1 -CleanCache  # Remove cache and exit"
    Write-Host ""
    Write-Host "First time setup:" -ForegroundColor Yellow
    Write-Host "  1. Push coolify-deployment folder to GitHub"
    Write-Host "  2. Create Docker Compose app in Coolify using that repo"
    Write-Host "  3. Configure webhook in GitHub to trigger on push to master"
    Write-Host "  4. Run this script to build and sync files"
    Write-Host ""
    Write-Host "Triggering Deployment:" -ForegroundColor Yellow
    Write-Host "  Default: Script triggers automatically (no flag needed)"
    Write-Host "  Option 1: Use -NoTrigger to skip automatic trigger"
    Write-Host "  Option 2: Run .\trigger-deploy.ps1 separately"
    Write-Host "  Option 3: Manually click 'Redeploy' in Coolify UI"
    Write-Host ""
    exit 0
}

# Load environment variables from .env.deploy.local if it exists
$envFile = ".env.deploy.local"
if (Test-Path $envFile) {
    Write-Host "📋 Loading configuration from $envFile" -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value.Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Configuration
$SERVER_USER = if($env:SERVER_USER) {$env:SERVER_USER} else {"rndev"}
$SERVER_HOST = if($env:SERVER_HOST) {$env:SERVER_HOST} else {"rndev.local"}
$REMOTE_BUILD_BASE = "/home/$SERVER_USER/chess-app-builds"

# Handle CleanCache flag
if ($CleanCache) {
    Write-Host "🧹 Cleaning deployment cache..." -ForegroundColor Yellow
    if (Test-Path .deploy-temp) {
        Remove-Item -Recurse -Force .deploy-temp
        Write-Host "✅ Cache cleaned successfully" -ForegroundColor Green
    } else {
        Write-Host "   No cache to clean" -ForegroundColor Gray
    }
    if (Test-Path .deploy-manifest.json) {
        Remove-Item -Force .deploy-manifest.json
        Write-Host "   Manifest removed" -ForegroundColor Gray
    }
    exit 0
}

# Force full copy if requested
if ($ForceFullCopy -and (Test-Path .deploy-manifest.json)) {
    Write-Host "🔄 Force full copy requested - clearing cache..." -ForegroundColor Yellow
    Remove-Item -Force .deploy-manifest.json
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "    Chess App Deployment to Coolify" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Phase 1: Build locally
if (-not $SkipBuild) {
    Write-Host "📦 Phase 1: Building applications locally..." -ForegroundColor Cyan
    
    # Build Next.js app
    Write-Host "   Building Next.js app..." -ForegroundColor White
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Next.js build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Build WebSocket server
    Write-Host "   Building WebSocket server..." -ForegroundColor White
    npm run build:ws
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ WebSocket server build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Build phase completed!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Skipping build phase (using existing builds)" -ForegroundColor Yellow
    Write-Host ""
}

# Phase 2: Prepare deployment files
Write-Host "📋 Phase 2: Preparing deployment files..." -ForegroundColor Cyan

# Check if builds exist
if (-not (Test-Path .next\standalone)) {
    Write-Host "❌ No Next.js standalone build found. Run without -SkipBuild first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path server\dist\ws-server.js)) {
    Write-Host "❌ No WebSocket server build found. Run without -SkipBuild first." -ForegroundColor Red
    exit 1
}

# Create temporary deployment directory
$tempDir = ".deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy Next.js standalone build
Write-Host "   Preparing Next.js standalone files..." -ForegroundColor White
$appDistDir = "$tempDir\app-dist"
# Copy the CONTENTS of standalone, not the directory itself
New-Item -ItemType Directory -Path $appDistDir -Force | Out-Null
Copy-Item -Recurse -Force .next\standalone\* $appDistDir

# Fix the package.json to ensure npm start runs the standalone server
Write-Host "   Fixing package.json for standalone mode..." -ForegroundColor White
$packageJsonPath = "$appDistDir\package.json"
if (Test-Path $packageJsonPath) {
    $packageContent = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    # Replace scripts with just a start command that runs server.js
    $packageContent.scripts = @{ "start" = "node server.js" }
    $packageContent | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    Write-Host "   [OK] Package.json fixed for standalone" -ForegroundColor Green
}

# Copy static files and public assets
Copy-Item -Recurse -Force .next\static "$appDistDir\.next\static"
if (Test-Path public) {
    Copy-Item -Recurse -Force public $appDistDir\
}

# Copy WebSocket server
Write-Host "   Preparing WebSocket server files..." -ForegroundColor White
$wsDistDir = "$tempDir\ws-dist"
New-Item -ItemType Directory -Path $wsDistDir | Out-Null
Copy-Item -Force server\dist\ws-server.js $wsDistDir\
# Also copy source map for debugging if it exists
if (Test-Path server\dist\ws-server.js.map) {
    Copy-Item -Force server\dist\ws-server.js.map $wsDistDir\
}
Copy-Item -Force package.json $wsDistDir\
Copy-Item -Force package-lock.json $wsDistDir\

Write-Host "✅ Deployment files prepared!" -ForegroundColor Green
Write-Host ""

# Phase 3: Sync files to server using pscp/plink
Write-Host "🚀 Phase 3: Syncing files to server..." -ForegroundColor Cyan
Write-Host "   Target: ${SERVER_USER}@${SERVER_HOST}:$REMOTE_BUILD_BASE" -ForegroundColor Gray

# Check if plink/pscp are available
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
$pscpPath = Get-Command pscp -ErrorAction SilentlyContinue

if (-not $plinkPath -or -not $pscpPath) {
    Write-Host "❌ plink/pscp not found. Please install PuTTY." -ForegroundColor Red
    Write-Host "   Download from: https://www.putty.org/" -ForegroundColor Yellow
    exit 1
}

# Ensure remote directories exist
Write-Host "   Creating remote directories..." -ForegroundColor White
$createDirs = "mkdir -p $REMOTE_BUILD_BASE/app-dist $REMOTE_BUILD_BASE/ws-dist"
echo $createDirs | plink -batch ${SERVER_USER}@${SERVER_HOST} 2>$null

# Use pscp to copy files
Write-Host "   Transferring app files..." -ForegroundColor White
pscp -r -batch $tempDir\app-dist ${SERVER_USER}@${SERVER_HOST}:$REMOTE_BUILD_BASE/ 2>$null

Write-Host "   Transferring WebSocket files..." -ForegroundColor White
pscp -r -batch $tempDir\ws-dist ${SERVER_USER}@${SERVER_HOST}:$REMOTE_BUILD_BASE/ 2>$null

Write-Host "✅ File sync completed!" -ForegroundColor Green
Write-Host ""

# Phase 4: Trigger deployment (default behavior unless -NoTrigger is specified)
if (-not $NoTrigger) {
    Write-Host "🔄 Phase 4: Triggering Coolify deployment..." -ForegroundColor Cyan
    
    # Use the trigger script
    & .\trigger-deploy.ps1 -Message "Deployment after sync"
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "    ✅ Deployment Complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
} else {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "    ✅ Files Synced Successfully!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Skipped automatic deployment trigger (use without -NoTrigger to auto-deploy)" -ForegroundColor Yellow
    Write-Host "   To manually trigger deployment:" -ForegroundColor Yellow
    Write-Host "   Option 1: Run .\trigger-deploy.ps1" -ForegroundColor White
    Write-Host "   Option 2: Go to Coolify and click 'Redeploy'" -ForegroundColor White
}

Write-Host ""
Write-Host "Monitor deployment at: http://$($SERVER_HOST):8000/" -ForegroundColor Yellow