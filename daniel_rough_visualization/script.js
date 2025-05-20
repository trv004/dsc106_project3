d3.json("daniel2.json").then(data => {
  const margin = { top: 60, right: 40, bottom: 50, left: 180 };
  const width = 800 - margin.left - margin.right;
  const baseHeight = 500 - margin.top - margin.bottom;

  const svgRoot = d3.select("#anxietyChart");

  const getFilteredData = (range) => {
    if (range === "low") return data.filter(d => d.anxiety_score < 0.4);
    if (range === "medium") return data.filter(d => d.anxiety_score >= 0.4 && d.anxiety_score < 0.7);
    return data.filter(d => d.anxiety_score >= 0.7); // high
  };

  function drawChart(range) {
    svgRoot.selectAll("*").remove();  // Clear entire chart

    const filtered = getFilteredData(range);
    const barHeight = 20;
    const dynamicHeight = Math.max(baseHeight, filtered.length * barHeight);

    svgRoot.attr("height", dynamicHeight + margin.top + margin.bottom);

    const svg = svgRoot.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, d3.max(filtered, d => d.anxiety_score)])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(filtered.map(d => d.opname))
      .range([0, dynamicHeight])
      .padding(0.1);

    svg.selectAll("rect")
      .data(filtered)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", d => y(d.opname))
      .attr("width", d => x(d.anxiety_score))
      .attr("height", y.bandwidth())
      .attr("fill", "steelblue")
      .append("title")
      .text(d => `${d.opname} — Anxiety: ${d.anxiety_score.toFixed(2)}`);

    // Y Axis (surgery names)
    svg.append("g")
      .call(d3.axisLeft(y).tickSizeOuter(0))
      .selectAll("text")
      .style("font-size", "10px");

    // X Axis (anxiety score)
    svg.append("g")
      .attr("transform", `translate(0, ${dynamicHeight})`)
      .call(d3.axisBottom(x).ticks(5))
      .append("text")
      .attr("x", width)
      .attr("y", -6)
      .attr("fill", "black")
      .attr("text-anchor", "end")
      .attr("font-weight", "bold")
      .text("Anxiety Score");

    // Optional Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -dynamicHeight / 2)
      .attr("y", -margin.left + 15)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text("Surgery");
  }

  // Initial chart
  drawChart("low");

  // Tab switching logic
  d3.selectAll(".tab-button").on("click", function () {
    const range = d3.select(this).attr("data-range");
    d3.selectAll(".tab-button").classed("active", false);
    d3.select(this).classed("active", true);
    drawChart(range);
  });
});
