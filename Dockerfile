FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 8000
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1
CMD ["npm", "start"]