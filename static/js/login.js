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
});
