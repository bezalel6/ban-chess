$lines = Get-Content 'deploy-to-coolify.ps1'
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    # Count quotes not inside single quotes
    $quotes = ([regex]::Matches($line, '"')).Count
    if ($quotes % 2 -ne 0) {
        Write-Host "Line $($i+1): Odd quotes ($quotes) in: $line"
    }
}