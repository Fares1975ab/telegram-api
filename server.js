const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// تخزين التوكنز
const activeTokens = new Set();

// مسار المجلد الذي يحتوي على ملفاتك (مجلد public الموجود في الصورة)
const publicDir = path.join(__dirname, 'public');

// ==========================================
// 1. المسارات المفتوحة (التي يجب أن يصل إليها الطالب بدون توكن)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/web-content.json', (req, res) => res.sendFile(path.join(publicDir, 'web-content.json')));
app.get('/database.js', (req, res) => res.sendFile(path.join(publicDir, 'database.js')));

// السماح بفتح الصور بشكل طبيعي (إذا لم تكن تريد تشفير الصور)
app.use('/image', express.static(path.join(publicDir, 'image')));
app.use('/images', express.static(path.join(publicDir, 'images')));


// ==========================================
// 2. مسار توليد التوكن (للـ Iframe)
// ==========================================
app.get('/api/get-token', (req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    activeTokens.add(token);
    
    // التوكن يختفي بعد 10 دقائق
    setTimeout(() => activeTokens.delete(token), 10 * 60 * 1000);
    res.json({ token });
});


// ==========================================
// 3. نظام الحماية (Middleware)
// ==========================================
const iframeProtection = (req, res, next) => {
    const { token } = req.query;
    const referer = req.headers.referer || req.headers.origin;

    if (!token || !activeTokens.has(token)) {
        return res.status(403).send('<h1 style="color:red; text-align:center;">Access Denied: Invalid Token ❌</h1>');
    }

    if (!referer || !referer.includes(req.get('host'))) {
        return res.status(403).send('<h1 style="color:red; text-align:center;">Access Denied: Direct Access Not Allowed ❌</h1>');
    }

    next();
};


// ==========================================
// 4. حماية مجلدات الدروس (السنة الأولى، الثانية، البكالوريا)
// ==========================================
// أي ملف داخل هذه المجلدات لن يفتح إلا إذا اجتاز اختبار iframeProtection
app.use('/1as', iframeProtection, express.static(path.join(publicDir, '1as')));
app.use('/2as', iframeProtection, express.static(path.join(publicDir, '2as')));
app.use('/bacs', iframeProtection, express.static(path.join(publicDir, 'bacs')));


// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
