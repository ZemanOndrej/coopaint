const uuid = require('uuid/v1');

class Line {
  constructor(x1, y1, x2, y2, color, segmentId) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.segmentId = segmentId;
  }
}

class DrawDataService {
  constructor() {
    this.userSegmentState = {};
    this.state = {};
    this.allLines = [];
  }

  addLineFromUser(id, line) {
    this.userSegmentState[id].lines.push(line);
    this.allLines.push({ line, segmentId: this.userSegmentState[id].id });
  }

  initUserState(id) {
    this.state[id] = [];
  }

  endUserActivity(id) {
    if (this.state[id].length != 0) {
      this.finishUserSegment();
      delete this.state[id];
    }
  }

  finishUserSegment(id) {
    if (
      this.userSegmentState[id] &&
      this.userSegmentState[id].lines.length > 0
    ) {
      this.state[id].push(this.userSegmentState[id]);
    }
    delete this.userSegmentState[id];
  }

  startUserSegment(id) {
    if (
      this.userSegmentState[id] &&
      this.userSegmentState[id].lines.length > 0
    ) {
      this.finishUserSegment(id);
    }
    this.userSegmentState[id] = {
      date: new Date(),
      id: uuid(),
      lines: []
    };
  }

  undoLastUserSegment(id) {
    console.log(id)
  }

  getAllLines() {
    return this.allLines;
  }
}
module.exports = {
  DrawDataService
};
