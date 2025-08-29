# Script to check what files are actually on the server
param(
    [string]$ServerUser = "rndev",
    [string]$ServerHost = "rndev.local"
)

Write-Host "Checking files on server..." -ForegroundColor Cyan
Write-Host ""

# Check the app-dist directory
Write-Host "=== Checking /home/$ServerUser/chess-app-builds/app-dist ===" -ForegroundColor Yellow
$command = "ls -la /home/$ServerUser/chess-app-builds/app-dist 2>/dev/null | head -20"
echo $command | plink -batch "$ServerUser@$ServerHost"

Write-Host ""
Write-Host "=== Checking for server.js ===" -ForegroundColor Yellow
$command = "ls -la /home/$ServerUser/chess-app-builds/app-dist/server.js 2>/dev/null"
echo $command | plink -batch "$ServerUser@$ServerHost"

Write-Host ""
Write-Host "=== Checking .next directory ===" -ForegroundColor Yellow
$command = "ls -la /home/$ServerUser/chess-app-builds/app-dist/.next 2>/dev/null | head -10"
echo $command | plink -batch "$ServerUser@$ServerHost"

Write-Host ""
Write-Host "=== Checking if .next/standalone exists (shouldn't) ===" -ForegroundColor Yellow
$command = "ls -la /home/$ServerUser/chess-app-builds/app-dist/.next/standalone 2>/dev/null"
echo $command | plink -batch "$ServerUser@$ServerHost"

Write-Host ""
Write-Host "=== Checking package.json scripts ===" -ForegroundColor Yellow
$command = "grep -A5 '\"scripts\"' /home/$ServerUser/chess-app-builds/app-dist/package.json 2>/dev/null"
echo $command | plink -batch "$ServerUser@$ServerHost"

Write-Host ""
Write-Host "=== Checking what's actually in the Docker container ===" -ForegroundColor Yellow
Write-Host "Run this command on the server:" -ForegroundColor White
Write-Host "docker exec <container-id> ls -la /app" -ForegroundColor Green
Write-Host "docker exec <container-id> cat /app/server.js | head -20" -ForegroundColor Green