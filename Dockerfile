# Use the official Node.js 20 image.
FROM node:20-alpine

# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./

# Copy prisma schema for generation
COPY prisma ./prisma

# Install production dependencies.
RUN npm ci

# Generate Prisma client - CRITICAL for production
RUN npx prisma generate

# Copy local code to the container image.
COPY . .

# Build the application.
RUN npm run build

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change the owner of the .next directory
RUN chown -R nextjs:nodejs .next

# Switch to the non-root user
USER nextjs

# Run the web service on container startup.
CMD ["npm", "start"]
