FROM node:10.13-alpine
ENV NODE_ENV production
WORKDIR /usr/src
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent

COPY . .
WORKDIR /usr/src/client
RUN npm install --production --silent 
RUN npm run build-prod --production --silent
WORKDIR /usr/src
EXPOSE 1337
CMD npm run start-server