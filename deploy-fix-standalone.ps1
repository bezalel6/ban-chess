# Quick deployment script to fix standalone server issue
param(
    [string]$ServerUser = "rndev",
    [string]$ServerHost = "rndev.local"
)

Write-Host "Deploying fixed standalone build..." -ForegroundColor Cyan

# Check if standalone build exists
if (-not (Test-Path ".next\standalone")) {
    Write-Host "Error: No standalone build found. Run 'npm run build' first." -ForegroundColor Red
    exit 1
}

# Create temp directory
$tempDir = ".deploy-temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Prepare app files
Write-Host "Preparing files..." -ForegroundColor Yellow
$appDistDir = "$tempDir\app-dist"
New-Item -ItemType Directory -Path $appDistDir -Force | Out-Null

# Copy standalone contents
Copy-Item -Recurse -Force .next\standalone\* $appDistDir

# Fix package.json
$packageJsonPath = "$appDistDir\package.json"
if (Test-Path $packageJsonPath) {
    $content = Get-Content $packageJsonPath -Raw
    $json = $content | ConvertFrom-Json
    
    # Create minimal scripts section with only start command
    $json.scripts = New-Object PSObject
    $json.scripts | Add-Member -Type NoteProperty -Name "start" -Value "node server.js"
    
    # Save modified package.json
    $json | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    Write-Host "Fixed package.json" -ForegroundColor Green
}

# Copy static files
Copy-Item -Recurse -Force .next\static "$appDistDir\.next\static"
if (Test-Path public) {
    Copy-Item -Recurse -Force public $appDistDir\
}

# Upload to server
Write-Host "Uploading to server..." -ForegroundColor Yellow
$remotePath = "/home/$ServerUser/chess-app-builds"

# Create remote directory
echo "mkdir -p $remotePath/app-dist" | plink -batch "$ServerUser@$ServerHost"

# Upload files
pscp -r -batch "$tempDir\app-dist" "$ServerUser@${ServerHost}:$remotePath/"

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Coolify dashboard" -ForegroundColor White
Write-Host "2. Click 'Redeploy' to restart containers" -ForegroundColor White
Write-Host "3. Test at https://chess.rndev.site" -ForegroundColor White

# Cleanup
Remove-Item -Recurse -Force $tempDir