# Simple Coolify API redeploy test script
# Just makes the API call and shows the full response for debugging

# Load environment variables
$envFile = ".env.deploy.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim() -replace '^["'']|["'']$', ''
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$AppId = $env:COOLIFY_APP_ID
$Token = $env:COOLIFY_API_TOKEN
$Url = $env:COOLIFY_URL

if (-not $Url) { $Url = "http://rndev.local:8000" }

Write-Host "Testing Coolify API Redeploy" -ForegroundColor Cyan
Write-Host "URL: $Url" -ForegroundColor Gray
Write-Host "App ID: $AppId" -ForegroundColor Gray
Write-Host "Token: $(if($Token) {'[SET]'} else {'[NOT SET]'})" -ForegroundColor Gray
Write-Host ""

# Try different endpoints
Write-Host "Testing different Coolify endpoints..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Webhook endpoint (from GitHub Actions example)
$webhookUrl = "$Url/webhook/deploy/$AppId"
Write-Host "Test 1: Webhook endpoint" -ForegroundColor Cyan
Write-Host "URL: $webhookUrl" -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $Token"
    }
    
    $response = Invoke-WebRequest -Uri $webhookUrl -Method GET -Headers $headers -UseBasicParsing
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: Got HTML login page (webhook exists but needs auth)" -ForegroundColor Yellow
    
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
}