document.addEventListener('DOMContentLoaded', () => {
    // === Elements ===
    const openModalBtn = document.getElementById('open-tambah-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modal = document.getElementById('santri-modal');
    const backdrop = document.getElementById('modal-backdrop');
    const content = document.getElementById('modal-content');
    const searchInput = document.getElementById('student-search');
    const tableBody = document.getElementById('student-table-body');
    const form = document.getElementById('santri-form');

    // Form Inputs
    const modalTitle = document.getElementById('modal-title');
    const modalIcon = document.getElementById('modal-icon');
    const formNis = document.getElementById('form-nis');
    const formNama = document.getElementById('form-nama');
    const formGender = document.getElementById('form-gender');
    const formKelas = document.getElementById('form-kelas');
    const formSubmitText = document.getElementById('form-submit-text');
    const editBtns = document.querySelectorAll('.edit-btn');

    // === Modal Logic ===
    const showModal = (mode = 'add', data = {}) => {
        if (mode === 'edit') {
            modalTitle.textContent = 'Edit Data Santri';
            modalIcon.textContent = 'edit';
            formSubmitText.textContent = 'Simpan Perubahan';
            form.action = `/edit_santri/${data.id}`;
            formNis.value = data.nis || '';
            formNama.value = data.nama || '';
            formGender.value = data.gender || 'L';
            formKelas.value = data.kelas || '';
        } else {
            modalTitle.textContent = 'Tambah Santri Baru';
            modalIcon.textContent = 'person_add';
            formSubmitText.textContent = 'Simpan Data Santri';
            form.action = '/tambah_santri';
            form.reset();
        }

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        // Trigger animation
        setTimeout(() => {
            backdrop.classList.add('opacity-100');
            content.classList.remove('translate-y-full');
            content.classList.add('translate-y-0');
        }, 10);
    };

    const hideModal = () => {
        backdrop.classList.remove('opacity-100');
        content.classList.remove('translate-y-0');
        content.classList.add('translate-y-full');
        document.body.classList.remove('overflow-hidden');

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    // Listeners
    if (openModalBtn) openModalBtn.addEventListener('click', () => showModal('add'));
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (backdrop) backdrop.addEventListener('click', hideModal);

    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const data = {
                id: btn.dataset.id,
                nis: btn.dataset.nis,
                nama: btn.dataset.nama,
                gender: btn.dataset.gender,
                kelas: btn.dataset.kelas
            };
            showModal('edit', data);
        });
    });

    // === Filter & Sort State ===
    let currentGender = 'all';
    let currentClass = 'all';
    let currentSort = 'nis-asc';

    const applyFiltersAndSort = () => {
        const query = searchInput.value.toLowerCase();
        let rows = Array.from(tableBody.querySelectorAll('tr.student-row'));

        // 1. Filtering
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const rowGender = row.dataset.gender;
            const rowClass = row.dataset.kelas_id || row.dataset.kelasId; // Support both naming conventions

            const matchSearch = text.includes(query);
            const matchGender = currentGender === 'all' || rowGender === currentGender;
            const matchClass = currentClass === 'all' || rowClass === currentClass;

            if (matchSearch && matchGender && matchClass) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });

        // 2. Sorting (Only visible rows for efficiency, but usually all rows are sorted even if hidden)
        const [field, order] = currentSort.split('-');
        rows.sort((a, b) => {
            let valA, valB;
            if (field === 'nis') {
                valA = parseInt(a.querySelector('td:nth-child(1) span').textContent);
                valB = parseInt(b.querySelector('td:nth-child(1) span').textContent);
            } else if (field === 'nama') {
                valA = a.querySelector('td:nth-child(2) span').textContent.toLowerCase();
                valB = b.querySelector('td:nth-child(2) span').textContent.toLowerCase();
            } else if (field === 'kelas') {
                valA = a.querySelector('td:nth-child(4) span').textContent.toLowerCase();
                valB = b.querySelector('td:nth-child(4) span').textContent.toLowerCase();
            }

            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });

        // Re-append rows in sorted order
        rows.forEach(row => tableBody.appendChild(row));
    };

    // === Listeners ===
    if (searchInput) searchInput.addEventListener('input', applyFiltersAndSort);

    // Gender Filters
    document.querySelectorAll('.gender-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.gender-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGender = btn.dataset.gender;
            applyFiltersAndSort();
        });
    });

    // Class Pills
    document.querySelectorAll('.class-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.class-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentClass = btn.dataset.class;
            applyFiltersAndSort();
        });
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('student-sort');
    const sortLabel = document.getElementById('sort-label');
    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            currentSort = this.value;
            if (sortLabel) {
                sortLabel.textContent = this.options[this.selectedIndex].text;
            }
            applyFiltersAndSort();
        });
    }

    // Initial Filter
    applyFiltersAndSort();
});
