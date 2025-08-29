# Next.js Application Dockerfile - Optimized for Caching

# ===== Dependencies Stage =====
# This stage only rebuilds when package.json changes
FROM node:20-alpine AS deps
WORKDIR /app

# Copy ONLY package files first (most stable layer)
COPY package*.json ./

# Install production dependencies
# Cache bust only when package.json changes
RUN npm ci --only=production

# ===== Builder Stage =====
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies)
COPY package*.json ./
RUN npm ci

# Copy configuration files next (changes less frequently than source code)
COPY next.config.js ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./

# Copy public assets (changes less frequently)
COPY public ./public

# Copy source code last (changes most frequently)
COPY app ./app
COPY components ./components
COPY contexts ./contexts
COPY hooks ./hooks
COPY lib ./lib
COPY types ./types
COPY middleware.ts ./
COPY server ./server

# Build the application
# This layer only rebuilds when source code changes
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== Production Stage =====
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user first (stable layer)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy production dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

CMD ["node", "server.js"]