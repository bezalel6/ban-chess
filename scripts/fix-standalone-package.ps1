# Script to fix the standalone package.json
# Removes the scripts section to prevent npm start from running next start

$standalonePath = ".next\standalone"
$packageJsonPath = "$standalonePath\package.json"

if (Test-Path $packageJsonPath) {
    Write-Host "Fixing standalone package.json..." -ForegroundColor Cyan
    
    # Read the package.json
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    
    # Create minimal scripts section with only start command
    $packageJson.scripts = New-Object PSObject
    $packageJson.scripts | Add-Member -Type NoteProperty -Name "start" -Value "node server.js"
    
    # Save the modified package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    
    Write-Host "[OK] Package.json fixed - npm start will now run 'node server.js'" -ForegroundColor Green
    
    # Show the scripts section
    Write-Host "New scripts section:" -ForegroundColor Yellow
    Write-Host ($packageJson.scripts | ConvertTo-Json)
} else {
    Write-Host "[ERROR] Standalone package.json not found at $packageJsonPath" -ForegroundColor Red
    Write-Host "Run npm run build first" -ForegroundColor Yellow
}