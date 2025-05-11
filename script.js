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

d3.json("data.json").then(data => {
  d3.selectAll("#sexFilter, #ageFilter").on("change", update);

  update();

  function update() {
    const selectedSex = d3.select("#sexFilter").node().value;
    const selectedAgeGroup = d3.select("#ageFilter").node().value;
  
    // Filter data
    let filtered = data;
    if (selectedSex !== "all") {
      filtered = filtered.filter(d => d.sex === selectedSex);
    }
    if (selectedAgeGroup !== "all") {
      filtered = filtered.filter(d => getAgeGroup(d.age) === selectedAgeGroup);
    }
  
    // Define a preferred/fixed test axis order
    const preferredOrder = [
      "alb", "alt", "ammo", "aptt", "ast", "be", "bun", "ccr", "cl", "cr", "crp",
      "esr", "fib", "gfr", "gluc", "hb", "hco3", "hct", "ica", "k", "lac", "na",
      "pco2", "ph", "plt", "po2", "pt%", "ptinr", "ptsec", "sao2", "tbil", "tprot", "wbc"
    ];

    // Compute averages and filter valid tests
    const avg = {};
    const tests = preferredOrder.filter(name => {
      const vals = filtered.map(d => +d[name]).filter(v => Number.isFinite(v));
      if (vals.length >= filtered.length * 0.5) {
        avg[name] = d3.mean(vals);
        return true;
      }
      return false;
    });
  
    // Early exit if there's no valid data
    g.selectAll("*").remove();
    svg.select(".legend").remove();
    if (filtered.length === 0 || tests.length === 0) {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text("No data to display for this filter.");
      return;
    }
  
    const angleSlice = (2 * Math.PI) / tests.length;
    const maxVal = 1;
  
    // Prepare data in radar-friendly format
    const radarData = [
      {
        name: "Average",
        values: tests.map(test => ({
          axis: test,
          value: avg[test] ?? 0
        }))
      }
    ];
  
    // Axes
    tests.forEach((t, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
  
      g.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", y)
        .attr("stroke", "#ccc");
  
      g.append("text")
        .attr("x", x * 1.1)
        .attr("y", y * 1.1)
        .attr("text-anchor", "middle")
        .attr("class", "axisLabel")
        .text(t);
    });
  
    // Path generator
    function getPath(datum) {
      return d3.lineRadial()
        .radius(d => radius * (d.value / maxVal))
        .angle((d, i) => i * angleSlice)(datum.values);
    }
  
    // Draw radar shape
    g.selectAll(".radar")
      .data(radarData)
      .enter()
      .append("path")
      .attr("class", "radarArea average-shape")
      .attr("d", getPath)
      .attr("stroke", colors[0])
      .attr("fill", colors[0])
      .attr("fill-opacity", 0.3);
  
    // Legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20,20)`);
  
    legend.selectAll("rect")
      .data(["Average"])
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", colors[0]);
  
    legend.selectAll("text")
      .data(["Average"])
      .enter()
      .append("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 20 + 12)
      .text(d => d);
  }
  
  
});