document.addEventListener('DOMContentLoaded', function () {
    let currentDate = new Date();

    // Initial Render
    fetchAndRenderCalendar(currentDate);

    // Navigation Listeners
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        fetchAndRenderCalendar(currentDate);
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        fetchAndRenderCalendar(currentDate);
    });
});

async function fetchAndRenderCalendar(date) {
    const month = date.getMonth() + 1; // 1-12
    const year = date.getFullYear();
    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('month-display');

    // Loading State
    header.textContent = "Loading...";
    grid.innerHTML = '<div class="col-span-7 flex items-center justify-center text-slate-400 h-64">Loading Calendar...</div>';

    try {
        // Aladhan API: Gregorian to Hijri Calendar
        // endpoint: /v1/gToHCalendar/:month/:year
        const response = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}?latitude=-6.9175&longitude=107.6191&method=20`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const days = json.data;

        renderCalendarGrid(days, date);

    } catch (error) {
        console.error("Error fetching calendar data:", error);
        header.textContent = "Error Loading Data";
        grid.innerHTML = '<div class="col-span-7 flex flex-col items-center justify-center text-red-500 h-64 gap-2"><span class="material-symbols-outlined text-4xl">error</span><span>Gagal memuat data kalender.</span><button onclick="location.reload()" class="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">Coba Lagi</button></div>';
    }
}

function renderCalendarGrid(days, currentDate) {
    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('month-display');
    const indoMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // Clear Grid
    grid.innerHTML = '';

    // --- Header Calculation (Month Year | HijriMonth HijriYear) ---
    // We pick the 15th day (or middle) to get the dominant Hijri month for the header
    const middleDayIndex = Math.floor(days.length / 2);
    // structure is day.hijri and day.gregorian
    const middleHijri = days[middleDayIndex].hijri;

    // Construct Header String
    const masehiMonth = indoMonths[currentDate.getMonth()];
    const masehiYear = currentDate.getFullYear();
    const hijriString = `${middleHijri.month.en} ${middleHijri.year} H`;

    header.innerHTML = `
        <div class="flex flex-col items-center leading-tight">
            <span>${masehiMonth} ${masehiYear}</span>
            <span class="text-sm font-normal opacity-75">${hijriString}</span>
        </div>
    `;


    // --- Grid Rendering ---

    // 1. Calculate Empty Slots for start of month
    // Aladhan days[0] gives us the weekday of the 1st
    // "Sunday" -> 0, "Monday" -> 1, ...
    const firstDayWeekday = days[0].gregorian.weekday.en;
    const weekdayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
    let startOffset = weekdayMap[firstDayWeekday];

    // Create empty cells
    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = "h-24 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20";
        grid.appendChild(emptyCell);
    }

    // 2. Render Days
    days.forEach(day => {
        const dateDiv = document.createElement('div');
        const gDate = day.gregorian;
        const hDate = day.hijri;

        // Parse date for "Today" check. API format: "DD-MM-YYYY"
        const [d, m, y] = gDate.date.split('-');
        const dateObj = new Date(y, m - 1, d); // Month is 0-indexed in JS
        const today = new Date();
        const isToday = isSameDay(today, dateObj);
        const isSunday = gDate.weekday.en === "Sunday";

        // Styles
        let baseClass = "h-24 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-start pt-1 gap-1 relative group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50";
        let textClass = isSunday ? "text-red-500" : "text-slate-800 dark:text-white";

        if (isToday) {
            // Highlight style for today
            baseClass = "h-24 rounded-xl border border-primary shadow-sm relative flex flex-col items-center justify-start pt-1 gap-1 bg-white z-10 -ml-1 -mr-1 -mt-1 -mb-1 shadow-md";
            textClass = "text-primary";
        }

        dateDiv.className = baseClass;

        // Content
        if (isToday) {
            dateDiv.innerHTML = `
                <div class="w-full flex justify-between px-1">
                     <span class="font-bold ${textClass}">${gDate.day}</span>
                     <span class="w-1.5 h-1.5 rounded-full bg-primary mt-1"></span>
                </div>
                <span class="text-[10px] font-bold text-slate-500 opacity-75">${hDate.day}</span>
                <!-- Placeholder for future events -->
             `;
        } else {
            dateDiv.innerHTML = `
                <span class="font-bold ${textClass}">${gDate.day}</span>
                <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-75">${hDate.day}</span>
                <!-- Placeholder for future events -->
             `;
        }

        grid.appendChild(dateDiv);
    });

}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}
