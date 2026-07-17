FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=
ARG VITE_AUTH_ENABLED=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED

COPY package.json package-lock.json* ./

RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
