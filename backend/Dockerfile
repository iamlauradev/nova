FROM node:20-alpine

# Dependencias para better-sqlite3 (necesita compilar)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js .

# Directorio para la base de datos SQLite
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
