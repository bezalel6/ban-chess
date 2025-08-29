# Quick deployment trigger script
# Pushes an empty commit to the master branch to trigger Coolify

param(
    [string]$Message = ""
)

$deploymentRepo = ".\coolify-deployment"

if (-not (Test-Path $deploymentRepo)) {
    Write-Host "❌ Deployment repo not found at $deploymentRepo" -ForegroundColor Red
    exit 1
}

Push-Location $deploymentRepo

try {
    # Ensure we're on the master branch
    git checkout master 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Could not switch to master branch" -ForegroundColor Red
        exit 1
    }
    
    # Pull latest changes to avoid conflicts
    git pull 2>&1 | Out-Null
    
    # Create deployment message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($Message) {
        $commitMessage = "Deploy: $Message [$timestamp]"
    } else {
        $commitMessage = "Deploy: $timestamp"
    }
    
    # Create empty commit and push
    Write-Host "🚀 Triggering deployment..." -ForegroundColor Cyan
    git commit --allow-empty -m $commitMessage
    git push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deployment triggered!" -ForegroundColor Green
        Write-Host "   Commit: $commitMessage" -ForegroundColor Gray
        Write-Host "   Monitor at: http://rndev.local:8000/" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to push trigger commit" -ForegroundColor Red
    }
    
} finally {
    Pop-Location
}