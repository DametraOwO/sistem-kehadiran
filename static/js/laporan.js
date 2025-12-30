document.addEventListener('DOMContentLoaded', function () {
    const monthSelect = document.getElementById('month-select');
    const kelasSelect = document.getElementById('kelas-select');
    const searchInput = document.getElementById('search-input');
    const studentListContainer = document.getElementById('student-list');
    const studentCount = document.getElementById('student-count');

    // Stat Elements
    const stats = {
        Hadir: { pct: document.getElementById('stat-hadir-pct'), trend: document.getElementById('stat-hadir-trend') },
        Sakit: { pct: document.getElementById('stat-sakit-pct'), trend: document.getElementById('stat-sakit-trend') },
        Izin: { pct: document.getElementById('stat-izin-pct'), trend: document.getElementById('stat-izin-trend') },
        Alpha: { pct: document.getElementById('stat-alpha-pct'), trend: document.getElementById('stat-alpha-trend') }
    };

    const filterBtn = document.getElementById('filter-btn');
    const sortMenu = document.getElementById('sort-menu');
    const sortOptions = document.querySelectorAll('.sort-option');

    let debounceTimer;
    let currentSort = 'name_asc';

    // Dropdown Toggle
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log("Filter button clicked");
        const isHidden = sortMenu.classList.contains('hidden');
        if (isHidden) {
            sortMenu.classList.remove('hidden');
            // Force reflow
            sortMenu.offsetHeight;
            sortMenu.classList.remove('opacity-0', 'scale-95');
            sortMenu.classList.add('opacity-100', 'scale-100');
        } else {
            hideSortMenu();
        }
    });

    function hideSortMenu() {
        sortMenu.classList.remove('opacity-100', 'scale-100');
        sortMenu.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            sortMenu.classList.add('hidden');
        }, 200);
    }

    document.addEventListener('click', () => {
        if (!sortMenu.classList.contains('hidden')) hideSortMenu();
    });

    sortOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            currentSort = opt.dataset.sort;
            // Highlight active sort
            sortOptions.forEach(o => o.classList.remove('bg-primary/10', 'text-primary', 'font-bold'));
            opt.classList.add('bg-primary/10', 'text-primary', 'font-bold');

            fetchLaporan();
            hideSortMenu();
        });
    });

    function updateAcademicTitle(monthStr) {
        if (!monthStr) return;
        const [yearStr, monthStrNum] = monthStr.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStrNum);
        const academicTitle = document.getElementById('academic-title');
        if (!academicTitle) return;

        let semester, akad;
        if (month >= 7) {
            semester = "Ganjil";
            akad = `${year}/${year + 1}`;
        } else {
            semester = "Genap";
            akad = `${year - 1}/${year}`;
        }
        academicTitle.textContent = `Semester ${semester} ${akad}`;
    }

    function fetchLaporan() {
        const month = monthSelect.value;
        const kelasId = kelasSelect.value;
        const search = searchInput.value;

        if (!month) return;

        // Update Title
        updateAcademicTitle(month);

        // Show loading state in list
        studentListContainer.querySelectorAll('.student-card').forEach(el => el.remove());
        const loader = `
            <div id="list-loader" class="flex flex-col items-center justify-center py-20 text-slate-400">
                <span class="material-symbols-outlined text-[48px] animate-spin mb-4">sync</span>
                <p>Memperbarui laporan...</p>
            </div>
        `;
        const existingLoader = document.getElementById('list-loader');
        if (!existingLoader) {
            studentListContainer.insertAdjacentHTML('beforeend', loader);
        }

        fetch(`/api/laporan_stats?month=${month}&kelas_id=${kelasId}&search=${encodeURIComponent(search)}&sort=${currentSort}`)
            .then(response => response.json())
            .then(data => {
                const loader = document.getElementById('list-loader');
                if (loader) loader.remove();

                if (data.success) {
                    updateStats(data.stats, data.trends);
                    updateStudentList(data.students);
                } else {
                    console.error("API Error:", data.message);
                }
            })
            .catch(err => {
                const loader = document.getElementById('list-loader');
                if (loader) loader.remove();
                console.error("Fetch Error:", err);
            });
    }

    function updateStats(dataStats, trends) {
        for (const status in stats) {
            const el = stats[status];
            const val = dataStats[status];
            const trendVal = trends[status];
            const trendStatus = trends[status + '_status'];

            if (el.pct) el.pct.textContent = `${val.pct}%`;

            if (el.trend) {
                el.trend.textContent = trendVal;
                // Reset classes
                el.trend.className = 'text-xs font-semibold';

                if (trendStatus === 'stable') {
                    el.trend.classList.add('text-slate-500');
                    el.trend.textContent = 'Stabil';
                } else if (trendStatus === 'up') {
                    // Up is green for Hadir, red for others
                    if (status === 'Hadir') {
                        el.trend.classList.add('text-green-600');
                    } else {
                        el.trend.classList.add('text-red-600');
                    }
                } else if (trendStatus === 'down') {
                    // Down is red for Hadir, green for others
                    if (status === 'Hadir') {
                        el.trend.classList.add('text-red-600');
                    } else {
                        el.trend.classList.add('text-green-600');
                    }
                }
            }
        }
    }

    function updateStudentList(students) {
        studentCount.textContent = `${students.length} Santri ditemukan`;

        // Remove old cards
        studentListContainer.querySelectorAll('.student-card').forEach(el => el.remove());

        if (students.length === 0) {
            studentListContainer.insertAdjacentHTML('beforeend', `
                <div class="student-card py-10 text-center text-slate-400">
                    <p>Tidak ada data santri ditemukan.</p>
                </div>
            `);
            return;
        }

        students.forEach(s => {
            const initials = s.nama_lengkap.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Calculate dominant status for the badge? 
            // Or just summary. I'll show Hadir counts.
            const statsText = `H:${s.hadir} I:${s.izin} S:${s.sakit} A:${s.alpha}`;

            // Determine badge color based on highest count or presence trend
            let badgeClass = "bg-slate-100 text-slate-700";
            let mainStatus = "Detail";

            if (s.alpha > 3) {
                badgeClass = "bg-red-100 text-red-700";
                mainStatus = "Alpha Tinggi";
            } else if (s.hadir > 0) {
                badgeClass = "bg-green-100 text-green-700";
                mainStatus = "Aktif";
            }

            const html = `
                <div class="student-card group flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-100 hover:border-primary/50 transition-all">
                    <div class="flex items-center gap-4">
                        <div class="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-slate-100 bg-emerald-50 flex items-center justify-center">
                            <span class="text-emerald-700 font-bold text-lg">${initials}</span>
                        </div>
                        <div class="flex flex-col">
                            <p class="text-base font-bold text-slate-900">${s.nama_lengkap}</p>
                            <p class="text-[10px] font-medium text-slate-500">NIS: ${s.nis} • ${s.nama_kelas || 'Tanpa Kelas'}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="inline-flex items-center rounded-full ${badgeClass} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            ${mainStatus}
                        </span>
                        <div class="flex gap-3">
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span class="text-[10px] font-bold text-slate-600">${s.hadir}</span>
                            </div>
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                <span class="text-[10px] font-bold text-slate-600">${s.sakit}</span>
                            </div>
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                <span class="text-[10px] font-bold text-slate-600">${s.izin}</span>
                            </div>
                            <div class="flex flex-col items-center gap-0.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                <span class="text-[10px] font-bold text-slate-600">${s.alpha}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            studentListContainer.insertAdjacentHTML('beforeend', html);
        });
    }

    // Listeners
    monthSelect.addEventListener('change', fetchLaporan);
    kelasSelect.addEventListener('change', fetchLaporan);
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchLaporan, 300);
    });

    // Initial Fetch
    fetchLaporan();
});
