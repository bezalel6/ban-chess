# Coolify Build Server Setup for Windows
# Run this script as Administrator

param(
    [string]$CoolifyUrl = "",
    [string]$CoolifyToken = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Coolify Build Server Setup for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator. Restarting..." -ForegroundColor Red
    Start-Process PowerShell -Verb RunAs "-File `"$PSCommandPath`""
    exit
}

function Test-Docker {
    try {
        $dockerVersion = docker --version
        Write-Host "[✓] Docker is installed: $dockerVersion" -ForegroundColor Green
        
        # Check if Docker is running
        docker info | Out-Null
        Write-Host "[✓] Docker daemon is running" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[✗] Docker is not installed or not running" -ForegroundColor Red
        Write-Host "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        return $false
    }
}

function Install-Requirements {
    Write-Host "Installing required tools..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    }
    
    # Install required packages
    $packages = @("git", "curl", "wget", "openssh")
    foreach ($package in $packages) {
        if (!(Get-Command $package -ErrorAction SilentlyContinue)) {
            Write-Host "Installing $package..." -ForegroundColor Yellow
            choco install $package -y
        } else {
            Write-Host "[✓] $package is already installed" -ForegroundColor Green
        }
    }
}

function Configure-Docker {
    Write-Host "Configuring Docker for build server..." -ForegroundColor Yellow
    
    # Docker daemon configuration
    $dockerConfig = @{
        "log-driver" = "json-file"
        "log-opts" = @{
            "max-size" = "10m"
            "max-file" = "3"
        }
        "storage-driver" = "windowsfilter"
        "experimental" = $true
        "features" = @{
            "buildkit" = $true
        }
        "hosts" = @("tcp://0.0.0.0:2376", "npipe://")
        "insecure-registries" = @()
    }
    
    $dockerConfigPath = "$env:ProgramData\docker\config\daemon.json"
    $dockerConfigDir = Split-Path $dockerConfigPath -Parent
    
    if (!(Test-Path $dockerConfigDir)) {
        New-Item -ItemType Directory -Path $dockerConfigDir -Force | Out-Null
    }
    
    $dockerConfig | ConvertTo-Json -Depth 10 | Set-Content $dockerConfigPath
    Write-Host "[✓] Docker daemon configured" -ForegroundColor Green
    
    # Restart Docker
    Write-Host "Restarting Docker service..." -ForegroundColor Yellow
    Restart-Service Docker -Force
    Start-Sleep -Seconds 10
    Write-Host "[✓] Docker service restarted" -ForegroundColor Green
}

function Configure-Firewall {
    Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
    
    # Define firewall rules
    $rules = @(
        @{Name="Coolify-SSH"; Port=22; Protocol="TCP"},
        @{Name="Coolify-Docker-API"; Port=2376; Protocol="TCP"},
        @{Name="Coolify-Agent"; Port=8000; Protocol="TCP"},
        @{Name="Docker-Swarm-Management"; Port=2377; Protocol="TCP"},
        @{Name="Docker-Swarm-Communication-TCP"; Port=7946; Protocol="TCP"},
        @{Name="Docker-Swarm-Communication-UDP"; Port=7946; Protocol="UDP"},
        @{Name="Docker-Overlay-Network"; Port=4789; Protocol="UDP"}
    )
    
    foreach ($rule in $rules) {
        $existingRule = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
        if (!$existingRule) {
            New-NetFirewallRule -DisplayName $rule.Name `
                -Direction Inbound `
                -Protocol $rule.Protocol `
                -LocalPort $rule.Port `
                -Action Allow | Out-Null
            Write-Host "[✓] Firewall rule created: $($rule.Name)" -ForegroundColor Green
        } else {
            Write-Host "[✓] Firewall rule exists: $($rule.Name)" -ForegroundColor Green
        }
    }
}

function Setup-SSH {
    Write-Host "Setting up SSH..." -ForegroundColor Yellow
    
    # Install OpenSSH Server
    $sshFeature = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
    if ($sshFeature.State -ne "Installed") {
        Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
        Write-Host "[✓] OpenSSH Server installed" -ForegroundColor Green
    } else {
        Write-Host "[✓] OpenSSH Server already installed" -ForegroundColor Green
    }
    
    # Start and configure SSH service
    Start-Service sshd
    Set-Service -Name sshd -StartupType 'Automatic'
    Write-Host "[✓] SSH service started and set to automatic" -ForegroundColor Green
    
    # Generate SSH key if it doesn't exist
    $sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
    if (!(Test-Path $sshKeyPath)) {
        ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""'
        Write-Host "[✓] SSH key generated" -ForegroundColor Green
    } else {
        Write-Host "[✓] SSH key already exists" -ForegroundColor Green
    }
    
    # Display public key
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "SSH Public Key (add this to Coolify):" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Get-Content "$sshKeyPath.pub"
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Install-CoolifyAgent {
    Write-Host "Installing Coolify Build Agent..." -ForegroundColor Yellow
    
    # Create directory for Coolify
    $coolifyDir = "C:\coolify"
    if (!(Test-Path $coolifyDir)) {
        New-Item -ItemType Directory -Path $coolifyDir -Force | Out-Null
    }
    
    # Download Coolify agent
    $agentUrl = "https://github.com/coollabsio/coolify/releases/latest/download/coolify-agent-windows.exe"
    $agentPath = "$coolifyDir\coolify-agent.exe"
    
    try {
        Invoke-WebRequest -Uri $agentUrl -OutFile $agentPath
        Write-Host "[✓] Coolify agent downloaded" -ForegroundColor Green
    }
    catch {
        Write-Host "[!] Could not download Coolify agent. Will use Docker container instead." -ForegroundColor Yellow
        
        # Run Coolify agent as Docker container
        docker pull coollabsio/coolify-agent:latest
        
        # Create docker-compose file for agent
        $dockerCompose = @"
version: '3.8'
services:
  coolify-agent:
    image: coollabsio/coolify-agent:latest
    restart: unless-stopped
    environment:
      - COOLIFY_MODE=build
      - COOLIFY_URL=$CoolifyUrl
      - COOLIFY_TOKEN=$CoolifyToken
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - C:\coolify\data:/data
    ports:
      - "8000:8000"
    networks:
      - coolify
      
networks:
  coolify:
    driver: bridge
"@
        $dockerCompose | Set-Content "$coolifyDir\docker-compose.yml"
        
        # Start the agent
        Push-Location $coolifyDir
        docker-compose up -d
        Pop-Location
        
        Write-Host "[✓] Coolify agent running as Docker container" -ForegroundColor Green
    }
}

function Create-WindowsService {
    Write-Host "Creating Windows service for Coolify agent..." -ForegroundColor Yellow
    
    # Create a scheduled task to run Docker container at startup
    $taskName = "CoolifyBuildAgent"
    $taskExists = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    if (!$taskExists) {
        $action = New-ScheduledTaskAction -Execute "docker" -Argument "start coolify-agent"
        $trigger = New-ScheduledTaskTrigger -AtStartup
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -RestartInterval (New-TimeSpan -Minutes 1) -RestartCount 3
        
        Register-ScheduledTask -TaskName $taskName `
            -Action $action `
            -Trigger $trigger `
            -Principal $principal `
            -Settings $settings `
            -Description "Coolify Build Agent Service" | Out-Null
            
        Write-Host "[✓] Windows scheduled task created" -ForegroundColor Green
    } else {
        Write-Host "[✓] Scheduled task already exists" -ForegroundColor Green
    }
}

function Get-ConnectionInfo {
    # Get local IP address
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Ethernet -ErrorAction SilentlyContinue).IPAddress
    if (!$localIP) {
        $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.PrefixOrigin -ne "WellKnown"} | Select-Object -First 1).IPAddress
    }
    
    # Get hostname
    $hostname = $env:COMPUTERNAME
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Build Server Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Connection Information:" -ForegroundColor Cyan
    Write-Host "----------------------" -ForegroundColor Cyan
    Write-Host "Hostname: $hostname"
    Write-Host "IP Address: $localIP"
    Write-Host "SSH Port: 22"
    Write-Host "Docker API Port: 2376"
    Write-Host "Agent Port: 8000"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "-----------" -ForegroundColor Yellow
    Write-Host "1. Log into your Coolify dashboard"
    Write-Host "2. Go to Servers -> Add Server"
    Write-Host "3. Choose 'Build Server' type"
    Write-Host "4. Enter the following details:"
    Write-Host "   - Name: $hostname"
    Write-Host "   - IP: $localIP"
    Write-Host "   - Port: 22"
    Write-Host "   - User: $env:USERNAME"
    Write-Host "5. Add the SSH public key shown above"
    Write-Host "6. Test the connection"
    Write-Host ""
    Write-Host "To check agent status:" -ForegroundColor Cyan
    Write-Host "  docker ps -a | Select-String coolify"
    Write-Host ""
    Write-Host "To view agent logs:" -ForegroundColor Cyan
    Write-Host "  docker logs coolify-agent -f"
    Write-Host ""
}

# Main execution
Write-Host "Starting Coolify Build Server setup..." -ForegroundColor Cyan
Write-Host ""

# Check Docker first
if (!(Test-Docker)) {
    Write-Host "Please install Docker Desktop and run this script again." -ForegroundColor Red
    exit 1
}

# Run setup steps
Install-Requirements
Configure-Docker
Configure-Firewall
Setup-SSH

# Install agent (request Coolify URL if not provided)
if (!$CoolifyUrl) {
    $CoolifyUrl = Read-Host "Enter your Coolify instance URL (e.g., https://coolify.example.com)"
}
if (!$CoolifyToken) {
    $CoolifyToken = Read-Host "Enter your Coolify API token (optional)" -AsSecureString
}

Install-CoolifyAgent
Create-WindowsService
Get-ConnectionInfo

Write-Host "[✓] Setup complete!" -ForegroundColor Green