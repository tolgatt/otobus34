    let tableData = [];
    let sortOrder = {};

    document.getElementById('filterForm').addEventListener('submit', async function(e){
      e.preventDefault();

      const form = e.target;
      const loading = document.getElementById('loading');
      loading.style.display = 'block';

      let tarih = form.tarih.value;
      if (!tarih) {
        alert("Tarih seçmek zorunludur.");
        loading.style.display = 'none';
        return;
      }

      tarih = tarih.replace(/-/g, '');

      const filters = [
        form.hatKoduFilter.value,
        form.guzergahKoduFilter.value,
        form.kapiNumaraFilter.value,
        form.gorevDurumFilter.value,
        form.bitisZamaniFilter.value,
        form.duzenlenenBaslamaZamaniFilter.value
      ];

      const hasOtherFilter = filters.some(v => v.trim() !== "");

      if (!hasOtherFilter) {
        alert("Tarih dışında en az bir filtre daha doldurun.");
        loading.style.display = 'none';
        return;
      }

      const data = {
        tarih: tarih,
        hatKoduFilter: form.hatKoduFilter.value,
        guzergahKoduFilter: form.guzergahKoduFilter.value,
        kapiNumaraFilter: form.kapiNumaraFilter.value,
        gorevDurumFilter: form.gorevDurumFilter.value,
        bitisZamaniFilter: form.bitisZamaniFilter.value,
        duzenlenenBaslamaZamaniFilter: form.duzenlenenBaslamaZamaniFilter.value
      };

      try {
        const response = await fetch('https://low-goose-47.deno.dev', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data)
        });
        const result = await response.json();
        tableData = result.rows || [];

        tableData.sort((a, b) => new Date(a.DTPLANLANANBASLANGICZAMANI) - new Date(b.DTPLANLANANBASLANGICZAMANI));

        renderTable(tableData);
      } catch (err) {
        console.error(err);
        alert('Bir hata oluştu.');
      } finally {
        loading.style.display = 'none';
      }
    });

    function renderTable(data) {
      const tbody = document.querySelector("#results tbody");
      tbody.innerHTML = "";

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">Veri bulunamadı. <i class="fa-sharp fa-solid fa-face-sad-tear"></i></td></tr>`;
        return;
      }

      data.forEach(row => {
        tbody.innerHTML += `
          <tr>
            <td>${row.SKAPINUMARA}</td>
            <td>${row.SHATKODU}</td>
            <td>${row.SGUZERGAHKODU}</td>
            <td>${row.SGOREVDURUM}</td>
            <td>${formatTime(row.DTPLANLANANBASLANGICZAMANI)}</td>
            <td>${formatTime(row.DTDUZENLENENBASLANGICZAMANI)}</td>
            <td>${row.DTBITISZAMANI ? formatTime(row.DTBITISZAMANI) : '—'}</td>
          </tr>`;
      });
    }

    function formatTime(dtString) {
      if (!dtString) return '—';
      const date = new Date(dtString);
      const hours = date.getHours().toString().padStart(2,'0');
      const minutes = date.getMinutes().toString().padStart(2,'0');
      return `${hours}:${minutes}`;
    }

    document.getElementById("searchInput").addEventListener("input", function() {
      const value = this.value.toLowerCase();
      const filtered = tableData.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(value)));
      renderTable(filtered);
    });

    document.querySelectorAll("#results th").forEach(th => {
      th.addEventListener("click", function() {
        const key = this.dataset.key;
        const order = sortOrder[key] === "asc" ? "desc" : "asc";
        sortOrder[key] = order;

        // reset all icons
        document.querySelectorAll("#results th i").forEach(icon => {
          icon.className = "fa-sharp fa-solid fa-arrow-up-arrow-down";
        });

        // set active icon
        const icon = this.querySelector("i");
        icon.className = order === "asc" ? "fa-sharp fa-solid fa-arrow-up-short-wide" : "fa-sharp fa-solid fa-arrow-down-wide-short";

        const sorted = [...tableData].sort((a, b) => {
          const valA = a[key] || "";
          const valB = b[key] || "";
          if (!isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
            return order === "asc" ? new Date(valA) - new Date(valB) : new Date(valB) - new Date(valA);
          } else if (!isNaN(valA) && !isNaN(valB)) {
            return order === "asc" ? valA - valB : valB - valA;
          } else {
            return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
        });
        renderTable(sorted);
      });
    });
