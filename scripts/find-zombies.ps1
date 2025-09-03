# Find potential zombie processes related to 2ban-2chess development
Write-Host "Searching for potential zombie processes..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Get all Node.js processes
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -match 'node' }
Write-Host "`nNode.js Processes ($($nodeProcesses.Count) found):" -ForegroundColor Yellow

foreach ($proc in $nodeProcesses) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        $workingSet = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        
        Write-Host "  PID: $($proc.Id) | RAM: ${workingSet}MB | Started: $($proc.StartTime)"
        if ($cmdLine) {
            # Check if this is related to our project
            if ($cmdLine -match '2ban-2chess|tsx|next|ws-server|dev-server') {
                Write-Host "    -> RELATED TO 2BAN-2CHESS: $cmdLine" -ForegroundColor Red
            } else {
                Write-Host "    Command: $($cmdLine.Substring(0, [Math]::Min($cmdLine.Length, 100)))" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "    (Unable to get details)" -ForegroundColor DarkGray
    }
}

# Get all npm processes
$npmProcesses = Get-Process | Where-Object { $_.ProcessName -match 'npm' }
if ($npmProcesses.Count -gt 0) {
    Write-Host "`nNPM Processes ($($npmProcesses.Count) found):" -ForegroundColor Yellow
    foreach ($proc in $npmProcesses) {
        $workingSet = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        Write-Host "  PID: $($proc.Id) | RAM: ${workingSet}MB | Started: $($proc.StartTime)"
    }
}

# Get all tsx processes
$tsxProcesses = Get-Process | Where-Object { $_.ProcessName -match 'tsx' }
if ($tsxProcesses.Count -gt 0) {
    Write-Host "`nTSX Processes ($($tsxProcesses.Count) found):" -ForegroundColor Yellow
    foreach ($proc in $tsxProcesses) {
        $workingSet = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        Write-Host "  PID: $($proc.Id) | RAM: ${workingSet}MB | Started: $($proc.StartTime)"
    }
}

# Check for processes with command lines containing our keywords
Write-Host "`nSearching for processes by command line..." -ForegroundColor Cyan
$allProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match '2ban-2chess|ws-server|dev:next|dev:ws|next dev|tsx watch'
}

if ($allProcesses.Count -gt 0) {
    Write-Host "Found $($allProcesses.Count) processes with matching command lines:" -ForegroundColor Yellow
    foreach ($proc in $allProcesses) {
        try {
            $process = Get-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
            if ($process) {
                $workingSet = [math]::Round($process.WorkingSet64 / 1MB, 2)
                Write-Host "  PID: $($proc.ProcessId) | Name: $($proc.Name) | RAM: ${workingSet}MB"
                Write-Host "    Command: $($proc.CommandLine)" -ForegroundColor Red
            }
        } catch {
            # Process might have already exited
        }
    }
}

# Check for Redis processes
$redisProcesses = Get-Process | Where-Object { $_.ProcessName -match 'redis' }
if ($redisProcesses.Count -gt 0) {
    Write-Host "`nRedis Processes ($($redisProcesses.Count) found):" -ForegroundColor Yellow
    foreach ($proc in $redisProcesses) {
        $workingSet = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        Write-Host "  PID: $($proc.Id) | RAM: ${workingSet}MB | Started: $($proc.StartTime)"
    }
}

# Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Green
$totalNodeRAM = ($nodeProcesses | Measure-Object WorkingSet64 -Sum).Sum / 1MB
Write-Host "  Total Node.js processes: $($nodeProcesses.Count) using $([math]::Round($totalNodeRAM, 2))MB RAM"

# Suggest cleanup
if ($allProcesses.Count -gt 0 -or $nodeProcesses.Count -gt 5) {
    Write-Host "`nWARNING: Found potential zombie processes!" -ForegroundColor Red
    Write-Host "To kill all Node.js processes related to this project, run:" -ForegroundColor Yellow
    Write-Host '  Get-Process node | Stop-Process -Force' -ForegroundColor White
    Write-Host "Or to kill specific PIDs:" -ForegroundColor Yellow
    Write-Host '  Stop-Process -Id <PID> -Force' -ForegroundColor White
}