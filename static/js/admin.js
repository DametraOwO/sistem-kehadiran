document.addEventListener('DOMContentLoaded', async function () {
    await fetchDateData();

    // Calendar Initialization
    let calendarDate = new Date();
    window.globalScheduleData = [];
    window.globalHolidays = [];
    fetchAndRenderCalendar(calendarDate);

    // Calendar Navigation
    document.getElementById('prev-month-btn').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        fetchAndRenderCalendar(calendarDate);
    });

    document.getElementById('next-month-btn').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        fetchAndRenderCalendar(calendarDate);
    });

    // Calendar Filter
    document.getElementById('class-filter').addEventListener('change', () => {
        renderCurrentView(calendarDate);
    });

    // Agenda Modal Listeners (Unique IDs for Admin Dashboard)
    const agendaModal = document.getElementById('agenda-modal');
    const agendaBackdrop = document.getElementById('agenda-modal-backdrop');
    const agendaCloseBtn = document.getElementById('close-agenda-modal-btn');

    const closeAgendaModal = () => {
        const container = document.getElementById('agenda-modal-container');
        agendaBackdrop.classList.remove('opacity-100');
        agendaBackdrop.classList.add('opacity-0');
        container.classList.remove('translate-y-0');
        container.classList.add('translate-y-full');
        setTimeout(() => {
            agendaModal.classList.add('hidden');
        }, 300);
    };

    if (agendaBackdrop) agendaBackdrop.addEventListener('click', closeAgendaModal);
    if (agendaCloseBtn) agendaCloseBtn.addEventListener('click', closeAgendaModal);

    // Digital Clock Logic
    updateClock();
    setInterval(updateClock, 1000);
});

function updateClock() {
    const clockElement = document.getElementById('digital-clock');
    if (!clockElement) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}

async function fetchDateData() {
    try {
        const today = new Date();
        const dateStr = today.getDate() + '-' + (today.getMonth() + 1) + '-' + today.getFullYear();
        // Aladhan API for Bandung, Indonesia (Method 20: Kemenag)
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Bandung&country=Indonesia&method=20`);
        const data = await response.json();

        if (data.code === 200) {
            const dateData = data.data.date;
            const timings = data.data.timings;
            updateAdminDateUI(dateData);
            updatePrayerUI(timings);
        }
    } catch (error) {
        console.error("Failed to fetch date data:", error);
    }
}

function updateAdminDateUI(dateData) {
    const hijri = dateData.hijri;
    const gregorian = dateData.gregorian;
    const element = document.getElementById('realtime-date');

    if (!element) return;

    // Day Mapping (English -> Indonesia)
    const dayMap = {
        "Sunday": "Ahad", "Monday": "Senin", "Tuesday": "Selasa", "Wednesday": "Rabu",
        "Thursday": "Kamis", "Friday": "Jumat", "Saturday": "Sabtu"
    };

    // Month Mapping (English -> Indonesia)
    const monthMap = {
        "January": "Januari", "February": "Februari", "March": "Maret", "April": "April", "May": "Mei", "June": "Juni",
        "July": "Juli", "August": "Agustus", "September": "September", "October": "Oktober", "November": "November", "December": "Desember"
    };

    const indoDay = dayMap[gregorian.weekday.en] || gregorian.weekday.en;
    const indoMonth = monthMap[gregorian.month.en] || gregorian.month.en;

    // Requested Format:
    // 10 Rajab 1447 H - (Hijri)
    // 30 Desember 2025 - (Day, Date Month Year)

    const hijriString = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;
    const masehiString = `${indoDay}, ${gregorian.day} ${indoMonth} ${gregorian.year}`;

    const dateString = `
        <div class="flex flex-col items-start leading-tight">
            <span class="text-xs font-bold text-primary">${hijriString}</span>
            <span class="text-[10px] font-medium text-slate-500 dark:text-slate-400">${masehiString}</span>
        </div>
    `;

    element.innerHTML = dateString;
    // Remove the calendar icon from the container if using innerHTML replacement for the whole content, 
    // but the ID is on the <p> tag which had the icon inside.
    // The previous structure was: <p id> <icon> text </p>
    // I am replacing innerHTML, so the icon will be gone unless I put it back.
    // The user didn't explicitly say remove icon, but the layout "like index" implies separate lines.
    // I'll keep the icon but maybe adjust alignment.

    // Let's rewrite the innerHTML to include the icon properly aligned or just remove it if it looks cluttered.
    // User sample: 
    // 10 Rajab...
    // 30 Desember...
    //
    // In index.html it has no icon for the date group (it's inside a card)
    // In admin.html header, it had a calendar icon.
    // I will keep the icon on the left, centered vertically to the two lines.

    element.innerHTML = `
        <span class="material-symbols-outlined text-[24px] mr-2 text-white/80">calendar_month</span>
        <div class="flex flex-col items-start leading-tight">
             <span class="text-sm font-bold text-white">${hijriString}</span>
             <span class="text-xs font-medium text-white/90">${masehiString}</span>
        </div>
    `;

    // Update container classes to ensure alignment
    element.className = "flex items-center";
    // Removing 'text-primary' from parent since I am styling children
}

function updatePrayerUI(timings) {
    const prayers = [
        { id: 'subuh', time: timings.Fajr },
        { id: 'dzuhur', time: timings.Dhuhr },
        { id: 'ashar', time: timings.Asr },
        { id: 'maghrib', time: timings.Maghrib },
        { id: 'isya', time: timings.Isha }
    ];

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    let highlightIndex = -1;

    // 1. Update all prayer time texts first
    prayers.forEach((prayer) => {
        const timeElement = document.getElementById(`${prayer.id}-time`);
        if (timeElement) timeElement.textContent = prayer.time;
    });

    // 2. Check for "recently started" (last 30 mins)
    prayers.forEach((prayer, index) => {
        const [hours, minutes] = prayer.time.split(':').map(Number);
        const prayerTimeMinutes = hours * 60 + minutes;
        let elapsed = currentTime - prayerTimeMinutes;

        // Handle case where it's early morning (e.g. 00:05) 
        // and we check if Isya from yesterday is still within 30 mins
        if (elapsed < 0) {
            let elapsedYesterday = (1440 - prayerTimeMinutes) + currentTime;
            if (elapsedYesterday < 30) elapsed = elapsedYesterday;
        }

        if (elapsed >= 0 && elapsed < 30) {
            highlightIndex = index;
        }
    });

    // 3. If no "recent" prayer started within 30 mins, focus on the upcoming one
    if (highlightIndex === -1) {
        let minDiff = Infinity;
        prayers.forEach((prayer, index) => {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerTimeMinutes = hours * 60 + minutes;

            let diff = prayerTimeMinutes - currentTime;
            if (diff < 0) diff += 1440;

            if (diff < minDiff) {
                minDiff = diff;
                highlightIndex = index;
            }
        });
    }

    // Reset all cards
    prayers.forEach(p => {
        const card = document.getElementById(`${p.id}-card`);
        if (!card) return;
        const dot = card.querySelector('.indicator-dot');
        const label = card.querySelector('.label');
        const time = document.getElementById(`${p.id}-time`);

        card.classList.remove('scale-110');
        dot.classList.remove('w-3', 'h-3', 'bg-primary', 'shadow-glow', 'ring-4', 'ring-primary/20');
        dot.classList.add('w-2', 'h-2', 'bg-slate-300', 'dark:bg-slate-600');
        label.classList.remove('text-primary');
        label.classList.add('text-slate-500');
        if (time) {
            time.classList.remove('text-primary', 'text-sm');
            time.classList.add('text-xs', 'text-black');
        }
    });

    // Highlight Next/Current Prayer
    const activePrayer = prayers[highlightIndex];
    if (activePrayer) {
        const activeCard = document.getElementById(`${activePrayer.id}-card`);
        if (activeCard) {
            const activeDot = activeCard.querySelector('.indicator-dot');
            const activeLabel = activeCard.querySelector('.label');
            const activeTime = document.getElementById(`${activePrayer.id}-time`);

            activeCard.classList.add('scale-110');

            activeDot.classList.remove('w-2', 'h-2', 'bg-slate-300', 'dark:bg-slate-600');
            activeDot.classList.add('w-3', 'h-3', 'bg-primary', 'shadow-glow', 'ring-4', 'ring-primary/20');

            activeLabel.classList.remove('text-slate-500');
            activeLabel.classList.add('text-primary', 'font-bold');

            if (activeTime) {
                activeTime.classList.remove('text-xs', 'text-black');
                activeTime.classList.add('text-sm', 'text-primary');
            }
        }
    }
}

// Announcement Slider Logic
document.addEventListener('DOMContentLoaded', function () {
    // === Sidebar Navigation ===
    const sidebarTrigger = document.getElementById('sidebar-trigger');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarMenu = document.getElementById('sidebar-menu');

    const toggleSidebar = (show) => {
        if (show) {
            sidebarOverlay.classList.remove('pointer-events-none', 'opacity-0');
            sidebarOverlay.classList.add('opacity-100');
            sidebarMenu.classList.remove('-translate-x-full');
            document.body.style.overflow = 'hidden';
        } else {
            sidebarOverlay.classList.add('opacity-0', 'pointer-events-none');
            sidebarOverlay.classList.remove('opacity-100');
            sidebarMenu.classList.add('-translate-x-full');
            document.body.style.overflow = '';
        }
    };

    if (sidebarTrigger) sidebarTrigger.addEventListener('click', () => toggleSidebar(true));
    if (sidebarClose) sidebarClose.addEventListener('click', () => toggleSidebar(false));
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

    // === Announcement Slider Logic ===
    const container = document.getElementById('admin-announcement-container');
    const prevBtn = document.getElementById('admin-prev-slide');
    const nextBtn = document.getElementById('admin-next-slide');

    // === Floating Action Button (FAB) ===
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    const fabIcon = document.getElementById('fab-icon');
    const fabAddNews = document.getElementById('open-news-modal');
    let isFabOpen = false;

    if (fabMain && fabMenu) {
        fabMain.addEventListener('click', (e) => {
            e.stopPropagation();
            isFabOpen = !isFabOpen;
            if (isFabOpen) {
                fabMenu.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
                fabMenu.classList.add('opacity-100', 'translate-y-0');
                fabIcon.style.transform = 'rotate(45deg)';
            } else {
                fabMenu.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                fabMenu.classList.remove('opacity-100', 'translate-y-0');
                fabIcon.style.transform = 'rotate(0deg)';
            }
        });

        // Close FAB when clicking anywhere else
        document.addEventListener('click', () => {
            if (isFabOpen) {
                isFabOpen = false;
                fabMenu.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                fabMenu.classList.remove('opacity-100', 'translate-y-0');
                fabIcon.style.transform = 'rotate(0deg)';
            }
        });

        if (fabAddNews) {
            fabAddNews.addEventListener('click', () => {
                if (isFabOpen) {
                    isFabOpen = false;
                    fabMenu.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
                    fabMenu.classList.remove('opacity-100', 'translate-y-0');
                    fabIcon.style.transform = 'rotate(0deg)';
                }
            });
        }
    }

    if (container && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            container.scrollBy({ left: -300, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', () => {
            container.scrollBy({ left: 300, behavior: 'smooth' });
        });
    }

    // Modal News Logic
    const openModalBtn = document.getElementById('open-news-modal');
    const closeModalBtn = document.getElementById('close-news-modal');
    const modal = document.getElementById('news-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const content = document.getElementById('modal-content');
    const imageInput = document.getElementById('news-image-input');
    const fileNamePreview = document.getElementById('file-name-preview');
    const fileNameText = document.getElementById('file-name-text');

    // Modal Edit Elements
    const form = document.getElementById('news-form');
    const modalTitle = document.getElementById('modal-title');
    const modalIcon = document.getElementById('modal-icon');
    const modalJudul = document.getElementById('modal-judul');
    const modalKategori = document.getElementById('modal-kategori');
    const modalKonten = document.getElementById('modal-konten');
    const modalBeritaId = document.getElementById('modal-berita-id');
    const modalSubmitText = document.getElementById('modal-submit-text');
    const editBtns = document.querySelectorAll('.edit-news-btn');

    if (openModalBtn && modal && backdrop && content) {
        const showModal = (mode = 'add', data = {}) => {
            if (mode === 'edit') {
                modalTitle.textContent = 'Edit Postingan';
                modalIcon.textContent = 'edit';
                modalSubmitText.textContent = 'Simpan Perubahan';
                modalJudul.value = data.judul || '';
                modalKategori.value = data.kategori || 'Berita Madrasah';
                modalKonten.value = data.konten || '';
                modalBeritaId.value = data.id || '';
                form.action = `/edit_berita/${data.id}`;
            } else {
                modalTitle.textContent = 'Buat Posting Baru';
                modalIcon.textContent = 'edit_square';
                modalSubmitText.textContent = 'Publikasikan Sekarang';
                form.reset();
                modalBeritaId.value = '';
                form.action = '/tambah_berita';
                if (fileNamePreview) fileNamePreview.classList.add('hidden');
            }

            modal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            void modal.offsetWidth;
            backdrop.classList.add('opacity-100');
            content.classList.remove('translate-y-full');
            content.classList.add('translate-y-0');
        };

        const hideModal = () => {
            backdrop.classList.remove('opacity-100');
            content.classList.remove('translate-y-0');
            content.classList.add('translate-y-full');
            document.body.classList.remove('overflow-hidden');

            // Wait for animation to finish before hiding
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        };

        openModalBtn.addEventListener('click', () => showModal('add'));
        closeModalBtn.addEventListener('click', hideModal);
        backdrop.addEventListener('click', hideModal);

        // Add Listeners to Edit Buttons
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const data = {
                    id: btn.dataset.id,
                    judul: btn.dataset.judul,
                    konten: btn.dataset.konten,
                    kategori: btn.dataset.kategori
                };
                showModal('edit', data);
            });
        });

        // Add Listeners to Delete Buttons
        const deleteBtns = document.querySelectorAll('.delete-news-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const beritaId = btn.dataset.id;
                const judul = btn.dataset.judul;
                // Get CSRF Token
                const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

                if (confirm(`Apakah Anda yakin ingin menghapus berita "${judul}"?`)) {
                    // Create a form and submit it
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = `/hapus_berita/${beritaId}`;

                    // Add CSRF Input
                    const csrfInput = document.createElement('input');
                    csrfInput.type = 'hidden';
                    csrfInput.name = 'csrf_token';
                    csrfInput.value = csrfToken;
                    form.appendChild(csrfInput);

                    document.body.appendChild(form);
                    form.submit();
                }
            });
        });
    }

    // File Preview Logic
    if (imageInput && fileNamePreview && fileNameText) {
        imageInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name;
            if (fileName) {
                fileNameText.textContent = fileName;
                fileNamePreview.classList.remove('hidden');
                fileNamePreview.classList.add('flex');
            } else {
                fileNamePreview.classList.add('hidden');
                fileNamePreview.classList.remove('flex');
            }
        });
    }
});

// --- CALENDAR FUNCTIONS (Copied from calendar.js) ---

async function fetchAndRenderCalendar(date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('month-display');

    if (header) header.textContent = "Loading...";
    if (grid) grid.innerHTML = '<div class="col-span-7 flex items-center justify-center text-slate-400 h-64">Loading...</div>';

    try {
        const [calendarResponse, scheduleResponse, holidayResponse] = await Promise.all([
            fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}?latitude=-6.9175&longitude=107.6191&method=20`),
            fetch('/api/jadwal'),
            fetch(`https://api-harilibur.vercel.app/api?year=${year}`)
        ]);

        if (calendarResponse.ok) {
            const calendarJson = await calendarResponse.json();
            window.currentCalendarDays = calendarJson.data;
        }

        if (scheduleResponse.ok) {
            const scheduleJson = await scheduleResponse.json();
            if (scheduleJson.success) window.globalScheduleData = scheduleJson.data;
        }

        if (holidayResponse.ok) {
            window.globalHolidays = await holidayResponse.json();
        }

        renderCalendarGrid(window.currentCalendarDays, date);
    } catch (error) {
        console.error("Error fetching calendar data:", error);
    }
}

async function renderCurrentView(date) {
    if (window.currentCalendarDays && window.currentCalendarDate &&
        window.currentCalendarDate.getMonth() === date.getMonth() &&
        window.currentCalendarDate.getFullYear() === date.getFullYear()) {
        renderCalendarGrid(window.currentCalendarDays, date);
    } else {
        fetchAndRenderCalendar(date);
    }
}

function renderCalendarGrid(days, currentDate) {
    if (!days) return;
    window.currentCalendarDays = days;
    window.currentCalendarDate = currentDate;

    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('month-display');
    const holidayListContainer = document.getElementById('holiday-list');
    const filterClass = document.getElementById('class-filter').value;

    const indoMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const dayMap = { "Sunday": "Minggu", "Monday": "Senin", "Tuesday": "Selasa", "Wednesday": "Rabu", "Thursday": "Kamis", "Friday": "Jumat", "Saturday": "Sabtu" };
    const weekdayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };

    if (grid) grid.innerHTML = '';
    if (holidayListContainer) holidayListContainer.innerHTML = '';
    const currentMonthHolidays = [];

    // Header Display
    const firstHijri = days[0].hijri;
    const lastHijri = days[days.length - 1].hijri;
    let hijriString = `${firstHijri.month.en} ${firstHijri.year} H`;
    if (firstHijri.month.number !== lastHijri.month.number) {
        hijriString = `${firstHijri.month.en} - ${lastHijri.month.en} ${lastHijri.year} H`;
    }
    if (header) {
        header.innerHTML = `
            <div class="flex flex-col items-center leading-tight">
                <span>${indoMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}</span>
                <span class="text-[10px] font-normal opacity-60">${hijriString}</span>
            </div>
        `;
    }

    // Offset
    const startOffset = weekdayMap[days[0].gregorian.weekday.en];
    for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = "h-16 border-b border-slate-50 bg-slate-50/30";
        grid.appendChild(empty);
    }

    days.forEach(day => {
        const dateDiv = document.createElement('div');
        const gDate = day.gregorian;
        const [d, m, y] = gDate.date.split('-');
        const cYear = parseInt(y), cMonth = parseInt(m) - 1, cDay = parseInt(d);

        const isHoliday = window.globalHolidays.some(h => {
            const hD = new Date(h.holiday_date);
            return hD.getFullYear() === cYear && hD.getMonth() === cMonth && hD.getDate() === cDay;
        });
        const holiday = window.globalHolidays.find(h => {
            const hD = new Date(h.holiday_date);
            return hD.getFullYear() === cYear && hD.getMonth() === cMonth && hD.getDate() === cDay;
        });

        if (isHoliday && holiday) {
            if (!currentMonthHolidays.some(h => h.holiday_date === holiday.holiday_date)) currentMonthHolidays.push(holiday);
        }

        const isToday = isSameDay(new Date(), new Date(cYear, cMonth, cDay));
        const isSunday = gDate.weekday.en === "Sunday";
        const dayIndo = dayMap[gDate.weekday.en];

        let todaysSchedule = [];
        if (filterClass !== "") {
            todaysSchedule = window.globalScheduleData.filter(s => s.hari === dayIndo && s.nama_kelas === filterClass);
        }

        let baseClass = "h-16 border-b border-slate-50 flex flex-col items-center justify-center relative group cursor-pointer hover:bg-slate-50 transition-colors";
        let textClass = (isSunday || isHoliday) ? "text-red-500 font-bold" : "text-slate-700";
        if (isToday) baseClass += " bg-primary/5 ring-1 ring-inset ring-primary/20";

        dateDiv.className = baseClass;
        dateDiv.innerHTML = `
            <span class="text-sm ${textClass}">${gDate.day}</span>
            <span class="text-[8px] text-slate-400 font-medium">${day.hijri.day}</span>
            ${todaysSchedule.length > 0 ? '<div class="absolute bottom-1 size-1.5 rounded-full bg-primary mb-1"></div>' : ''}
            ${isHoliday ? '<div class="absolute bottom-1 size-1.5 rounded-full bg-red-400 mb-1"></div>' : ''}
        `;

        dateDiv.addEventListener('click', () => showAgendaDetail(day, holiday, todaysSchedule, dayIndo));
        grid.appendChild(dateDiv);
    });

    // Render Holiday List
    if (holidayListContainer) {
        if (currentMonthHolidays.length > 0) {
            currentMonthHolidays.sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date));
            currentMonthHolidays.forEach(h => {
                const hD = new Date(h.holiday_date);
                const item = document.createElement('div');
                item.className = "flex items-center gap-3 p-3 rounded-2xl bg-red-50/50 border border-red-100/50";
                item.innerHTML = `
                    <div class="flex flex-col items-center justify-center min-w-[36px] h-[36px] rounded-lg bg-red-500 text-white">
                        <span class="text-xs font-bold leading-none">${hD.getDate()}</span>
                        <span class="text-[8px] font-medium uppercase">${indoMonths[hD.getMonth()].slice(0, 3)}</span>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-red-600 leading-tight">${h.holiday_name}</span>
                        <span class="text-[10px] text-red-400">Libur Nasional</span>
                    </div>
                `;
                holidayListContainer.appendChild(item);
            });
        } else {
            holidayListContainer.innerHTML = '<p class="text-center text-[10px] text-slate-400 py-2 italic">Tidak ada hari libur bulan ini</p>';
        }
    }
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function showAgendaDetail(day, holiday, schedules, dayName) {
    const modal = document.getElementById('agenda-modal');
    const backdrop = document.getElementById('agenda-modal-backdrop');
    const container = document.getElementById('agenda-modal-container');
    const body = document.getElementById('modal-agenda-body');
    const masehiText = document.getElementById('modal-masehi');
    const hijriText = document.getElementById('modal-hijri');
    const indoMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const gDate = day.gregorian;
    const mParts = gDate.date.split('-');
    if (masehiText) masehiText.textContent = `${dayName}, ${parseInt(mParts[0])} ${indoMonths[parseInt(mParts[1]) - 1]} ${mParts[2]}`;
    if (hijriText) hijriText.textContent = `${day.hijri.day} ${day.hijri.month.en} ${day.hijri.year} H`;

    if (body) {
        body.innerHTML = '';
        if (holiday) {
            const hDiv = document.createElement('div');
            hDiv.className = "p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-4";
            hDiv.innerHTML = `<div class="size-11 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-200"><span class="material-symbols-outlined text-[24px]">event_busy</span></div><div class="flex flex-col"><span class="text-xs font-bold text-red-400 uppercase tracking-widest leading-none mb-1">Hari Libur</span><span class="font-bold text-red-600 tracking-tight">${holiday.holiday_name}</span></div>`;
            body.appendChild(hDiv);
        }

        if (schedules.length > 0) {
            schedules.sort((a, b) => a.waktu_mulai.localeCompare(b.waktu_mulai));
            const h = document.createElement('p');
            h.className = "text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mt-6 mb-2";
            h.textContent = "Agenda Mata Pelajaran";
            body.appendChild(h);

            schedules.forEach(sch => {
                const row = document.createElement('div');
                row.className = "p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all";
                row.innerHTML = `<div class="flex items-center gap-4"><div class="size-11 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[24px]">book</span></div><div class="flex flex-col"><span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">${sch.nama_kelas}</span><span class="font-bold text-slate-800 tracking-tight leading-tight">${sch.mata_pelajaran}</span></div></div><div class="text-right flex flex-col items-end"><span class="text-xs font-extrabold text-primary leading-none">${sch.waktu_mulai.slice(0, 5)}</span><span class="text-[10px] font-medium text-slate-400 mt-1">${sch.waktu_selesai.slice(0, 5)}</span></div>`;
                body.appendChild(row);
            });
        }

        if (!holiday && schedules.length === 0) {
            body.innerHTML = `<div class="py-12 flex flex-col items-center text-center"><div class="size-20 rounded-full bg-slate-50 flex items-center justify-center mb-4"><span class="material-symbols-outlined text-slate-200 text-5xl">event_upcoming</span></div><p class="text-slate-400 font-medium italic">Tidak ada agenda kegiatan <br> pada hari ini.</p></div>`;
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        void container.offsetHeight;
        backdrop.classList.add('opacity-100');
        backdrop.classList.remove('opacity-0');
        container.classList.remove('translate-y-full');
        container.classList.add('translate-y-0');
    }
}
