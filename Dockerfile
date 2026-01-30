FROM node:18-alpine

WORKDIR /usr/src/app

# install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production --silent --no-progress

COPY . .

ENV API_PORT=8080
EXPOSE ${API_PORT}

CMD ["node", "src/app.js"]
