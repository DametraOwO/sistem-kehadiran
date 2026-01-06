/**
 * Security script to discourage inspection of code.
 * Note: This client-side measure cannot completely prevent a determined user from viewing source code.
 */

// Disable Right Click
document.addEventListener('contextmenu', (event) => event.preventDefault());

// Disable Keyboard Shortcuts
document.onkeydown = function (e) {
    // F12
    if (e.keyCode == 123) {
        return false;
    }

    // Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
        return false;
    }

    // Ctrl+Shift+C (Inspect Element)
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) {
        return false;
    }

    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
        return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
        return false;
    }
}
