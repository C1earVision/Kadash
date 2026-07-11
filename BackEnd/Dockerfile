# ---- Render Deployment Dockerfile for Node.js Backend ----
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Run DB initializer then start the server
# Render sets the PORT env var; the app already reads process.env.PORT
EXPOSE 3000

CMD ["sh", "-c", "node db/init-db.js && node app.js"]
