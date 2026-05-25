FROM node:20-alpine

# Dependencias para better-sqlite3 (necesita compilar)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --chown=node:node . .

# Directorio para la base de datos SQLite
RUN mkdir -p /app/data && chown node:node /app/data

EXPOSE 3000

USER node

CMD ["node", "server.js"]
