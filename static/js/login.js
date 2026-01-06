document.addEventListener('DOMContentLoaded', function () {
    // Tab Switching Logic
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formsSlider = document.getElementById('forms-slider');

    function switchTab(mode) {
        if (mode === 'login') {
            formsSlider.style.transform = 'translateX(0)';
            // Make login tab checked (if triggered by other means) but radio behavior handles UI
        } else {
            formsSlider.style.transform = 'translateX(-100%)';
        }
    }

    tabLogin.addEventListener('change', () => {
        if (tabLogin.checked) switchTab('login');
    });

    tabRegister.addEventListener('change', () => {
        if (tabRegister.checked) switchTab('register');
    });

    // Password Toggle Logic
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('span');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.textContent = 'visibility';
            } else {
                passwordInput.type = 'password';
                icon.textContent = 'visibility_off';
            }
        });
    });


    // --- Forgot Password Logic ---
    const forgotModal = document.getElementById("forgot-password-modal");
    const openForgotBtn = document.querySelector("a[href*='maintenance']"); // Select the "Lupa Kata Sandi" link
    const closeForgotBtn = document.getElementById("close-forgot-modal");
    const forgotBackdrop = document.getElementById("forgot-modal-backdrop");
    const forgotContent = document.getElementById("forgot-modal-content");
    const forgotActionBtn = document.getElementById("forgot-action-btn");

    // Inputs
    const forgotNama = document.getElementById("forgot-nama");
    const forgotEmail = document.getElementById("forgot-email");
    const forgotNewPass = document.getElementById("forgot-new-pass");
    const forgotConfirmPass = document.getElementById("forgot-confirm-pass");
    const stepReset = document.getElementById("step-reset");
    const forgotMessage = document.getElementById("forgot-message");

    let isVerified = false;

    // Open Modal
    if (openForgotBtn) {
        openForgotBtn.addEventListener("click", (e) => {
            e.preventDefault();
            forgotModal.classList.remove("hidden");
            setTimeout(() => {
                forgotBackdrop.classList.remove("opacity-0");
                forgotContent.classList.remove("translate-y-full");
            }, 10);
        });
    }

    // Close Modal
    function closeForgotModal() {
        forgotBackdrop.classList.add("opacity-0");
        forgotContent.classList.add("translate-y-full");
        setTimeout(() => {
            forgotModal.classList.add("hidden");
            resetForgotForm();
        }, 300);
    }

    if (closeForgotBtn) closeForgotBtn.addEventListener("click", closeForgotModal);
    if (forgotBackdrop) forgotBackdrop.addEventListener("click", closeForgotModal);

    // Reset Form State
    function resetForgotForm() {
        isVerified = false;
        forgotNama.value = "";
        forgotEmail.value = "";
        forgotNewPass.value = "";
        forgotConfirmPass.value = "";
        forgotNama.disabled = false;
        forgotEmail.disabled = false;

        stepReset.classList.add("opacity-50", "pointer-events-none");
        forgotNewPass.disabled = true;
        forgotConfirmPass.disabled = true;
        forgotNewPass.classList.replace("bg-white", "bg-gray-50");
        forgotConfirmPass.classList.replace("bg-white", "bg-gray-50");

        forgotActionBtn.textContent = "Verifikasi";
        forgotActionBtn.classList.remove("bg-green-600");

        hideMessage();
    }

    function showMessage(type, text) {
        forgotMessage.classList.remove("hidden", "bg-red-50", "text-red-700", "border-red-200", "bg-green-50", "text-green-700", "border-green-200");
        if (type === "error") {
            forgotMessage.classList.add("bg-red-50", "text-red-700");
            forgotMessage.innerHTML = `<span class="material-symbols-outlined text-[18px]">error</span> ${text}`;
        } else {
            forgotMessage.classList.add("bg-green-50", "text-green-700");
            forgotMessage.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span> ${text}`;
        }
    }

    function hideMessage() {
        forgotMessage.classList.add("hidden");
    }

    // Helper to get CSRF Token
    function getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    }

    // Main Action Handler
    forgotActionBtn.addEventListener("click", async () => {
        if (!isVerified) {
            // VERIFICATION STEP
            const nama = forgotNama.value.trim();
            const email = forgotEmail.value.trim();

            if (!nama || !email) {
                showMessage("error", "Nama dan Email harus diisi.");
                return;
            }

            // Show Loading
            forgotActionBtn.textContent = "Memverifikasi...";
            forgotActionBtn.disabled = true;

            try {
                const res = await fetch('/api/verify_reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({ nama, email })
                });
                const data = await res.json();

                if (data.success) {
                    // Success: Enable Step 2
                    isVerified = true;
                    showMessage("success", "Data valid! Silakan buat kata sandi baru.");

                    // Lock Step 1
                    forgotNama.disabled = true;
                    forgotEmail.disabled = true;

                    // Unlock Step 2
                    stepReset.classList.remove("opacity-50", "pointer-events-none");
                    forgotNewPass.disabled = false;
                    forgotConfirmPass.disabled = false;
                    forgotNewPass.classList.replace("bg-gray-50", "bg-white");
                    forgotConfirmPass.classList.replace("bg-gray-50", "bg-white");

                    forgotActionBtn.textContent = "Reset Kata Sandi";
                } else {
                    showMessage("error", "Data tidak ditemukan. Cek kembali nama dan email Anda.");
                }
            } catch (err) {
                showMessage("error", "Terjadi kesalahan server.");
            } finally {
                if (!isVerified) forgotActionBtn.textContent = "Verifikasi";
                forgotActionBtn.disabled = false;
            }

        } else {
            // RESET PASSWORD STEP
            const pass = forgotNewPass.value;
            const confirm = forgotConfirmPass.value;

            if (!pass || pass.length < 8) {
                showMessage("error", "Kata sandi minimal 8 karakter.");
                return;
            }
            if (pass !== confirm) {
                showMessage("error", "Konfirmasi kata sandi tidak cocok.");
                return;
            }

            forgotActionBtn.textContent = "Memproses...";
            forgotActionBtn.disabled = true;

            try {
                const res = await fetch('/api/reset_password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCsrfToken()
                    },
                    body: JSON.stringify({
                        nama: forgotNama.value,
                        email: forgotEmail.value,
                        new_password: pass
                    })
                });
                const data = await res.json();

                if (data.success) {
                    showMessage("success", "Kata sandi berhasil direset! Mengalihkan...");
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showMessage("error", data.message || "Gagal mereset sandi.");
                    forgotActionBtn.textContent = "Reset Kata Sandi";
                    forgotActionBtn.disabled = false;
                }
            } catch (err) {
                showMessage("error", "Terjadi kesalahan server.");
                forgotActionBtn.textContent = "Reset Kata Sandi";
                forgotActionBtn.disabled = false;
            }
        }
    });
});
