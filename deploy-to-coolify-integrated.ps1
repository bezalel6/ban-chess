# PowerShell deployment script for Coolify integration
# 
# Usage:
#   .\deploy-to-coolify-integrated.ps1              # Build and deploy everything
#   .\deploy-to-coolify-integrated.ps1 -SkipBuild   # Deploy without building

param(
    [switch]$SkipBuild,
    [switch]$Help,
    [string]$CoolifyAppId = "loswg4c4c8scs8kkcog4gcwo",  # Update this after creating Coolify app
    [string]$SudoPassword = "123456"  # Optional: Set your password here or pass via parameter
)

if ($Help) {
    Write-Host "Chess App Deployment Script (Coolify Integration)" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-to-coolify-integrated.ps1              # Build and deploy"
    Write-Host "  .\deploy-to-coolify-integrated.ps1 -SkipBuild   # Deploy without building"
    Write-Host ""
    Write-Host "First time setup:" -ForegroundColor Yellow
    Write-Host "  1. Push coolify-deployment folder to GitHub"
    Write-Host "  2. Create Docker Compose app in Coolify using that repo"
    Write-Host "  3. Get the app ID from Coolify (in URL or deployment logs)"
    Write-Host "  4. Update -CoolifyAppId parameter in this script"
    Write-Host ""
    exit 0
}

# Configuration
$SERVER_USER = "rndev"
$SERVER_HOST = "rndev.local"

# Coolify paths - UPDATE THE APP ID AFTER CREATING IN COOLIFY
$COOLIFY_BASE = "/data/coolify/applications/$CoolifyAppId"
$COOLIFY_BUILDS = "$COOLIFY_BASE/builds"

if ($CoolifyAppId -eq "YOUR_APP_ID") {
    Write-Host "❌ Please update the CoolifyAppId parameter with your actual Coolify app ID" -ForegroundColor Red
    Write-Host "   You can find this in Coolify's URL when viewing your app" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Starting Coolify integrated deployment..." -ForegroundColor Yellow
Write-Host "📍 Deploying to Coolify app: $CoolifyAppId" -ForegroundColor Cyan

if ($SkipBuild) {
    Write-Host "⏭️  Skipping build step" -ForegroundColor Cyan
} else {
    # Build Next.js
    Write-Host "📦 Building Next.js application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
}

# Prepare deployment files
Write-Host "📁 Preparing deployment files..." -ForegroundColor Yellow
if (Test-Path .deploy-temp) {
    Remove-Item -Recurse -Force .deploy-temp
}

New-Item -ItemType Directory -Force -Path .deploy-temp\app-dist | Out-Null
New-Item -ItemType Directory -Force -Path .deploy-temp\ws-dist | Out-Null

# Copy Next.js standalone build (INCLUDING node_modules!)
Write-Host "   Copying Next.js standalone with dependencies..." -ForegroundColor Gray
Copy-Item -Recurse .next\standalone\* .deploy-temp\app-dist\ -Force
Copy-Item -Recurse .next\static .deploy-temp\app-dist\.next\ -Force
if (Test-Path public) {
    Copy-Item -Recurse public .deploy-temp\app-dist\
}

# Copy WebSocket server built files
Write-Host "   Copying WebSocket server build..." -ForegroundColor Gray
if (Test-Path server\dist\ws-server.js) {
    Copy-Item server\dist\ws-server.js .deploy-temp\ws-dist\
    Copy-Item server\dist\ws-server.js.map .deploy-temp\ws-dist\ -ErrorAction SilentlyContinue
} else {
    Write-Host "⚠️  WebSocket build not found. Building now..." -ForegroundColor Yellow
    npm run build:ws
    Copy-Item server\dist\ws-server.js .deploy-temp\ws-dist\
    Copy-Item server\dist\ws-server.js.map .deploy-temp\ws-dist\ -ErrorAction SilentlyContinue
}
# Copy minimal package.json for WebSocket
@"
{
  "name": "chess-ws-server",
  "version": "1.0.0",
  "type": "commonjs",
  "dependencies": {}
}
"@ | Out-File -FilePath .deploy-temp\ws-dist\package.json -Encoding UTF8

# Transfer to Coolify builds directory
Write-Host "📤 Transferring files to Coolify..." -ForegroundColor Yellow
Write-Host "   Target: $COOLIFY_BUILDS" -ForegroundColor Gray

# First check if we can access the Coolify directory
if ($SudoPassword) {
    # Try with sudo if password provided (using sshpass for SSH auth)
    $testAccess = wsl sshpass -p "$SudoPassword" ssh ${SERVER_USER}@${SERVER_HOST} "echo '$SudoPassword' | sudo -S ls -la /data/coolify/applications/ 2>&1"
    if ($testAccess -notlike "*Permission denied*" -and $testAccess -notlike "*cannot access*") {
        # We have access with sudo, try to create the directory
        wsl sshpass -p "$SudoPassword" ssh ${SERVER_USER}@${SERVER_HOST} "echo '$SudoPassword' | sudo -S mkdir -p $COOLIFY_BUILDS && echo '$SudoPassword' | sudo -S chown -R ${SERVER_USER}:${SERVER_USER} $COOLIFY_BUILDS 2>/dev/null"
    }
}

# Test if we can write to the Coolify builds directory (using sshpass)
$canWrite = wsl sshpass -p "$SudoPassword" ssh ${SERVER_USER}@${SERVER_HOST} "test -w $COOLIFY_BUILDS && echo 'writable' || echo 'not-writable'" 2>$null
if ($canWrite -ne "writable") {
    Write-Host "⚠️  Cannot write to Coolify directory. Using fallback location." -ForegroundColor Yellow
    # Use home directory as fallback
    $COOLIFY_BUILDS = "~/chess-app-builds"
    Write-Host "   Using fallback: $COOLIFY_BUILDS" -ForegroundColor Yellow
    
    # Create directory in home (using sshpass)
    wsl sshpass -p "$SudoPassword" ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p $COOLIFY_BUILDS/app-dist $COOLIFY_BUILDS/ws-dist"
}

# rsync to builds directory (using sshpass for authentication)
# Note: We DO want node_modules for the standalone build!
wsl sshpass -p "$SudoPassword" rsync -avz --delete `
    --exclude '.git' `
    --exclude '*.log' `
    .deploy-temp/ `
    ${SERVER_USER}@${SERVER_HOST}:${COOLIFY_BUILDS}/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ File transfer failed" -ForegroundColor Red
    exit 1
}

# Trigger Coolify redeploy
Write-Host "🔄 Triggering Coolify redeploy..." -ForegroundColor Yellow
Write-Host "   Go to Coolify dashboard and click 'Redeploy' for your app" -ForegroundColor Cyan
Write-Host "   Or use Coolify CLI/API if configured" -ForegroundColor Cyan

# Clean up
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .deploy-temp

Write-Host "✅ Deployment files uploaded successfully!" -ForegroundColor Green
Write-Host "📍 Files deployed to: $COOLIFY_BUILDS" -ForegroundColor Green
Write-Host "🔄 Remember to redeploy in Coolify UI to apply changes" -ForegroundColor Yellow