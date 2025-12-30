document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-jadwal');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    const modalIcon = document.getElementById('modal-icon');
    const form = document.getElementById('jadwal-form');
    const openBtn = document.getElementById('open-tambah-modal');
    const closeBtn = document.getElementById('close-modal');
    const overlay = document.getElementById('modal-overlay');

    // Search and Filter
    const searchInput = document.getElementById('jadwal-search');
    const filterHari = document.getElementById('filter-hari');
    const tableRows = document.querySelectorAll('#jadwal-table-body tr');

    // Initialize Flatpickr safely
    let fpMulai = null;
    let fpSelesai = null;

    try {
        if (typeof flatpickr !== 'undefined') {
            const fpConfig = {
                enableTime: true,
                noCalendar: true,
                dateFormat: "H:i",
                time_24hr: true,
            };
            fpMulai = flatpickr("#form-waktu-mulai", fpConfig);
            fpSelesai = flatpickr("#form-waktu-selesai", fpConfig);
        } else {
            console.error("Flatpickr library not found");
        }
    } catch (e) {
        console.error("Flatpickr init error:", e);
    }

    const showModal = (mode = 'add', id = null, id_kelas = '', hari = '', mata_pelajaran = '', waktu_mulai = '', waktu_selesai = '', keterangan = '') => {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        if (mode === 'edit') {
            modalTitle.textContent = 'Edit Jadwal';
            modalIcon.textContent = 'edit_calendar';
            form.action = `/edit_jadwal/${id}`;
            document.getElementById('form-id-kelas').value = id_kelas;
            document.getElementById('form-hari').value = hari;
            document.getElementById('form-mapel').value = mata_pelajaran;

            // Safe update for Flatpickr
            if (fpMulai) fpMulai.setDate(waktu_mulai, true);
            else document.getElementById('form-waktu-mulai').value = waktu_mulai;

            if (fpSelesai) fpSelesai.setDate(waktu_selesai, true);
            else document.getElementById('form-waktu-selesai').value = waktu_selesai;

            document.getElementById('form-keterangan').value = keterangan || '';
        } else {
            modalTitle.textContent = 'Tambah Jadwal Baru';
            modalIcon.textContent = 'calendar_add_on';
            form.action = '/tambah_jadwal';
            form.reset();
            // Safe clear for Flatpickr
            if (fpMulai) fpMulai.clear();
            if (fpSelesai) fpSelesai.clear();
        }
    };

    const hideModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    openBtn.addEventListener('click', () => showModal('add'));
    closeBtn.addEventListener('click', hideModal);
    overlay.addEventListener('click', hideModal);

    // Global function for edit button
    window.editJadwal = (id, id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan) => {
        // Backend now returns HH:MM string, which works perfectly with type="text"
        showModal('edit', id, id_kelas, hari, mata_pelajaran, waktu_mulai, waktu_selesai, keterangan);
    };

    // Filter Logic
    const filterTable = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const hariTerm = filterHari.value;

        tableRows.forEach(row => {
            if (row.querySelector('td[colspan]')) return; // Skip empty state

            const mapel = row.querySelector('td:nth-child(3) .text-sm').textContent.toLowerCase();
            const hari = row.querySelector('td:nth-child(1) span').textContent.trim();

            const matchesSearch = mapel.includes(searchTerm);
            const matchesHari = hariTerm === "" || hari === hariTerm;

            if (matchesSearch && matchesHari) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });
    };

    searchInput.addEventListener('input', filterTable);
    filterHari.addEventListener('change', filterTable);
});
