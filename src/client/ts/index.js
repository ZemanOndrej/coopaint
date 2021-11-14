
window.WebSocket = window.WebSocket || window.MozWebSocket;

console.log(process.env);
const protocol = process.env.mode ==='production' ? 'wss://' : 'ws://';

const connection = new WebSocket( protocol + window.location.host);
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
let segmentsSent = 0;
let undoCount = 0;
let lines = [];

function getMousePos(evt) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}

function drawLine(line) {
	const { x1, x2, y1, y2, color } = line;
	ctx.beginPath();
	ctx.lineWidth = penSizeInput.value;
	ctx.strokeStyle = color || defaultColor;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function redrawCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	lines.forEach(line => {
		drawLine(line);
	});
}

function closeSettings() {
	settings.classList.add('not-active');
}

function sendLoop() {
	if ((mouseDown && mouseMove && lastCtxCoords) || segmentEnd) {
		let newLine = {
			x1: lastCtxCoords.x,
			y1: lastCtxCoords.y,
			x2: currentMousePos.x,
			y2: currentMousePos.y,
			color: colorSelect.value || defaultColor
		};
		if (mouseDownEvent) {
			newLine['segmentStart'] = true;
			undoCount = 0;
			mouseDownEvent = false;
		}
		if (segmentEnd) {
			newLine['segmentEnd'] = true;
			segmentEnd = false;
			segmentsSent++;
		}

		connection.send(JSON.stringify({ type: 'newLine', line: newLine }));
		lastCtxCoords = currentMousePos;
		mouseMove = false;
	}
}

function sendUndoRequest() {
	if (segmentsSent > 0) {
		segmentsSent--;
		undoCount++;
		connection.send(JSON.stringify({ type: 'undo' }));
	}
}

function sendRedoRequest() {
	if (undoCount > 0) {
		segmentsSent++;
		undoCount--;
		connection.send(JSON.stringify({ type: 'redo' }));
	}
}

redoButton.addEventListener('click', sendRedoRequest);
undoButton.addEventListener('click', sendUndoRequest);

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

document.addEventListener('keydown', e => {
	if (e.keyCode == 90 && e.ctrlKey && e.shiftKey) {
		sendRedoRequest();
	} else if (e.keyCode == 90 && e.ctrlKey) {
		sendUndoRequest();
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

connection.onerror = error => {
	console.error('There was error with Websocket connections: ', error);
};

connection.onclose = msg => {
	alert('Websocket connection was closed by server.');
	console.error('Websocket connection was closed with message: ', msg);
};

connection.onmessage = json => {
	const message = JSON.parse(json.data);
	if (message.type === 'init' && message.id) {
		lines = Object.values(Object.values(message.state.lines));
		redrawCanvas();
		document.cookie = 'X-Authorization=' + message.id + '; path=/';
		if (!message.isNew) {
			segmentsSent = message.state.segmentsSent;
			undoCount = message.state.undoCount;
		}
	} else if (message.type === 'newLine' && message.data) {
		lines.push(message.data);
		drawLine(message.data);
	} else if (message.type === 'undo' && message.segmentId) {
		lines = lines.filter(line => line.segmentId != message.segmentId);
		redrawCanvas();
	} else if (message.type === 'redo') {
		lines = lines.concat(message.segment.lines);
		redrawCanvas();
	} else if (message.type === 'cleanup') {
		lines = Object.values(Object.values(message.state.lines));
		redrawCanvas();
	}
};

const loop = setInterval(sendLoop, 25);
window.addEventListener('beforeunload', e => {
	connection.onclose = () => {};
	connection.close();
	clearInterval(loop);
});
