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

                if (confirm(`Apakah Anda yakin ingin menghapus berita "${judul}"?`)) {
                    // Create a form and submit it
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = `/hapus_berita/${beritaId}`;
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
