const svg = d3.select("svg"),
      width = +svg.attr("width"),
      height = +svg.attr("height"),
      radius = Math.min(width, height) / 2 - 60,
      g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

const colors = ["steelblue"];

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background", "#fff")
  .style("border", "1px solid #ccc")
  .style("padding", "6px 10px")
  .style("border-radius", "4px")
  .style("font-size", "12px")
  .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)");

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

    // Define test categories
    const clinicalGroups = {
      "Blood Cell & Inflammation Markers": ["wbc", "hb", "hct", "plt", "esr", "crp"],
      "Liver & Protein Function": ["tprot", "alb", "tbil", "ast", "alt", "ammo"],
      "Kidney Function & Metabolic Waste": ["bun", "cr", "gfr", "ccr", "lac"],
      "Electrolytes & Metabolic Panel": ["gluc", "na", "k", "ica", "cl", "hco3"],
      "Coagulation & Blood Gases": ["ptinr", "pt%", "ptsec", "aptt", "fib", "ph", "pco2", "po2", "be", "sao2"]
    };

    const groupNames = Object.keys(clinicalGroups);
    const groupScores = {};
    const maxVals = {};

    // Compute averages for each group
    groupNames.forEach(group => {
      const tests = clinicalGroups[group];
      const groupVals = [];

      tests.forEach(test => {
        const values = filtered.map(d => +d[test]).filter(v => Number.isFinite(v));
        groupVals.push(...values);
      });

      const avg = groupVals.length > 0 ? d3.mean(groupVals) : 0;
      const max = groupVals.length > 0 ? d3.max(groupVals) : 1;

      groupScores[group] = avg;
      maxVals[group] = max;
    });

    const angleSlice = (2 * Math.PI) / groupNames.length;
    const maxVal = d3.max(Object.values(groupScores)) || 1;

    g.selectAll("*").remove();

    // Axes
    groupNames.forEach((group, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("stroke", "#ccc");

      g.append("text")
        .attr("x", x * 1.1)
        .attr("y", y * 1.1)
        .attr("text-anchor", "middle")
        .attr("class", "axisLabel")
        .text(group);
    });

    function getPath(obj) {
      return d3.lineRadial()
        .radius((d, i) => radius * ((obj[d] || 0) / maxVal))
        .angle((d, i) => i * angleSlice)
        (groupNames);
    }

    const radarData = [{ group: "Average", ...groupScores }];

    g.selectAll(".radar")
      .data(radarData)
      .enter()
      .append("path")
      .attr("class", "radarArea average-shape")
      .attr("d", d => getPath(d))
      .attr("stroke", colors[0])
      .attr("fill", colors[0])
      .attr("fill-opacity", 0.3);

    // Data points with tooltips
    radarData.forEach((d, groupIdx) => {
      groupNames.forEach((group, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const val = d[group] || 0;
        const r = radius * (val / maxVal);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        g.append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 4)
          .attr("fill", colors[groupIdx])
          .on("mouseover", () => {
            tooltip.style("visibility", "visible").text(`${group}: ${val.toFixed(2)}`);
          })
          .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
          })
          .on("mouseout", () => tooltip.style("visibility", "hidden"));
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
