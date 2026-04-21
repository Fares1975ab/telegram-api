const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==========================================
// إعدادات CORS - السماح بالاتصال من أي مصدر
// ==========================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ==========================================
// قراءة الإعدادات من متغيرات البيئة
// ==========================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const TARGET_GROUP_ID = process.env.TARGET_GROUP_ID;

// التحقق من وجود الإعدادات
if (!BOT_TOKEN || !TARGET_GROUP_ID) {
    console.error('❌ خطأ: BOT_TOKEN أو TARGET_GROUP_ID غير موجود في .env');
    process.exit(1);
}

console.log('✅ الخادم يعمل مع المجموعة:', TARGET_GROUP_ID);

// ==========================================
// الصفحة الرئيسية - GET
// ==========================================
app.get('/', (req, res) => {
    res.send('✅ خادم منصة الأستاذ فارس يعمل!<br>استخدم POST /api/verify-access للتحقق من العضوية');
});

// ==========================================
// دالة التحقق من توقيع Telegram WebApp
// ==========================================
function verifyTelegramWebAppData(telegramInitData) {
    if (!telegramInitData) return false;
    
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    return calculatedHash === hash;
}

// ==========================================
// API التحقق من العضوية - POST
// ==========================================
app.post('/api/verify-access', async (req, res) => {
    const { initData } = req.body;
    
    // 1. التحقق من صحة البيانات
    if (!initData) {
        return res.status(400).json({ error: 'بيانات مفقودة' });
    }
    
    if (!verifyTelegramWebAppData(initData)) {
        return res.status(401).json({ error: 'بيانات غير صالحة' });
    }
    
    try {
        // 2. استخراج معرف المستخدم
        const urlParams = new URLSearchParams(initData);
        const userData = JSON.parse(urlParams.get('user'));
        const userId = userData.id;
        
        console.log('🔍 التحقق من المستخدم:', userId);
        
        // 3. التحقق من عضوية المستخدم في المجموعة
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
            params: {
                chat_id: TARGET_GROUP_ID,
                user_id: userId
            },
            timeout: 10000 // مهلة 10 ثواني
        });
        
        const status = response.data.result?.status;
        console.log('📊 حالة العضوية:', status);
        
        // 4. التحقق من الحالة
        const allowedStatuses = ['member', 'administrator', 'creator'];
        
        if (allowedStatuses.includes(status)) {
            return res.json({
                success: true,
                user: {
                    id: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                    username: userData.username
                }
            });
        } else {
            return res.status(403).json({
                error: 'لست عضواً في المجموعة',
                status: status
            });
        }
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        
        if (error.response?.data?.error_code === 400) {
            return res.status(404).json({ error: 'المستخدم غير موجود في المجموعة' });
        }
        
        return res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// ==========================================
// تشغيل الخادم
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🔗 الرابط: http://localhost:${PORT}`);
});
