// script.js

//Grab the SVG by its ID and ensure width/height attrs exist
const svg = d3.select("#chart");
const width  = +svg.attr("width");
const height = +svg.attr("height");
const radius = Math.min(width, height) / 2 - 60;

const g = svg.append("g")
             .attr("transform", `translate(${width/2},${height/2})`);

// Controls & tooltips
const ageSlider    = d3.select("#ageSlider"),
      heightSlider = d3.select("#heightSlider"),
      weightSlider = d3.select("#weightSlider"),
      sexFilter    = d3.select("#sexFilter"),
      ageTip       = d3.select("#ageSliderTooltip"),
      heightTip    = d3.select("#heightSliderTooltip"),
      weightTip    = d3.select("#weightSliderTooltip");

// Chart‐dot floating tooltip
const chartTip = d3.select("body")
  .append("div")
  .attr("class","tooltip");

// Slider bubble helper
function showTip(slider, tip, val) {
  const min = +slider.attr("min"),
        max = +slider.attr("max"),
        pct = (val - min) / (max - min),
        w   = slider.node().offsetWidth,
        x   = pct * w;
  tip.style("left", `${x}px`)
     .text(val)
     .style("opacity", 1);
}

// Load & draw/update
d3.json("data.json").then(data => {
  function updateChart() {
    // filters
    const maxAge    = +ageSlider.node().value,
          maxHeight = +heightSlider.node().value,
          maxWeight = +weightSlider.node().value,
          sex       = sexFilter.node().value;

    let filt = data
      .filter(d => +d.age    <= maxAge)
      .filter(d => +d.height <= maxHeight)
      .filter(d => +d.weight <= maxWeight);
    if (sex !== "all") filt = filt.filter(d => d.sex === sex);

    // clinical group keys
    const clinical = {
      "Blood Cell & Inflammation Markers": ["wbc","hb","hct","plt","esr","crp"],
      "Liver & Protein Function":         ["tprot","alb","tbil","ast","alt","ammo"],
      "Kidney Function & Metabolic Waste":["bun","cr","gfr","ccr","lac"],
      "Electrolytes & Metabolic Panel":   ["gluc","na","k","ica","cl","hco3"],
      "Coagulation & Blood Gases":        ["ptinr","pt%","ptsec","aptt","fib","ph","pco2","po2","be","sao2"]
    };
    const groups = Object.keys(clinical);

    // compute means
    const means = {};
    groups.forEach(gp => {
      const vals = clinical[gp]
        .flatMap(key => filt.map(d => +d[key]).filter(v => isFinite(v)));
      means[gp] = vals.length ? d3.mean(vals) : 0;
    });

    // clear old drawing
    g.selectAll("*").remove();

    // angles & max scale
    const angleSlice = 2 * Math.PI / groups.length,
          maxVal     = d3.max(Object.values(means)) || 1;

    // draw axes + labels
    groups.forEach((gp,i) => {
      const ang = i * angleSlice - Math.PI/2,
            x   = Math.cos(ang) * radius,
            y   = Math.sin(ang) * radius;

      g.append("line")
        .attr("x1",0).attr("y1",0)
        .attr("x2",x).attr("y2",y)
        .attr("stroke","#ccc");

      g.append("text")
        .attr("x", x * 1.3)
        .attr("y", y * 1.3)
        .attr("text-anchor","middle")
        .attr("class","axisLabel")
        .text(gp);
    });

    // radar shape generator
    const radarLine = d3.lineRadial()
      .radius((d,i) => radius * (means[d] / maxVal))
      .angle((d,i) => i * angleSlice);

    // draw filled area
    g.append("path")
      .datum(groups)
      .attr("d", radarLine)
      .attr("fill","steelblue")
      .attr("fill-opacity",0.3)
      .attr("stroke","steelblue");

    // draw hover‐able dots
    groups.forEach((gp,i) => {
      const ang = i * angleSlice - Math.PI/2,
            r0  = radius * (means[gp] / maxVal),
            x   = Math.cos(ang) * r0,
            y   = Math.sin(ang) * r0;

      g.append("circle")
        .attr("cx", x).attr("cy", y)
        .attr("r", 4)
        .attr("fill","steelblue")
        .style("cursor","pointer")
        .on("mouseover", function(event) {
          d3.select(this)
            .transition().duration(100)
            .attr("r", 6).attr("fill", "#3367d6");
          chartTip.text(`${gp}: ${means[gp].toFixed(2)}`)
                  .style("opacity",1);
        })
        .on("mousemove", event => {
          chartTip.style("top",  `${event.pageY-10}px`)
                  .style("left", `${event.pageX+10}px`);
        })
        .on("mouseout", function() {
          d3.select(this)
            .transition().duration(100)
            .attr("r", 4).attr("fill", "steelblue");
          chartTip.style("opacity",0);
        });
    });

    // legend
    svg.selectAll(".legend").remove();
    const legend = svg.append("g")
      .attr("class","legend")
      .attr("transform","translate(20,20)");
    legend.append("rect")
      .attr("width",15).attr("height",15).attr("fill","steelblue");
    legend.append("text")
      .attr("x",20).attr("y",12)
      .text("Average");
  }

  // wire sliders
  ageSlider.on("input",    () => { showTip(ageSlider, ageTip, +ageSlider.node().value); updateChart(); })
           .on("change",   () => ageTip.style("opacity",0));
  heightSlider.on("input", () => { showTip(heightSlider, heightTip, +heightSlider.node().value); updateChart(); })
              .on("change",() => heightTip.style("opacity",0));
  weightSlider.on("input", () => { showTip(weightSlider, weightTip, +weightSlider.node().value); updateChart(); })
              .on("change",() => weightTip.style("opacity",0));
  sexFilter.on("change", updateChart);

  // initial draw
  updateChart();
});
