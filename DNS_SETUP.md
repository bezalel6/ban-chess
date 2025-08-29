# DNS Setup for 2ban-2chess

## Cloudflare DNS Records

| Subdomain | Type | Points To | Proxy Status | Purpose |
|-----------|------|-----------|--------------|---------|
| `chess` | A | Your-Server-IP | 🟠 Proxied | Main app |
| `ws.chess` | A | Your-Server-IP | ⚪ DNS Only | WebSocket |

## Full URLs
- Main App: `https://chess.rndev.site`
- WebSocket: `wss://ws.chess.rndev.site`

## Coolify Settings
In Coolify, set these domains for each service:
- **app** container → `chess.rndev.site`
- **websocket** container → `ws.chess.rndev.site`
- **redis** container → No domain (internal only)

## Important Notes
- WebSocket subdomain MUST be "DNS Only" (gray cloud) unless you have Cloudflare Pro
- All records point to the same Coolify server IP
- Coolify's Traefik proxy handles routing to correct containers