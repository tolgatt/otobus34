    let data = [], scope = 'all', door = null, charts = {}, selectedGarage = "";

    const normalizeBrand = b => !b ? "Bilinmeyen" : (b.includes("CITIPORT") || b.includes("ANADOLU")) ? "ISUZU" : (b.includes("MERCEDES-BENZ")) ? "MERCEDES" : b.split(/[ /]/)[0];

    fetch("https://arac.iett.gov.tr/api/task/bus-fleet/buses", { method: "POST" })
      .then(r => r.json()).then(json => {
        data = json;
        fillGarages();
        draw();
      });

    function fillGarages() {
      const garages = [...new Set(data.map(v => v.garageName).filter(Boolean))].sort();
      const sel = document.getElementById("garageFilter");
      garages.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        sel.appendChild(opt);
      });
    }

    function setScope(s) {
      scope = s;
      document.getElementById("doorFilter").style.display = s === "non-iett" ? "block" : "none";
      draw();
    }

    function setDoor(d) {
      door = d;
      draw();
    }

    function setGarage(g) {
      selectedGarage = g;
      draw();
    }

    function draw() {
      let f = data;
      if (scope === "iett") f = f.filter(v => v.operatorType === "İETT");
      else if (scope === "non-iett") f = f.filter(v => v.operatorType !== "İETT" && (!door || v.vehicleDoorCode?.startsWith(door)));
      if (selectedGarage) f = f.filter(v => v.garageName === selectedGarage);

      const count = (arr, keyFn) => arr.reduce((acc, v) => {
        const k = keyFn(v); acc[k] = (acc[k] || 0) + 1; return acc;
      }, {});

      const defs = [
        { id: "brand", key: v => v.brandName || "Bilinmeyen" },
        { id: "model", key: v => v.modelYear || "Bilinmeyen" },
        { id: "mainBrand", key: v => normalizeBrand(v.brandName) },
        { id: "type", key: v => v.vehicleType || "Bilinmeyen" }
      ];

      defs.forEach(def => {
        const values = count(f, def.key);
        const labels = Object.keys(values);
        const numbers = Object.values(values);
        const colors = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 70%, 60%)`);

        if (charts[def.id]) charts[def.id].destroy();

        charts[def.id] = new Chart(document.getElementById(def.id + "Chart"), {
          type: "pie",
          data: {
            labels,
            datasets: [{ data: numbers, backgroundColor: colors }]
          },
          options: { plugins: { legend: { position: 'right' } } }
        });

        const tbl = document.getElementById(def.id + "Table");
        tbl.innerHTML = "<tr><th>Değer</th><th>Adet</th></tr>" + labels.map(l =>
          `<tr><td>${l}</td><td>${values[l]}</td></tr>`
        ).join('');
      });
    }
