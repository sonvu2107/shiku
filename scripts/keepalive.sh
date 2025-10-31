#!/bin/bash

# =============================================================================
# Render Server Keepalive Script
# =============================================================================
# Script này ping server để tránh Render free tier sleep sau 15 phút
# Chạy script này trong background trên máy local hoặc VPS

# Configuration
SERVER_URL="https://api.shiku.click"
HEALTH_ENDPOINT="/api/health"
PING_INTERVAL=600  # 10 phút (600 giây)
LOG_FILE="keepalive.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to ping server
ping_server() {
    local url="${SERVER_URL}${HEALTH_ENDPOINT}"
    
    echo -e "${BLUE}🔄 Pinging: $url${NC}"
    
    # Measure response time
    start_time=$(date +%s%N)
    response=$(curl -s -w "%{http_code}" -o /tmp/keepalive_response.json --max-time 30 "$url" 2>/dev/null || echo "000")
    end_time=$(date +%s%N)
    
    duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    case $response in
        200)
            echo -e "${GREEN}✅ Server is alive! (${duration}ms)${NC}"
            
            # Parse and display server info
            if command -v jq &> /dev/null; then
                uptime=$(jq -r '.uptime // "unknown"' /tmp/keepalive_response.json 2>/dev/null)
                memory=$(jq -r '.memory.used // "unknown"' /tmp/keepalive_response.json 2>/dev/null)
                echo -e "${BLUE}📊 Uptime: $(printf "%.0f" $uptime)s | Memory: $memory${NC}"
            fi
            
            # Detect cold start
            if [ $duration -gt 5000 ]; then
                echo -e "${YELLOW}🥶 Cold start detected! (${duration}ms)${NC}"
                log "COLD_START - Response time: ${duration}ms"
            else
                log "SUCCESS - Response time: ${duration}ms"
            fi
            
            return 0
            ;;
        000)
            echo -e "${RED}❌ Server unreachable (timeout/connection error)${NC}"
            log "ERROR - Server unreachable"
            return 1
            ;;
        *)
            echo -e "${YELLOW}⚠️ Server responded with code: $response${NC}"
            log "WARNING - HTTP $response"
            return 1
            ;;
    esac
}

# Function to start keepalive
start_keepalive() {
    echo -e "${GREEN}🚀 Starting Render Keepalive Service${NC}"
    echo -e "${BLUE}📍 Target: $SERVER_URL${NC}"
    echo -e "${BLUE}⏱️  Interval: $PING_INTERVAL seconds${NC}"
    echo -e "${BLUE}📝 Log file: $LOG_FILE${NC}"
    echo ""
    
    log "Keepalive service started"
    
    # Initial ping
    ping_server
    
    # Setup periodic pinging
    while true; do
        sleep $PING_INTERVAL
        ping_server
    done
}

# Function to run once
ping_once() {
    echo -e "${GREEN}🚀 Single Ping Mode${NC}"
    ping_server
}

# Function to show help
show_help() {
    echo "Render Server Keepalive Script"
    echo ""
    echo "Usage:"
    echo "  $0 start     # Start continuous keepalive service"
    echo "  $0 ping      # Ping server once"
    echo "  $0 status    # Check current status"
    echo "  $0 help      # Show this help"
    echo ""
    echo "Configuration:"
    echo "  SERVER_URL: $SERVER_URL"
    echo "  PING_INTERVAL: $PING_INTERVAL seconds"
    echo "  LOG_FILE: $LOG_FILE"
}

# Function to check status
check_status() {
    echo -e "${BLUE}📊 Keepalive Status${NC}"
    echo ""
    echo "Server URL: $SERVER_URL"
    echo "Health endpoint: $HEALTH_ENDPOINT"
    echo "Ping interval: $PING_INTERVAL seconds"
    echo "Log file: $LOG_FILE"
    echo ""
    
    if [ -f "$LOG_FILE" ]; then
        echo "Recent log entries:"
        tail -5 "$LOG_FILE"
    else
        echo "No log file found"
    fi
}

# Main script logic
case ${1:-start} in
    start)
        start_keepalive
        ;;
    ping)
        ping_once
        ;;
    status)
        check_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac