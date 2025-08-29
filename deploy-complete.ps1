# Complete deployment script with Git-based Coolify trigger
# This script builds, uploads, and triggers Coolify via git push

param(
    [switch]$SkipBuild,
    [switch]$Help
)

if ($Help) {
    Write-Host "Complete Deployment Script" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script:" -ForegroundColor Yellow
    Write-Host "  1. Builds the application locally"
    Write-Host "  2. Uploads files to server via rsync"
    Write-Host "  3. Triggers Coolify redeploy via git push"
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-complete.ps1              # Full deployment"
    Write-Host "  .\deploy-complete.ps1 -SkipBuild   # Deploy without building"
    Write-Host ""
    exit 0
}

Write-Host "🚀 Starting Complete Deployment Process" -ForegroundColor Cyan
Write-Host ""

# Step 1: Run the existing deployment script
Write-Host "Step 1: Building and uploading files..." -ForegroundColor Yellow
if ($SkipBuild) {
    & .\deploy-to-coolify-integrated.ps1 -SkipBuild
} else {
    & .\deploy-to-coolify-integrated.ps1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment script failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Triggering Coolify via Git..." -ForegroundColor Yellow

# Step 2: Navigate to deployment repo
$deploymentPath = ".\coolify-deployment"
if (-not (Test-Path $deploymentPath)) {
    Write-Host "❌ Deployment repository not found at $deploymentPath" -ForegroundColor Red
    Write-Host "   Make sure the coolify-deployment folder exists" -ForegroundColor Gray
    exit 1
}

Push-Location $deploymentPath

try {
    # Check if it's a git repository
    git status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Initializing git repository..." -ForegroundColor Yellow
        git init
        git remote add origin YOUR_DEPLOYMENT_REPO_URL_HERE
        Write-Host "   ⚠️  Please update the remote URL in this script!" -ForegroundColor Yellow
    }
    
    # Create an empty commit to trigger Coolify
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commitMessage = "Deploy: $timestamp"
    
    Write-Host "   Creating deployment trigger commit..." -ForegroundColor Gray
    git commit --allow-empty -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Pushing to trigger Coolify..." -ForegroundColor Gray
        git push origin main 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📊 Deployment Summary:" -ForegroundColor Cyan
            Write-Host "   - Files uploaded to server" -ForegroundColor Gray
            Write-Host "   - Git push triggered at $timestamp" -ForegroundColor Gray
            Write-Host "   - Coolify should now be redeploying" -ForegroundColor Gray
            Write-Host ""
            Write-Host "🔍 Monitor deployment at: http://rndev.local:8000/" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  Git push failed" -ForegroundColor Yellow
            Write-Host "   Files are uploaded but Coolify not triggered" -ForegroundColor Gray
            Write-Host "   Try manual redeploy in Coolify UI" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Could not create commit" -ForegroundColor Yellow
        Write-Host "   Files are uploaded but Coolify not triggered" -ForegroundColor Gray
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "🎯 Deployment process complete!" -ForegroundColor Green