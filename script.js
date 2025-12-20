let myChart;

function showError() {
  const inputs = document.querySelectorAll("input");

  inputs.forEach(function (input) {
    input.style.backgroundColor = "red";
  });
}



async function calculateSalary() {
  const sumInput = document.getElementById("sum").value;
  const hoursInput = document.getElementById("hours").value;
  const additionalValueInput = document.getElementById("additionalValue").value;

  const sum = parseFloat(sumInput);
  const hours = parseFloat(hoursInput);
  const additionalValue = parseFloat(additionalValueInput);

  if (isNaN(sum) || isNaN(hours) || isNaN(additionalValue)) {
    showError();
    return;
  }

  // Выполняем существующие формулы расчёта
  let brut, result, com;

  if (sum === 0 && hours === 0) {
    brut = 38.5 * 16.1;
    result = brut - 0.21 * brut;
    com = 0;
  } else {
    const y = hours * 16.1;
    const z = y * 2;
    const t = sum - z;
    com = t - 0.6 * t;
    const w = com + y;
    brut = w;
    result = w - 0.21 * w;
  }

  // Добавляем дополнительное значение к результату и brut
  const additionalResult = additionalValue + result;
  const additionalBrut = additionalValue + brut;

  // Вычисляем дополнительные значения по формуле
  const additionalNalog = additionalValue + 0.21 * brut + result;

  // Вычисляем часовую зарплату
  let hourlySalary;
  if (sum === 0 && hours === 0) {
    hourlySalary = 16.1;
  } else {
    hourlySalary = hours !== 0 ? brut / hours : 0;
  }

  if (!isFinite(hourlySalary)) {
    hourlySalary = 0;
  }

  // Сохранение данных в базу данных Supabase
  await saveDataToSupabase(
    sum,
    hours,
    result,
    com,
    additionalValue,
    hourlySalary,
    additionalResult,
    additionalBrut,
    additionalNalog,
  );
  await fetchResults();

  // Hide wizard steps and show results
  // document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  // document.getElementById('resultsArea').classList.remove('hidden');

  // После сохранения данных и получения новых данных из базы данных перезагружаем результаты и обновляем график
  displayResults();
  await updateChart();
}
// Получение элементов DOM
// Получение элементов DOM
const resultsList = document.getElementById("resultsList");
const resultsList2 = document.getElementById("resultsList2");
const resultsList3 = document.getElementById("resultsList3");
const hourlySalaryResult1 = document.getElementById("hourlySalaryResult1");
const hourlySalaryResult2 = document.getElementById("hourlySalaryResult2");

// Функция для получения всех данных для статистики
async function fetchResults() {
  try {
    const { data, error } = await supabaseClient
      .from("peon")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error.message);
      return;
    }

    if (data) {
      calculateStats(data);
    }
  } catch (error) {
    console.error("Error in fetchResults:", error.message);
  }
}

// Функция для отображения результатов
async function displayResults() {
  try {
    // Получение данных из базы данных Supabase
    const { data, error } = await supabaseClient
      .from("peon")
      .select("*")
      .order("id", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Supabase:", error.message);
      showError();
      return;
    }

    // Очистка списка перед обновлением
    resultsList.innerHTML = "";
    resultsList2.innerHTML = ""; // Добавлено для второго списка
    resultsList3.innerHTML = "";

    // Вывод почасовой зарплаты для второй записи
    if (data.length >= 2) {
      const firstEntry = data[1];
      const firstHourlySalary = (
        firstEntry.bigtotal / firstEntry.hours
      ).toFixed(2);
      hourlySalaryResult2.textContent = `${firstHourlySalary}`;
    }

    // Вывод почасовой зарплаты для второй записи
    if (data.length >= 2) {
      const secondEntry = data[1];
      const secondHourlySalary = secondEntry.hourlySalary.toFixed(2);
      hourlySalaryResult1.textContent = `${secondHourlySalary}`;
    }
    // Helper to format date safely
    const formatDate = (dateStr, fallbackStr) => {
        if (!dateStr && !fallbackStr) return 'N/A';
        const d = new Date(dateStr || fallbackStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    };

    // Вывод результатов в список
    data.forEach((entry, index) => {
      const listItem = document.createElement("li");

      // Добавление стиля для второй записи
      if (index === 1) {
        listItem.classList.add("blueunderline");
      } else {
        listItem.classList.add("redunderline");
      }

      const displayDate = formatDate(entry.date, entry.created_at);

      // Формирование содержимого элемента списка
      listItem.innerHTML = `
        <div class="result-card">
          <div class="result-row">
            <div class="result-item">
              <span class="result-label">LA CASSE</span>
              <span class="result-value">${entry.sum}</span>
            </div>
            <div class="result-item">
              <span class="result-label">LES HEURES</span>
              <span class="result-value">${entry.hours}</span>
            </div>
          </div>
          <div class="result-row">
            <div class="result-item">
              <span class="result-label">COMMISSION</span>
              <span class="result-value">${entry.com.toFixed(2)}</span>
            </div>
            <div class="result-item highlight-cyan">
              <span class="result-label">LE SALAIRE</span>
              <span class="result-value">${entry.result.toFixed(2)}</span>
            </div>
          </div>
          <div class="result-row full-width">
            <div class="result-item highlight-purple">
              <span class="result-label">SOMME TOTALE</span>
              <span class="result-value">${entry.ADtotal.toFixed(2)}</span>
            </div>
          </div>
          <div class="result-row">
            <div class="result-item">
               <span class="result-label" style="font-size: 10px; opacity: 0.7;">DATE</span>
               <span class="result-value" style="font-size: 12px; font-weight: 400;">${displayDate}</span>
            </div>
          </div>
        </div>
      `;

      if (index < 1) {
        resultsList.appendChild(listItem);
      } else if (index < 2) {
        const listItem2 = listItem.cloneNode(true); // Создание копии элемента
        resultsList2.appendChild(listItem2); // Добавление копии во второй список
      } else {
        const listItem3 = listItem.cloneNode(true); // Создание копии элемента
        resultsList3.appendChild(listItem3); // Добавление копии в третий список
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
    showError();
  }
}

function createChart(results) {
  if (typeof Chart === 'undefined') {
    console.error("Chart.js is not loaded. Cannot create chart.");
    return;
  }
  const canvas = document.getElementById("myChart");
  if (!canvas) {
      console.error("Canvas element 'myChart' not found");
      return;
  }
  console.log("createChart executing. Data points:", results.length);
  const labels = results.map(
    (result) => {
      const dateStr = result.date || result.created_at;
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    }
  );
  const data = results.map((result) =>
    result.result ? result.result.toFixed(2) : 0
  );

  const ctx = document.getElementById("myChart").getContext("2d");

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(10, 132, 255, 0.2)'); // Blue with low opacity
  gradient.addColorStop(1, 'rgba(10, 132, 255, 0)');

  if (typeof myChart === "object" && myChart !== null) {
    myChart.destroy();
  }
  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Salary",
          data: data,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4,
          borderColor: "#0A84FF", // Blue accent
          borderWidth: 2,
          pointRadius: 0, // Clean look, no points by default
          pointHoverRadius: 4,
          pointBackgroundColor: "#0A84FF",
          pointBorderColor: "#fff",
        }
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: true,
          display: true,
          grid: { 
            color: "rgba(255, 255, 255, 0.05)",
            drawBorder: false
          },
          ticks: { 
            color: "#8e8e93",
            font: {
              family: "'Inter', sans-serif",
              size: 11
            }
          }
        },
        // ... rest of options ...
      },
      plugins: {
        // ... plugins ...
      },
    },
  });
}



function calculateStats(data) {
  // ... best/worst logic ...

  // Robust date formatter for stats
  const formatDate = (dateStr) => {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  if (!data || data.length === 0) {
      document.getElementById("bestWeek").textContent = "N/A";
      document.getElementById("worstWeek").textContent = "N/A";
      document.getElementById("vacationRec").textContent = "N/A";
      document.getElementById("profitTrend").textContent = "N/A";
      return;
  }

  // Best and Worst Week
  let maxResult = -Infinity;
  let minResult = Infinity;
  let bestWeek = null;
  let worstWeek = null;

  data.forEach((entry) => {
    if (typeof entry.result !== 'number') return;
    if (entry.result > maxResult) {
      maxResult = entry.result;
      bestWeek = entry;
    }
    if (entry.result < minResult) {
      minResult = entry.result;
      worstWeek = entry;
    }
  });

  if (bestWeek) {
    document.getElementById("bestWeek").textContent = `$${maxResult.toFixed(2)}`;
    const bestDate = bestWeek.date || bestWeek.created_at;
    document.getElementById("bestWeekDate").textContent = bestDate ? formatDate(bestDate) : 'N/A';
  } else {
    document.getElementById("bestWeek").textContent = "N/A";
    document.getElementById("bestWeekDate").textContent = "";
  }

  if (worstWeek) {
    document.getElementById("worstWeek").textContent = `$${minResult.toFixed(2)}`;
    const worstDate = worstWeek.date || worstWeek.created_at;
    document.getElementById("worstWeekDate").textContent = worstDate ? formatDate(worstDate) : 'N/A';
  } else {
    document.getElementById("worstWeek").textContent = "N/A";
    document.getElementById("worstWeekDate").textContent = "";
  }

  // Vacation Recommendation (Lowest Average Month)
  const monthTotals = {};
  const monthCounts = {};

  data.forEach((entry) => {
    const dateStr = entry.date || entry.created_at;
    if (!dateStr) return;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return; // Skip invalid dates
    const month = date.toLocaleString("default", { month: "long" });

    if (!monthTotals[month]) {
      monthTotals[month] = 0;
      monthCounts[month] = 0;
    }
    monthTotals[month] += entry.result;
    monthCounts[month]++;
  });

  let minAvg = Infinity;
  let worstMonth = "N/A";

  for (const month in monthTotals) {
    const avg = monthTotals[month] / monthCounts[month];
    if (avg < minAvg) {
      minAvg = avg;
      worstMonth = month;
    }
  }

  if (worstMonth === "N/A") {
      document.getElementById("vacationRec").textContent = "N/A";
      return; 
  }

  // Profit Trend Calculation
  if (data.length >= 2) {
    const current = data[0].result;
    const previous = data[1].result;
    const diff = current - previous;
    const trendElement = document.getElementById("profitTrend");

    if (diff > 0) {
      trendElement.innerHTML = `+$${diff.toFixed(2)} <span style="color: #00ff9d;">&#8593;</span>`;
    } else if (diff < 0) {
      trendElement.innerHTML = `-$${Math.abs(diff).toFixed(2)} <span style="color: #ff4d4d;">&#8595;</span>`;
    } else {
      trendElement.innerHTML = `$0.00 <span>-</span>`;
    }
  } else {
    const trendElement = document.getElementById("profitTrend");
    if (trendElement) trendElement.textContent = "N/A";
  }

  document.getElementById("vacationRec").textContent = worstMonth.toUpperCase();
}

async function updateChart() {
  try {
    if (typeof supabaseClient === 'undefined') {
        console.error("Supabase client not initialized");
        return;
    }

    const { data, error } = await supabaseClient
        .from("peon")
        .select("sum, hours, result, date, ADtotal, additionalValue")
        .order("id", { ascending: false }) // Сортировка по ID в порядке возрастания
        .limit(10);

    if (error) {
        console.error("Error fetching data from Supabase:", error.message);
    } else if (data) {
        console.log("updateChart: Data fetched successfully", data.length);
        const recentData = data.slice(0, 10);
        createChart(recentData.reverse());
    }
  } catch (err) {
      console.error("Unexpected error in updateChart:", err);
  }
}

window.onload = function () {
  fetchResults();
  displayResults();
  updateChart();
};

