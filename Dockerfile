FROM node:20-alpine

WORKDIR /app
COPY package.json .
RUN npm install --production
COPY . .

EXPOSE 8000

ENTRYPOINT ["node", "entrypoint.js"]
CMD ["serve"]