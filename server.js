/* ============================================
   AI FUTURE WORKSHOP 2026 — NODE.JS BACKEND
   Express + MongoDB + Razorpay + AWS S3
   ============================================ */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const PORT = process.env.PORT || 8080;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Explicitly serve index.html for root (fixes Vercel Express zero-config issue)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Multer for file uploads (in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, PPT, PPTX, DOC, DOCX files allowed'));
        }
    }
});


// ==========================================
// MONGODB CONNECTION
// ==========================================
mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'aifutureworkshop'
}).then(() => {
    console.log('✅ MongoDB Connected Successfully');
}).catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
});


// ==========================================
// MONGOOSE SCHEMAS
// ==========================================

// Registration Schema
const registrationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    college: { type: String, required: true },
    profession: { type: String, default: '' },
    razorpay_order_id: String,
    razorpay_payment_id: String,
    amount: { type: Number, default: 199 },
    status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

// Pitch Deck Schema
const pitchSchema = new mongoose.Schema({
    // Team Details
    teamName: { type: String, required: true },
    leaderName: { type: String, required: true },
    leaderPhone: { type: String, required: true },
    leaderEmail: { type: String, required: true },
    college: { type: String, required: true },
    city: { type: String, required: true },

    // Members
    members: [{
        name: String,
        role: String
    }],

    // Idea
    ideaName: { type: String, required: true },
    problemStatement: String,
    proposedSolution: String,
    targetUsers: String,
    techUsed: String,
    expectedImpact: String,
    ideaSummary: String,

    // File Upload
    pitchDeckUrl: String,         // S3 URL
    pitchDeckKey: String,         // S3 Key
    pitchDeckOriginalName: String,

    // Payment
    razorpay_order_id: String,
    razorpay_payment_id: String,
    amount: { type: Number, default: 199 },
    paymentStatus: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },

    // Review
    reviewStatus: { type: String, enum: ['submitted', 'under_review', 'selected', 'rejected'], default: 'submitted' },
    reviewNotes: String,

    createdAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', registrationSchema);
const Pitch = mongoose.model('Pitch', pitchSchema);

// Visitor Schema for Tracking
const visitorSchema = new mongoose.Schema({
    count: { type: Number, default: 0 }
});
const Visitor = mongoose.model('Visitor', visitorSchema);


// ==========================================
// RAZORPAY INSTANCE
// ==========================================
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


// ==========================================
// AWS S3 CLIENT
// ==========================================
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});


// ==========================================
// NODEMAILER EMAIL TRANSPORTER
// ==========================================
const emailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'smartpandit0823@gmail.com',
        pass: 'ynyh miou qfrw vdps'
    }
});

async function sendConfirmationEmail(registration) {
    try {
        const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0018; color: #fff; border-radius: 20px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4B0082, #9D4EDD); padding: 2rem; text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem; letter-spacing: 3px;">🤖 AI FUTURE WORKSHOP 2026</h1>
                <p style="margin: 0.5rem 0 0; font-size: 0.9rem; opacity: 0.9;">Registration Confirmed!</p>
            </div>
            <div style="padding: 2rem;">
                <p style="font-size: 1.1rem; color: #39FF14;">🎉 Congratulations, ${registration.name}!</p>
                <p style="color: #d4cfe0;">Your registration for <strong style="color: #00F5FF;">AI Future Workshop 2026</strong> is confirmed.</p>
                
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(0,245,255,0.2); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                    <h3 style="color: #00F5FF; margin: 0 0 1rem; font-size: 0.9rem; letter-spacing: 1px;">📋 EVENT DETAILS</h3>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">📅 <strong>Date:</strong> 17 March 2026 (Tuesday)</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">⏰ <strong>Time:</strong> 9:00 AM to 6:00 PM</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">📍 <strong>Venue:</strong> Bali Mandir, Behind Rasbihari Int. School, Panchavati, Nashik – 422003</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">👨‍🏫 <strong>Instructor:</strong> Harshal Kulkarni</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">🏢 <strong>Organized by:</strong> Samartha Institute × SanatanSetu</p>
                </div>

                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(0,245,255,0.2); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                    <h3 style="color: #FFD700; margin: 0 0 1rem; font-size: 0.9rem; letter-spacing: 1px;">🧾 YOUR DETAILS</h3>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">👤 <strong>Name:</strong> ${registration.name}</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">📧 <strong>Email:</strong> ${registration.email}</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">📱 <strong>Phone:</strong> ${registration.phone}</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">🏫 <strong>College:</strong> ${registration.college}</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">💳 <strong>Payment ID:</strong> ${registration.razorpay_payment_id}</p>
                    <p style="color: #d4cfe0; margin: 0.3rem 0;">💰 <strong>Amount:</strong> ₹199</p>
                </div>

                <div style="text-align: center; margin: 1.5rem 0;">
                    <a href="https://chat.whatsapp.com/KknvWTMpZoaCEhGvsiyj3W" style="display: inline-block; padding: 0.8rem 2rem; background: #25D366; color: #fff; border-radius: 50px; text-decoration: none; font-weight: bold;">💬 Join WhatsApp Group</a>
                </div>

                <div style="background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 12px; padding: 1rem; margin: 1rem 0;">        
                    <p style="color: #FFD700; font-weight: bold; margin: 0 0 0.5rem;">✨ What You'll Get:</p>
                    <p style="color: #d4cfe0; margin: 0.2rem 0; font-size: 0.9rem;">✅ Full Day AI Workshop &nbsp; ✅ 100+ AI Tools PDF</p>
                    <p style="color: #d4cfe0; margin: 0.2rem 0; font-size: 0.9rem;">✅ AI Agents Training &nbsp; ✅ Earn With AI Session</p>
                    <p style="color: #d4cfe0; margin: 0.2rem 0; font-size: 0.9rem;">✅ Participation Certificate &nbsp; ✅ Networking</p>
                </div>
                
                <p style="color: rgba(176,168,192,0.6); font-size: 0.8rem; text-align: center; margin-top: 1.5rem;">This is an auto-generated email. For queries, WhatsApp: 8421116801</p>
            </div>
        </div>
        `;

        await emailTransporter.sendMail({
            from: '"AI Future Workshop 2026" <smartpandit0823@gmail.com>',
            to: registration.email,
            subject: '🎉 Registration Confirmed — AI Future Workshop 2026 | 17 March',
            html: html
        });

        console.log(`📧 Confirmation email sent to ${registration.email}`);
    } catch (error) {
        console.error('Email send error:', error.message);
        // Don't block the flow if email fails
    }
}

async function sendPitchStatusEmail(pitch, oldStatus) {
    // Only send if status actually changed and isn't 'submitted'
    if (pitch.reviewStatus === oldStatus || pitch.reviewStatus === 'submitted') return;

    const statusColors = {
        'under_review': '#FFA500',
        'selected': '#39FF14',
        'rejected': '#FF4444'
    };

    const statusLabels = {
        'under_review': 'Under Review',
        'selected': 'Selected ✨',
        'rejected': 'Not Selected'
    };

    const color = statusColors[pitch.reviewStatus] || '#00F5FF';
    const label = statusLabels[pitch.reviewStatus] || pitch.reviewStatus;

    try {
        const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0018; color: #fff; border-radius: 20px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4B0082, #9D4EDD); padding: 2rem; text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem; letter-spacing: 3px; color:#FFD700">🏆 KUMBH MELA 2027</h1>
                <p style="margin: 0.5rem 0 0; font-size: 0.9rem; opacity: 0.9;">Pitch Status Update</p>
            </div>
            <div style="padding: 2rem;">
                <p style="font-size: 1.1rem;">Hello, <strong style="color: #00F5FF;">${pitch.leaderName}</strong> (Team: ${pitch.teamName})</p>
                <p style="color: #d4cfe0;">The status of your pitch deck idea <strong style="color:#FFD700;">"${pitch.ideaName}"</strong> has been updated.</p>

                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(0,245,255,0.2); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; text-align: center;">
                    <h3 style="margin: 0 0 1rem; font-size: 0.8rem; letter-spacing: 1px; color: rgba(176,168,192,0.7);">CURRENT STATUS</h3>
                    <div style="display: inline-block; padding: 0.6rem 2rem; background: rgba(255,255,255,0.05); border: 2px solid ${color}; color: ${color}; border-radius: 50px; font-weight: bold; font-size: 1.1rem; letter-spacing: 1px; text-transform: uppercase;">
                        ${label}
                    </div>
                </div>
                
                ${pitch.reviewNotes ? `
                <div style="background: rgba(255,215,0,0.05); border: 1px solid rgba(255,215,0,0.3); border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0;">
                    <h3 style="color: #FFD700; margin: 0 0 0.8rem; font-size: 0.8rem; letter-spacing: 1px;">📝 REVIEWER NOTES</h3>
                    <p style="color: #d4cfe0; margin: 0; font-style: italic; font-size: 0.95rem; line-height: 1.5;">"${pitch.reviewNotes}"</p>
                </div>
                ` : ''}

                <p style="color: rgba(176,168,192,0.6); font-size: 0.8rem; text-align: center; margin-top: 2rem;">This is an auto-generated email from AI Future Workshop 2026.<br>For queries, contact us on WhatsApp.</p>
            </div>
        </div>
        `;

        await emailTransporter.sendMail({
            from: '"AI Future Workshop" <smartpandit0823@gmail.com>',
            to: pitch.leaderEmail,
            subject: `Update: Pitch Status for "${pitch.ideaName}"`,
            html: html
        });

        console.log(`📧 Pitch status email sent to ${pitch.leaderEmail}`);
    } catch (error) {
        console.error('Pitch email send error:', error.message);
    }
}


// ==========================================
// ADMIN AUTH MIDDLEWARE
// ==========================================
function adminAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}


// ==========================================
// API: ADMIN LOGIN
// ==========================================
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    return res.status(401).json({ error: 'Wrong password' });
});


// ==========================================
// API: CREATE RAZORPAY ORDER (Workshop Registration)
// ==========================================
app.post('/api/create-order', async (req, res) => {
    try {
        const { name, email, phone, college, profession } = req.body;

        // Validate
        if (!name || !email || !phone || !college) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: 19900, // ₹199 in paise
            currency: 'INR',
            receipt: `reg_${Date.now()}`,
            notes: {
                name, email, phone, college, profession,
                event: 'AI Future Workshop 2026'
            }
        });

        // Save pending registration
        const registration = new Registration({
            name, email, phone, college, profession,
            razorpay_order_id: order.id,
            status: 'pending'
        });
        await registration.save();

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});


// ==========================================
// API: VERIFY PAYMENT (Workshop Registration)
// ==========================================
app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Verify signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex');

        if (expectedSign !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Update registration
        const registration = await Registration.findOneAndUpdate(
            { razorpay_order_id },
            {
                razorpay_payment_id,
                status: 'confirmed'
            },
            { new: true }
        );

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Send confirmation email (non-blocking)
        sendConfirmationEmail(registration);

        res.json({
            success: true,
            message: 'Payment verified successfully',
            payment_id: razorpay_payment_id,
            registration: {
                name: registration.name,
                email: registration.email,
                phone: registration.phone
            }
        });
    } catch (err) {
        console.error('Verify payment error:', err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});


// ==========================================
// API: CREATE RAZORPAY ORDER (Pitch Deck)
// ==========================================
app.post('/api/pitch/create-order', async (req, res) => {
    try {
        const { teamName, leaderName, leaderEmail, leaderPhone } = req.body;

        if (!teamName || !leaderName || !leaderEmail || !leaderPhone) {
            return res.status(400).json({ error: 'Team details required' });
        }

        const order = await razorpay.orders.create({
            amount: 19900, // ₹199
            currency: 'INR',
            receipt: `pitch_${Date.now()}`,
            notes: {
                teamName, leaderName, leaderEmail,
                type: 'Kumbh Mela Pitch Deck'
            }
        });

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Pitch order error:', err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});


// ==========================================
// API: UPLOAD PITCH DECK TO S3
// ==========================================
app.post('/api/pitch/upload', upload.single('pitchDeck'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileExt = path.extname(req.file.originalname);
        const key = `pitch-decks/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));

        const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        res.json({
            success: true,
            url: fileUrl,
            key: key,
            originalName: req.file.originalname
        });
    } catch (err) {
        console.error('S3 upload error:', err);
        res.status(500).json({ error: 'File upload failed' });
    }
});


// ==========================================
// API: SUBMIT PITCH + VERIFY PAYMENT
// ==========================================
app.post('/api/pitch/submit', async (req, res) => {
    try {
        const {
            razorpay_order_id, razorpay_payment_id, razorpay_signature,
            teamName, leaderName, leaderPhone, leaderEmail,
            college, city, members,
            ideaName, problemStatement, proposedSolution,
            targetUsers, techUsed, expectedImpact, ideaSummary,
            pitchDeckUrl, pitchDeckKey, pitchDeckOriginalName
        } = req.body;

        // Verify payment signature
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex');

        if (expectedSign !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Save pitch
        const pitch = new Pitch({
            teamName, leaderName, leaderPhone, leaderEmail,
            college, city,
            members: members || [],
            ideaName, problemStatement, proposedSolution,
            targetUsers, techUsed, expectedImpact, ideaSummary,
            pitchDeckUrl, pitchDeckKey, pitchDeckOriginalName,
            razorpay_order_id,
            razorpay_payment_id,
            paymentStatus: 'confirmed',
            reviewStatus: 'submitted'
        });
        await pitch.save();

        res.json({
            success: true,
            message: 'Pitch deck submitted successfully',
            pitch_id: pitch._id
        });
    } catch (err) {
        console.error('Pitch submit error:', err);
        res.status(500).json({ error: 'Submission failed' });
    }
});


// ==========================================
// API: RAZORPAY WEBHOOK (Automated Payment Tracking)
// ==========================================
app.post('/api/razorpay-webhook', async (req, res) => {
    try {
        // Razorpay sends webhook secret in headers
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // If you haven't set a secret in Vercel/Render, just accept it for now or enforce it later
        if (secret) {
            const shasum = crypto.createHmac('sha256', secret);
            shasum.update(JSON.stringify(req.body));
            const digest = shasum.digest('hex');

            if (digest !== req.headers['x-razorpay-signature']) {
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }

        const event = req.body.event;
        const payload = req.body.payload.payment.entity;
        const orderId = payload.order_id; // Related order ID

        if (event === 'payment.failed') {
            // Update Registration and Pitch to mark as failed
            await Registration.findOneAndUpdate({ razorpay_order_id: orderId }, { status: 'failed' });
            await Pitch.findOneAndUpdate({ razorpay_order_id: orderId }, { paymentStatus: 'failed' });
            console.log(`❌ Webhook: Payment failed for Order ${orderId}`);
        }
        else if (event === 'payment.authorized' || event === 'payment.captured') {
            // Update Registration
            const reg = await Registration.findOneAndUpdate({ razorpay_order_id: orderId }, { razorpay_payment_id: payload.id, status: 'confirmed' });
            if (reg) sendConfirmationEmail(reg);

            // Update Pitch
            await Pitch.findOneAndUpdate({ razorpay_order_id: orderId }, { razorpay_payment_id: payload.id, paymentStatus: 'confirmed' });
            console.log(`✅ Webhook: Payment Success for Order ${orderId}`);
        }

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook Error:', err.message);
        res.status(500).json({ error: 'Webhook failed' });
    }
});


// ==========================================
// API: ADMIN — GET ALL REGISTRATIONS
// ==========================================
app.get('/api/admin/registrations', adminAuth, async (req, res) => {
    try {
        // Exclude pending (abandoned checkouts) so admin only sees real data
        const registrations = await Registration.find({ status: { $ne: 'pending' } }).sort({ createdAt: -1 });
        res.json({ success: true, data: registrations });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});


// ==========================================
// API: ADMIN — GET ALL PITCHES
// ==========================================
app.get('/api/admin/pitches', adminAuth, async (req, res) => {
    try {
        const pitches = await Pitch.find().sort({ createdAt: -1 });
        res.json({ success: true, data: pitches });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pitches' });
    }
});


// ==========================================
// API: ADMIN — GET STATS
// ==========================================
app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const totalRegistrations = await Registration.countDocuments({ status: 'confirmed' });
        const pendingRegistrations = await Registration.countDocuments({ status: 'pending' });
        const totalRevenue = totalRegistrations * 199;

        const totalPitches = await Pitch.countDocuments({ paymentStatus: 'confirmed' });
        const selectedPitches = await Pitch.countDocuments({ reviewStatus: 'selected' });
        const underReviewPitches = await Pitch.countDocuments({ reviewStatus: 'under_review' });
        const pitchRevenue = totalPitches * 199;

        const visitorDoc = await Visitor.findOne();
        const visitors = visitorDoc ? visitorDoc.count : 0;

        res.json({
            success: true,
            registrations: {
                total: totalRegistrations,
                pending: pendingRegistrations,
                revenue: totalRevenue
            },
            pitches: {
                total: totalPitches,
                selected: selectedPitches,
                under_review: underReviewPitches,
                revenue: pitchRevenue
            },
            totalRevenue: totalRevenue + pitchRevenue,
            visitors: visitors
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});


// ==========================================
// API: ADMIN — UPDATE PITCH STATUS
// ==========================================
app.put('/api/admin/pitches/:id', adminAuth, async (req, res) => {
    try {
        const { reviewStatus, reviewNotes } = req.body;

        // Get old pitch first to check status
        const oldPitch = await Pitch.findById(req.params.id);
        if (!oldPitch) return res.status(404).json({ error: 'Pitch not found' });

        const oldStatus = oldPitch.reviewStatus;

        const pitch = await Pitch.findByIdAndUpdate(
            req.params.id,
            { reviewStatus, reviewNotes },
            { new: true }
        );

        // Send email notification non-blocking
        sendPitchStatusEmail(pitch, oldStatus);

        res.json({ success: true, data: pitch });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update pitch' });
    }
});


// ==========================================
// API: ADMIN — GET PITCH DECK DOWNLOAD URL
// ==========================================
app.get('/api/admin/pitch-download/:id', adminAuth, async (req, res) => {
    try {
        const pitch = await Pitch.findById(req.params.id);
        if (!pitch || !pitch.pitchDeckKey) {
            return res.status(404).json({ error: 'Pitch deck not found' });
        }

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: pitch.pitchDeckKey
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.json({ success: true, url: signedUrl });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get download URL' });
    }
});


// ==========================================
// API: ADMIN — GET SINGLE PITCH DETAILS
// ==========================================
app.get('/api/admin/pitches/:id', adminAuth, async (req, res) => {
    try {
        const pitch = await Pitch.findById(req.params.id);
        if (!pitch) return res.status(404).json({ error: 'Pitch not found' });
        res.json({ success: true, data: pitch });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch pitch details' });
    }
});


// ==========================================
// API: GET REGISTRATION COUNT (Public)
// ==========================================
app.get('/api/registration-count', async (req, res) => {
    try {
        const count = await Registration.countDocuments({ status: 'confirmed' });
        res.json({ count: count + 132 }); // base + actual
    } catch (err) {
        res.json({ count: 132 });
    }
});


// ==========================================
// API: TRACK VISITOR (Public)
// ==========================================
app.post('/api/track-visit', async (req, res) => {
    try {
        let visitor = await Visitor.findOne();
        if (!visitor) {
            visitor = new Visitor({ count: 1 });
        } else {
            visitor.count += 1;
        }
        await visitor.save();
        res.json({ success: true, visitors: visitor.count });
    } catch (err) {
        res.json({ success: false });
    }
});


// ==========================================
// SERVE ADMIN PAGE
// ==========================================
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// ==========================================
// START SERVER
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 AI Future Workshop 2026 Server`);
        console.log(`📡 Running on http://localhost:${PORT}`);
        console.log(`🔑 Admin Panel: http://localhost:${PORT}/admin\n`);
    });
}

// Export app for Vercel Serverless Function
module.exports = app;
