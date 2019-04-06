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
    this.state[id].undid = [];
    return lineSegment;
  }

  initUserState(id) {
    this.state[id] = { segments: [], undid: [] };
  }

  endUserActivity(id) {
    if (this.state[id] && this.state[id].length != 0) {
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

  cleanOlderSegments(oldDate) {
    let deletedSegments = [];
    Object.keys(this.state).forEach(key => {
      this.state[key].segments = this.state[key].segments.reduce(
        (acc, segment) => {
          if (segment.date > oldDate) {
            return acc.concat(segment);
          } else {
            deletedSegments.push(segment.id);
            return acc;
          }
        },
        []
      );
    });
    const removedInactiveUsers = [];
    Object.keys(this.state).forEach(key => {
      if (this.state[key].segments.length === 0) {
        removedInactiveUsers.push(key);
        delete this.state[key];
      }
    });
    this.allLines = this.allLines.filter(
      line => deletedSegments.indexOf(line.segmentId) === -1
    );
    return removedInactiveUsers;
  }
}
module.exports = {
  DrawDataService
};
