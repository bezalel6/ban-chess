# Script to fix the standalone package.json
# Removes the scripts section to prevent npm start from running next start

$standalonePath = ".next\standalone"
$packageJsonPath = "$standalonePath\package.json"

if (Test-Path $packageJsonPath) {
    Write-Host "Fixing standalone package.json..." -ForegroundColor Cyan
    
    # Read the package.json
    $packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    
    # Remove the scripts section entirely
    if ($packageJson.PSObject.Properties.Name -contains "scripts") {
        $packageJson.PSObject.Properties.Remove("scripts")
        Write-Host "Removed scripts section from package.json" -ForegroundColor Green
    }
    
    # Add a minimal start script that runs server.js
    $packageJson | Add-Member -NotePropertyName "scripts" -NotePropertyValue @{
        "start" = "node server.js"
    } -Force
    
    # Save the modified package.json
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
    
    Write-Host "✓ Package.json fixed - npm start will now run 'node server.js'" -ForegroundColor Green
    
    # Show the scripts section
    Write-Host "New scripts section:" -ForegroundColor Yellow
    $packageJson.scripts | ConvertTo-Json
} else {
    Write-Host "❌ Standalone package.json not found at $packageJsonPath" -ForegroundColor Red
    Write-Host "   Run 'npm run build' first" -ForegroundColor Yellow
}