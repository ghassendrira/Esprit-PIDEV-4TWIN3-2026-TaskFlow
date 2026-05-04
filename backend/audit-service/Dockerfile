FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps || true
RUN npm run build || true
EXPOSE 3006
CMD ["node", "dist/main"]