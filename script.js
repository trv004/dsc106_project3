const labInfo = {
  wbc:  "White blood cell score",
  hb:   "Hemoglobin score",
  hct:  "Hematocrit score",
  plt:  "Platelet score",
  esr:  "Erythrocyte sedimentation score",
  crp:  "C-reactive protein score",
  tprot:"Total protein score",
  alb:  "Albumin score",
  tbil: "Total bilirubin score",
  ast:  "Aspartate transferase score",
  alt:  "Alanine transferase score",
  ammo: "Ammonia score",
  bun:  "Blood urea nitrogen score",
  cr:   "Creatinine score",
  gfr:  "Glomerular filtration score",
  ccr:  "Creatinine clearance score",
  lac:  "Lactate score",
  gluc: "Glucose score",
  na:   "Sodium score",
  k:    "Potassium score",
  ica:  "Ionized calcium score",
  cl:   "Chloride score",
  hco3: "Bicarbonate (HCO₃) score",
  ptinr:"Prothrombin time INR score",
  aptt: "Activated partial thromboplastin time score",
  fib:  "Fibrinogen score",
  ph:   "Blood pH score",
  pco2: "Partial pressure CO₂ score",
  po2:  "Partial pressure O₂ score",
  be:   "Base excess score",
  sao2: "Oxygen saturation score"
};



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

// **ADDED**: grab the spans next to each label
const ageValue    = d3.select("#ageValue"),
      heightValue = d3.select("#heightValue"),
      weightValue = d3.select("#weightValue");

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

    // **ADDED**: update the label‐spans live
    ageValue.text(maxAge);
    heightValue.text(maxHeight);
    weightValue.text(maxWeight);

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
      "Coagulation & Blood Gases":        ["ptinr","aptt","fib","ph","pco2","po2","be","sao2"]
    };

    const testMeans = {};
    Object.values(clinical).flat().forEach(test => {
      const values = filt.map(d => +d[test]).filter(v => isFinite(v));
      testMeans[test] = values.length ? d3.mean(values) : null;
    });

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

    // draw axes + **BOLDED & BOXED** labels
    groups.forEach((gp,i) => {
      const ang = i * angleSlice - Math.PI/2,
            x   = Math.cos(ang) * radius,
            y   = Math.sin(ang) * radius;

      // axis line
      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", x).attr("y2", y)
        .attr("stroke", "#ccc");

      // grouped label (for rect + text)
      const labelGroup = g.append("g")
        .attr("transform", `translate(${x * 1.3},${y * (i === 0 ? 1.1 : 1.3)})`);

      // bold text
      const text = labelGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("class", "axisLabel")
        .style("font-weight", "bold")
        .text(gp);

      // get text dimensions
      const bbox = text.node().getBBox();

      // draw box behind text
      labelGroup.insert("rect", "text")
        .attr("x",      bbox.x - 6)
        .attr("y",      bbox.y - 4)
        .attr("width",  bbox.width + 12)
        .attr("height", bbox.height + 8)
        .attr("rx",     4)
        .attr("fill",   "white")
        .attr("stroke", "#999")
        .attr("stroke-width", 1);
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
          const labList = clinical[gp];
          const rows = labList.map(name => {
            const desc = labInfo[name] || name;
            const val  = testMeans[name];
            return `${desc}: ${val !== null ? val.toFixed(2) : "N/A"}`;
          });
          chartTip.html(
            `<strong>${gp} Averaged</strong>: ${means[gp].toFixed(2)}<br/>
            <em>Includes:</em><br/>
            ${rows.join("<br/>")}<br/>
            <small style="display:block; margin-top:6px; color:gray;">
            All lab test values are normalized between 0 and 1 <br/>
            Values close to <strong>1</strong> are on the <strong>higher end</strong> of their reference range,<br/>
            while values close to <strong>0</strong> are on the <strong>lower end</strong>.
          </small>
          `)
          .style("opacity", 1);
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
  }

  // wire sliders
  ageSlider
    .on("input",    () => {
      const v = +ageSlider.node().value;
      ageValue.text(v);
      showTip(ageSlider, ageTip, v);
      updateChart();
    })
    .on("change",   () => ageTip.style("opacity",0));

  heightSlider
    .on("input", () => {
      const v = +heightSlider.node().value;
      heightValue.text(v);
      showTip(heightSlider, heightTip, v);
      updateChart();
    })
    .on("change",() => heightTip.style("opacity",0));

  weightSlider
    .on("input", () => {
      const v = +weightSlider.node().value;
      weightValue.text(v);
      showTip(weightSlider, weightTip, v);
      updateChart();
    })
    .on("change",() => weightTip.style("opacity",0));

  sexFilter.on("change", updateChart);

  // initial draw
  updateChart();

  // --- ADDED: color the select based on choice ---
  function styleSexFilter() {
    const v = sexFilter.node().value;
    let bg, col;
    if (v === "M") {
      bg  = "#cce5ff";
      col = "#003366";
    } else if (v === "F") {
      bg  = "#ffccdd";
      col = "#800040";
    } else {
      bg  = "white";
      col = "#333";
    }
    sexFilter
      .style("background-color", bg)
      .style("color", col);
  }

  sexFilter
    .on("change.style", styleSexFilter)
    .dispatch("change");

});
