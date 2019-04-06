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
      state: drawDataService.getAllLines()
    })
  );
  drawDataService.initUserState(id);

  ws.on('message', json => {
    let message = JSON.parse(json);
    if (message.type === 'undo') {
      const segmentId = drawDataService.undoLastUserSegment(id);
      sendToAll(JSON.stringify({ type: 'undo', segmentId }));
    } else if (message.type === 'redo') {
      // drawDataService.redoLastUserSegment(id);
      // sendToAll(JSON.stringify({ type: 'redo', segmentId }));
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

function sendToAll(message) {
  Object.values(connectedClients).forEach(client => {
    if (client.readyState === websocket.OPEN) {
      client.send(message);
    }
  });
}

server.listen(port, () => console.log(`Server is listening on port ${port}!`));
