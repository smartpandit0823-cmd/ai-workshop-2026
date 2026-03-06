/* ============================================
   AI FUTURE WORKSHOP 2026 — COUNTDOWN TIMER
   Live countdown to 17 March 2026
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Event date: 17 March 2026, 10:00 AM IST
    const eventDate = new Date('2026-03-17T10:00:00+05:30').getTime();

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    // Don't run if elements don't exist (non-home pages)
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = eventDate - now;

        if (distance < 0) {
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Animate number changes
        animateValue(daysEl, days);
        animateValue(hoursEl, hours);
        animateValue(minutesEl, minutes);
        animateValue(secondsEl, seconds);
    }

    function animateValue(element, newValue) {
        const formatted = String(newValue).padStart(2, '0');
        if (element.textContent !== formatted) {
            element.style.transform = 'scale(1.1)';
            element.textContent = formatted;
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 150);
        }
    }

    // Initial call
    updateCountdown();

    // Update every second
    setInterval(updateCountdown, 1000);
});
