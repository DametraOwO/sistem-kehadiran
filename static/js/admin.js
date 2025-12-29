document.addEventListener('DOMContentLoaded', async function () {
    await fetchDateData();
});

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
    let nextPrayerIndex = 0;
    let minDiff = Infinity;

    prayers.forEach((prayer, index) => {
        // Update Time Text
        const timeElement = document.getElementById(`${prayer.id}-time`);
        if (timeElement) {
            timeElement.textContent = prayer.time;
        }

        // Highlight Logic
        const [hours, minutes] = prayer.time.split(':').map(Number);
        const prayerTime = hours * 60 + minutes;

        // If current time > prayer time, it's passed.
        // We want the smallest positive difference.

        let diff = prayerTime - currentTime;

        // If diff is negative, it means passed today. Treat as tomorrow? 
        // For simple "Next Prayer", we just look for first future time.

        if (prayerTime >= currentTime) {
            if (diff < minDiff) {
                minDiff = diff;
                nextPrayerIndex = index;
            }
        }
    });

    // If all passed (minDiff still Infinity), then next is Subuh (index 0 for tomorrow)
    if (minDiff === Infinity) {
        nextPrayerIndex = 0;
    }

    // Apply Styles
    prayers.forEach((prayer, index) => {
        const card = document.getElementById(`${prayer.id}-card`);
        if (!card) return;

        const dot = card.querySelector('.indicator-dot');
        const label = card.querySelector('.label');
        const time = document.querySelector(`#${prayer.id}-time`);

        if (index === nextPrayerIndex) {
            // Highlight Next Prayer
            dot.classList.remove('bg-slate-300', 'dark:bg-slate-600');
            dot.classList.add('bg-primary', 'scale-125');

            label.classList.remove('text-slate-500');
            label.classList.add('text-primary', 'font-bold');

            time.classList.add('text-primary');

            card.classList.add('-translate-y-1');
        } else {
            // Reset
            dot.classList.add('bg-slate-300', 'dark:bg-slate-600');
            dot.classList.remove('bg-primary', 'scale-125');

            label.classList.add('text-slate-500');
            label.classList.remove('text-primary', 'font-bold');

            time.classList.remove('text-primary');

            card.classList.remove('-translate-y-1');
        }
    });
}
