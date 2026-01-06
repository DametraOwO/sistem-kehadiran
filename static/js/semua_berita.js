document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const newsCards = document.querySelectorAll('.news-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            newsCards.forEach(card => {
                if (filterValue === 'all') {
                    card.style.display = 'flex';
                } else {
                    const cardCategory = card.getAttribute('data-category');
                    if (cardCategory === filterValue) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });

    // === News Modal Logic (Admin Only) ===
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
                    const deleteForm = document.createElement('form');
                    deleteForm.method = 'POST';
                    deleteForm.action = `/hapus_berita/${beritaId}`;
                    document.body.appendChild(deleteForm);
                    deleteForm.submit();
                }
            });
        });

        // Image Preview Logic
        if (imageInput) {
            imageInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    const fileName = this.files[0].name;
                    if (fileNameText) fileNameText.textContent = fileName;
                    if (fileNamePreview) fileNamePreview.classList.remove('hidden');
                }
            });
        }
    }
});
