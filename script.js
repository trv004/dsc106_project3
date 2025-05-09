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
  const grouped = d3.group(data, d => d.caseid);
  const caseIDs = Array.from(grouped.keys()).sort((a, b) => a - b);

  d3.select("#caseSelect")
    .selectAll("option")
    .data(caseIDs)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  d3.selectAll("#caseSelect, #sexFilter, #ageFilter").on("change", update);

  update();

  function update() {
    const selectedCase = +d3.select("#caseSelect").node().value;
    const selectedSex = d3.select("#sexFilter").node().value;
    const selectedAgeGroup = d3.select("#ageFilter").node().value;

    const patientData = grouped.get(selectedCase);
    if (!patientData || patientData.length === 0) {
      g.selectAll("*").remove();
      svg.select(".legend").remove();
      return;
    }

    const patient = {};
    patientData.forEach(d => { patient[d.name] = +d.result; });

    let filtered = data;
    if (selectedSex !== "all") {
      filtered = filtered.filter(d => d.sex === selectedSex);
    }
    if (selectedAgeGroup !== "all") {
      filtered = filtered.filter(d => getAgeGroup(d.age) === selectedAgeGroup);
    }

    const avgMap = {};
    filtered.forEach(d => {
      if (!avgMap[d.name]) avgMap[d.name] = [];
      avgMap[d.name].push(+d.result);
    });

    const patientTests = new Set(patientData.map(d => d.name));
    const tests = Array.from(patientTests).filter(t => avgMap[t] && avgMap[t].length > 0);
    const angleSlice = (2 * Math.PI) / tests.length;

    const avg = {};
    tests.forEach(t => { avg[t] = d3.mean(avgMap[t]); });

    const radarData = [
      { group: "Average", ...avg },
      { group: `Case ${selectedCase}`, ...patient }
    ];

    const maxVal = d3.max(tests.map(t => Math.max(avg[t], patient[t] || 0)));

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
      .attr("class", (d, i) => i === 0 ? "radarArea average-shape" : "radarArea me-shape")
      .attr("d", d => getPath(d))
      .attr("stroke", (d, i) => colors[i])
      .attr("fill", (d, i) => colors[i]);

    svg.select(".legend").remove();

    const legendLabels = ["Average", `Case ${selectedCase}`];
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20,20)`);

    legend.selectAll("rect")
      .data(legendLabels)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d, i) => colors[i])
      .on("mouseover", (event, d) => {
        const target = d.includes("Average") ? ".average-shape" : ".me-shape";
        const other = d.includes("Average") ? ".me-shape" : ".average-shape";
        d3.selectAll(target).attr("fill-opacity", 0.6).attr("stroke-width", 3);
        d3.selectAll(other).attr("fill-opacity", 0.1).attr("stroke-width", 1);
      })
      .on("mouseout", () => {
        d3.selectAll(".radarArea").attr("fill-opacity", 0.3).attr("stroke-width", 2);
      });

    legend.selectAll("text")
      .data(legendLabels)
      .enter()
      .append("text")
      .attr("x", 20)
      .attr("y", (d, i) => i * 20 + 12)
      .text(d => d);
  }
});
