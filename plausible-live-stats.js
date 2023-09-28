// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// You'll be able to set the domain when adding/editing the widget
// Make sure the stats are public on Plausible
const namespace = args.widgetParameter || "plausible.io"
const displayName = namespace.slice(0,namespace.lastIndexOf("."))
const accentColor = new Color("#CCCCCC")

// LineChart by https://kevinkub.de/
// Used as the widget background
class LineChart {
  constructor(width, height, values) {
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.values = values;
  }
  
  _calculatePath() {
    let maxValue = Math.max(...this.values);
    let minValue = Math.min(...this.values);
    let difference = maxValue - minValue;
    let count = this.values.length;
    let step = this.ctx.size.width / (count - 1);
    let points = this.values.map((current, index, all) => {
        let x = step*index;
        let y = this.ctx.size.height - (current - minValue) / difference * this.ctx.size.height;
        return new Point(x, y);
    });
    return this._getSmoothPath(points);
  }
      
  _getSmoothPath(points) {
    let path = new Path();
    path.move(new Point(0, this.ctx.size.height));
    path.addLine(points[0]);
    for(let i = 0; i < points.length-1; i++) {
      let xAvg = (points[i].x + points[i+1].x) / 2;
      let yAvg = (points[i].y + points[i+1].y) / 2;
      let avg = new Point(xAvg, yAvg);
      let cp1 = new Point((xAvg + points[i].x) / 2, points[i].y);
      let next = new Point(points[i+1].x, points[i+1].y);
      let cp2 = new Point((xAvg + points[i+1].x) / 2, points[i+1].y);
      path.addQuadCurve(avg, cp1);
      path.addQuadCurve(next, cp2);
    }
    path.addLine(new Point(this.ctx.size.width, this.ctx.size.height));
    path.closeSubpath();
    return path;
  }
  
  configure(fn) {
    let path = this._calculatePath();
    if(fn) {
      fn(this.ctx, path);
    } else {
      this.ctx.addPath(path);
      this.ctx.fillPath(path);
    }
    return this.ctx;
  }

}

// Requests

function plausibleEndpoint(key) {
  return "https://plausible.io/api/stats/" + namespace + key
}

// Today
const today = new Date()
const fmt = new DateFormatter()
fmt.dateFormat = "yyyy-MM-dd"
const formatted_date = fmt.string(today)
const req = new Request(plausibleEndpoint("/main-graph?period=day&date=" + formatted_date + "&filters=%7B%7D"))
const graph = await req.loadJSON()
const plot = graph["plot"];
const chartData = graph["plot"]
const totalVisitorsToday = plot.reduce((sum, current) => sum + current, 0);

// Live visits
const liveRequest = new Request(plausibleEndpoint("/current-visitors"))
const liveVisitors = await liveRequest.loadString()

// Format visitors 
const formattedTodayVisitors = kFormatter(totalVisitorsToday);
const formattedLiveVisitors = kFormatter(liveVisitors);

// Create widget
let w = new ListWidget()
w.backgroundColor = new Color("#0A0A0A");

// Use iA Writer Quattro font
// Download: https://github.com/iaolo/iA-Fonts
const iA = new Font("iA Writer Quattro S Regular",19);

// Show domain
t1 = w.addText(displayName);
t1.textColor = accentColor;
t1.font = iA;
t1.minimumScaleFactor = 0.1;
t1.lineLimit = 1;

// Show live visitors
const copy1 = formattedLiveVisitors + " now"

t2 = w.addText(copy1)
t2.textColor = Color.white();
t2.font = iA;
t2.minimumScaleFactor = 0.1;
t2.lineLimit = 1;

// Show today 
const copy2 = formattedTodayVisitors + " today";

t3 = w.addText(copy2);
t3.textColor = Color.gray();
t3.font = iA;
t3.minimumScaleFactor = 0.1;
t3.lineLimit = 1;

// Line chart
let chart = new LineChart(400, 200, chartData).configure((ctx, path) => {
  ctx.opaque = false;
  ctx.setFillColor(new Color("FFFFFF", .1));
  ctx.addPath(path);
  ctx.fillPath(path);
}).getImage();
w.backgroundImage = chart

if (config.runsInWidget) {
  Script.setWidget(w)
} else {
  w.presentMedium()
}
Script.complete()

function kFormatter(num) {  
  if (num > 999) {
    return (num / 1000).toFixed(1) + "k"
  } else {
    return num
 }
}
