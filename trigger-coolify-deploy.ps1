# Coolify Deployment Trigger Script
# Multiple methods to trigger deployment programmatically

param(
    [string]$Method = "webhook"  # webhook, browser, or ssh
)

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
$Url = if($env:COOLIFY_URL) {$env:COOLIFY_URL} else {"http://rndev.local:8000"}

Write-Host "🚀 Triggering Coolify Deployment" -ForegroundColor Cyan
Write-Host "Method: $Method" -ForegroundColor Gray
Write-Host ""

switch ($Method) {
    "webhook" {
        # Method 1: Direct webhook call (simplest if it works)
        Write-Host "Attempting webhook trigger..." -ForegroundColor Yellow
        $webhookUrl = "$Url/webhook/deploy/$AppId"
        
        try {
            # Try without authentication first (some webhooks are public)
            $response = Invoke-WebRequest -Uri $webhookUrl -Method GET -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠️  Webhook requires authentication" -ForegroundColor Yellow
            Write-Host "Try 'browser' or 'ssh' method instead" -ForegroundColor Gray
        }
    }
    
    "browser" {
        # Method 2: Open browser to trigger manually
        Write-Host "Opening Coolify in browser..." -ForegroundColor Yellow
        Write-Host "Please click 'Redeploy' for your application" -ForegroundColor Cyan
        
        $appUrl = "$Url/project/1/application/$AppId"
        Start-Process $appUrl
        
        Write-Host "✅ Browser opened to application page" -ForegroundColor Green
    }
    
    "ssh" {
        # Method 3: SSH to server and trigger via Docker
        Write-Host "Attempting SSH deployment trigger..." -ForegroundColor Yellow
        
        $ServerUser = $env:SERVER_USER
        $ServerHost = $env:SERVER_HOST
        $SudoPassword = $env:SUDO_PASSWORD
        
        if (-not $ServerUser -or -not $ServerHost) {
            Write-Host "❌ SSH credentials not configured" -ForegroundColor Red
            exit 1
        }
        
        # Try to restart the application container directly
        $containerName = "coolify-application-$AppId"
        
        Write-Host "Restarting container: $containerName" -ForegroundColor Gray
        
        $sshCommand = "docker restart $containerName 2>/dev/null || echo 'Container not found'"
        
        if ($SudoPassword) {
            wsl sshpass -p "$SudoPassword" ssh ${ServerUser}@${ServerHost} "$sshCommand"
        } else {
            wsl ssh ${ServerUser}@${ServerHost} "$sshCommand"
        }
        
        Write-Host "✅ Container restart command sent" -ForegroundColor Green
    }
    
    default {
        Write-Host "❌ Unknown method: $Method" -ForegroundColor Red
        Write-Host "Available methods: webhook, browser, ssh" -ForegroundColor Gray
    }
}