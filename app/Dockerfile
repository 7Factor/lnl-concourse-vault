# Build image.
FROM node:14 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src ./src

COPY server.js ./

RUN npm run build

# Run image
FROM node:alpine

WORKDIR /app

COPY --from=build /app/package*.json ./

RUN npm ci

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js .

ARG TFL_API_KEY
ENV TFL_API_KEY=$TFL_API_KEY

EXPOSE 3000

CMD ["node", "server.js"]
