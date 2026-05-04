FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps || true
RUN npm run build -- --configuration=production || true

FROM nginx:alpine
COPY --from=builder /app/dist/taskflow-web/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]