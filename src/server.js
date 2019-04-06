const websocket = require('ws');
const http = require('http');
const uuid = require('uuid/v1');
const express = require('express');
const ds = require('./drawDataService');
const schedule = require('node-schedule');

const app = express();
const port = 1337;
const drawDataService = new ds.DrawDataService();
const server = http.createServer(app);
app.use(express.static(__dirname + '/static'));
const connectedClients = {};
const wss = new websocket.Server({ server });

const job = schedule.scheduleJob({ hour: 0, minute: 0 }, cleanUp);

wss.on('connection', (ws, req) => {
  let id = null;
  if (req.headers.cookie) {
    let cookie = req.headers.cookie.split('=');
    id = cookie[0] === 'X-Authorization' && cookie[1];
    console.log(id);
  }
  const isNew = !drawDataService.checkIfUserExists(id);
  let state = { lines: drawDataService.getAllLines() };
  if (isNew) {
    id = uuid();
    drawDataService.initUserState(id);
  } else {
    Object.assign(state, drawDataService.getUserState(id));
  }
  console.log(`request for connection: ${id} isNew? ${isNew}`);

  connectedClients[id] = ws;
  ws.send(
    JSON.stringify({
      message: 'new client has connected',
      type: 'init',
      id,
      state,
      isNew
    })
  );

  ws.on('message', json => {
    let message = JSON.parse(json);
    if (message.type === 'undo') {
      const segmentId = drawDataService.undoLastUserSegment(id);
      sendToAll(JSON.stringify({ type: 'undo', segmentId }));
    } else if (message.type === 'redo') {
      const segment = drawDataService.redoLastUserSegment(id);
      sendToAll(JSON.stringify({ type: 'redo', segment }));
    } else if (message.type === 'newLine') {
      let { line } = message;
      if (line.segmentStart) {
        drawDataService.startUserSegment(id);
      }
      const lineSegment = drawDataService.addLineFromUser(id, line);
      sendToAll(JSON.stringify({ type: 'newLine', data: lineSegment }));
      if (line.segmentEnd) {
        drawDataService.finishUserSegment(id);
      }
    }
  });

  ws.on('close', (code, reason) => {
    drawDataService.endUserActivity(id);
    console.log(`closed connection ${id} code: ${code}`);
    delete connectedClients[id];
  });
});

function cleanUp() {
  const inactiveUsers = drawDataService.cleanOlderSegments(
    new Date(new Date() - 2 * 24 * 60 * 60 * 1000)
  );
  inactiveUsers.forEach(userId => {
    connectedClients[userId].close();
    delete connectedClients[userId];
  });
  sendToAll(
    JSON.stringify({
      type: 'cleanup',
      state: { lines: drawDataService.getAllLines() }
    })
  );
}

function sendToAll(message) {
  Object.values(connectedClients).forEach(client => {
    if (client.readyState === websocket.OPEN) {
      client.send(message);
    }
  });
}

server.listen(port, () => console.log(`Server is listening on port ${port}!`));
