const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// ⚠️ ضع التوكن الخاص ببوتك بين علامتي التنصيص هنا
const BOT_TOKEN = '8763640214:AAHn1NPSgNhfz4NgVrW9GAplPjR4aWn5fzQ'; 

// معرف مجموعتك الذي استخرجناه سابقاً
const TARGET_GROUP_ID = '-1003380136352'; 
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

app.post('/api/verify-access', async (req, res) => {
    const { initData } = req.body;
    if (!verifyTelegramWebAppData(initData)) return res.status(401).json({ error: 'بيانات غير صالحة' });
    try {
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(urlParams.get('user'));
        const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
            params: { chat_id: TARGET_GROUP_ID, user_id: user.id }
        });
        const status = response.data.result.status;
        if (['member', 'administrator', 'creator'].includes(status)) return res.json({ success: true });
        else return res.status(403).json({ error: 'لست عضواً' });
    } catch (error) {
        return res.status(500).json({ error: 'خطأ خادم' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));