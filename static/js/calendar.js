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

    // Modal Interaction Listeners
    const modal = document.getElementById('agenda-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const closeBtn = document.getElementById('close-modal-btn');

    const closeModal = () => {
        const container = document.getElementById('modal-container');
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        container.classList.remove('translate-y-0');
        container.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
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

    const holidayListContainer = document.getElementById('holiday-list');
    grid.innerHTML = '';
    holidayListContainer.innerHTML = '';
    const currentMonthHolidays = [];

    const firstHijri = days[0].hijri;
    const lastHijri = days[days.length - 1].hijri;
    const masehiMonth = indoMonths[currentDate.getMonth()];
    const masehiYear = currentDate.getFullYear();

    let hijriString = `${firstHijri.month.en} ${firstHijri.year} H`;
    if (firstHijri.month.number !== lastHijri.month.number) {
        hijriString = `${firstHijri.month.en} - ${lastHijri.month.en} ${lastHijri.year} H`;
    }

    header.innerHTML = `
        <div class="flex flex-col items-center leading-tight">
            <span>${masehiMonth} ${masehiYear}</span>
            <span class="text-[10px] font-normal opacity-60">${hijriString}</span>
        </div>
    `;

    const firstDayWeekday = days[0].gregorian.weekday.en;
    const weekdayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
    let startOffset = weekdayMap[firstDayWeekday];

    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = "h-16 border-b border-slate-50 bg-slate-50/30";
        grid.appendChild(emptyCell);
    }

    days.forEach(day => {
        const dateDiv = document.createElement('div');
        const gDate = day.gregorian;
        const hDate = day.hijri;

        // Parse date
        const [d, m, y] = gDate.date.split('-');
        const currentYear = parseInt(y);
        const currentMonth = parseInt(m) - 1;
        const currentDay = parseInt(d);

        // Holiday Check
        const isHoliday = window.globalHolidays.some(h => {
            const hDate = new Date(h.holiday_date);
            return hDate.getFullYear() === currentYear &&
                hDate.getMonth() === currentMonth &&
                hDate.getDate() === currentDay &&
                h.is_national_holiday !== false;
        });

        // Get Holiday Name
        const holiday = window.globalHolidays.find(h => {
            const hDate = new Date(h.holiday_date);
            return hDate.getFullYear() === currentYear &&
                hDate.getMonth() === currentMonth &&
                hDate.getDate() === currentDay;
        });

        if (isHoliday && holiday) {
            if (!currentMonthHolidays.some(h => h.holiday_date === holiday.holiday_date)) {
                currentMonthHolidays.push(holiday);
            }
        }

        const dateObj = new Date(currentYear, currentMonth, currentDay);
        const isToday = isSameDay(new Date(), dateObj);
        const isSunday = gDate.weekday.en === "Sunday";
        const dayNameIndo = dayMap[gDate.weekday.en];

        // FILTER LOGIC
        let todaysSchedule = [];
        if (filterClass !== "") {
            todaysSchedule = window.globalScheduleData.filter(s => s.hari === dayNameIndo && s.nama_kelas === filterClass);
        }

        // Styles
        let baseClass = "h-16 border-b border-slate-50 flex flex-col items-center justify-center relative group cursor-pointer hover:bg-slate-50 transition-colors";
        let textClass = (isSunday || isHoliday) ? "text-red-500 font-bold" : "text-slate-700";

        if (isToday) {
            baseClass += " bg-primary/5 ring-1 ring-inset ring-primary/20";
        }

        dateDiv.className = baseClass;

        // Date Display
        dateDiv.innerHTML = `
            <span class="text-sm ${textClass}">${gDate.day}</span>
            <span class="text-[8px] text-slate-400 font-medium">${hDate.day}</span>
            ${todaysSchedule.length > 0 ? '<div class="absolute bottom-1.5 size-1 rounded-full bg-primary"></div>' : ''}
            ${isHoliday ? '<div class="absolute bottom-1.5 size-1 rounded-full bg-red-400"></div>' : ''}
        `;

        // Add Click Listener to show Modal
        dateDiv.addEventListener('click', () => {
            showAgendaDetail(day, holiday, todaysSchedule, dayNameIndo);
        });

        grid.appendChild(dateDiv);
    });

    // Render Holiday List below calendar
    if (currentMonthHolidays.length > 0) {
        currentMonthHolidays.sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date));

        currentMonthHolidays.forEach(h => {
            const hDate = new Date(h.holiday_date);
            const d = hDate.getDate();
            const m = hDate.getMonth();
            const monthName = indoMonths[m];

            const item = document.createElement('div');
            item.className = "flex items-center gap-3 p-3 rounded-2xl bg-red-50/50 border border-red-100/50";
            item.innerHTML = `
                <div class="flex flex-col items-center justify-center min-w-[36px] h-[36px] rounded-lg bg-red-500 text-white">
                    <span class="text-xs font-bold leading-none">${d}</span>
                    <span class="text-[8px] font-medium uppercase opacity-90">${monthName.slice(0, 3)}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-red-600 leading-tight">${h.holiday_name}</span>
                    <span class="text-[10px] text-red-400">Libur Nasional</span>
                </div>
            `;
            holidayListContainer.appendChild(item);
        });
    } else {
        holidayListContainer.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-2 italic font-medium">Tidak ada hari libur bulan ini</p>';
    }
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function showAgendaDetail(day, holiday, schedules, dayName) {
    const modal = document.getElementById('agenda-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const container = document.getElementById('modal-container');
    const body = document.getElementById('modal-agenda-body');
    const masehiText = document.getElementById('modal-masehi');
    const hijriText = document.getElementById('modal-hijri');
    const indoMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // 1. Format Dates
    const gDate = day.gregorian;
    const hDate = day.hijri;
    const mDateParts = gDate.date.split('-');
    masehiText.textContent = `${dayName}, ${parseInt(mDateParts[0])} ${indoMonths[parseInt(mDateParts[1]) - 1]} ${mDateParts[2]}`;
    hijriText.textContent = `${hDate.day} ${hDate.month.en} ${hDate.year} H`;

    // 2. Clear Body
    body.innerHTML = '';

    // 3. Add Holiday if any
    if (holiday) {
        const hDiv = document.createElement('div');
        hDiv.className = "p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-4";
        hDiv.innerHTML = `
            <div class="size-11 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                <span class="material-symbols-outlined text-[24px]">event_busy</span>
            </div>
            <div class="flex flex-col">
                <span class="text-xs font-bold text-red-400 uppercase tracking-widest leading-none mb-1">Hari Libur</span>
                <span class="font-bold text-red-600 tracking-tight">${holiday.holiday_name}</span>
            </div>
        `;
        body.appendChild(hDiv);
    }

    // 4. Add Schedules
    if (schedules.length > 0) {
        // Sort schedules by time
        schedules.sort((a, b) => a.waktu_mulai.localeCompare(b.waktu_mulai));

        const schHeader = document.createElement('p');
        schHeader.className = "text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mt-6 mb-2";
        schHeader.textContent = "Agenda Mata Pelajaran";
        body.appendChild(schHeader);

        schedules.forEach(sch => {
            const row = document.createElement('div');
            row.className = "p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all";
            row.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="size-11 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[24px]">book</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">${sch.nama_kelas}</span>
                        <span class="font-bold text-slate-800 tracking-tight leading-tight">${sch.mata_pelajaran}</span>
                    </div>
                </div>
                <div class="text-right flex flex-col items-end">
                    <span class="text-xs font-extrabold text-primary leading-none">${sch.waktu_mulai.slice(0, 5)}</span>
                    <span class="text-[10px] font-medium text-slate-400 mt-1">${sch.waktu_selesai.slice(0, 5)}</span>
                </div>
            `;
            body.appendChild(row);
        });
    }

    // 5. Empty State
    if (!holiday && schedules.length === 0) {
        body.innerHTML = `
            <div class="py-12 flex flex-col items-center text-center">
                <div class="size-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-slate-200 text-5xl">event_upcoming</span>
                </div>
                <p class="text-slate-400 font-medium italic">Tidak ada agenda kegiatan <br> pada hari ini.</p>
            </div>
        `;
    }

    // 6. Show Modal with Animation
    modal.classList.remove('hidden');
    // Force reflow for animation
    void container.offsetHeight;

    backdrop.classList.add('opacity-100');
    backdrop.classList.remove('opacity-0');
    container.classList.remove('translate-y-full');
    container.classList.add('translate-y-0');
}
