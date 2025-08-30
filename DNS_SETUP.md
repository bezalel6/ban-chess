# DNS Setup for 2ban-2chess

## Cloudflare DNS Records (with Cloudflare Tunnel)

| Subdomain  | Type  | Points To                       | Proxy Status | Purpose   |
| ---------- | ----- | ------------------------------- | ------------ | --------- |
| `chess`    | CNAME | Your-Tunnel-ID.cfargotunnel.com | 🟠 Proxied   | Main app  |
| `ws-chess` | CNAME | Your-Tunnel-ID.cfargotunnel.com | 🟠 Proxied   | WebSocket |

## Full URLs

- Main App: `https://chess.rndev.site`
- WebSocket: `wss://ws-chess.rndev.site`

## Coolify Settings

In Coolify, set these domains for each service:

- **app** container → `chess.rndev.site`
- **websocket** container → `ws-chess.rndev.site`
- **redis** container → No domain (internal only)

## Important Notes (Cloudflare Tunnel Setup)

- **Both subdomains SHOULD be Proxied** (orange cloud) when using Cloudflare Tunnel
- Cloudflare Tunnel handles all SSL/TLS termination
- No certificates needed on your server
- WebSocket works through Cloudflare Tunnel (no special configuration needed)

## Cloudflare Tunnel Configuration

In your Cloudflare Tunnel, configure these services:

1. `chess.rndev.site` → `http://localhost:3000` (or your app port)
2. `ws-chess.rndev.site` → `http://localhost:3001` (WebSocket port)
