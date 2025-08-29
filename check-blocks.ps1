$content = Get-Content 'deploy-to-coolify.ps1' -Raw

# Count opening and closing braces
$openBraces = ([regex]::Matches($content, '\{')).Count
$closeBraces = ([regex]::Matches($content, '\}')).Count

Write-Host "Opening braces: $openBraces"
Write-Host "Closing braces: $closeBraces"

if ($openBraces -ne $closeBraces) {
    Write-Host "Mismatch detected!" -ForegroundColor Red
    
    # Find approximate location of issue
    $lines = Get-Content 'deploy-to-coolify.ps1'
    $openCount = 0
    $closeCount = 0
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $lineOpens = ([regex]::Matches($lines[$i], '\{')).Count
        $lineCloses = ([regex]::Matches($lines[$i], '\}')).Count
        
        $openCount += $lineOpens
        $closeCount += $lineCloses
        
        if ($openCount -lt $closeCount) {
            Write-Host "Extra closing brace at line $($i + 1): $($lines[$i])" -ForegroundColor Yellow
            break
        }
    }
}