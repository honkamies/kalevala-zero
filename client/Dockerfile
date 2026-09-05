FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM alpine:latest
WORKDIR /dist
COPY --from=builder /app/dist .
CMD ["echo", "Client assets built"]
