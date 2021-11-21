FROM node:14.18.1-alpine3.13
ENV NODE_ENV production
ENV PORT 1337
ENV PATH /usr/app/src/client/node_modules/.bin:$PATH
WORKDIR /usr/app

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules .

COPY . .
RUN npm run build-client-prod --production --silent
RUN rm -rf ./src/client

EXPOSE 1337
CMD npm run start-server
