# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY client ./client
COPY public ./public
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libvips42 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY server ./server
COPY public ./public
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data /app/public/uploads /app/public/tiles

EXPOSE 3000
VOLUME ["/app/data", "/app/public/uploads", "/app/public/tiles"]
CMD ["npm", "start"]
