const WebSocketServer = require('websocket').server;
const http = require('http');
const uuid = require('uuid/v1');
const port = 1338;
const state = [];
const server = http.createServer(function(request, response) {});
server.listen(port, () => {
  console.log('listening for sockets on ' + port);
});

wsServer = new WebSocketServer({
  httpServer: server
});

const connectedClients = {};

wsServer.on('request', function(request) {
  const connection = request.accept(null, request.origin);
  const id = uuid();

  connectedClients[id] = connection;
  console.log(`request for connection: ${id}`);
  connection.send(
    JSON.stringify({
      message: 'new client has connected',
      type: 'init',
      id,
      data: state
    })
  );

  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      state.push(message.utf8Data);
      sendToAll(JSON.stringify({ type: 'line', data: message.utf8Data }));
    }
  });

  connection.on('close', function(code, reason) {
    console.log(`closed connection ${id} code: ${code}`);
    delete connectedClients[id];
  });
});

function sendToAll(message) {
  Object.values(connectedClients).forEach(client => client.send(message));
}
