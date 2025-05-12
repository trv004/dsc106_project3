const svg = d3.select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height"),
  radius = Math.min(width, height) / 2 - 60,
  g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

const colors = ["steelblue"];

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Reference info (extend as needed)
const referenceInfo = {
  alb: { unit: "g/dL", ref_low: 3.5, ref_high: 5.0 },
  alt: { unit: "U/L", ref_low: 7, ref_high: 56 },
  wbc: { unit: "x10⁹/L", ref_low: 4.0, ref_high: 11.0 },
  sao2: { unit: "%", ref_low: 95, ref_high: 100 }
};

function getAgeGroup(age) {
  if (age < 40) return "20-39";
  if (age < 60) return "40-59";
  if (age < 80) return "60-79";
  return "80+";
}
function getHeightGroup(height) {
  if (height < 160) return "150-160";
  if (height < 170) return "160-170";
  if (height < 180) return "170-180";
  return "180+";
}
function getWeightGroup(weight) {
  if (weight < 60) return "50-60";
  if (weight < 70) return "60-70";
  if (weight < 80) return "70-80";
  return "80+";
}

d3.json("data.json").then(data => {
  d3.selectAll("#sexFilter, #ageFilter, #heightRange, #weightRange").on("change", update);
  update();

  function update() {
    const selectedSex = d3.select("#sexFilter").node().value;
    const selectedAgeGroup = d3.select("#ageFilter").node().value;
    const selectedHeightRange = d3.select("#heightRange").node().value;
    const selectedWeightRange = d3.select("#weightRange").node().value;

    let filtered = data;
    if (selectedSex !== "all") filtered = filtered.filter(d => d.sex === selectedSex);
    if (selectedAgeGroup !== "all") filtered = filtered.filter(d => getAgeGroup(d.age) === selectedAgeGroup);
    if (selectedHeightRange !== "all") filtered = filtered.filter(d => getHeightGroup(d.height) === selectedHeightRange);
    if (selectedWeightRange !== "all") filtered = filtered.filter(d => getWeightGroup(d.weight) === selectedWeightRange);

    const excludeKeys = new Set(["caseid", "sex", "age", "height", "weight"]);
    const testNames = Object.keys(data[0]).filter(k => !excludeKeys.has(k));

    const avg = {};
    const tests = [];

    testNames.forEach(name => {
      const vals = filtered.map(d => +d[name]).filter(v => Number.isFinite(v));
      if (vals.length >= filtered.length * 0.5) {
        avg[name] = d3.mean(vals);
        tests.push(name);
      }
    });

    const angleSlice = (2 * Math.PI) / tests.length;

    // Get max for normalization
    const maxVals = {};
    tests.forEach(name => {
      const vals = filtered.map(d => +d[name]).filter(v => Number.isFinite(v));
      maxVals[name] = d3.max(vals) || 1;
    });

    g.selectAll("*").remove();

    // Draw axes
    tests.forEach((t, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("stroke", "#ccc");
      g.append("text")
        .attr("x", x * 1.1)
        .attr("y", y * 1.1)
        .attr("text-anchor", "middle")
        .attr("class", "axisLabel")
        .text(t);
    });

    function getPath(obj) {
      return d3.lineRadial()
        .radius((d, i) => radius * ((obj[d] || 0) / (maxVals[d] || 1)))
        .angle((d, i) => i * angleSlice)
        (tests);
    }

    // Draw radar area
    g.append("path")
      .attr("class", "radarArea average-shape")
      .attr("d", getPath(avg))
      .attr("stroke", colors[0])
      .attr("fill", colors[0])
      .attr("fill-opacity", 0.3);

    // Draw tooltip points
    tests.forEach((t, i) => {
      const val = avg[t];
      const ref = referenceInfo[t] || {};
      const unit = ref.unit || "";
      const refLow = ref.ref_low ?? "N/A";
      const refHigh = ref.ref_high ?? "N/A";

      const values = filtered.map(d => +d[t]).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
      const idx = values.findIndex(v => val <= v);
      const percentile = idx >= 0 ? Math.round((idx / values.length) * 100) : "N/A";

      const angle = angleSlice * i - Math.PI / 2;
      const r = radius * (val / (maxVals[t] || 1));
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 4)
        .attr("fill", "black")
        .on("mouseover", (event) => {
          tooltip.transition().duration(200).style("opacity", 0.9);
          tooltip.html(`
            <strong>${t.toUpperCase()}</strong><br>
            Value: ${val?.toFixed(2)} ${unit}<br>
            Range: ${refLow} – ${refHigh} ${unit}<br>
            Percentile: ${percentile}%
          `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", () => {
          tooltip.transition().duration(300).style("opacity", 0);
        });
    });

    // Legend
    svg.select(".legend").remove();
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20,20)`);

    legend.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", colors[0]);

    legend.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text("Average");
  }
});
