import { BoardState, defaultColor, drawLine, redrawCanvas } from './canvas';

const protocol = process.env.mode === 'production' ? 'wss://' : 'ws://';
const wsURL = protocol + process.env.URL || 'localhost:1337';
console.log(wsURL);

const connection = new WebSocket(wsURL);
const closeSettingsBtn = document.getElementById('close-settings');
const settings = document.getElementById('settings');
const colorSelect = document.getElementById('color-select') as HTMLInputElement;
const redoButton = document.getElementById('redo-button');
const undoButton = document.getElementById('undo-button');
const penSizeInput = document.getElementById(
	'pen-size-input',
) as HTMLInputElement;

const defaultPenSize = 1;
colorSelect.value = defaultColor;
penSizeInput.value = defaultPenSize.toString();
export interface Coords {
	x?: number;
	y?: number;
}

const boardState = BoardState();

let lines: Line[] = [];
let pingTime = 0;

export interface Line {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
	width?: number;
	color: string;
	segmentStart?: boolean;
	segmentEnd?: boolean;
	segmentId?: string;
}

function closeSettings() {
	settings.classList.add('not-active');
}

function sendLoop() {
	if (
		(boardState.mouseDown &&
			boardState.mouseMove &&
			boardState.lastCtxCoords) ||
		boardState.segmentEnd
	) {
		let newLine: Line = {
			x1: boardState.lastCtxCoords.x,
			y1: boardState.lastCtxCoords.y,
			x2: boardState.currentMousePos.x,
			y2: boardState.currentMousePos.y,
			color: colorSelect.value || defaultColor,
			width: parseInt(penSizeInput.value) || defaultPenSize,
		};
		if (boardState.mouseDownEvent) {
			newLine.segmentStart = true;
			boardState.undoCount = 0;
			boardState.mouseDownEvent = false;
		}
		if (boardState.segmentEnd) {
			newLine.segmentEnd = true;
			boardState.segmentEnd = false;
			boardState.segmentsSent++;
		}

		sendMessage(connection, { type: 'newLine', line: newLine });

		boardState.lastCtxCoords = boardState.currentMousePos;
		boardState.mouseMove = false;
	}
}

function sendUndoRequest() {
	if (boardState.segmentsSent > 0) {
		boardState.segmentsSent--;
		boardState.undoCount++;
		connection.send(JSON.stringify({ type: 'undo' }));
	}
}

function sendRedoRequest() {
	if (boardState.undoCount > 0) {
		boardState.segmentsSent++;
		boardState.undoCount--;

		sendMessage(connection, { type: 'redo' });
	}
}

redoButton.addEventListener('click', sendRedoRequest);
undoButton.addEventListener('click', sendUndoRequest);

document.addEventListener('keydown', (e) => {
	if (e.keyCode == 90 && e.ctrlKey && e.shiftKey) {
		sendRedoRequest();
	} else if (e.keyCode == 90 && e.ctrlKey) {
		sendUndoRequest();
	}
});

penSizeInput.addEventListener('change', (e) => {});

console.log('object');

closeSettingsBtn.addEventListener('click', closeSettings);

colorSelect.addEventListener('change', closeSettings);

connection.onopen = (e) => {
	console.log('Successfully connected to websocket server!');
};

connection.onerror = (error) => {
	console.error('There was error with Websocket connections: ', error);
};

connection.onclose = (msg) => {
	alert('Websocket connection was closed by server.');
	console.error('Websocket connection was closed with message: ', msg);
};

connection.onmessage = (json) => {
	const message = JSON.parse(json.data);
	if (message.type === 'init' && message.id) {
		lines = Object.values(Object.values(message.state.lines)) as Line[];
		redrawCanvas(lines);
		document.cookie = 'X-Authorization=' + message.id + '; path=/';
		if (!message.isNew) {
			boardState.segmentsSent = message.state.segmentsSent;
			boardState.undoCount = message.state.undoCount;
		}
	} else if (message.type === 'newLine' && message.data) {
		lines.push(message.data);
		drawLine(message.data);
	} else if (message.type === 'undo' && message.segmentId) {
		lines = lines.filter((line) => line.segmentId != message.segmentId);
		redrawCanvas(lines);
	} else if (message.type === 'redo') {
		lines = lines.concat(message.segment.lines);
		redrawCanvas(lines);
	} else if (message.type === 'cleanup') {
		lines = Object.values(Object.values(message.state.lines));
		redrawCanvas(lines);
	} else if (message.type === 'pong') {
		console.log(`pong server response took ${Date.now() - pingTime}ms`);
	}
};

type MessageType =
	| 'newLine'
	| 'ping'
	| 'pong'
	| 'undo'
	| 'redo'
	| 'init'
	| 'cleanup';
interface WebScoketMessage {
	type: MessageType;
}

function sendMessage<T extends WebScoketMessage>(
	connection: WebSocket,
	message: T,
) {
	connection.send(JSON.stringify(message));
}

const loop = setInterval(sendLoop, 25);

const pingInterval = setInterval(() => {
	console.log('ping');
	pingTime = Date.now();
	sendMessage(connection, { type: 'ping' });
}, 55 * 1000);
window.addEventListener('beforeunload', (e) => {
	connection.onclose = () => {};
	connection.close();
	clearInterval(loop);
	clearInterval(pingInterval);
});
