FROM node:20-alpine

WORKDIR /app

# Copy package specifications
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source code
COPY frontend/ .

# Build Next.js production bundle
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start"]

