FROM node:alpine
WORKDIR /usr/src/app

copy package.json package-lock.json .

RUN npm install

COPY . .
EXPOSE 80
CMD [ "node", "server.js" ]