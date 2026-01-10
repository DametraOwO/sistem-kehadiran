document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('account-table-body');
    const searchInput = document.getElementById('account-search');
    const roleFilter = document.getElementById('role-filter');
    const roleLabel = document.getElementById('role-label');
    const modal = document.getElementById('account-modal');
    const modalContent = document.getElementById('modal-content');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const form = document.getElementById('account-form');
    const openModalBtn = document.getElementById('open-tambah-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalIcon = document.getElementById('modal-icon');
    const submitBtnText = document.getElementById('form-submit-text');
    const passwordHint = document.getElementById('password-hint');
    const passwordInput = document.getElementById('form-password');
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    let allAccounts = [];

    // Fetch Accounts
    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/accounts');
            const result = await response.json();
            if (result.success) {
                allAccounts = result.data;
                renderAccounts(allAccounts);
            } else {
                showToast(result.message, 'danger');
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            showToast('Gagal memuat data akun', 'danger');
        }
    };

    // Render Accounts
    const renderAccounts = (accounts) => {
        tableBody.innerHTML = '';
        if (accounts.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-20 text-center">
                        <div class="flex flex-col items-center gap-3">
                            <div class="size-20 rounded-full bg-slate-50 flex items-center justify-center">
                                <span class="material-symbols-outlined text-slate-300 text-[40px]">person_off</span>
                            </div>
                            <p class="text-slate-500 text-sm font-medium">Tidak ada akun ditemukan.</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        accounts.forEach(acc => {
            const roleClass = acc.status_role === 'Admin' ? 'bg-emerald-100 text-emerald-600' :
                acc.status_role === 'Guru' ? 'bg-blue-100 text-blue-600' :
                    'bg-amber-100 text-amber-600';

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/50 transition-colors group';
            tr.innerHTML = `
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="size-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-primary/20 group-hover:text-primary transition-all">
                            ${acc.nama_lengkap.charAt(0)}
                        </div>
                        <span class="text-sm font-semibold text-slate-700">${acc.nama_lengkap}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600 font-medium">${acc.username}</td>
                <td class="px-6 py-4 text-sm text-slate-500">${acc.email}</td>
                <td class="px-6 py-4 text-center">
                    <span class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${roleClass}">
                        ${acc.status_role}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button class="edit-btn size-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600 transition-all" 
                                data-id="${acc.id}">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button class="delete-btn size-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-all" 
                                data-id="${acc.id}" data-name="${acc.nama_lengkap}">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Attach event listeners to buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => handleEdit(btn.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.name));
        });
    };

    // Filter Logic
    const handleFilter = () => {
        const query = searchInput.value.toLowerCase();
        const role = roleFilter.value;

        roleLabel.textContent = role === 'all' ? 'SEMUA ROLE' : role.toUpperCase();

        const filtered = allAccounts.filter(acc => {
            const matchesSearch = acc.nama_lengkap.toLowerCase().includes(query) ||
                acc.username.toLowerCase().includes(query) ||
                acc.email.toLowerCase().includes(query);
            const matchesRole = role === 'all' || acc.status_role === role;
            return matchesSearch && matchesRole;
        });
        renderAccounts(filtered);
    };

    searchInput.addEventListener('input', handleFilter);
    roleFilter.addEventListener('change', handleFilter);

    // Modal Control
    const togglePassword = document.getElementById('toggle-password');

    const openModal = (mode = 'add', data = null) => {
        modal.classList.remove('hidden');
        // Reset password field to password type
        passwordInput.type = 'password';
        togglePassword.querySelector('span').textContent = 'visibility';

        setTimeout(() => {
            modalBackdrop.classList.replace('opacity-0', 'opacity-100');
            modalContent.classList.replace('translate-y-full', 'translate-y-0');
        }, 10);

        if (mode === 'edit') {
            modalTitle.textContent = 'Edit Akun';
            modalIcon.textContent = 'edit_square';
            submitBtnText.textContent = 'Perbarui Akun';
            passwordHint.classList.remove('hidden');
            passwordInput.required = false;

            // Populate form
            document.getElementById('form-id').value = data.id;
            document.getElementById('form-nama').value = data.nama_lengkap;
            document.getElementById('form-username').value = data.username;
            document.getElementById('form-gender').value = data.gender;
            document.getElementById('form-email').value = data.email;
            document.getElementById('form-role').value = data.status_role;
            document.getElementById('form-password').value = '';
        } else {
            modalTitle.textContent = 'Tambah Akun Baru';
            modalIcon.textContent = 'person_add';
            submitBtnText.textContent = 'Simpan Akun';
            passwordHint.classList.add('hidden');
            passwordInput.required = true;
            form.reset();
            document.getElementById('form-id').value = '';
        }
    };

    const closeModal = () => {
        modalBackdrop.classList.replace('opacity-100', 'opacity-0');
        modalContent.classList.replace('translate-y-0', 'translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    openModalBtn.addEventListener('click', () => openModal('add'));
    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    // Edit Handler
    const handleEdit = (id) => {
        const account = allAccounts.find(acc => acc.id == id);
        if (account) openModal('edit', account);
    };

    // Delete Handler
    const handleDelete = async (id, name) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus akun ${name}?`)) return;

        try {
            const response = await fetch(`/api/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                fetchAccounts();
            } else {
                showToast(result.message, 'danger');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Gagal menghapus akun', 'danger');
        }
    };

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('form-id').value;
        const formData = new FormData(form);
        const url = id ? `/api/accounts/${id}` : '/api/accounts';
        const method = id ? 'PUT' : 'POST';

        // Add CSRF token manually for fetch if needed, but FormData usually works with forms.
        // However, Python Flask-WTF expects it in the header or form data.
        formData.append('csrf_token', csrfToken);

        try {
            const response = await fetch(url, {
                method: method,
                body: formData,
                headers: { 'X-CSRFToken': csrfToken }
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                closeModal();
                fetchAccounts();
            } else {
                showToast(result.message, 'danger');
            }
        } catch (error) {
            console.error('Form submit error:', error);
            showToast('Terjadi kesalahan saat menyimpan data', 'danger');
        }
    });

    // Helper: Show Toast
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${type === 'danger' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined text-[20px]">${type === 'danger' ? 'error' : 'check_circle'}</span>
            ${message}
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-out', 'fade-out', 'slide-out-to-top-4');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Toggle Password Visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });

    // Initial load
    fetchAccounts();
});
