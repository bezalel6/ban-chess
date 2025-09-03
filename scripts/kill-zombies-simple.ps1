# Simple script to kill zombie 2ban-2chess processes
Write-Host "Killing zombie processes..." -ForegroundColor Red

# Kill all node processes with our project in the command line
$killed = 0
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    $id = $_.Id
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $id").CommandLine
        if ($cmdLine -match '2ban-2chess|ws-server|tsx watch') {
            Write-Host "Killing PID $id : $($_.ProcessName)" -ForegroundColor Yellow
            taskkill /PID $id /T /F 2>$null
            $killed++
        }
    } catch {}
}

# Kill orphaned bash processes
Get-Process bash -ErrorAction SilentlyContinue | ForEach-Object {
    $id = $_.Id
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $id").CommandLine
        if ($cmdLine -match 'npm run dev:') {
            Write-Host "Killing orphaned bash PID $id" -ForegroundColor Yellow
            Stop-Process -Id $id -Force
            $killed++
        }
    } catch {}
}

# Kill orphaned cmd processes
Get-Process cmd -ErrorAction SilentlyContinue | ForEach-Object {
    $id = $_.Id
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $id").CommandLine
        if ($cmdLine -match 'portio.*tsx|next dev') {
            Write-Host "Killing orphaned cmd PID $id" -ForegroundColor Yellow
            Stop-Process -Id $id -Force
            $killed++
        }
    } catch {}
}

Write-Host "Killed $killed zombie processes" -ForegroundColor Green