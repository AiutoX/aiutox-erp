FROM node:22.22.3-alpine AS development-dependencies-env
COPY . /app
WORKDIR /app
RUN npm ci

FROM node:22.22.3-alpine AS production-dependencies-env
COPY ./package.json package-lock.json /app/
WORKDIR /app
RUN npm ci --omit=dev --ignore-scripts

FROM node:22.22.3-alpine AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
WORKDIR /app
# Pasar variables de entorno para el build
# En producción: URLs completas (nginx proxea /api al backend interno)
ARG VITE_API_BASE_URL=https://erp.app.aiutox.com/api/v1
ARG VITE_WS_URL=wss://erp.app.aiutox.com/ws
ARG VITE_PUBLIC_URL=https://erp.app.aiutox.com
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build-env /app/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]