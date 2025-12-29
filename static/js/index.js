async function fetchPrayerTimes() {
    try {
        const today = new Date();
        const dateStr = today.getDate() + '-' + (today.getMonth() + 1) + '-' + today.getFullYear();
        // Aladhan API for Bandung, Indonesia (Method 20: Kemenag)
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Bandung&country=Indonesia&method=20`);
        const data = await response.json();

        if (data.code === 200) {
            const timings = data.data.timings;
            const dateData = data.data.date;
            updatePrayerUI(timings);
            updateDateUI(dateData);
        }
    } catch (error) {
        console.error("Failed to fetch prayer times:", error);
    }
}

function updateDateUI(dateData) {
    const hijri = dateData.hijri;
    const gregorian = dateData.gregorian;

    // Format: 12 Rajab 1445 H
    const hijriString = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;
    const hijriElement = document.getElementById('hijri-date');
    if (hijriElement) hijriElement.textContent = hijriString;

    // Format: 24 Januari 2024 (Using Gregorian from API or manual format)
    // The API returns distinct parts properly.

    const monthMap = {
        "January": "Januari", "February": "Februari", "March": "Maret", "April": "April", "May": "Mei", "June": "Juni",
        "July": "Juli", "August": "Agustus", "September": "September", "October": "Oktober", "November": "November", "December": "Desember"
    };

    const indoMonth = monthMap[gregorian.month.en] || gregorian.month.en;
    const masehiString = `${gregorian.day} ${indoMonth} ${gregorian.year}`;
    const gregorianElement = document.getElementById('gregorian-date');
    if (gregorianElement) gregorianElement.textContent = masehiString;
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
        // Update Text
        const timeElement = document.getElementById(`${prayer.id}-time`);
        if (timeElement) timeElement.textContent = prayer.time;

        // Logic for Active/Next Prayer
        const [hours, minutes] = prayer.time.split(':').map(Number);
        const prayerTimeMinutes = hours * 60 + minutes;

        let diff = prayerTimeMinutes - currentTime;
        // If diff is negative, it means this prayer has passed for today
        if (diff < 0) diff += 24 * 60;

        if (diff < minDiff) {
            minDiff = diff;
            nextPrayerIndex = index;
        }
    });

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
        time.classList.remove('text-primary', 'text-sm');
        time.classList.add('text-xs', 'text-slate-800', 'dark:text-white');
    });

    // Highlight Next/Current Prayer
    const activePrayer = prayers[nextPrayerIndex];
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

            activeTime.classList.remove('text-xs', 'text-slate-800', 'dark:text-white');
            activeTime.classList.add('text-sm', 'text-primary');
        }
    }
}

// Fetch immediately
fetchPrayerTimes();
