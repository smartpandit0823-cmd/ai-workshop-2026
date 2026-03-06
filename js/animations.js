/* ============================================
   AI FUTURE WORKSHOP 2026 — SCROLL ANIMATIONS
   Intersection Observer based scroll effects
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // SCROLL REVEAL ANIMATIONS
    // ==========================================
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');

                // Trigger counter animation if stat value
                const counter = entry.target.querySelector('.stat-value[data-target]');
                if (counter) {
                    animateCounter(counter);
                }
            }
        });
    }, observerOptions);

    // Observe all animate-on-scroll elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });


    // ==========================================
    // COUNTER ANIMATION
    // ==========================================
    function animateCounter(element) {
        const target = parseInt(element.getAttribute('data-target'));
        if (isNaN(target)) return;

        const duration = 2000; // 2 seconds
        const startTime = performance.now();
        const startValue = 0;

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (target - startValue) * easeOut);

            element.textContent = currentValue + '+';

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }

        requestAnimationFrame(updateCounter);
    }


    // ==========================================
    // SEAT COUNTER ANIMATION
    // ==========================================
    const seatCount = document.getElementById('seatCount');
    if (seatCount) {
        // Randomly increase seat count for urgency
        setInterval(() => {
            const current = parseInt(seatCount.textContent);
            if (current < 200) {
                seatCount.textContent = current + 1;
                seatCount.style.color = 'var(--success-green)';
                seatCount.style.fontWeight = '700';
                setTimeout(() => {
                    seatCount.style.fontWeight = '';
                }, 500);
            }
        }, 15000 + Math.random() * 30000); // Random 15-45 second interval
    }


    // ==========================================
    // PARALLAX EFFECT on HERO
    // ==========================================
    const hero = document.querySelector('.hero');
    const heroRobot = document.querySelector('.hero-robot');

    if (hero && heroRobot) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            if (scrolled < window.innerHeight) {
                heroRobot.style.transform = `translateY(${scrolled * 0.15}px)`;
            }
        });
    }


    // ==========================================
    // CURSOR GLOW (Desktop only)
    // ==========================================
    if (window.innerWidth > 768) {
        const cursorGlow = document.createElement('div');
        cursorGlow.style.cssText = `
            position: fixed;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 245, 255, 0.04) 0%, transparent 70%);
            pointer-events: none;
            z-index: -1;
            transition: transform 0.15s ease;
            transform: translate(-50%, -50%);
        `;
        document.body.appendChild(cursorGlow);

        document.addEventListener('mousemove', (e) => {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
    }


    // ==========================================
    // TILT EFFECT on CARDS (Desktop only)
    // ==========================================
    if (window.innerWidth > 768) {
        document.querySelectorAll('.feature-card, .speaker-card, .speaker-card-large, .stat-item').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }
});
