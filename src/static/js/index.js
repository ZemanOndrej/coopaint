(function() {
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  const connection = new WebSocket('ws://ozeman.eu:1338');
  const canvas = document.getElementById('canvas');
  const closeSettingsBtn = document.getElementById('close-settings');
  const settings = document.getElementById('settings');
  const colorSelect = document.getElementById('color-select');
  const ctx = canvas.getContext('2d');
  ctx.canvas.width = 1800;
  ctx.canvas.height = 950;
  const defaultColor = '#000000';
  colorSelect.value = defaultColor;
  let mouseDown = false;
  let mouseMove = false;
  let lastCtxCoords = { x: null, y: null };
  let currentMousePos = { x: null, y: null };

  function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  function paintPixel(r, g, b, a, x, y) {
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  function drawLine(x1, y1, x2, y2, color) {
    ctx.beginPath();
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
    if (mouseDown && mouseMove && lastCtxCoords) {
      connection.send(
        JSON.stringify({
          x1: lastCtxCoords.x,
          y1: lastCtxCoords.y,
          x2: currentMousePos.x,
          y2: currentMousePos.y,
          color: colorSelect.value || defaultColor
        })
      );
      lastCtxCoords = currentMousePos;
      mouseMove = false;
    }
  }
  canvas.addEventListener('click', e => {
    let { x, y } = getMousePos(e);
    paintPixel(0, 0, 0, 1, x, y);
  });

  canvas.addEventListener('mouseout', e => {
    mouseDown = false;
  });

  canvas.addEventListener('mousedown', e => {
    if (e.which == 1) {
      lastCtxCoords = getMousePos(e);
      mouseDown = true;
      ctx.moveTo(lastCtxCoords.x, lastCtxCoords.y);
    }
  });

  canvas.addEventListener('mouseup', e => {
    mouseDown = false;
    if (e.which == 3) {
      const cursorCoords = getMousePos(e);
      settings.style.left = `${cursorCoords.x-150}px`;
      settings.style.top = `${cursorCoords.y-75}px`;
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
    console.log(e);
  };

  connection.onerror = error => {};

  connection.onmessage = message => {
    const json = JSON.parse(message.data);
    if (json.type === 'init' && json.id) {
      json.data.forEach(line => {
        parseAndDrawLine(line);
      });
    } else if (json.type === 'line' && json.data) {
      parseAndDrawLine(json.data);
    }
  };

  const loop = setInterval(sendLoop, 25);
  window.addEventListener('beforeunload', e => {
    websocket.onclose = () => {};
    websocket.close();
    clearInterval(loop);
  });
})();
