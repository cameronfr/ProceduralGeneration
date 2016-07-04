var pointListHead;

var canvasWidth;
var canvasHeight;
var backgroundColor;
var fillColor;

var maxTries;
var moveMultiplier;
var drawIteration;
var modelIterPerDrawIter;
var pointsPerDraw;
var pointLoopIncrement;

var initialPoints;
var initialCircleX;
var initialCircleY;
var initialCircleR;
var initialCircleNoiseAmp;
var initialCircleNoiseRad;

var numPoints;

var maxSegmentLength;
var minSegmentLength;
var effectRadius;
var effectStrength;

var areaWeight;
var perimeterWeight;
var closenessWeight;
var minDist;

function setup() {
  resetModelParameters();
  resetCostParameters();
  createCanvas(canvasWidth, canvasHeight);
  background(backgroundColor);
  fill(fillColor);
  pixelDensity(2);
  strokeWeight(1);
  frameRate(6000);
  pointListHead = initializePointList(initialCircleX, initialCircleY, initialPoints, initialCircleR);
}

function resetPointList() {
  pointListHead = initializePointList(initialCircleX, initialCircleY, initialPoints, initialCircleR);
}

function resetModelParameters() {
  //hand-tuned parameters (slash hyper-parameters)
  seed = getURLParameter("seed");
  if (!seed) {
    resetSeedAndReload();
  }
  console.log("SEED: " + seed);
  randomSeed(seed);

  canvasWidth = windowWidth;
  canvasHeight = windowHeight;
  fillColor = 'rgb(153, 204, 153)';
  backgroundColor = 'rgb(0,51,102)';

  maxTries = 20;
  moveMultiplier = 0.1;
  drawIteration = -1;
  modelIterPerDrawIter = 1;
  pointLoopIncrement = Math.floor(Math.random() * 30) + 1;
  pointsPerDraw = 300;

  initialPoints = Math.floor(15 * random() + 2);
  numPoints = initialPoints;
  initialCircleX = Math.floor(canvasWidth / 2);
  initialCircleY = Math.floor(canvasHeight / 2);
  initialCircleR = 100;
  initialCircleNoiseAmp = 5;
  initialCircleNoiseRad = 40;

  maxSegmentLength = Math.min(Math.floor(random() * 25 + 1), 18);
  minSegmentLength = Math.floor((random() / 3 * maxSegmentLength));
  effectRadius = Math.floor((random() * 30)) + 1;
  effectStrength = random() * 3 + 1;
}

function resetCostParameters() {
  areaWeight = (random() - 0.1);
  perimeterWeight = 20 * (random() * 3 - 1.5);
  closenessWeight = 1000 * random();
  minDist = 50 * random() + 10;
}

function resetSeedAndReload() {
  seed = Math.floor(Math.random() * 1000000);
  setURLParameter("seed", seed);
  setup();
}

function keyPressed(value) {
  if (keyCode == UP_ARROW) {
    resetPointList();
  } else if (keyCode == RIGHT_ARROW) {
    resetSeedAndReload();
  } else if (keyCode == DOWN_ARROW) {
    resetCostParameters(true);
  }

}

function draw() {
  drawIteration++;
  var head;
  for (head = pointListHead, loops = 0, i = 0; i < pointsPerDraw * pointLoopIncrement; head = head.next, i++) {
    if (i % pointLoopIncrement === 0) {
      var tries = 0;
      var cost;
      var endPoints = {
        start: head,
        end: head.prev
      };
      var startCost = calculateCost(head, endPoints);
      do {
        tries++;
        var rand = Math.random(1);
        var rand2 = Math.random(1);
        var moveX = cos((rand * 2 * Math.PI)) * moveMultiplier * rand2;
        var moveY = sin((rand * 2 * Math.PI)) * moveMultiplier * rand2;
        var move = {
          x: moveX,
          y: moveY
        };
        movePointList(move, head);
        cost = calculateCost(head, endPoints);
      } while (cost >= startCost && tries < maxTries);
      finalizePointList(endPoints);
    }
    pointListHead = head;

  }

  populatePointList(head, maxSegmentLength, minSegmentLength);
  drawPointListPShape(pointListHead);
  drawTextOverlay();
}

function calculateCost(index, endPoints) {
  var deltaCost = 0;
  var deltaClosenessCost = deltaClosenessPenalty(index, endPoints);
  var deltaAreaCost = deltaAreaPenalty(index, endPoints);
  var deltaPerimeterCost = deltaPerimeterPenalty(index, endPoints);
  deltaCost = deltaClosenessCost * closenessWeight + deltaAreaCost * areaWeight + deltaPerimeterCost * perimeterWeight;
  return deltaCost;
}

function drawPointListPShape(index) {
  background(backgroundColor);
  beginShape();
  for (var head = index, i = 0; i === 0 || head != index; head = head.next, i++) {
    var p1 = head;
    vertex(p1.x, p1.y);
  }
  endShape(CLOSE);
}

function drawTextOverlay() {
  text(Math.round(frameRate()), 20, 20); //FPS
  text("<Up Arrow> creates a new model with the same parameters", canvasWidth - 360, canvasHeight - 70);
  text("<Right Arrow> creates a new model with new parameters", canvasWidth - 360, canvasHeight - 50);
  text("<Down Arrow> changes the parameters with the same model", canvasWidth - 360, canvasHeight - 30);
}

function movePointList(move, head) {
  //TODO: custom move function (currently just proportional to 1/distance)
  var endPoints;
  for (var leftHead = head, rightHead = head, dist = 1; dist <= effectRadius; leftHead = leftHead.prev, rightHead = rightHead.next, dist++) {
    leftHead.x_potential = leftHead.x + effectStrength * move.x / dist;
    leftHead.y_potential = leftHead.y + effectStrength * move.y / dist;
    if (dist != 1) {
      rightHead.y_potential = rightHead.y + effectStrength * move.y / dist;
      rightHead.x_potential = rightHead.x + effectStrength * move.x / dist;
    }
    if (dist == effectRadius) {
      endPoints = {
        start: leftHead,
        end: rightHead
      };
    }
  }
  if (effectRadius === 0) {
    endPoints = {
      start: head,
      end: head
    };
  }
  return endPoints;
}

function finalizePointList(endPoints) {
  for (var head = endPoints.start, start = true; head.prev != endPoints.end || start; head = head.next, start = false) {
    head.x = head.x_potential;
    head.y = head.y_potential;
  }
}

function populatePointList(index, maxDistance, minDistance) {

  for (var head = index, i = 0; i === 0 || head != index; head = head.next, i++) {
    var p1 = head;
    var p2 = head.prev;
    dista = distance(p1, p2);
    if (dista > maxDistance) {
      var x_n = p1.x + p2.x;
      var y_n = p1.y + p2.y;
      x_n /= 2;
      y_n /= 2;
      var p = {
        x: x_n,
        y: y_n,
        x_potential: x_n,
        y_potential: y_n
      };

      p2.next = p;
      p.prev = p2;
      p.next = p1;
      p1.prev = p;

      numPoints++;

    } else if (dista < minDistance && p2 != pointListHead && p2 != index) {
      numPoints--;
      var p_p = p2.prev;
      p1.prev = p_p;
      p_p.next = p1;
    }
  }
}

function initializePointList(x, y, numPoints, radius) {
  var head;
  var prevNode;
  var lastNode;
  for (var i = 0; i < initialPoints; i += 1) {
    var x_i = (radius + noise(i / 30) * 2) * cos(2 * Math.PI * i / numPoints) + x;
    var y_i = (radius + noise(i / 30) * 2) * sin(2 * Math.PI * i / numPoints) + y;
    var p_i = {
      x: x_i,
      y: y_i,
      x_potential: x_i,
      y_potential: y_i,
      grow: true
    };
    if (i == initialPoints - 1) {
      p_i.special = "end";
      p_i.next = head;
      lastNode = p_i;
    }
    if (i === 0) {
      p_i.special = "start";
      head = p_i;
      prevNode = p_i;
    } else {
      prevNode.next = p_i;
      p_i.prev = prevNode;
      prevNode = p_i;
    }

  }
  head.prev = lastNode;
  return head;

}

function printPointList(head) {
  while (head) {
    console.log(head);
    if (head.special == "end") break;
    head = head.next;
  }
}


//-- Cost Functions --//

function distance(p1, p2) {
  dx = Math.abs(p1.x_potential - p2.x_potential);
  dy = Math.abs(p1.y_potential - p2.y_potential);
  return Math.sqrt((dx * dx) + (dy * dy));
}

function deltaClosenessPenalty(index, endPoints) {
  var penalty = 0;
  var closePoints = 1;
  for (var rightHead = index.next, leftHead = index.prev, dist = 1; rightHead != leftHead && rightHead.prev != leftHead; rightHead = rightHead.next, leftHead = leftHead.prev, dist++) {
    var distance1 = distance(rightHead, index);
    if (distance1 < minDist) {
      penalty += (dist * dist * dist) * (1 / distance1);
      closePoints++;
    }
    var distance2 = distance(leftHead, index);
    if (distance2 < minDist) {
      penalty += (dist * dist * dist) * (1 / distance2);
      closePoints++;
    }
  }
  return penalty / closePoints;
}


function deltaPerimeterPenalty(index, endPoints) {
  var penalty = 0;
  for (var head = endPoints.start, start = true; head.prev != endPoints.end || start; head = head.next, start = false) {
    penalty += distance(head, head.next);
  }
  return penalty;
}

function deltaAreaPenalty(index, endPoints) {
  var area = 0;
  for (var head = endPoints.start, start = true; head.prev != endPoints.end || start; head = head.next, start = false) {
    area = area + head.x_potential * head.next.y_potential;
    area = area - head.y_potential * head.next.x_potential;
  }
  return abs(area / 2);
}

//-- Page Functions --//
//(courtesy sujoy on SO)

function getURLParameter(name, url) {
  var href = url ? url : window.location.href;
  var reg = new RegExp('[?&]' + name + '=([^&#]*)', 'i');
  var string = reg.exec(href);
  return string ? string[1] : null;
}

function setURLParameter(name, val, url) {
  var href = url ? url : window.location.href;
  var newAdditionalURL = "";
  var tempArray = href.split("?");
  var baseURL = tempArray[0];
  var additionalURL = tempArray[1];
  var temp = "";
  if (additionalURL) {
    tempArray = additionalURL.split("&");
    for (i = 0; i < tempArray.length; i++) {
      if (tempArray[i].split('=')[0] != name) {
        newAdditionalURL += temp + tempArray[i];
        temp = "&";
      }
    }
  }
  var rows_txt = temp + "" + name + "=" + val;

  var state = {
    title:document.title,
    url:(baseURL + "?" + newAdditionalURL + rows_txt)
  };
  history.pushState(state, state.title, state.url);
}
