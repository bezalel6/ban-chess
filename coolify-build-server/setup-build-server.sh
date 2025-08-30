#!/bin/bash

# Coolify Build Server Setup Script
# This script sets up a machine as a Coolify build server

set -e

echo "========================================"
echo "Coolify Build Server Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running with proper permissions
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root directly"
   exit 1
fi

# Check Docker installation
check_docker() {
    if command -v docker &> /dev/null; then
        print_status "Docker is installed: $(docker --version)"
    else
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        print_status "Docker daemon is running"
    else
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
}

# Install required packages
install_requirements() {
    print_status "Installing required packages..."
    
    # Update package list
    sudo apt-get update -qq
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        wget \
        git \
        jq \
        netcat-openbsd \
        ca-certificates \
        gnupg \
        lsb-release
    
    print_status "Required packages installed"
}

# Configure Docker for build server
configure_docker() {
    print_status "Configuring Docker for build server..."
    
    # Add current user to docker group if not already
    if ! groups $USER | grep -q docker; then
        sudo usermod -aG docker $USER
        print_warning "Added $USER to docker group. You may need to log out and back in."
    fi
    
    # Configure Docker daemon
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "metrics-addr": "0.0.0.0:9323",
    "experimental": true,
    "features": {
        "buildkit": true
    }
}
EOF
    
    # Restart Docker to apply changes
    sudo systemctl restart docker
    print_status "Docker configured for build operations"
}

# Install Coolify Build Agent
install_build_agent() {
    print_status "Installing Coolify Build Agent..."
    
    # Create coolify directory
    sudo mkdir -p /opt/coolify
    sudo chown $USER:$USER /opt/coolify
    
    # Download and run Coolify agent installation
    curl -fsSL https://raw.githubusercontent.com/coollabsio/coolify/main/scripts/install-agent.sh -o /tmp/install-agent.sh
    chmod +x /tmp/install-agent.sh
    
    # Run the installation
    sudo /tmp/install-agent.sh
    
    print_status "Coolify Build Agent installed"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Check if ufw is installed
    if command -v ufw &> /dev/null; then
        # Allow SSH
        sudo ufw allow 22/tcp
        
        # Allow Docker API (for Coolify to communicate)
        sudo ufw allow 2376/tcp
        
        # Allow Docker Swarm ports if needed
        sudo ufw allow 2377/tcp
        sudo ufw allow 7946/tcp
        sudo ufw allow 7946/udp
        sudo ufw allow 4789/udp
        
        # Allow Coolify agent port
        sudo ufw allow 8000/tcp
        
        print_status "Firewall rules configured"
    else
        print_warning "UFW not installed. Please configure firewall manually."
    fi
}

# Generate SSH key for Coolify
setup_ssh() {
    print_status "Setting up SSH for Coolify..."
    
    # Generate SSH key if it doesn't exist
    if [ ! -f ~/.ssh/id_rsa ]; then
        ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
        print_status "SSH key generated"
    else
        print_status "SSH key already exists"
    fi
    
    # Display public key
    echo ""
    echo "========================================"
    echo "SSH Public Key (add this to Coolify):"
    echo "========================================"
    cat ~/.ssh/id_rsa.pub
    echo "========================================"
    echo ""
}

# Create systemd service for build agent
create_service() {
    print_status "Creating systemd service..."
    
    sudo tee /etc/systemd/system/coolify-agent.service > /dev/null <<EOF
[Unit]
Description=Coolify Build Agent
After=docker.service
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=5
User=$USER
Environment="COOLIFY_AGENT_MODE=build"
ExecStart=/usr/local/bin/coolify-agent
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable coolify-agent
    sudo systemctl start coolify-agent
    
    print_status "Coolify agent service created and started"
}

# Display connection information
display_connection_info() {
    local ip_addr=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "========================================"
    echo "Build Server Setup Complete!"
    echo "========================================"
    echo ""
    echo "Connection Information:"
    echo "----------------------"
    echo "IP Address: $ip_addr"
    echo "SSH Port: 22"
    echo "Docker API Port: 2376"
    echo "Agent Port: 8000"
    echo ""
    echo "Next Steps:"
    echo "-----------"
    echo "1. Log into your Coolify dashboard"
    echo "2. Go to Servers → Add Server"
    echo "3. Choose 'Build Server' type"
    echo "4. Enter the following details:"
    echo "   - Name: $(hostname)"
    echo "   - IP: $ip_addr"
    echo "   - Port: 22"
    echo "   - User: $USER"
    echo "5. Add the SSH public key shown above"
    echo "6. Test the connection"
    echo ""
    echo "To check agent status:"
    echo "  sudo systemctl status coolify-agent"
    echo ""
    echo "To view agent logs:"
    echo "  sudo journalctl -u coolify-agent -f"
    echo ""
}

# Main execution
main() {
    echo "Starting Coolify Build Server setup..."
    echo ""
    
    check_docker
    install_requirements
    configure_docker
    configure_firewall
    setup_ssh
    install_build_agent
    create_service
    display_connection_info
    
    print_status "Setup complete!"
}

# Run main function
main