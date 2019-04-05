const websocket = require('ws');
const http = require('http');
const uuid = require('uuid/v1');
const express = require('express');
const app = express();
const port = 1337;
let state = {};
let userSegmentState = {};
const server = http.createServer(app);
app.use(express.static(__dirname + '/static'));
const connectedClients = {};
const wss = new websocket.Server({ server });
const schedule = require('node-schedule');

const job = schedule.scheduleJob({ hour: 0, minute: 0 }, () => {
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
      state,userSegmentState
    })
  );
  state[id] = {}

  ws.on('message', message => {
    let res = JSON.parse(message)
    if (res.segmentStart) {
      if (userSegmentState) {
        state[id][uuid()] = userSegmentState[id];
      }
      userSegmentState[id] = [];
    }
    if (res.segmentEnd) {
      state[id][uuid()] = userSegmentState[id];
      delete userSegmentState[id];

    }
    userSegmentState[id].push(Object.assign(message, {
      date: new Date()
    }));

    sendToAll(JSON.stringify({ type: 'line', data: message }));
  });

  ws.on('close', (code, reason) => {
    state[id][uuid()] = userSegmentState[id]
    delete userSegmentState[id]
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
