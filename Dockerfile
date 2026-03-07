#Use Official Node.js runtime as base image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for effieient caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the source code
COPY . .

# Expose the port Taskflow runs on
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
