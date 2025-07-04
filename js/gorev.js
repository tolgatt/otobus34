    const statusColors = {
      "T": "#caffbf",
      "I": "#ffadad",
      "YK": "#fdffb6",
      "A": "#9bf6ff",
      "B": "#d6eadf",
    };

    function convertUnixToTime(unixTime) {
      if (!unixTime) return "-";
      const date = new Date(unixTime);
      return date.toLocaleTimeString("tr-TR", {
        timeZone: "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function toggleYardim() {
      const panel = document.getElementById("yardimPaneli");
      panel.style.display = panel.style.display === "block" ? "none" : "block";
    }

    async function getTasks() {
      const container = document.getElementById("tasksContainer");
      const baslik = document.getElementById("baslik");
      const urlParams = new URLSearchParams(window.location.search);
      const aracNo = urlParams.get("arac");
      if (!aracNo) {
        container.innerHTML = "URL'de kapı numarası belirtilmemiş.";
        return;
      }
      baslik.innerText = `${aracNo}`;
      try {
        const res = await fetch(`https://arac.iett.gov.tr/api/task/getCarTasks/${aracNo}`, {
          method: "POST"
        });
        const data = await res.json();
        container.innerHTML = "";

        data.forEach(task => {
          const statusColor = statusColors[task.taskStatusCode] || "#e0e0e0";
          const approxStartTime = convertUnixToTime(task.approximateStartTime);
          const updatedStartTime = convertUnixToTime(task.updatedStartTime);
          const endTime = convertUnixToTime(task.taskEndTime);
          const direction = (() => {
            if (!task.lineName || !task.lineName.includes("-")) return task.routeDirection === 1 ? "Gidiş" : "Dönüş";
            const [gidis, donus] = task.lineName.split("-");
            return task.routeDirection === 1 ? donus.trim() : gidis.trim();
          })();

          const div = document.createElement("div");
          div.className = "task";
          div.id = `task-${task.taskId}`;
          div.style.backgroundColor = statusColor;

          const pulse = (task.taskStatusCode === "A") ? `
  <div class="pulse">
    <div class="dot"></div>
  </div>
` : "";
          const stopName = task.taskStatusCode === "YK" ? (task.lastStopPassedName || "-") : (task.stopName || "-");
          const stopCode = task.taskStatusCode === "YK" ? (task.lastStopPassedCode || "-") : (task.stopCode || "-");

          const title = `
            ${pulse}
            <div class="task-header">
              <strong>${task.routeCode} (${task.serviceNo})<br>
              ${approxStartTime} - ${direction}</strong><br>
              (${updatedStartTime} - ${endTime})<br>
              ${stopName} (${stopCode})<br>
              ${task.note ? '<div class="note">' + task.note + '</div>' : ''}
            </div>
          `;

          div.innerHTML = title;
          container.appendChild(div);
        });

        if (data.length === 0) {
          container.innerHTML = "Görev bulunamadı.";
        }
      } catch (err) {
        console.error("Hata:", err);
        container.innerHTML = "Görevler teknik bir hatadan ötürü alınamadı.";
      }
    }

    window.addEventListener("load", () => {
      const now = new Date();
      const timestamp = now.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
      document.getElementById("timestamp").textContent = `Son güncelleme: ${timestamp}`;
      getTasks();
    });
