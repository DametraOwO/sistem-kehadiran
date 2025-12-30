document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('foto_profil');
    const imgPreview = document.getElementById('profile-preview');
    const newPassword = document.getElementById('new_password');
    const confirmPassword = document.getElementById('confirm_password');
    const passwordError = document.getElementById('password-error');
    const submitBtn = document.getElementById('submit-btn');

    // === Image Preview ===
    if (fileInput && imgPreview) {
        fileInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imgPreview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // === Password Match Validation ===
    const validatePasswords = () => {
        if (confirmPassword.value === '') {
            passwordError.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            return;
        }

        if (newPassword.value !== confirmPassword.value) {
            passwordError.classList.remove('hidden');
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            passwordError.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    };

    if (newPassword && confirmPassword) {
        newPassword.addEventListener('input', validatePasswords);
        confirmPassword.addEventListener('input', validatePasswords);
    }
});
