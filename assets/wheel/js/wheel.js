(() => {
  "use strict";

  const paletteMap = {
    customColor5: ["#D9CBAD", "#FFDD00", "#2c3033"],
    customColor6: ["#3369E8", "#D50F25", "#EEB211", "#009925"],
    customColor7: ["#D72323", "#E57915", "#28A430", "#564082", "#ECE346", "#FCFCFC", "#4AA1D2"],
    customColor8: ["#66B569", "#20A094", "#2BC0D4", "#23B0EF", "#5968BA", "#5363B9", "#7D58BD", "#A849B8", "#E53C76", "#EF594E"],
    customColor9: ["#D98121", "#EDB23F", "#F5D346", "#F7E1B4", "#FAF4DC", "#D3151C"],
    customColor10: ["#E1AC26", "#DC380F", "#9F0812", "#6347B2", "#368DD5", "#70AF1E"],
  };

  // State
  let colorScale = d3.scale.category20();
  let data = [];
  let currentRotation = 0;
  const oldPicks = [];
  let isResultOpen = false;

  // Elements
  const textarea = document.getElementById("input-text");
  const colorSelector = document.getElementById("color-selector");

  // Helpers
  function shuffle(list) {
    const result = [...list];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getWidth() {
    const width = window.outerWidth;
    if (width >= 450 && width <= 510) return 390;
    if (width >= 385 && width <= 450) return 320;
    if (width >= 300 && width <= 385) return 250;
    if (width <= 300) return 200;
    if (width >= 510 && width <= 560) return 450;
    return 500;
  }

  function parseInputToData(text) {
    const lines = text.split("\n");
    data = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) data.push({ label: trimmed, value: 1 });
    });
  }

  // UI actions
  function updateColorScale() {
    if (!colorSelector) return;
    const value = colorSelector.value;

    if (value === "category10") {
      colorScale = d3.scale.category10();
    } else if (value === "category20b") {
      colorScale = d3.scale.category20b();
    } else if (value === "category20c") {
      colorScale = d3.scale.category20c();
    } else if (paletteMap[value]) {
      colorScale = d3.scale.ordinal().range(paletteMap[value]);
    } else {
      colorScale = d3.scale.category20();
    }

    makeChart();
  }

  function updateChart() {
    const chart = document.getElementById("chart");
    if (chart) chart.innerHTML = "";
    makeChart();
  }

  function randomizeInput() {
    if (!textarea) return;
    const lines = textarea.value.split("\n");
    const shuffled = shuffle(lines);
    textarea.value = shuffled.join("\n");
    parseInputToData(textarea.value);
    updateChart();
  }

  function sortInput() {
    if (!textarea) return;
    const lines = textarea.value.split("\n");
    const sorted = lines.sort();
    textarea.value = sorted.join("\n");
    parseInputToData(textarea.value);
    updateChart();
  }

  function clearInput() {
    if (!textarea) return;
    textarea.value = "";
    data = [];
    updateChart();
  }

  function clearoutput() {
    const output = document.getElementById("output-text");
    if (output) output.value = "";
  }

  // Rendering
  function makeChart() {
    const chart = document.getElementById("chart");
    if (!chart) return;

    chart.innerHTML = "";
    if (!data.length) return;

    const margin = { top: 20, right: 40, bottom: 0, left: 0 };
    const width = getWidth();
    const height = getWidth();
    const radius = Math.min(width, height) / 2;

    const svg = d3
      .select("#chart")
      .append("svg")
      .data([data])
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const chartHolder = svg
      .append("g")
      .attr("class", "chartholder")
      .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    const pieGroup = chartHolder.append("g");
    const pie = d3.layout.pie().sort(null).value(() => 1);
    const arc = d3.svg.arc().outerRadius(radius);

    const slices = pieGroup
      .selectAll("g.slice")
      .data(pie)
      .enter()
      .append("g")
      .attr("class", "slice");

    slices
      .append("path")
      .attr("fill", (d, i) => colorScale(i))
      .attr("d", (d) => arc(d));

    slices
      .append("text")
      .attr("transform", (d) => {
        d.innerRadius = 0;
        d.outerRadius = radius;
        d.angle = (d.startAngle + d.endAngle) / 2;
        return `rotate(${(d.angle * 180) / Math.PI - 90})translate(${d.outerRadius - 10})`;
      })
      .attr("text-anchor", "end")
      .text((d) => {
        const label = d.data.label;
        const maxLen = 24;
        return label.length > maxLen ? `${label.substring(0, maxLen - 3)}...` : label;
      })
      .style({
        "font-size": "17px",
        "font-family": "Arial, sans-serif",
        fill: "white",
        stroke: "black",
        "stroke-width": "0.5px",
      });

    chartHolder.on("click", spin);

    function spin() {
      chartHolder.on("click", null);

      const soundToggle = document.getElementById("sound-checkbox");
      if (soundToggle && soundToggle.checked) {
        const tickSound = document.getElementById("spin-tick");
        if (tickSound) tickSound.play();
      }

      console.log(`OldPick: ${oldPicks.length}`, `Data length: ${data.length}`);
      if (oldPicks.length === data.length) {
        console.log("done");
        return;
      }

      const sliceAngle = 360 / data.length;
      const randomAngle = Math.floor(Math.random() * 1440 + 360);
      const rotation = Math.round(randomAngle / sliceAngle) * sliceAngle;

      let pickedIndex = Math.round(data.length - (rotation % 360) / sliceAngle);
      if (pickedIndex >= data.length) pickedIndex %= data.length;

      const finalRotation = rotation + 90 - Math.round(sliceAngle / 2);

      pieGroup
        .transition()
        .duration(5000)
        .attrTween("transform", () => {
          const interpolator = d3.interpolate(currentRotation % 360, finalRotation);
          return (t) => `rotate(${interpolator(t)})`;
        })
        .each("end", () => {
          if (typeof window.pop === "function") {
            window.pop(data[pickedIndex].label);
          } else {
            pop(data[pickedIndex].label);
          }
          currentRotation = finalRotation;
          chartHolder.on("click", spin);
        });
    }

    svg
      .append("g")
      .attr(
        "transform",
        `translate(${width + margin.left + margin.right},${height / 2 + margin.top})`
      )
      .append("path")
      .attr("d", `M-${radius * 0.15},0L0,${radius * 0.05}L0,-${radius * 0.05}Z`)
      .style({ fill: "grey" });

    chartHolder
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 60)
      .style({ fill: "white", cursor: "pointer" });

    chartHolder
      .append("text")
      .attr("x", 0)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text("スピン")
      .style({ "font-weight": "bold", "font-size": "20px", cursor: "pointer" });
  }

  // Result popover
  function pop(selectedLabel) {
    const box = document.getElementById("box");
    const selected = document.getElementById("selected-op");
    if (!box || !selected) return;

    if (!isResultOpen) {
      box.style.display = "block";
      selected.textContent = selectedLabel;

      const soundToggle = document.getElementById("sound-checkbox");
      if (soundToggle && soundToggle.checked) {
        const celeb = document.getElementById("celeb");
        if (celeb) {
          celeb.volume = 0.1;
          celeb.play();
        }
      }

      isResultOpen = true;

      const output = document.getElementById("output-text");
      if (output) output.value += `${selectedLabel}\n`;
    } else {
      box.style.display = "none";
      selected.textContent = selectedLabel;
      isResultOpen = false;
    }
  }

  function deleteSelected() {
    const selected = document.getElementById("selected-op");
    if (!selected) return;

    const value = selected.textContent;
    const index = data.findIndex((item) => item.label === value);
    if (index !== -1) data.splice(index, 1);
    makeChart();

    if (textarea) {
      const lines = textarea.value.split("\n");
      const lineIndex = lines.findIndex((line) => line.trim() === value);
      if (lineIndex !== -1) {
        lines.splice(lineIndex, 1);
        textarea.value = lines.join("\n");
      }
    }

    const box = document.getElementById("box");
    if (box) box.style.display = "none";
    isResultOpen = false;
  }

  // Fullscreen
  function toggleFullscreen() {
    const container = document.getElementsByClassName("wheel-container")[0];
    const chart = document.querySelector("#chart");
    if (!container || !chart) return;

    const canFullscreen =
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled;

    if (!canFullscreen) return;

    if (
      !document.fullscreenElement &&
      !document.webkitFullscreenElement &&
      !document.mozFullScreenElement &&
      !document.msFullscreenElement
    ) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      else if (container.mozRequestFullScreen) container.mozRequestFullScreen();
      else if (container.msRequestFullscreen) container.msRequestFullscreen();

      container.classList.add("fullscreen-chart");
      chart.style.fill = "black";
      chart.style.transform = "scale(1.5)";
    }
  }

  function handleFullscreenChange() {
    const chart = document.querySelector("#chart");
    const container = document.getElementsByClassName("wheel-container")[0];
    if (!chart || !container) return;

    if (
      !document.fullscreenElement &&
      !document.webkitFullscreenElement &&
      !document.mozFullScreenElement &&
      !document.msFullscreenElement
    ) {
      container.classList.remove("fullscreen-chart");
      chart.style.transform = "scale(1.0)";
    }
  }

  // Wiring
  if (textarea) {
    parseInputToData(textarea.value);
    textarea.addEventListener("input", () => {
      parseInputToData(textarea.value);
      updateChart();
    });
  }

  if (colorSelector) colorSelector.addEventListener("change", updateColorScale);
  window.addEventListener("resize", makeChart);
  document.addEventListener("fullscreenchange", handleFullscreenChange);

  makeChart();

  // Expose functions for inline handlers.
  window.updateColorScale = updateColorScale;
  window.randomizeInput = randomizeInput;
  window.sortInput = sortInput;
  window.clearInput = clearInput;
  window.clearoutput = clearoutput;
  window.updateChart = updateChart;
  window.pop = pop;
  window.deleteSelected = deleteSelected;
  window.toggleFullscreen = toggleFullscreen;
})();
