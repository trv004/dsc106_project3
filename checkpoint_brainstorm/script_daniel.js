const width = 900;
const height = 500;
const margin = { top: 40, right: 40, bottom: 40, left: 60 };

//Visualization 1
d3.json("merged.json").then(data => {
  const labNames = [...new Set(data.map(d => d.name))];

  const select = d3.select("#lab-select");
  select.selectAll("option")
    .data(labNames)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  drawChart(data, labNames[0]);

  select.on("change", function () {
    drawChart(data, this.value);
  });
});

function drawChart(data, labName) {
  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  let labData = data
    .filter(d => d.name === labName)
    .sort((a, b) => a.dt - b.dt);

  // Downsample: keep every 5th point
  labData = labData.filter((d, i) => i % 5 === 0);

  const x = d3.scaleLinear()
    .domain(d3.extent(labData, d => d.dt))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain(d3.extent(labData, d => d.result)).nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .curve(d3.curveMonotoneX)
    .x(d => x(d.dt))
    .y(d => y(d.result));

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6));

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("path")
    .datum(labData)
    .attr("class", "line")
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.85);

  // Tooltip
  const tooltip = d3.select("#chart")
    .append("div")
    .style("position", "absolute")
    .style("background", "#f9f9f9")
    .style("padding", "5px 10px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("display", "none");

  const focus = svg.append("circle")
    .attr("r", 5)
    .attr("fill", "orange")
    .style("display", "none");

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mousemove", function (event) {
      const [mx] = d3.pointer(event);
      const xVal = x.invert(mx);
      const closest = d3.least(labData, d => Math.abs(d.dt - xVal));

      focus
        .attr("cx", x(closest.dt))
        .attr("cy", y(closest.result))
        .style("display", null);

      tooltip
        .html(`Time: ${closest.dt}<br>Result: ${closest.result}`)
        .style("left", `${x(closest.dt) + 50}px`)
        .style("top", `${y(closest.result)}px`)
        .style("display", "block");
    })
    .on("mouseout", () => {
      focus.style("display", "none");
      tooltip.style("display", "none");
    });
}

//Visualization 2
d3.json("merged.json").then(data => {
    // Bin time into steps (e.g., per 100,000 units)
    const binSize = 100000;
    data.forEach(d => {
      d.timeBin = Math.floor(d.dt / binSize) * binSize;
    });
  
    // Group by (test name, timeBin) to compute average result
    const grouped = d3.rollups(
      data,
      v => d3.mean(v, d => d.result),
      d => d.name,
      d => d.timeBin
    );
  
    // Flatten structure into array of { name, timeBin, avg }
    const heatmapData = [];
    const allBins = new Set();
  
    grouped.forEach(([name, times]) => {
      times.forEach(([timeBin, avg]) => {
        heatmapData.push({ name, timeBin, avg });
        allBins.add(timeBin);
      });
    });
  
    const names = [...new Set(heatmapData.map(d => d.name))];
    const timeBins = [...allBins].sort((a, b) => a - b);
  
    const margin = { top: 50, right: 40, bottom: 100, left: 100 };
    const width = 900;
    const height = 500;
    const cellSize = 25;
  
    const svg = d3.select("#lab-heatmap")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    const x = d3.scaleBand()
      .domain(timeBins)
      .range([margin.left, width - margin.right])
      .padding(0.05);
  
    const y = d3.scaleBand()
      .domain(names)
      .range([margin.top, height - margin.bottom])
      .padding(0.05);
  
    const color = d3.scaleSequential(d3.interpolateYlGnBu)
      .domain(d3.extent(heatmapData, d => d.avg));
  
    svg.selectAll("rect")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.timeBin))
      .attr("y", d => y(d.name))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.avg));
  
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d => `t=${d}`))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");
  
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
  
    const tooltip = d3.select("#lab-heatmap")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "5px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("display", "none");
  
    svg.selectAll("rect")
      .on("mouseover", (event, d) => {
        tooltip
          .html(`<strong>${d.name}</strong><br>Time: ${d.timeBin}<br>Avg: ${d.avg.toFixed(2)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px")
          .style("display", "block");
      })
      .on("mouseout", () => tooltip.style("display", "none"));
  });
  