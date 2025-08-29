# PowerShell deployment script for Coolify integration
# 
# Usage:
#   .\deploy-to-coolify-integrated.ps1              # Build and deploy everything
#   .\deploy-to-coolify-integrated.ps1 -SkipBuild   # Deploy without building

param(
    [switch]$SkipBuild,
    [switch]$Help,
    [switch]$ForceFullCopy,  # Force complete file sync (clears cache)
    [switch]$CleanCache,  # Remove deployment cache completely
    [string]$CoolifyAppId,
    [string]$SudoPassword,
    [string]$CoolifyApiToken,
    [string]$CoolifyUrl,
    [string]$ServerUser,
    [string]$ServerHost
)

# Load environment variables from .env.deploy.local if it exists
$envFile = ".env.deploy.local"
if (Test-Path $envFile) {
    Write-Host "📋 Loading configuration from $envFile" -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Apply defaults from environment variables or hardcoded values
if (-not $CoolifyAppId) { $CoolifyAppId = if($env:COOLIFY_APP_ID) {$env:COOLIFY_APP_ID} else {"loswg4c4c8scs8kkcog4gcwo"} }
if (-not $SudoPassword) { $SudoPassword = if($env:SUDO_PASSWORD) {$env:SUDO_PASSWORD} else {"123456"} }
if (-not $CoolifyApiToken) { $CoolifyApiToken = $env:COOLIFY_API_TOKEN }
if (-not $CoolifyUrl) { $CoolifyUrl = $env:COOLIFY_URL }
if (-not $ServerUser) { $ServerUser = if($env:SERVER_USER) {$env:SERVER_USER} else {"rndev"} }
if (-not $ServerHost) { $ServerHost = if($env:SERVER_HOST) {$env:SERVER_HOST} else {"rndev.local"} }

if ($Help) {
    Write-Host "Chess App Deployment Script (Coolify Integration)" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-to-coolify-integrated.ps1              # Build and deploy (incremental)"
    Write-Host "  .\deploy-to-coolify-integrated.ps1 -SkipBuild   # Deploy without building"
    Write-Host "  .\deploy-to-coolify-integrated.ps1 -ForceFullCopy  # Force complete file sync"
    Write-Host "  .\deploy-to-coolify-integrated.ps1 -CleanCache  # Remove cache and exit"
    Write-Host ""
    Write-Host "First time setup:" -ForegroundColor Yellow
    Write-Host "  1. Push coolify-deployment folder to GitHub"
    Write-Host "  2. Create Docker Compose app in Coolify using that repo"
    Write-Host "  3. Get the app ID from Coolify (in URL or deployment logs)"
    Write-Host "  4. Update -CoolifyAppId parameter in this script"
    Write-Host ""
    Write-Host "API Setup (Optional - for automatic redeploy):" -ForegroundColor Yellow
    Write-Host "  1. Go to Coolify > Settings > API Tokens"
    Write-Host "  2. Create a new API token with 'Deploy Application' permission"
    Write-Host "  3. Set environment variables:" -ForegroundColor Cyan
    Write-Host "     `$env:COOLIFY_API_TOKEN = 'your-token'"
    Write-Host "     `$env:COOLIFY_URL = 'https://coolify.yourdomain.com'"
    Write-Host "  Or pass them as parameters:"
    Write-Host "     -CoolifyApiToken 'your-token' -CoolifyUrl 'https://...'"
    Write-Host ""
    Write-Host "Configuration Options (.env.deploy.local):" -ForegroundColor Yellow
    Write-Host "  COOLIFY_APP_ID       - Your Coolify application ID"
    Write-Host "  COOLIFY_API_TOKEN    - API token for automatic deployment"
    Write-Host "  COOLIFY_URL          - Your Coolify instance URL"
    Write-Host "  SERVER_USER          - SSH username for deployment"
    Write-Host "  SERVER_HOST          - SSH hostname/IP for deployment"
    Write-Host "  SUDO_PASSWORD        - Password for sudo operations"
    Write-Host ""
    exit 0
}

# Coolify paths - UPDATE THE APP ID AFTER CREATING IN COOLIFY
$COOLIFY_BASE = "/data/coolify/applications/$CoolifyAppId"
$COOLIFY_BUILDS = "$COOLIFY_BASE/builds"

if ($CoolifyAppId -eq "YOUR_APP_ID") {
    Write-Host "❌ Please update the CoolifyAppId parameter with your actual Coolify app ID" -ForegroundColor Red
    Write-Host "   You can find this in Coolify's URL when viewing your app" -ForegroundColor Yellow
    exit 1
}

# Handle CleanCache flag
if ($CleanCache) {
    Write-Host "🧹 Cleaning deployment cache..." -ForegroundColor Yellow
    if (Test-Path .deploy-temp) {
        Remove-Item -Recurse -Force .deploy-temp
        Write-Host "✅ Cache cleaned successfully" -ForegroundColor Green
    } else {
        Write-Host "   No cache to clean" -ForegroundColor Gray
    }
    if (Test-Path .deploy-manifest.json) {
        Remove-Item -Force .deploy-manifest.json
        Write-Host "   Manifest removed" -ForegroundColor Gray
    }
    exit 0
}

Write-Host "🚀 Starting Coolify integrated deployment..." -ForegroundColor Yellow
Write-Host "📍 Configuration:" -ForegroundColor Cyan
Write-Host "   App ID: $CoolifyAppId" -ForegroundColor Gray
Write-Host "   Server: ${ServerUser}@${ServerHost}" -ForegroundColor Gray
if ($CoolifyApiToken) {
    Write-Host "   API: Configured ✅" -ForegroundColor Gray
} else {
    Write-Host "   API: Not configured (manual redeploy required)" -ForegroundColor Gray
}

if ($SkipBuild) {
    Write-Host "⏭️  Skipping build step" -ForegroundColor Cyan
} else {
    # Build Next.js
    Write-Host "📦 Building Next.js application..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
}

# Prepare deployment files with intelligent caching
Write-Host "📁 Preparing deployment files..." -ForegroundColor Yellow

# Create deployment manifest for tracking
$manifestPath = ".deploy-manifest.json"
$currentManifest = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    files = @{}
}

# Load previous manifest if exists
$previousManifest = if (Test-Path $manifestPath) {
    Get-Content $manifestPath | ConvertFrom-Json
} else {
    @{ files = @{} }
}

# Function to get file hash for change detection
function Get-FileHashString {
    param([string]$Path)
    if (Test-Path $Path) {
        $hash = Get-FileHash -Path $Path -Algorithm MD5
        return $hash.Hash
    }
    return $null
}

# Initialize deployment directory structure
$deployTemp = ".deploy-temp"
$requiresFullCopy = $false

# Force full copy if requested
if ($ForceFullCopy) {
    Write-Host "   Force full copy requested - clearing cache" -ForegroundColor Yellow
    if (Test-Path $deployTemp) {
        Remove-Item -Recurse -Force $deployTemp
    }
    if (Test-Path $manifestPath) {
        Remove-Item -Force $manifestPath
    }
    $requiresFullCopy = $true
}

# Check if we need a full rebuild (missing deploy-temp or major changes)
if (-not (Test-Path $deployTemp)) {
    Write-Host "   First deployment or missing cache - full copy required" -ForegroundColor Yellow
    $requiresFullCopy = $true
    New-Item -ItemType Directory -Force -Path $deployTemp\app-dist | Out-Null
    New-Item -ItemType Directory -Force -Path $deployTemp\ws-dist | Out-Null
} else {
    # Check for Next.js build changes
    $nextBuildTime = (Get-Item .next\standalone -ErrorAction SilentlyContinue).LastWriteTime
    $deployTime = (Get-Item $deployTemp).LastWriteTime
    
    if ($nextBuildTime -gt $deployTime) {
        Write-Host "   Next.js build is newer than deployment cache" -ForegroundColor Yellow
        $requiresFullCopy = $true
    }
}

# Smart copy with change detection
if ($requiresFullCopy) {
    Write-Host "   Performing full deployment file sync..." -ForegroundColor Yellow
    
    # Clean and recreate for full copy
    if (Test-Path $deployTemp) {
        # Keep manifest of what we're removing for safety
        $removedFiles = Get-ChildItem -Path $deployTemp -Recurse -File | Select-Object -ExpandProperty FullName
        if ($removedFiles.Count -gt 0) {
            Write-Host "   Removing $($removedFiles.Count) stale files..." -ForegroundColor Gray
        }
        Remove-Item -Recurse -Force $deployTemp
    }
    
    New-Item -ItemType Directory -Force -Path $deployTemp\app-dist | Out-Null
    New-Item -ItemType Directory -Force -Path $deployTemp\ws-dist | Out-Null
    
    # Copy Next.js standalone build
    Write-Host "   Copying Next.js standalone with dependencies..." -ForegroundColor Gray
    Copy-Item -Recurse .next\standalone\* $deployTemp\app-dist\ -Force
    Copy-Item -Recurse .next\static $deployTemp\app-dist\.next\ -Force
    if (Test-Path public) {
        Copy-Item -Recurse public $deployTemp\app-dist\
    }
    
    # Track all copied files in manifest
    Get-ChildItem -Path $deployTemp\app-dist -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Replace("$PWD\$deployTemp\", "")
        $currentManifest.files[$relativePath] = @{
            hash = Get-FileHashString $_.FullName
            size = $_.Length
            modified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        }
    }
} else {
    Write-Host "   Performing incremental update..." -ForegroundColor Cyan
    
    # Check for changed files only
    $changedFiles = 0
    $staticPath = ".next\static"
    $publicPath = "public"
    
    # Update static files if changed
    if (Test-Path $staticPath) {
        $sourceStatic = Get-ChildItem -Path $staticPath -Recurse -File
        foreach ($file in $sourceStatic) {
            $relativePath = $file.FullName.Replace("$PWD\", "")
            $destPath = "$deployTemp\app-dist\.next\static\" + $file.FullName.Replace("$PWD\.next\static\", "")
            
            $sourceHash = Get-FileHashString $file.FullName
            $destHash = Get-FileHashString $destPath
            
            if ($sourceHash -ne $destHash) {
                $changedFiles++
                $destDir = Split-Path -Parent $destPath
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
                }
                Copy-Item $file.FullName $destPath -Force
            }
        }
    }
    
    # Update public files if changed
    if (Test-Path $publicPath) {
        $sourcePublic = Get-ChildItem -Path $publicPath -Recurse -File
        foreach ($file in $sourcePublic) {
            $relativePath = $file.FullName.Replace("$PWD\", "")
            $destPath = "$deployTemp\app-dist\public\" + $file.FullName.Replace("$PWD\public\", "")
            
            $sourceHash = Get-FileHashString $file.FullName
            $destHash = Get-FileHashString $destPath
            
            if ($sourceHash -ne $destHash) {
                $changedFiles++
                $destDir = Split-Path -Parent $destPath
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
                }
                Copy-Item $file.FullName $destPath -Force
            }
        }
    }
    
    if ($changedFiles -gt 0) {
        Write-Host "   Updated $changedFiles changed files" -ForegroundColor Green
    } else {
        Write-Host "   No file changes detected in static/public" -ForegroundColor Gray
    }
}

# Copy WebSocket server built files (always check for updates)
Write-Host "   Checking WebSocket server build..." -ForegroundColor Gray
if (Test-Path server\dist\ws-server.js) {
    $wsSourceHash = Get-FileHashString "server\dist\ws-server.js"
    $wsDestHash = Get-FileHashString "$deployTemp\ws-dist\ws-server.js"
    
    if ($wsSourceHash -ne $wsDestHash) {
        Write-Host "   WebSocket server updated - copying new build" -ForegroundColor Green
        Copy-Item server\dist\ws-server.js $deployTemp\ws-dist\ -Force
        Copy-Item server\dist\ws-server.js.map $deployTemp\ws-dist\ -Force -ErrorAction SilentlyContinue
        
        # Track in manifest
        $currentManifest.files["ws-dist/ws-server.js"] = @{
            hash = $wsSourceHash
            size = (Get-Item server\dist\ws-server.js).Length
            modified = (Get-Item server\dist\ws-server.js).LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        }
    } else {
        Write-Host "   WebSocket server unchanged - skipping copy" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  WebSocket build not found. Building now..." -ForegroundColor Yellow
    npm run build:ws
    Copy-Item server\dist\ws-server.js $deployTemp\ws-dist\ -Force
    Copy-Item server\dist\ws-server.js.map $deployTemp\ws-dist\ -Force -ErrorAction SilentlyContinue
}
# Copy minimal package.json for WebSocket
@"
{
  "name": "chess-ws-server",
  "version": "1.0.0",
  "type": "commonjs",
  "dependencies": {}
}
"@ | Out-File -FilePath $deployTemp\ws-dist\package.json -Encoding UTF8

# Detect and remove stale files from deployment cache
Write-Host "🔍 Checking for stale files..." -ForegroundColor Yellow
$staleFiles = @()

# Compare current deployment with manifest to find orphaned files
if ((Test-Path $deployTemp) -and $previousManifest.files) {
    $currentFiles = Get-ChildItem -Path $deployTemp -Recurse -File | ForEach-Object {
        $_.FullName.Replace("$PWD\$deployTemp\", "").Replace("\", "/")
    }
    
    foreach ($file in $currentFiles) {
        # Skip manifest and package.json files
        if ($file -match "package\.json$" -or $file -match "\.deploy-manifest\.json$") {
            continue
        }
        
        # Check if file exists in source
        $sourcePath = switch -Regex ($file) {
            "^app-dist/\.next/static/" { $file.Replace("app-dist/", "") }
            "^app-dist/public/" { $file.Replace("app-dist/", "") }
            "^ws-dist/" { "server/dist/" + ($file -replace "^ws-dist/", "") }
            default { $null }
        }
        
        if ($sourcePath -and -not (Test-Path $sourcePath)) {
            $staleFiles += "$deployTemp\$($file.Replace('/', '\'))"
        }
    }
    
    if ($staleFiles.Count -gt 0) {
        Write-Host "   Found $($staleFiles.Count) stale files to remove:" -ForegroundColor Yellow
        foreach ($staleFile in $staleFiles) {
            Write-Host "     - $($staleFile.Replace("$PWD\", ''))" -ForegroundColor Gray
            Remove-Item $staleFile -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "   No stale files detected" -ForegroundColor Green
    }
}

# Save current manifest for next run
$currentManifest | ConvertTo-Json -Depth 10 | Out-File -FilePath $manifestPath -Encoding UTF8

# Verification step - ensure critical files exist
Write-Host "✔️ Verifying deployment integrity..." -ForegroundColor Yellow
$criticalFiles = @(
    "$deployTemp\app-dist\server.js",
    "$deployTemp\app-dist\.next\BUILD_ID",
    "$deployTemp\ws-dist\ws-server.js"
)

$missingFiles = @()
foreach ($file in $criticalFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Critical files missing:" -ForegroundColor Red
    foreach ($missing in $missingFiles) {
        Write-Host "   - $($missing.Replace("$PWD\", ''))" -ForegroundColor Red
    }
    Write-Host "   Forcing full rebuild on next run..." -ForegroundColor Yellow
    
    # Mark for full rebuild next time
    if (Test-Path $deployTemp) {
        Remove-Item -Recurse -Force $deployTemp
    }
    exit 1
} else {
    Write-Host "   All critical files verified ✅" -ForegroundColor Green
}

# Transfer to Coolify builds directory
Write-Host "📤 Transferring files to Coolify..." -ForegroundColor Yellow
Write-Host "   Target: $COOLIFY_BUILDS" -ForegroundColor Gray

# First check if we can access the Coolify directory
if ($SudoPassword) {
    # Try with sudo if password provided (using sshpass for SSH auth)
    $testAccess = wsl sshpass -p "$SudoPassword" ssh ${ServerUser}@${ServerHost} "echo '$SudoPassword' | sudo -S ls -la /data/coolify/applications/ 2>&1"
    if ($testAccess -notlike "*Permission denied*" -and $testAccess -notlike "*cannot access*") {
        # We have access with sudo, try to create the directory
        wsl sshpass -p "$SudoPassword" ssh ${ServerUser}@${ServerHost} "echo '$SudoPassword' | sudo -S mkdir -p $COOLIFY_BUILDS && echo '$SudoPassword' | sudo -S chown -R ${ServerUser}:${ServerUser} $COOLIFY_BUILDS 2>/dev/null"
    }
}

# Test if we can write to the Coolify builds directory (using sshpass)
$canWrite = wsl sshpass -p "$SudoPassword" ssh ${ServerUser}@${ServerHost} "test -w $COOLIFY_BUILDS && echo 'writable' || echo 'not-writable'" 2>$null
if ($canWrite -ne "writable") {
    Write-Host "⚠️  Cannot write to Coolify directory. Using fallback location." -ForegroundColor Yellow
    # Use home directory as fallback
    $COOLIFY_BUILDS = "~/chess-app-builds"
    Write-Host "   Using fallback: $COOLIFY_BUILDS" -ForegroundColor Yellow
    
    # Create directory in home (using sshpass)
    wsl sshpass -p "$SudoPassword" ssh ${ServerUser}@${ServerHost} "mkdir -p $COOLIFY_BUILDS/app-dist $COOLIFY_BUILDS/ws-dist"
}

# rsync to builds directory (using sshpass for authentication)
# Note: We DO want node_modules for the standalone build!
wsl sshpass -p "$SudoPassword" rsync -avz --delete `
    --exclude '.git' `
    --exclude '*.log' `
    --exclude '.deploy-manifest.json' `
    $deployTemp/ `
    ${ServerUser}@${ServerHost}:${COOLIFY_BUILDS}/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ File transfer failed" -ForegroundColor Red
    exit 1
}

# Trigger Coolify redeploy
Write-Host "🔄 Triggering Coolify redeploy..." -ForegroundColor Yellow

# Check if API credentials are available
if ($CoolifyApiToken -and $CoolifyUrl) {
    Write-Host "   Using Coolify API to trigger redeploy..." -ForegroundColor Cyan
    
    try {
        # Coolify API v1 endpoint for redeploying an application
        $apiEndpoint = "$CoolifyUrl/api/v1/applications/$CoolifyAppId/restart"
        
        # Create headers with Bearer token
        $headers = @{
            "Authorization" = "Bearer $CoolifyApiToken"
            "Accept" = "application/json"
            "Content-Type" = "application/json"
        }
        
        # Make the API call to trigger redeploy
        $response = Invoke-RestMethod -Uri $apiEndpoint -Method POST -Headers $headers -ErrorAction Stop
        
        Write-Host "✅ Redeploy triggered successfully via API!" -ForegroundColor Green
        Write-Host "   Deployment ID: $($response.deployment_uuid)" -ForegroundColor Gray
        Write-Host "   Status: $($response.message)" -ForegroundColor Gray
        
        # Optional: Poll for deployment status
        if ($response.deployment_uuid) {
            Write-Host "   You can check deployment status at: $CoolifyUrl/project/$($response.project_uuid)/application/$CoolifyAppId" -ForegroundColor Cyan
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        
        # Check for common error scenarios
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "❌ API authentication failed. Please check your API token." -ForegroundColor Red
            Write-Host "   Get a new token from: $CoolifyUrl/security/api-tokens" -ForegroundColor Yellow
        }
        elseif ($_.Exception.Response.StatusCode -eq 404) {
            Write-Host "❌ Application not found. Please check the App ID: $CoolifyAppId" -ForegroundColor Red
            Write-Host "   Find your app ID in the Coolify dashboard URL" -ForegroundColor Yellow
        }
        else {
            Write-Host "⚠️  API call failed: $errorMessage" -ForegroundColor Yellow
            Write-Host "   Falling back to manual redeploy instructions..." -ForegroundColor Yellow
        }
        
        # Fallback to manual instructions
        Write-Host ""
        Write-Host "📍 Manual Redeploy Instructions:" -ForegroundColor Cyan
        Write-Host "   1. Go to: $CoolifyUrl" -ForegroundColor White
        Write-Host "   2. Navigate to your application" -ForegroundColor White
        Write-Host "   3. Click the 'Redeploy' button" -ForegroundColor White
    }
}
else {
    # No API credentials - provide manual instructions
    Write-Host "   API credentials not configured. Manual redeploy required." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📍 Manual Redeploy Instructions:" -ForegroundColor Cyan
    Write-Host "   1. Go to your Coolify dashboard" -ForegroundColor White
    Write-Host "   2. Navigate to your application (ID: $CoolifyAppId)" -ForegroundColor White
    Write-Host "   3. Click the 'Redeploy' button" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 To enable automatic redeploy, set these environment variables:" -ForegroundColor Yellow
    Write-Host "   `$env:COOLIFY_API_TOKEN = 'your-api-token'" -ForegroundColor Gray
    Write-Host "   `$env:COOLIFY_URL = 'https://your-coolify-domain.com'" -ForegroundColor Gray
    Write-Host "   (Get API token from Coolify > Settings > API Tokens)" -ForegroundColor Gray
}

# Clean up (but keep cache for next run)
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Yellow
# We keep .deploy-temp for incremental updates
# Only remove the manifest if deployment failed
if ($LASTEXITCODE -ne 0) {
    Remove-Item -Force $manifestPath -ErrorAction SilentlyContinue
}

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "📍 Files deployed to: $COOLIFY_BUILDS" -ForegroundColor Green

# Show final status based on whether API was used
if ($CoolifyApiToken -and $CoolifyUrl) {
    Write-Host "🚀 Application is being redeployed automatically" -ForegroundColor Green
} else {
    Write-Host "🔄 Remember to redeploy in Coolify UI to apply changes" -ForegroundColor Yellow
}