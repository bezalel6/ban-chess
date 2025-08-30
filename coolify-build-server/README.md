# Coolify Build Server Setup Guide

This guide explains how to set up a machine as a Coolify build server to handle CI/CD workloads.

## What is a Coolify Build Server?

A Coolify build server is a dedicated machine that:
- Handles Docker image building for deployments
- Runs CI/CD pipelines
- Offloads resource-intensive build tasks from the main Coolify instance
- Can be scaled horizontally for better performance

## Prerequisites

### System Requirements
- **OS**: Windows 10/11 Pro/Enterprise, Ubuntu 20.04+, or any Linux with Docker support
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 50GB+ free space for Docker images
- **CPU**: 2+ cores recommended
- **Network**: Stable internet connection with open ports

### Software Requirements
- Docker Desktop (Windows) or Docker Engine (Linux)
- Git
- SSH server
- PowerShell 5.0+ (Windows) or Bash (Linux)

## Quick Start

### Windows Setup

1. **Install Docker Desktop**
   ```powershell
   # Download from: https://www.docker.com/products/docker-desktop
   ```

2. **Run the setup script as Administrator**
   ```powershell
   cd coolify-build-server
   .\setup-build-server-windows.ps1
   ```

3. **Follow the prompts**
   - Enter your Coolify instance URL when asked
   - Optionally provide an API token for automatic registration

### Linux Setup

1. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. **Run the setup script**
   ```bash
   cd coolify-build-server
   chmod +x setup-build-server.sh
   ./setup-build-server.sh
   ```

## Manual Setup Steps

### 1. Configure Docker

Create or update `/etc/docker/daemon.json` (Linux) or `C:\ProgramData\docker\config\daemon.json` (Windows):

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "experimental": true,
  "features": {
    "buildkit": true
  },
  "hosts": ["tcp://0.0.0.0:2376", "unix:///var/run/docker.sock"]
}
```

Restart Docker:
```bash
# Linux
sudo systemctl restart docker

# Windows
Restart-Service Docker
```

### 2. Configure Firewall

Open the following ports:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH access |
| 2376 | TCP | Docker API |
| 8000 | TCP | Coolify Agent |
| 2377 | TCP | Docker Swarm (optional) |
| 7946 | TCP/UDP | Container network discovery |
| 4789 | UDP | Overlay network |

### 3. Setup SSH Access

Generate an SSH key if you don't have one:
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
```

Copy the public key to add to Coolify:
```bash
cat ~/.ssh/id_rsa.pub
```

### 4. Install Coolify Agent

#### Option A: Docker Container (Recommended)
```yaml
# docker-compose.yml
version: '3.8'
services:
  coolify-agent:
    image: coollabsio/coolify-agent:latest
    restart: unless-stopped
    environment:
      - COOLIFY_MODE=build
      - COOLIFY_URL=https://your-coolify-instance.com
      - COOLIFY_TOKEN=your-api-token
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/data
    ports:
      - "8000:8000"
```

Start the agent:
```bash
docker-compose up -d
```

#### Option B: Native Installation
```bash
# Download and install the agent
curl -fsSL https://raw.githubusercontent.com/coollabsio/coolify/main/scripts/install-agent.sh | sudo bash
```

## Connecting to Coolify

### Step 1: Access Coolify Dashboard
1. Log into your Coolify instance
2. Navigate to **Servers** → **Add Server**

### Step 2: Configure Build Server
Select **Build Server** as the server type and enter:

- **Name**: A descriptive name (e.g., "Windows Build Server")
- **IP Address**: Your machine's IP address
- **SSH Port**: 22
- **SSH User**: Your username
- **SSH Key**: Paste the public key from step 3

### Step 3: Advanced Settings
- **Docker API Port**: 2376
- **Agent Port**: 8000
- **Concurrent Builds**: 2-4 (based on your CPU cores)
- **Build Timeout**: 3600 seconds (adjust as needed)

### Step 4: Test Connection
Click **Test Connection** to verify:
- ✅ SSH connectivity
- ✅ Docker API access
- ✅ Agent communication

## Configuration Options

### Environment Variables for Agent

| Variable | Description | Default |
|----------|-------------|---------|
| `COOLIFY_MODE` | Agent mode: `build` or `deploy` | `build` |
| `COOLIFY_URL` | Your Coolify instance URL | Required |
| `COOLIFY_TOKEN` | API token for authentication | Optional |
| `MAX_CONCURRENT_BUILDS` | Maximum parallel builds | 2 |
| `BUILD_CACHE_SIZE` | Docker build cache size | 10GB |
| `LOG_LEVEL` | Logging verbosity | `info` |

### Resource Limits

Configure Docker resource limits in `docker-compose.yml`:
```yaml
services:
  coolify-agent:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

## Monitoring

### Check Agent Status

Windows:
```powershell
docker ps | Select-String coolify
docker logs coolify-agent --tail 50
```

Linux:
```bash
docker ps | grep coolify
docker logs coolify-agent --tail 50
```

### Monitor Resources
```bash
# CPU and Memory usage
docker stats coolify-agent

# Disk usage
docker system df

# Build history
docker images --filter "label=coolify.build=true"
```

### Health Checks
```bash
# Test Docker API
curl http://localhost:2376/version

# Test Agent API
curl http://localhost:8000/health

# Check connectivity from Coolify
ssh user@build-server-ip 'docker version'
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
- Check firewall rules
- Verify Docker is running
- Ensure SSH service is active

#### 2. Build Failures
- Check disk space: `df -h`
- Clean Docker cache: `docker system prune -a`
- Review agent logs: `docker logs coolify-agent`

#### 3. Slow Builds
- Increase CPU/RAM allocation
- Enable Docker BuildKit
- Use build cache effectively

#### 4. Agent Not Starting
```bash
# Check for port conflicts
netstat -tulpn | grep 8000

# Verify Docker socket permissions
ls -la /var/run/docker.sock

# Test Docker access
docker run --rm hello-world
```

### Log Locations

- **Agent Logs**: `docker logs coolify-agent`
- **Docker Logs**: `/var/log/docker.log` or Event Viewer (Windows)
- **Build Logs**: Available in Coolify dashboard

## Security Best Practices

1. **Use SSH Keys** - Never use password authentication
2. **Firewall Rules** - Only allow connections from Coolify IP
3. **Regular Updates** - Keep Docker and agent updated
4. **Resource Limits** - Prevent resource exhaustion
5. **Encrypted Communication** - Use TLS for Docker API
6. **Audit Logs** - Monitor access and build activities

## Scaling Build Servers

### Adding Multiple Build Servers
1. Set up additional machines following this guide
2. Add each as a separate server in Coolify
3. Configure load balancing in Coolify settings

### Recommended Configurations

| Workload | CPU | RAM | Storage | Concurrent Builds |
|----------|-----|-----|---------|-------------------|
| Light | 2 cores | 4GB | 50GB | 1-2 |
| Medium | 4 cores | 8GB | 100GB | 2-4 |
| Heavy | 8+ cores | 16GB+ | 200GB+ | 4-8 |

## Maintenance

### Daily Tasks
- Monitor disk space
- Check agent health

### Weekly Tasks
- Clean unused Docker images
- Review build logs for errors
- Update agent if new version available

### Monthly Tasks
- Full system updates
- Docker cache cleanup
- Performance review

### Cleanup Commands
```bash
# Remove unused images
docker image prune -a -f

# Remove build cache
docker builder prune -f

# Full cleanup (careful!)
docker system prune -a -f --volumes
```

## Support

### Official Resources
- [Coolify Documentation](https://coolify.io/docs)
- [Coolify GitHub](https://github.com/coollabsio/coolify)
- [Docker Documentation](https://docs.docker.com)

### Community
- [Coolify Discord](https://discord.gg/coolify)
- [GitHub Issues](https://github.com/coollabsio/coolify/issues)

## License

This setup guide is provided as-is for use with Coolify build servers.