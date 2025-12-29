document.addEventListener('DOMContentLoaded', function () {
    updateBusinessStatus();
    // Update every minute to ensure accuracy if user keeps page open
    setInterval(updateBusinessStatus, 60000);
});

function updateBusinessStatus() {
    const statusElement = document.getElementById('business-status');
    if (!statusElement) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Business Hours: 07:00 - 18:00
    const startHour = 7;
    const endHour = 18;

    const isOpen = currentHour >= startHour && currentHour < endHour;

    if (isOpen) {
        statusElement.textContent = 'Buka • 07:00 - 18:00';
        // Green Styling
        statusElement.classList.remove('bg-red-100', 'text-red-700');
        statusElement.classList.add('bg-green-100', 'text-green-700');
    } else {
        statusElement.textContent = 'Tutup • 07:00 - 18:00';
        // Red Styling
        statusElement.classList.remove('bg-green-100', 'text-green-700');
        statusElement.classList.add('bg-red-100', 'text-red-700');
    }
}
