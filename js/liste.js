    let data = [];

    const normalizeBrand = b => !b ? "Bilinmeyen" : (b.includes("CITIPORT") || b.includes("ANADOLU")) ? "ISUZU" : (b.includes("MERCEDES-BENZ")) ? "MERCEDES" : b.split(/[ /]/)[0];

    fetch("https://arac.iett.gov.tr/api/task/bus-fleet/buses", { method: "POST" })
      .then(r => r.json())
      .then(json => {
        data = json;
        fillFilters();
        draw();
      });

    function fillFilters() {
      const fill = (id, keyFn) => {
        const values = [...new Set(data.map(keyFn))].filter(Boolean).sort();
        const sel = document.getElementById(id);
        values.forEach(v => {
          const opt = document.createElement("option");
          opt.value = opt.textContent = v;
          sel.appendChild(opt);
        });
      };
      fill("brandFilter", v => v.brandName);
      fill("mainBrandFilter", v => normalizeBrand(v.brandName));
      fill("yearFilter", v => v.modelYear);
      fill("typeFilter", v => v.vehicleType);
      fill("opFilter", v => v.operatorType);
      fill("garageFilter", v => v.garageName);
    }

    document.querySelectorAll("select").forEach(s => s.onchange = draw);

    function draw() {
      const brand = document.getElementById("brandFilter").value;
      const mainBrand = document.getElementById("mainBrandFilter").value;
      const year = document.getElementById("yearFilter").value;
      const type = document.getElementById("typeFilter").value;
      const op = document.getElementById("opFilter").value;
      const typeScope = document.getElementById("typeScopeFilter").value;
      const garage = document.getElementById("garageFilter").value;

      const tbody = document.querySelector("#vehicleTable tbody");
      tbody.innerHTML = "";

      const filtered = data.filter(v =>
        (!brand || v.brandName === brand) &&
        (!mainBrand || normalizeBrand(v.brandName) === mainBrand) &&
        (!year || v.modelYear == year) &&
        (!type || v.vehicleType === type) &&
        (!op || v.operatorType === op) &&
        (!garage || v.garageName === garage) &&
        (
          !typeScope ||
          (typeScope === "iett" && v.operatorType === "İETT") ||
          (typeScope === "oho" && v.operatorType !== "İETT")
        )
      );

      document.getElementById("status").textContent = `${filtered.length} otobüs bulundu.`;

      filtered.forEach(v => {
        const tr = document.createElement("tr");
        const lastSeen = v.lastLocationDate && v.lastLocationTime
          ? `${v.lastLocationDate} ${v.lastLocationTime}`
          : "—";
        [v.vehicleDoorCode, v.numberPlate, v.modelYear, v.brandName, v.vehicleType, v.operatorType, lastSeen].forEach(val => {
          const td = document.createElement("td");
          td.textContent = val || "—";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    function exportXLSX() {
        const rows = [["Kapı Kodu","Plaka","Model Yılı","Marka","Tip","İşletmeci","Son Konum"]];
        const tbody = document.querySelectorAll("#vehicleTable tbody tr");
	
        tbody.forEach(tr => {
        const row = [];
        tr.querySelectorAll("td").forEach(td => row.push(td.textContent));
        rows.push(row);
      });
	
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Araç Listesi");

        const now = new Date();
        const timestamp = now.getFullYear() + "-" +
          String(now.getMonth() + 1).padStart(2, '0') + "-" +
          String(now.getDate()).padStart(2, '0') + "_" +
          String(now.getHours()).padStart(2, '0') + "-" +
          String(now.getMinutes()).padStart(2, '0') + "-" +
          String(now.getSeconds()).padStart(2, '0');

        XLSX.writeFile(wb, `araclar_${timestamp}.xlsx`);
    }
