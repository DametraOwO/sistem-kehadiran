document.addEventListener('DOMContentLoaded', function () {
    let currentDate = new Date();
    window.globalScheduleData = []; // Store schedule data globally
    window.globalHolidays = []; // Store holidays globally

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

    // Filter Listener
    document.getElementById('class-filter').addEventListener('change', () => {
        renderCurrentView(currentDate);
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
        // Fetch Calendar Data, Schedule Data, and Holidays concurrently
        const [calendarResponse, scheduleResponse, holidayResponse] = await Promise.all([
            fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}?latitude=-6.9175&longitude=107.6191&method=20`),
            fetch('/api/jadwal'),
            fetch(`https://api-harilibur.vercel.app/api?year=${year}`)
        ]);

        if (!calendarResponse.ok) {
            throw new Error(`Calendar API error! status: ${calendarResponse.status}`);
        }

        const calendarJson = await calendarResponse.json();
        const days = calendarJson.data;

        // Save calendar days to a global/accessible scope for re-rendering if needed, 
        // but since we re-fetch on month change, passing it down is fine.
        // We DO need to save schedule data globally for filtering.

        if (scheduleResponse.ok) {
            const scheduleJson = await scheduleResponse.json();
            if (scheduleJson.success) {
                window.globalScheduleData = scheduleJson.data;
            }
        }

        if (holidayResponse.ok) {
            const holidayJson = await holidayResponse.json();
            // API returns array of objects: { "holiday_date": "2024-1-1", "holiday_name": "Tahun Baru" }
            window.globalHolidays = holidayJson;
        }

        renderCalendarGrid(days, date);

    } catch (error) {
        console.error("Error fetching data:", error);
        header.textContent = "Error Loading Data";
        grid.innerHTML = '<div class="col-span-7 flex flex-col items-center justify-center text-red-500 h-64 gap-2"><span class="material-symbols-outlined text-4xl">error</span><span>Gagal memuat data kalender.</span><button onclick="location.reload()" class="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">Coba Lagi</button></div>';
    }
}

// Wrapper to re-render without fetching if possible, but currently we fetch continuously on navigation.
// This function is mainly for the filter change.
async function renderCurrentView(date) {
    // We need 'days' from the API again or stored. 
    // Since we didn't store 'days' globally, we will re-fetch or we should refactor to store 'days'.
    // To allow filtering without network call, let's just trigger the fetch again acting as a refresh 
    // OR we change fetchAndRenderCalendar to reuse data.
    // For simplicity given the scope: Re-calling fetchAndRenderCalendar is safe but slightly inefficient.
    // OPTIMIZATION: Check if we already have data for this month/year? 
    // Let's stick to calling fetchAndRenderCalendar which handles loading UI. 
    // WAIT, fetchAndRenderCalendar overwrites globalScheduleData. That's fine.

    // BETTER APPROACH: Store 'days' in global variable too?
    // Let's modify fetchAndRenderCalendar to store 'days' in window.currentCalendarDays 
    // and then call renderCalendarGrid.

    // If we already have window.currentCalendarDays matching the date, just render.
    if (window.currentCalendarDays &&
        window.currentCalendarDate &&
        window.currentCalendarDate.getMonth() === date.getMonth() &&
        window.currentCalendarDate.getFullYear() === date.getFullYear()) {
        renderCalendarGrid(window.currentCalendarDays, date);
    } else {
        fetchAndRenderCalendar(date);
    }
}

function renderCalendarGrid(days, currentDate) {
    // Store for filtering re-renders
    window.currentCalendarDays = days;
    window.currentCalendarDate = currentDate;

    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('month-display');
    const indoMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const filterClass = document.getElementById('class-filter').value;

    const dayMap = {
        "Sunday": "Minggu",
        "Monday": "Senin",
        "Tuesday": "Selasa",
        "Wednesday": "Rabu",
        "Thursday": "Kamis",
        "Friday": "Jumat",
        "Saturday": "Sabtu"
    };

    grid.innerHTML = '';

    const middleDayIndex = Math.floor(days.length / 2);
    const middleHijri = days[middleDayIndex].hijri;
    const masehiMonth = indoMonths[currentDate.getMonth()];
    const masehiYear = currentDate.getFullYear();
    const hijriString = `${middleHijri.month.en} ${middleHijri.year} H`;

    header.innerHTML = `
        <div class="flex flex-col items-center leading-tight">
            <span>${masehiMonth} ${masehiYear}</span>
            <span class="text-sm font-normal opacity-75">${hijriString}</span>
        </div>
    `;

    const firstDayWeekday = days[0].gregorian.weekday.en;
    const weekdayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
    let startOffset = weekdayMap[firstDayWeekday];

    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = "h-32 border-b border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20";
        grid.appendChild(emptyCell);
    }

    days.forEach(day => {
        const dateDiv = document.createElement('div');
        const gDate = day.gregorian;
        const hDate = day.hijri;

        // Parse date
        const [d, m, y] = gDate.date.split('-');
        // API returns DD-MM-YYYY

        // Normalize Date for Comparison (YYYY-MM-DD or similar) to match API
        // New API api-harilibur often returns YYYY-M-D or YYYY-MM-DD
        // Safest is to create Date objects and compare timestamp/string

        const currentYear = parseInt(y);
        const currentMonth = parseInt(m) - 1; // JS Month is 0-indexed
        const currentDay = parseInt(d);

        // Holiday Check
        const isHoliday = window.globalHolidays.some(h => {
            const hDate = new Date(h.holiday_date);
            return hDate.getFullYear() === currentYear &&
                hDate.getMonth() === currentMonth &&
                hDate.getDate() === currentDay &&
                h.is_national_holiday !== false; // Ensure it is a national holiday if property exists
        });

        // Get Holiday Name
        const holiday = window.globalHolidays.find(h => {
            const hDate = new Date(h.holiday_date);
            return hDate.getFullYear() === currentYear &&
                hDate.getMonth() === currentMonth &&
                hDate.getDate() === currentDay;
        });

        const dateObj = new Date(currentYear, currentMonth, currentDay);
        const today = new Date();
        const isToday = isSameDay(today, dateObj);
        const isSunday = gDate.weekday.en === "Sunday";

        const dayNameIndo = dayMap[gDate.weekday.en];

        // FILTER LOGIC
        // If filterClass is empty (""), return NO schedules (General View)
        // If filterClass has value, return schedules for that class
        let todaysSchedule = [];
        if (filterClass !== "") {
            todaysSchedule = window.globalScheduleData.filter(s => s.hari === dayNameIndo);
            todaysSchedule = todaysSchedule.filter(s => s.nama_kelas === filterClass);
        }

        // HOLIDAY PRIORITY: If it is a holiday, DO NOT show schedules
        if (isHoliday) {
            todaysSchedule = [];
            // We keep the holiday display logic below, but ensure no schedule items are added.
        }

        // Styles
        let baseClass = "min-h-[128px] border-b border-r border-slate-100 dark:border-slate-800 flex flex-col items-start justify-start p-2 gap-1 relative group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50";

        // Text Color Logic: Sunday OR Holiday -> Red
        let textClass = (isSunday || isHoliday) ? "text-red-500 font-bold" : "text-slate-800 dark:text-white";

        if (isToday) {
            baseClass += " bg-primary/5";
            if (!isHoliday && !isSunday) { // Only force primary if not holiday/sunday, or maybe mix? 
                // Let holiday red take precedence for date color? 
                // textClass = "text-primary font-bold"; 
                // User requirement: "indonesian national holiday with a red date" -> Red takes precedence.
            }
        }

        dateDiv.className = baseClass;

        // Date Header inside cell
        let dateHtml = `
            <div class="w-full flex justify-between items-start mb-1">
                <span class="text-sm font-medium ${textClass}">${gDate.day}</span>
                <span class="text-[10px] text-slate-400 opacity-75">${hDate.day}</span>
            </div>
        `;

        // Holiday Label
        if (isHoliday && holiday) {
            dateHtml += `
                <div class="w-full mb-1">
                    <span class="text-[10px] font-bold text-red-500 leading-tight block text-center bg-red-50 dark:bg-red-900/20 rounded px-1 py-0.5 border border-red-100 dark:border-red-900/30">
                        ${holiday.holiday_name}
                    </span>
                </div>
            `;
        }

        // Schedule Items
        let scheduleHtml = '';
        if (todaysSchedule.length > 0) {
            scheduleHtml = '<div class="w-full flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar">';
            todaysSchedule.forEach(sch => {
                const startTime = sch.waktu_mulai.slice(0, 5);
                scheduleHtml += `
                    <div class="w-full bg-white dark:bg-white/10 border border-slate-100 dark:border-white/5 rounded px-1.5 py-1 flex flex-col items-start shadow-sm">
                        <span class="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-1">${sch.mata_pelajaran}</span>
                        <div class="flex items-center gap-1 w-full">
                            <span class="text-[9px] text-slate-500 dark:text-slate-400 leading-none">${startTime}</span>
                        </div>
                    </div>
                `;
            });
            scheduleHtml += '</div>';
        }

        dateDiv.innerHTML = dateHtml + scheduleHtml;
        grid.appendChild(dateDiv);
    });
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}
