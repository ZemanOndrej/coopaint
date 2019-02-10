const websocket = require('ws');
const http = require('http');
const uuid = require('uuid/v1');
const express = require('express');
const app = express();
const port = 1337;
let state = [];
const server = http.createServer(app);
app.use(express.static(__dirname + '/static'));
const connectedClients = {};
const wss = new websocket.Server({ server });
const schedule = require('node-schedule');

const job = schedule.scheduleJob('0 0 * * *', () => {
  const dateOld = new Date().getDate() - 2;
  state = state.filter(({ date }) => date.getDate() > dateOld);
});

wss.on('connection', ws => {
  const id = uuid();

  connectedClients[id] = ws;
  console.log(`request for connection: ${id}`);
  ws.send(
    JSON.stringify({
      message: 'new client has connected',
      type: 'init',
      id,
      data: state
    })
  );

  ws.on('message', message => {
    message.date = new Date();
    state.push(message);
    sendToAll(JSON.stringify({ type: 'line', data: message }));
  });

  ws.on('close', (code, reason) => {
    console.log(`closed connection ${id} code: ${code}`);
    delete connectedClients[id];
  });
});

function sendToAll(message) {
  Object.values(connectedClients).forEach(client => {
    if (client.readyState === websocket.OPEN) {
      client.send(message);
    }
  });
}

server.listen(port, () => console.log(`Server is listening on port ${port}!`));
