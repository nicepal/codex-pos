FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "node src/database/migrate.js && node src/database/seed.js && node src/server.js"]
