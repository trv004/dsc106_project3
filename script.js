const svg = d3.select("svg"),
      width = +svg.attr("width"),
      height = +svg.attr("height"),
      radius = Math.min(width, height) / 2 - 60,
      g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

const colors = ["steelblue", "crimson"];

function getAgeGroup(age) {
  if (age < 40) return "20-39";
  if (age < 60) return "40-59";
  if (age < 80) return "60-79";
  return "80+";
}

// Function to group by height ranges
function getHeightGroup(height) {
  if (height < 160) return "150-160";
  if (height < 170) return "160-170";
  if (height < 180) return "170-180";
  return "180+";
}

// Function to group by weight ranges
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
  
    // Filter data
    let filtered = data;

    // Filter by sex
    if (selectedSex !== "all") {
      filtered = filtered.filter(d => d.sex === selectedSex);
    }

    // Filter by age group
    if (selectedAgeGroup !== "all") {
      filtered = filtered.filter(d => getAgeGroup(d.age) === selectedAgeGroup);
    }

    // Filter by height range
    if (selectedHeightRange !== "all") {
      filtered = filtered.filter(d => getHeightGroup(d.height) === selectedHeightRange);
    }

    // Filter by weight range
    if (selectedWeightRange !== "all") {
      filtered = filtered.filter(d => getWeightGroup(d.weight) === selectedWeightRange);
    }
  
    const excludeKeys = new Set(["caseid", "sex", "age", "height", "weight"]);
    const testNames = Object.keys(data[0]).filter(k => !excludeKeys.has(k));

    // Compute averages
    const avg = {};
    const tests = [];
    testNames.forEach(name => {
      const vals = filtered.map(d => +d[name]).filter(v => Number.isFinite(v));
      if (vals.length >= filtered.length * 0.5) {  // Include only if ≥50% non-null
        avg[name] = d3.mean(vals);
        tests.push(name);  // Only keep tests with enough valid data
      }
    });

    const angleSlice = (2 * Math.PI) / tests.length;
  
    const radarData = [
      { group: "Average", ...avg },
    ];
  
    const maxVal = 1; // or choose your max reference for better scale
  
    g.selectAll("*").remove();
  
    // Axes
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
        .radius((d, i) => radius * ((obj[d] || 0) / maxVal))
        .angle((d, i) => i * angleSlice)
        (tests);
    }
  
    g.selectAll(".radar")
      .data(radarData)
      .enter()
      .append("path")
      .attr("class", "radarArea average-shape")
      .attr("d", d => getPath(d))
      .attr("stroke", colors[0])
      .attr("fill", colors[0])
      .attr("fill-opacity", 0.3);
  
    // Legend
    svg.select(".legend").remove();
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20,20)`);
  
    const legendLabels = ["Average"];
    legend.selectAll("rect")
      .data(legendLabels)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d, i) => colors[i]);
  
    legend.selectAll("text")
      .data(legendLabels)
      .enter()
      .append("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 20 + 12)
      .text(d => d);
  }
});