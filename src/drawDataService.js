const uuid = require('uuid/v1');

class DrawDataService {
  constructor() {
    this.userSegmentState = {};
    this.state = {};
    this.allLines = [];
  }

  addLineFromUser(id, line) {
    const lineSegment = { ...line, segmentId: this.userSegmentState[id].id };
    this.userSegmentState[id].lines.push(lineSegment);
    this.allLines.push(lineSegment);
    return lineSegment;
  }

  initUserState(id) {
    this.state[id] = { segments: [], undid: [] };
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
      this.state[id].segments.push(this.userSegmentState[id]);
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
    if (this.state[id].segments.length > 0) {
      const segmentId = this.state[id].segments[
        this.state[id].segments.length - 1
      ].id;
      this.allLines = this.allLines.filter(line => line.segmentId != segmentId);

      this.state[id].undid = [
        ...this.state[id].undid,
        this.state[id].segments.find(segment => segment.id === segmentId)
      ];
      this.state[id].segments = this.state[id].segments.filter(
        line => line.id != segmentId
      );
      return segmentId;
    }
    return -1;
  }

  redoLastUserSegment(id) {
    const undidSegment = this.state[id].undid.pop();
    this.allLines = this.allLines.concat(undidSegment.lines);
    this.state[id].segments.push(undidSegment);
    return undidSegment;
  }

  getAllLines() {
    return this.allLines;
  }
}
module.exports = {
  DrawDataService
};
