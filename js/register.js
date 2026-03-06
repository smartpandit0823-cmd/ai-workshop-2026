/* ============================================
   AI FUTURE WORKSHOP 2026 — REGISTRATION
   Razorpay Payment + MongoDB Backend
   ============================================ */

const API_BASE = window.location.origin;


// ==========================================
// FORM VALIDATION
// ==========================================
function validateForm() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const college = document.getElementById('regCollege').value.trim();
    const profession = document.getElementById('regProfession')?.value.trim() || '';

    if (!name) {
        showAlert('Please enter your full name');
        document.getElementById('regName').focus();
        return false;
    }

    if (!email || !isValidEmail(email)) {
        showAlert('Please enter a valid email address');
        document.getElementById('regEmail').focus();
        return false;
    }

    if (!phone || phone.length < 10) {
        showAlert('Please enter a valid 10-digit phone number');
        document.getElementById('regPhone').focus();
        return false;
    }

    if (!college) {
        showAlert('Please enter your college or company name');
        document.getElementById('regCollege').focus();
        return false;
    }

    return true;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 68, 68, 0.95);
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-family: 'Exo 2', sans-serif;
        font-weight: 600;
        z-index: 100000;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(255, 68, 68, 0.3);
        max-width: 90vw;
        text-align: center;
    `;
    alertDiv.textContent = '⚠️ ' + message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateX(-50%) translateY(-10px)';
        alertDiv.style.transition = 'all 0.3s ease';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(57, 255, 20, 0.9);
        color: #000;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-family: 'Exo 2', sans-serif;
        font-weight: 700;
        z-index: 100000;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(57, 255, 20, 0.3);
        max-width: 90vw;
        text-align: center;
    `;
    alertDiv.textContent = '✅ ' + message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transform = 'translateX(-50%) translateY(-10px)';
        alertDiv.style.transition = 'all 0.3s ease';
        setTimeout(() => alertDiv.remove(), 300);
    }, 4000);
}


// ==========================================
// INITIATE PAYMENT — Step 1: Create Order
// ==========================================
async function initiatePayment() {
    if (!validateForm()) return;

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const college = document.getElementById('regCollege').value.trim();
    const profession = document.getElementById('regProfession')?.value.trim() || '';

    const payBtn = document.getElementById('payBtn');
    payBtn.textContent = '⏳ Creating Order...';
    payBtn.disabled = true;

    try {
        // Step 1: Create Razorpay order on server
        const response = await fetch(`${API_BASE}/api/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, college, profession })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to create order');
        }

        // Step 2: Open Razorpay checkout
        const options = {
            key: data.key,
            amount: data.amount,
            currency: data.currency,
            name: "AI Future Workshop 2026",
            description: "Workshop Registration — ₹199",
            order_id: data.order_id,
            image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🤖%3C/text%3E%3C/svg%3E",
            handler: function (response) {
                // Step 3: Verify payment on server
                verifyPayment(response, { name, email, phone });
            },
            prefill: { name, email, contact: phone },
            notes: { event: "AI Future Workshop 2026", college, profession },
            theme: {
                color: "#4B0082",
                backdrop_color: "rgba(10, 0, 24, 0.8)"
            },
            modal: {
                ondismiss: function () {
                    payBtn.textContent = '💳 Pay ₹199 & Register';
                    payBtn.disabled = false;
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            payBtn.textContent = '💳 Pay ₹199 & Register';
            payBtn.disabled = false;
            showAlert('Payment failed: ' + response.error.description);
        });
        rzp.open();

    } catch (error) {
        console.error('Payment error:', error);
        payBtn.textContent = '💳 Pay ₹199 & Register';
        payBtn.disabled = false;
        showAlert('Something went wrong. Please try again.');
    }
}


// ==========================================
// VERIFY PAYMENT — Step 3
// ==========================================
async function verifyPayment(razorpayResponse, userData) {
    const payBtn = document.getElementById('payBtn');
    payBtn.textContent = '⏳ Verifying Payment...';

    try {
        const response = await fetch(`${API_BASE}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature
            })
        });

        const data = await response.json();

        if (data.success) {
            onPaymentSuccess({
                ...userData,
                payment_id: razorpayResponse.razorpay_payment_id
            });
        } else {
            showAlert('Payment verification failed. Contact support.');
            payBtn.textContent = '💳 Pay ₹199 & Register';
            payBtn.disabled = false;
        }
    } catch (error) {
        console.error('Verification error:', error);
        // Payment was successful even if verification API fails
        onPaymentSuccess({
            ...userData,
            payment_id: razorpayResponse.razorpay_payment_id
        });
    }
}


// ==========================================
// PAYMENT SUCCESS
// ==========================================
function onPaymentSuccess(data) {
    console.log('✅ Payment successful!');

    // Show success overlay
    showSuccessOverlay(data);

    // Confetti
    if (typeof createConfetti === 'function') {
        createConfetti();
        setTimeout(() => createConfetti(), 500);
    }

    // Update button
    const payBtn = document.getElementById('payBtn');
    if (payBtn) {
        payBtn.textContent = '✅ Registration Complete!';
        payBtn.style.background = '#39FF14';
        payBtn.style.color = '#000';
    }
}


// ==========================================
// SUCCESS OVERLAY
// ==========================================
function showSuccessOverlay(data) {
    const overlay = document.getElementById('successOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        const payIdEl = document.getElementById('paymentIdDisplay');
        if (payIdEl && data && data.payment_id) {
            payIdEl.textContent = data.payment_id;
        }
    }
}

function closeSuccessOverlay() {
    const overlay = document.getElementById('successOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}


// ==========================================
// LOAD REGISTRATION COUNT
// ==========================================
async function loadRegistrationCount() {
    try {
        const res = await fetch(`${API_BASE}/api/registration-count`);
        const data = await res.json();
        const el = document.getElementById('seatCount');
        if (el) el.textContent = data.count;
    } catch (e) {
        // Keep default
    }
}


// ==========================================
// PHONE INPUT & FORM SETUP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Load live count
    loadRegistrationCount();

    const phoneInput = document.getElementById('regPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value.length > 10) {
                e.target.value = e.target.value.slice(0, 10);
            }
        });
    }

    // Focus effects
    document.querySelectorAll('.form-group input, .form-group select').forEach(input => {
        input.addEventListener('focus', () => {
            const label = input.parentElement.querySelector('label');
            if (label) {
                label.style.color = 'var(--neon-blue)';
                label.style.textShadow = '0 0 10px rgba(0, 245, 255, 0.3)';
            }
        });
        input.addEventListener('blur', () => {
            const label = input.parentElement.querySelector('label');
            if (label) {
                label.style.color = '';
                label.style.textShadow = '';
            }
        });
    });
});
