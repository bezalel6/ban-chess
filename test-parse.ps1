$scriptPath = ".\deploy-to-coolify.ps1"
$errors = $null
$tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)

if ($errors) {
    Write-Host "Syntax errors found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "Line $($error.Extent.StartLineNumber): $($error.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "No syntax errors found!" -ForegroundColor Green
}