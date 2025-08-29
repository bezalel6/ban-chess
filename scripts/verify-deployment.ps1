# Deployment Verification Script
# Tests that the production deployment is working correctly

param(
    [string]$BaseUrl = "https://chess.rndev.site",
    [switch]$Verbose
)

Write-Host "🔍 Verifying deployment at $BaseUrl" -ForegroundColor Cyan
Write-Host "=" * 50

$results = @()
$allPassed = $true

# Test function
function Test-Endpoint {
    param(
        [string]$Path,
        [string]$Description,
        [int]$ExpectedStatus = 200
    )
    
    $url = "$BaseUrl$Path"
    Write-Host "Testing: $Description" -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $status = $response.StatusCode
    }
    catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($null -eq $status) {
            $status = 0
            $error = $_.Exception.Message
        }
    }
    
    $passed = $status -eq $ExpectedStatus
    
    if ($passed) {
        Write-Host " ✅ OK ($status)" -ForegroundColor Green
    }
    else {
        Write-Host " ❌ FAILED (Expected: $ExpectedStatus, Got: $status)" -ForegroundColor Red
        $script:allPassed = $false
        if ($Verbose -and $error) {
            Write-Host "  Error: $error" -ForegroundColor Yellow
        }
    }
    
    $script:results += [PSCustomObject]@{
        Path = $Path
        Description = $Description
        Expected = $ExpectedStatus
        Actual = $status
        Passed = $passed
    }
}

# Test static pages
Write-Host "`n📄 Testing Static Pages:" -ForegroundColor Yellow
Test-Endpoint "/" "Homepage"
Test-Endpoint "/play" "Play page"
Test-Endpoint "/auth/signin" "Sign in page"
Test-Endpoint "/settings" "Settings page"
Test-Endpoint "/lobby" "Lobby page"

# Test API routes
Write-Host "`n🔌 Testing API Routes:" -ForegroundColor Yellow
Test-Endpoint "/api/auth/providers" "Auth providers API"
Test-Endpoint "/api/health" "Health check API"

# Test authentication endpoints
Write-Host "`n🔐 Testing Auth Endpoints:" -ForegroundColor Yellow
Test-Endpoint "/api/auth/signin" "Auth signin endpoint" 401
Test-Endpoint "/api/auth/session" "Auth session endpoint"
Test-Endpoint "/api/auth/csrf" "Auth CSRF endpoint"

# Test WebSocket endpoint
Write-Host "`n🌐 Testing WebSocket:" -ForegroundColor Yellow
$wsUrl = "https://ws-chess.rndev.site"
Write-Host "Testing: WebSocket server at $wsUrl" -NoNewline
try {
    $wsResponse = Invoke-WebRequest -Uri $wsUrl -Method GET -ErrorAction SilentlyContinue
    # WebSocket endpoints typically return 426 Upgrade Required for regular HTTP requests
    if ($wsResponse.StatusCode -eq 426 -or $wsResponse.StatusCode -eq 200) {
        Write-Host " ✅ OK (Server responding)" -ForegroundColor Green
    }
    else {
        Write-Host " ⚠️  Unexpected status: $($wsResponse.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    $wsStatus = $_.Exception.Response.StatusCode.value__
    if ($wsStatus -eq 426) {
        Write-Host " ✅ OK (WebSocket upgrade required)" -ForegroundColor Green
    }
    else {
        Write-Host " ❌ FAILED (Status: $wsStatus)" -ForegroundColor Red
        $allPassed = $false
    }
}

# Summary
Write-Host "`n" + ("=" * 50)
Write-Host "📊 Summary:" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Passed }).Count
$failed = ($results | Where-Object { -not $_.Passed }).Count

Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })

if ($allPassed) {
    Write-Host "`n✅ All tests passed! Deployment verified successfully." -ForegroundColor Green
}
else {
    Write-Host "`n❌ Some tests failed. Please check the deployment." -ForegroundColor Red
    
    if ($Verbose) {
        Write-Host "`nFailed endpoints:" -ForegroundColor Yellow
        $results | Where-Object { -not $_.Passed } | Format-Table -AutoSize
    }
}

# Return exit code for CI/CD
exit $(if ($allPassed) { 0 } else { 1 })