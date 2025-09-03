# Kill zombie processes related to 2ban-2chess development
param(
    [switch]$DryRun = $false
)

Write-Host "================================================" -ForegroundColor Red
Write-Host "2BAN-2CHESS ZOMBIE PROCESS KILLER" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red

if ($DryRun) {
    Write-Host "DRY RUN MODE - No processes will be killed" -ForegroundColor Yellow
}

$killedCount = 0
$freedRAM = 0

# Find all processes related to our project
$targetProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match '2ban-2chess.*(tsx|next|ws-server|dev:ws|dev:next)' -or
    $_.CommandLine -match 'tsx.*watch.*server/ws-server' -or
    $_.CommandLine -match 'next.*dev' -and $_.CommandLine -match '2ban-2chess'
}

if ($targetProcesses.Count -eq 0) {
    Write-Host "`nNo zombie processes found!" -ForegroundColor Green
    exit 0
}

Write-Host "`nFound $($targetProcesses.Count) processes to kill:" -ForegroundColor Yellow

foreach ($proc in $targetProcesses) {
    try {
        $process = Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
        if ($process) {
            $ramMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            $freedRAM += $ramMB
            
            Write-Host "  PID: $($proc.ProcessId) | $($proc.Name) | RAM: ${ramMB}MB"
            Write-Host "    $($proc.CommandLine.Substring(0, [Math]::Min($proc.CommandLine.Length, 100)))" -ForegroundColor Gray
            
            if (-not $DryRun) {
                # Kill the process and its tree
                if ($proc.Name -eq "node.exe") {
                    # For Node processes, use taskkill to get the entire tree
                    $result = Start-Process -FilePath "taskkill" -ArgumentList "/PID", $proc.ProcessId, "/T", "/F" -NoNewWindow -Wait -PassThru
                    if ($result.ExitCode -eq 0) {
                        Write-Host "    ✓ Killed successfully" -ForegroundColor Green
                        $killedCount++
                    }
                } else {
                    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
                    Write-Host "    ✓ Killed successfully" -ForegroundColor Green
                    $killedCount++
                }
            }
        }
    } catch {
        Write-Host "    ✗ Failed to kill: $_" -ForegroundColor Red
    }
}

# Also kill any orphaned bash processes from npm run commands
$bashProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'bash.exe' -and $_.CommandLine -match 'npm run dev:'
}

if ($bashProcesses.Count -gt 0) {
    Write-Host "`nFound $($bashProcesses.Count) orphaned bash processes:" -ForegroundColor Yellow
    foreach ($proc in $bashProcesses) {
        try {
            $process = Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
            if ($process) {
                $ramMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
                $freedRAM += $ramMB
                
                Write-Host "  PID: $($proc.ProcessId) | bash.exe | RAM: ${ramMB}MB"
                
                if (-not $DryRun) {
                    Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
                    Write-Host "    ✓ Killed successfully" -ForegroundColor Green
                    $killedCount++
                }
            }
        } catch {
            Write-Host "    ✗ Failed to kill: $_" -ForegroundColor Red
        }
    }
}

# Summary
Write-Host "`n================================================" -ForegroundColor Green
if ($DryRun) {
    Write-Host "DRY RUN COMPLETE" -ForegroundColor Yellow
    Write-Host "Would have killed $($targetProcesses.Count + $bashProcesses.Count) processes" -ForegroundColor Yellow
    Write-Host "Would have freed approximately $([math]::Round($freedRAM, 2))MB of RAM" -ForegroundColor Yellow
} else {
    Write-Host "CLEANUP COMPLETE" -ForegroundColor Green
    Write-Host "Killed $killedCount processes" -ForegroundColor Green
    Write-Host "Freed approximately $([math]::Round($freedRAM, 2))MB of RAM" -ForegroundColor Green
}

# Check if any processes are still running
$remaining = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match '2ban-2chess.*(tsx|next|ws-server)'
}

if ($remaining.Count -gt 0) {
    Write-Host "`nWARNING: $($remaining.Count) processes still running!" -ForegroundColor Red
    Write-Host "You may need to restart your computer to fully clean up." -ForegroundColor Yellow
}