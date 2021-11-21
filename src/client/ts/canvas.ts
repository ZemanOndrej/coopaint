import { Coords, Line } from '.';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
export const defaultColor = '#000000';
export const defaultWidth = 1;

ctx.canvas.width = 1800;
ctx.canvas.height = 950;

interface State {
	mouseDown: boolean;
	mouseMove: boolean;
	segmentEnd: boolean;
	mouseDownEvent: boolean;
	lastCtxCoords: Coords;
	currentMousePos: Coords;
	segmentsSent: number;
	undoCount: number;
}

function getMousePos(evt: MouseEvent) {
	const rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top,
	};
}

export function drawLine(line: Line) {
	const { x1, x2, y1, y2, color, width } = line;
	ctx.beginPath();
	ctx.lineWidth = width || defaultWidth;
	ctx.strokeStyle = color || defaultColor;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

export function redrawCanvas(lines: Line[]) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	lines.forEach((line) => {
		drawLine(line);
	});
}
export function BoardState() {
	const state: State = {
		mouseDown: false,
		mouseMove: false,
		segmentEnd: false,
		mouseDownEvent: false,
		lastCtxCoords: { x: null, y: null },
		currentMousePos: { x: null, y: null },
		undoCount: 0,
		segmentsSent: 0,
	};
	canvas.addEventListener('mouseout', (e) => {
		if (state.mouseDown) {
			state.mouseDown = false;
			state.segmentEnd = true;
		}
	});

	canvas.addEventListener('mousedown', (e: MouseEvent) => {
		if (e.which == 1) {
			state.lastCtxCoords = getMousePos(e);
			state.mouseDown = true;
			state.mouseDownEvent = true;
			ctx.moveTo(state.lastCtxCoords.x, state.lastCtxCoords.y);
		}
	});

	canvas.addEventListener('mouseup', (e: MouseEvent) => {
		if (e.which == 1 && state.mouseDown) {
			state.segmentEnd = true;
		}
		state.mouseDown = false;
		if (e.which == 3) {
			const settings = document.getElementById('settings');
			const cursorCoords = getMousePos(e);
			settings.style.left = `${cursorCoords.x - 150}px`;
			settings.style.top = `${cursorCoords.y - 75}px`;
			settings.classList.remove('not-active');
		}
	});

	canvas.addEventListener('mousemove', (e) => {
		state.mouseMove = true;
		state.currentMousePos = getMousePos(e);
	});

	return state;
}
