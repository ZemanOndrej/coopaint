(function() {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  const connection = new WebSocket('ws://' + window.location.host);
  const canvas = document.getElementById('canvas');
  const closeSettingsBtn = document.getElementById('close-settings');
  const settings = document.getElementById('settings');
  const colorSelect = document.getElementById('color-select');
  const redoButton = document.getElementById('redo-button');
  const undoButton = document.getElementById('undo-button');
  const ctx = canvas.getContext('2d');
  const penSizeInput = document.getElementById('pen-size-input');
  ctx.canvas.width = 1800;
  ctx.canvas.height = 950;
  const defaultColor = '#000000';
  const defaultPenSize = 1;
  colorSelect.value = defaultColor;
  penSizeInput.value = defaultPenSize;
  let mouseDown = false;
  let mouseMove = false;
  let mouseDownEvent = false;
  let segmentEnd = false;
  let lastCtxCoords = { x: null, y: null };
  let currentMousePos = { x: null, y: null };
  let sentSegments=0;

  function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function drawLine(x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.lineWidth = penSizeInput.value;
    ctx.strokeStyle = color || defaultColor;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function parseAndDrawLine(data) {
    let line = JSON.parse(data);
    let { x1, y1, x2, y2, color } = line;
    drawLine(x1, y1, x2, y2, color);
  }

  function closeSettings() {
    settings.classList.add('not-active');
  }

  function sendLoop() {
    if ((mouseDown && mouseMove && lastCtxCoords) || segmentEnd) {
      console.log(mouseDown || segmentEnd);
      let message = {
        x1: lastCtxCoords.x,
        y1: lastCtxCoords.y,
        x2: currentMousePos.x,
        y2: currentMousePos.y,
        color: colorSelect.value || defaultColor
      };
      if (mouseDownEvent) {
        message['segmentStart'] = true;
        mouseDownEvent = false;
        console.log('segmentStart');
      }
      if (segmentEnd) {
        message['segmentEnd'] = true;
        segmentEnd = false;
        sentSegments++;
        console.log('segmentEnd');
      }

      connection.send(JSON.stringify(message));
      lastCtxCoords = currentMousePos;
      mouseMove = false;
    }
  }

  undoButton.addEventListener('click', e => {
    connection.send(JSON.stringify({ type: 'undo' }));
  });

  canvas.addEventListener('mouseout', e => {
    if (mouseDown) {
      mouseDown = false;
      segmentEnd = true;
    }
  });

  canvas.addEventListener('mousedown', e => {
    if (e.which == 1) {
      lastCtxCoords = getMousePos(e);
      mouseDown = true;
      mouseDownEvent = true;
      ctx.moveTo(lastCtxCoords.x, lastCtxCoords.y);
    }
  });

  penSizeInput.addEventListener('change', e => {});

  canvas.addEventListener('mouseup', e => {
    if (e.which == 1 && mouseDown) {
      segmentEnd = true;
    }
    mouseDown = false;
    if (e.which == 3) {
      const cursorCoords = getMousePos(e);
      settings.style.left = `${cursorCoords.x - 150}px`;
      settings.style.top = `${cursorCoords.y - 75}px`;
      settings.classList.remove('not-active');
    }
  });

  canvas.addEventListener('mousemove', e => {
    mouseMove = true;
    currentMousePos = getMousePos(e);
  });

  closeSettingsBtn.addEventListener('click', closeSettings);
  colorSelect.addEventListener('change', closeSettings);

  connection.onopen = e => {
    console.log('Successfully connected to websocket server!');
  };

  connection.onerror = error => {};

  connection.onmessage = message => {
    const json = JSON.parse(message.data);
    if (json.type === 'init' && json.id) {
      console.log(json);
      let lines = Object.values(Object.values(json.state));
      lines.forEach(({ line }) => {
        parseAndDrawLine(line);
      });
    } else if (json.type === 'line' && json.data) {
      parseAndDrawLine(json.data);
    }
  };

  const loop = setInterval(sendLoop, 25);
  window.addEventListener('beforeunload', e => {
    connection.onclose = () => {};
    connection.close();
    clearInterval(loop);
  });
})();
