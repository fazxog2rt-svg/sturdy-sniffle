const { Client, LocalAuth, MessageMedia, Poll } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const puter = require('@heyputer/puter.js');
const googleTTS = require('google-tts-api');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// HABIB BOT V7.5 (MEGA UPDATE & STABLE)
process.on('unhandledRejection', (r) => { });
process.on('uncaughtException', (e) => { console.log('Bot tetap tegak meski badai menerpa. 💪'); });

let db = { users: {}, global: { totalSholawat: 0, lastUpdate: new Date().toLocaleDateString() }, groups: {} };
let games = {};

// Database Loading
try {
    if (fs.existsSync('./database.json')) {
        const data = JSON.parse(fs.readFileSync('./database.json'));
        db.users = data.users || {};
        db.global = data.global || { totalSholawat: 0, lastUpdate: new Date().toLocaleDateString() };
        db.groups = data.groups || {};
    }
} catch (e) { console.log('Database loading error...'); }

function saveDB() {
    try { fs.writeFileSync('./database.json', JSON.stringify(db, null, 2)); } catch (e) { }
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
        protocolTimeout: 300000
    }
});

client.on('qr', (qr) => {
    console.log('--- SCAN QR NYA YA AKHI ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n====================================');
    console.log('   HABIB BOT V7.5 (MEGA UPDATE)     ');
    console.log('====================================\n');
    console.log('Bot WhatsApp SIAP DIGUNAKAN! 🚀');

    // Auto-Adzan Timer
    setInterval(async () => {
        try {
            const timeStr = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
            for (const [id, s] of Object.entries(db.groups)) {
                if (s && s.sholatSchedule) {
                    const j = s.sholatSchedule;
                    const times = { 'Subuh': j.subuh, 'Dzuhur': j.dzuhur, 'Ashar': j.ashar, 'Maghrib': j.maghrib, 'Isya': j.isya };
                    const name = Object.keys(times).find(k => times[k] === timeStr);
                    if (name) {
                        const chat = await client.getChatById(id);
                        await chat.sendMessage(`📢 *ALLAHU AKBAR!* Waktunya sholat *${name}* wilayah *${s.sholatCity}*. Mari tunaikan ibadah! 🕌`);
                    }
                }
            }

            // Global Sunnah Reminders (Hanya kirim sekali pada jam tertentu)
            const sunnahTimes = { '04:00': 'Tahajjud 🌙', '08:30': 'Dhuha ✨', '18:15': 'Membaca Al-Kahfi (Jika hari Jum\'at) 📖' };
            const sunnahMsg = sunnahTimes[timeStr];
            if (sunnahMsg) {
                console.log(`[SYS] Meluncurkan Reminder Sunnah: ${sunnahMsg}`);
                for (const [id] of Object.entries(db.groups)) {
                    if (timeStr === '18:15' && new Date().getDay() !== 5) continue;
                    const chat = await client.getChatById(id);
                    await chat.sendMessage(`✨ *REMINDER SUNNAH* ✨\n\nAkhi/Ukhti, jangan lupa untuk menunaikan ibadah *${sunnahMsg}*. Semoga berkah untuk kita semua! 🤲`);
                }
            }
        } catch (e) { }
    }, 60000);
});

client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        // Mendapatkan ID anggota yang baru bergabung
        const contact = await client.getContactById(notification.recipientIds[0]);
        
        const welcomeText = `Ahlan wa Sahlan @${contact.id.user}! 👋✨
        
Selamat datang di grup *${chat.name}*. 
        
Yuk kenalan dulu ya Akhi/Ukhti agar saling mengenal:
📝 Nama:
📍 Asal:
🎯 Tujuan:

Semoga betah di sini ya! Jaga lisan dan tetap santun sesuai aturan grup. 🙏`;
        
        await chat.sendMessage(welcomeText, { mentions: [contact.id._serialized] });
    } catch (e) { console.log('Error Welcome Message:', e); }
});

client.on('group_admin_changed', async (notification) => {
    try {
        if (notification.type === 'promote') {
            const chat = await notification.getChat();
            const contact = await client.getContactById(notification.recipientIds[0]);
            const text = `🎉 *MABRUK!* Selamat Akhi/Ukhti @${contact.id.user} atas amanah barunya sebagai *ADMIN* di grup *${chat.name}*. 
            
Semoga berkah dan bisa menjaga ketertiban grup dengan baik. Semangat khidmat ya! 💪🔥`;
            await chat.sendMessage(text, { mentions: [contact.id._serialized] });
        }
    } catch (e) { console.log('Error Admin Promote Message:', e); }
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();
        const body = msg.body.toLowerCase();
        const prefix = '/';
        const isCommand = msg.body.startsWith(prefix);
        const command = isCommand ? msg.body.slice(1).trim().split(/ +/)[0].toLowerCase() : null;
        const args = msg.body.trim().split(/ +/).slice(1);
        const userId = msg.from;
        const gid = chat.id._serialized;
        
        if (isCommand) console.log(`[EXEC] Command: ${command} from ${userId}`);
        
        // PENTING: Daftar nomor yang dianggap Owner/Super Admin
        const owners = ['6285280619005', '6285150288039', '213567601152204']; 
        const isOwner = owners.some(o => (msg.author || msg.from).includes(o)); 

        // Data Init (MEGA UPDATE V2.0)
        if (!db.users[userId]) db.users[userId] = { koin: 100, warnings: 0, xp: 0, level: 1, lastChat: 0, afk: { r: '', t: 0 } };
        if (chat.isGroup && !db.groups[gid]) db.groups[gid] = { sholatCity: '', warnings: {}, toxicWords: [], antilink: false };
        
        // Anti-Spam Check
        const now = Date.now();
        if (!isOwner && db.users[userId].lastChat > 0 && (now - db.users[userId].lastChat) < 2000) {
            return; // Balas diam-diam jika spam kurang dari 2 detik
        }
        db.users[userId].lastChat = now;

        // AFK Listener (Cek siapa yang dipanggil)
        if (msg.hasMentions) {
            const mentioned = await msg.getMentions();
            for (let m of mentioned) {
                const mid = m.id._serialized;
                if (db.users[mid] && db.users[mid].afk && db.users[mid].afk.t > 0) {
                    msg.reply(`💤 *PENGUMUMAN AFK!* \n@${m.id.user} sedang istirahat sejak ${(new Date(db.users[mid].afk.t)).toLocaleTimeString()}. \nAlasan: ${db.users[mid].afk.r}`, { mentions: [mid] });
                }
            }
        }
        // Matikan AFK jika yang bersangkutan chat
        if (db.users[userId].afk && db.users[userId].afk.t > 0) {
            db.users[userId].afk = { r: '', t: 0 };
            msg.reply(`👋 *Selamat Datang Kembali!* @${contact.id.user}, status AFK ana matikan ya.`, { mentions: [userId] });
        }

        // Game Answer Check
        if (chat.isGroup && games[gid]) {
            if (body.toLowerCase() === games[gid].jawaban.toLowerCase()) {
                db.users[userId].koin += 50; 
                db.users[userId].xp += 20; 
                saveDB();
                msg.reply(`✅ *BENAR!* Selamat @${contact.id.user}, ente dapat 🪙 50 Koin & 🔱 20 XP!`, { mentions: [userId] });
                delete games[gid]; return;
            }
        }

        if (!isCommand) {
            const addXp = Math.floor(Math.random() * 10) + 1;
            db.users[userId].xp += addXp;
            const requiredXp = db.users[userId].level * 100;
            if (db.users[userId].xp >= requiredXp) {
                db.users[userId].level++;
                db.users[userId].xp = 0;
                msg.reply(`🎊 *LEVEL UP!* Selamat @${contact.id.user}, ente naik ke *Level ${db.users[userId].level}* ! \n_Tetap aktif ya Akhi!_`, { mentions: [userId] });
            }
        }
        saveDB();

        // Sticker Maker (Send image with caption /sticker)
        if (command === 'sticker' || command === 's') {
            if (msg.hasMedia || (msg.hasQuotedMsg && (await msg.getQuotedMessage()).hasMedia)) {
                const target = msg.hasMedia ? msg : await msg.getQuotedMessage();
                const media = await target.downloadMedia();
                await chat.sendMessage(media, { sendMediaAsSticker: true, stickerAuthor: 'Habib Bot', stickerName: 'V7.5' });
            } else { msg.reply('Kirim/Balas gambar dengan caption */sticker* ya Akhi.'); }
        }

        else if (command === 'menu') {
            const menuText = `*🕋 HABIB BOT V7.5 (MEGA UPDATE) 🕋*

*🕌 FITUR ISLAMI:*
1️⃣ */setsholat [kota]* - Reminder Adzan
2️⃣ */quran [s:a]* - Ayat & Terjemahan
3️⃣ */play [no surah]* - Murottal (Audio)
4️⃣ */asmaulhusna* - 99 Nama Allah
5️⃣ */doa* - Doa harian acak
6️⃣ */sholawat* - Counter Sholawat
7️⃣ */hadits* - Hadits Arbain acak
8️⃣ */zikir* - Bacaan zikir pagi/petang

*✨ AI & CREATIVE:*
9️⃣ */ai [tanya]* - GPT-4 Asisten Habib
🔟 */draw [prompt]* - AI Generator Foto
1️⃣1️⃣ */sticker* - Gambar -> Sticker
1️⃣2️⃣ */tts [teks]* - Teks Jadi Voice Note (ID)

*📥 DOWNLOADER (VVIP):*
1️⃣3️⃣ */tt [link]* - TikTok (No Watermark)
1️⃣4️⃣ */ytmp3 [link]* - Audio YouTube

*🎮 FUN & UTILITY:*
1️⃣6️⃣ */cekkhodam [nama]* - Cek Khodam Viral
1️⃣7️⃣ */kuisislami* - Game Kuis Agama
1️⃣8️⃣ */quransearch [topik]* - Cari Ayat Al-Quran
1️⃣9️⃣ */confess [no]|[pesan]* - Menfess
2️⃣0️⃣ */hidetag [pesan]* - Tag All Group
2️⃣1️⃣ */info* - Info Spesifikasi Bot
2️⃣2️⃣ */jam* - Cek Waktu Saat Ini
2️⃣3️⃣ */ping* - Speed Test Bot

*👮 ADMIN ONLY:*
- */kick [tag]* | */add [no]*
- */promote [tag]* | */demote [tag]*

_Maki-maki = AUTO KICK!_ ⛔🛡️`;
            msg.reply(menuText);
        }

        else if (command === 'info') {
            const os = require('os');
            const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const infoText = `*🤖 INFO HABIB BOT 🤖*

*Platform:* ${os.platform()} ${os.arch()}
*RAM:* ${freeMem}GB / ${totalMem}GB
*Library:* whatsapp-web.js
*Engine:* Node.js ${process.version}
*Uptime:* ${(process.uptime() / 60 / 60).toFixed(2)} Jam

_Bot ini aktif 24/7 (Insya Allah)._`;
            msg.reply(infoText);
        }

        else if (command === 'owner') {
            msg.reply('👤 *OWNER BOT:* \n\nKaylendra Hadziq.k  & Fatmah Nabila. \nKontak: _Syukron katsiron sudah pakai bot ana!_');
        }

        else if (command === 'jam') {
            const time = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
            msg.reply(`🕒 *WAKTU WIB:* \n\nSaat ini pukul: *${time}*`);
        }

        else if (command === 'ping') {
            const start = Date.now();
            await msg.reply('Pong!');
            const end = Date.now();
            msg.reply(`⚡ Speed: *${end - start}ms*`);
        }

        else if (command === 'ai') {
            if (!args[0]) return msg.reply('Tanya apa Akhi?');
            try {
                const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(args.join(' '))}`);
                msg.reply(`🤖 *HABIB AI:* \n\n${res.data}`);
            } catch { msg.reply('Lagi error nih otaknya, coba lagi nanti.'); }
        }

        else if (command === 'tts' || command === 'bicara') {
            if (!args[0]) return msg.reply('Ketik teks yang mau ana suarakan Akhi!');
            try {
                const text = args.join(' ');
                const url = googleTTS.getAudioUrl(text, { lang: 'id', slow: false, host: 'https://translate.google.com' });
                const media = await MessageMedia.fromUrl(url, { unsafeMime: true });
                await client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
            } catch { msg.reply('Gagal buat voice note, teks kepanjangan mungkin?'); }
        }

        else if (command === 'quransearch' || command === 'cariayat') {
            if (!args[0]) return msg.reply('Cari topik apa? Contoh: */quransearch sabar*');
            try {
                msg.reply(`⏳ Mencari ayat tentang *${args.join(' ')}*...`);
                // Gunakan AI untuk mendapatkan referensi ayat yang relevan
                const prompt = `Cari satu ayat Al-Quran yang paling relevan tentang "${args.join(' ')}". Balas hanya dengan nomor surah dan nomor ayat saja dalam format "Surah:Ayat". (Contoh: "2:153")`;
                const aiRes = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
                const ref = aiRes.data.trim().match(/\d+:\d+/);
                if (ref) {
                    const [s, a] = ref[0].split(':');
                    const res = await axios.get(`https://equran.id/api/v2/surat/${s}`);
                    const ayat = res.data.data.ayat.find(v => v.nomorAyat == a);
                    msg.reply(`📖 *Hasil Pencarian Untuk: ${args.join(' ')}*\n\n*Surah ${res.data.data.namaLatin} Ayat ${a}:*\n\n${ayat.teksAr}\n\n_Artinya: ${ayat.teksIndonesia}_`);
                } else { throw new Error(); }
            } catch { msg.reply('Maaf Akhi, ana tidak menemukan ayat yang spesifik. Coba gunakan kata kunci lain (misal: sholat, zakat, sabar).'); }
        }

        else if (command === 'kuisislami') {
            if (!chat.isGroup) return msg.reply('Kuis cuma bisa di grup biar seru!');
            if (games[gid]) return msg.reply('Ada game yang lagi jalan, selesaikan dulu ya!');
            const kuisList = [
                { q: 'Siapakah Nabi yang memiliki gelar Khalilullah (Kekasih Allah)?', a: 'Ibrahim' },
                { q: 'Sebutkan rukun Islam yang kedua!', a: 'Sholat' },
                { q: 'Nama Surah terkecil dalam Al-Quran?', a: 'Al-Kautsar' },
                { q: 'Siapakah Sahabat Nabi yang dijuluki As-Siddiq?', a: 'Abu Bakar' },
                { q: 'Warna bendera Rasulullah SAW menurut kebanyakan riwayat?', a: 'Hitam' }
            ];
            const item = kuisList[Math.floor(Math.random() * kuisList.length)];
            games[gid] = { jawaban: item.a };
            msg.reply(`🕋 *KUIS ISLAMI* 🕋\n\n*PERTANYAAN:* \n${item.q}\n\n_Hadiah: 50 Koin & 20 XP!_ \nKetik jawabannya langsung di sini ya Akhi.`);
        }

        else if (command === 'quote') {
            try {
                const res = await axios.get('https://api.popcat.xyz/quote');
                if (res.data && res.data.quote) {
                    msg.reply(`📝 *RANDOM QUOTE:* \n\n"${res.data.quote}" \n\n— _${res.data.by}_`);
                } else {
                    const fallback = [
                        "Jangan berhenti bermimpi, karena mimpi adalah benih masa depan.",
                        "Kesuksesan berawal dari keputusan untuk mencoba.",
                        "Waktu adalah pedang, gunakanlah sebelum ia memotongmu."
                    ];
                    msg.reply(`📝 *RANDOM QUOTE:* \n\n"${fallback[Math.floor(Math.random() * fallback.length)]}"`);
                }
            } catch { msg.reply('Gagal ambil quote, coba lagi nanti ya Akhi.'); }
        }

        else if (command === 'draw') {
            if (!args[0]) return msg.reply('Mau gambar apa? (Gunakan bahasa Inggris)');
            try {
                msg.reply('⏳ Lagi ana lukis sebentar ya...');
                const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.join(' '))}`;
                const media = await MessageMedia.fromUrl(url);
                await chat.sendMessage(msg.from, media, { caption: `✅ Gambar untuk prompt: *${args.join(' ')}*` });
            } catch { msg.reply('Gagal melukis foto, coba prompt lain.'); }
        }

        else if (command === 'quran') {
            if (!args[0]) return msg.reply('Contoh: */quran 1:1* (Surah 1 Ayat 1)');
            try {
                const [s, a] = args[0].split(':');
                const res = await axios.get(`https://equran.id/api/v2/surat/${s}`);
                const ayat = res.data.data.ayat.find(v => v.nomorAyat == a);
                msg.reply(`📖 *Surah ${res.data.data.namaLatin} Ayat ${a}:*\n\n${ayat.teksAr}\n\n_Artinya: ${ayat.teksIndonesia}_`);
            } catch { msg.reply('Gagal cari ayat. Pastikan formatnya benar ya (Surah:Ayat).'); }
        }

        else if (command === 'asmaulhusna') {
            try {
                const res = await axios.get('https://api.aladhan.com/v1/asmaAlHusna');
                const random = res.data.data[Math.floor(Math.random() * res.data.data.length)];
                msg.reply(`✨ *${random.name}* (${random.transliteration})\nArtinya: *${random.en.meaning}*`);
            } catch { msg.reply('Gagal ambil data.'); }
        }

        else if (command === 'doa') {
            const doas = [
                { n: 'Doa Makan', t: 'Allahumma baarik lanaa fiimaa razaqtana wa qinaa \'adzaaban naar.', a: 'Ya Allah, berkahilah kami atas rezeki yang telah Engkau berikan...' },
                { n: 'Doa Bangun Tidur', t: 'Alhamdulillahil ladzi ahyana ba\'da ma amatana wa ilaihin nusyur', a: 'Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami...' }
            ];
            const d = doas[Math.floor(Math.random() * doas.length)];
            msg.reply(`🤲 *${d.n}*\n\n${d.t}\n\n_Artinya: ${d.a}_`);
        }

        else if (command === 'hadits') {
            msg.reply('📖 *Hadits Arbain:* \n"Sesungguhnya setiap amal perbuatan tergantung pada niatnya." (HR. Bukhari & Muslim)');
        }

        else if (command === 'zikir') {
            msg.reply('📿 *Zikir Pagi:* \n"Subhanallahi wa bihamdihi" (Maha Suci Allah dan Segala Puji bagi-Nya) - 100x.');
        }

        else if (command === 'tt' || command === 'tiktok') {
            if (!args[0]) return msg.reply('Mana link TikToknya?');
            try {
                msg.reply('⏳ Menjemput video TikTok...');
                const res = await axios.get(`https://www.tikwm.com/api/?url=${args[0]}`);
                const videoUrl = res.data.data.play;
                const media = await MessageMedia.fromUrl(videoUrl, { unsafeMime: true });
                await client.sendMessage(msg.from, media, { caption: `✅ Video Berhasil! \n👤: ${res.data.data.author.nickname}` });
            } catch { msg.reply('Gagal ambil video TikTok. Pastikan akun tidak privat.'); }
        }

        else if (command === 'rank' || command === 'level') {
            const u = db.users[userId];
            msg.reply(`👑 *PROFIL ANTUM:* \n\n👤 Nama: @${contact.id.user}\n🔱 Level: *${u.level}* \n✨ XP: *${u.xp}/${u.level * 100}* \n🪙 Koin: *${u.koin}*`, { mentions: [userId] });
        }

        else if (command === 'top' || command === 'leaderboard') {
            const top = Object.entries(db.users).sort((a,b) => b[1].level - a[1].level).slice(0, 5);
            let text = '🏆 *TOP 5 USTADZ TER-AKTIF:* \n\n';
            top.forEach((v, i) => text += `${i+1}. @${v[0].split('@')[0]} (Level ${v[1].level})\n`);
            msg.reply(text, { mentions: top.map(v => v[0]) });
        }

        else if (command === 'afk') {
            db.users[userId].afk = { r: args.join(' ') || 'Menghadap Kiblat', t: Date.now() };
            saveDB();
            msg.reply('✅ *Status AFK Aktif!* Ketik apa saja di grup untuk mematikan.');
        }

        else if (command === 'addtoxic') {
            if (!isOwner) return msg.reply('Cuma bos ana yang bisa!');
            if (!args[0]) return msg.reply('Tulis katanya ya Akhi!');
            db.groups[gid].toxicWords.push(args[0].toLowerCase());
            saveDB();
            msg.reply(`✅ Kata *${args[0]}* berhasil dicekal di grup ini.`);
        }

        else if (command === 'antilink') {
            if (!chat.isGroup) return msg.reply('Cuma bisa di grup!');
            if (!isOwner) {
                const author = msg.author || msg.from;
                const participants = chat.participants;
                const userPart = participants.find(p => p.id._serialized === author);
                if (!userPart || !userPart.isAdmin) return msg.reply('Ente bukan admin!');
            }
            
            if (!args[0]) return msg.reply('Gunakan: */antilink on* atau */antilink off*');
            if (args[0] === 'on') {
                db.groups[gid].antilink = true; saveDB();
                msg.reply('✅ *Antilink AKTIF!* Bot akan menendang siapa pun yang kirim link grup.');
            } else if (args[0] === 'off') {
                db.groups[gid].antilink = false; saveDB();
                msg.reply('✅ *Antilink MATI!*');
            } else { msg.reply('Pilih on atau off ya Akhi.'); }
        }

        else if (command === 'ytmp3') {
            if (!args[0]) return msg.reply('Mana link YouTube-nya?');
            msg.reply('⏳ Fitur ini memerlukan FFmpeg di server. Ana kirim linknya aja ya: https://ytmp3.li');
        }

        else if (command === 'cekkhodam') {
            const nama = args.join(' ') || contact.pushname;
            const list = ['Macan Putih', 'Noni Belanda', 'Kuntilanak Merah', 'Kodok Zunba', 'Sempak Berkarat', 'Gajah Bengkak', 'Naga Mas', 'Tuyul Racing', 'Kucing Oren', 'Jin Iprit', 'Elang Perkasa', 'Semut Gajah'];
            const random = list[Math.floor(Math.random() * list.length)];
            msg.reply(`🔮 *CEK KHODAM:* \n\nNama: *${nama}*\nKhodam: *${random}*\n\nStatus: _Aktif dan Siaga!_`);
        }

        else if (command === 'hidetag') {
            if (!chat.isGroup) return msg.reply('Cuma bisa di grup ya Akhi.');
            const participants = chat.participants;
            const mentions = participants.map(p => p.id._serialized);
            await chat.sendMessage(args.join(' ') || '📢 PENTING!', { mentions });
        }

        else if (command === 'terjemah' || command === 'translate') {
            if (!msg.hasQuotedMsg) return msg.reply('Tag pesan yang mau diterjemahin!');
            try {
                const q = await msg.getQuotedMessage();
                const res = await axios.get(`https://api.popcat.xyz/translate?to=id&text=${encodeURIComponent(q.body)}`);
                msg.reply(`🌍 *TERJEMAHAN:* \n${res.data.translated}`);
            } catch { msg.reply('Gagal terjemah.'); }
        }

        else if (command === 'poll' || command === 'poling') {
            const raw = args.join(' ').split('|');
            if (raw.length < 3) return msg.reply('Format: */poll Pertanyaan|Opsi1|Opsi2*');
            const [q, ...options] = raw;
            await client.sendMessage(msg.from, new Poll(q, options));
        }

        else if (command === 'logomaker' || command === 'logo') {
            if (!args[0]) return msg.reply('Ketik teks buat logonya!');
            msg.reply('🎨 Sedang mendesain logo...');
            try {
                const media = await MessageMedia.fromUrl(`https://api.v1.nayan-pramanik.site/logo/v1?text=${encodeURIComponent(args[0])}`);
                await client.sendMessage(msg.from, media, { caption: '✅ *Logo Selesai!*' });
            } catch { msg.reply('Gagal buat logo.'); }
        }

        else if (command === 'taaruf') {
            if (!chat.isGroup) return msg.reply('Khusus di grup Akhi.');
            const participants = chat.participants;
            const a = participants[Math.floor(Math.random() * participants.length)];
            const b = participants[Math.floor(Math.random() * participants.length)];
            msg.reply(`💞 *TAARUF ACAK:* \n\n@${a.id.user} ❤️ @${b.id.user} \n\nSemoga berjodoh sampai Jannah! Aamiin. 🤲`, { mentions: [a.id._serialized, b.id._serialized] });
        }

        else if (command === 'kick' || command === 'promote' || command === 'demote' || command === 'add') {
            if (!chat.isGroup) return msg.reply('Khusus grup!');
            
            // Ambil data terbaru
            const freshChat = await client.getChatById(gid);
            const participants = freshChat.participants;
            
            if (!participants || participants.length === 0) {
                return msg.reply('Gagal sinkronisasi anggota. Coba lagi sejenak.');
            }

            // Cara cerdas bandingkan ID (Hanya ambil nomor HP, buang :1, :2 dsb)
            const getPureId = (id) => {
                if (!id) return '';
                return id.split('@')[0].split(':')[0];
            };
            
            const senderId = msg.author || msg.from;
            const senderPureId = getPureId(senderId);
            const botPureId = getPureId(client.info.wid._serialized);

            console.log(`\n[DEBUG ADMIN]`);
            console.log(`Sender: ${senderId} -> Pure: ${senderPureId}`);
            console.log(`Bot: ${client.info.wid._serialized} -> Pure: ${botPureId}`);

            const userPart = participants.find(p => getPureId(p.id._serialized) === senderPureId);
            const botPart = participants.find(p => getPureId(p.id._serialized) === botPureId);

            if (userPart) console.log(`User found in participants! Admin: ${userPart.isAdmin}`);
            else console.log(`User NOT found in participants list!`);

            if (botPart) console.log(`Bot found in participants! Admin: ${botPart.isAdmin}`);
            else console.log(`Bot NOT found in participants list!`);

            // Jika dia Owner, maka otomatis lolos pengecekan Admin
            if (!isOwner) {
                if (!userPart || !userPart.isAdmin) return msg.reply('Ente bukan admin!');
            }
            
            if (!botPart || !botPart.isAdmin) return msg.reply('Ana belum jadi admin! Coba jadikan admin ulang agar bot tersinkron.');

            const targetContact = (await msg.getMentions())[0];
            if (!targetContact) return msg.reply('Tag orangnya dulu!');
            
            try {
                // Mencoba mendapatkan JID asli jika yang di-tag adalah LID
                const contact = await client.getContactById(targetContact.id._serialized);
                const finalTargetId = contact.id._serialized;

                if (command === 'kick') await freshChat.removeParticipants([finalTargetId]);
                if (command === 'promote') {
                    await freshChat.promoteParticipants([finalTargetId]);
                    const text = `🎉 *MABRUK!* Selamat Akhi/Ukhti @${contact.id.user} atas amanah barunya sebagai *ADMIN* di grup *${freshChat.name}*. \n\nSemoga berkah dan bisa menjaga ketertiban grup dengan baik. Semangat! 💪🔥`;
                    await freshChat.sendMessage(text, { mentions: [finalTargetId] });
                }
                if (command === 'demote') await freshChat.demoteParticipants([finalTargetId]);
                if (command === 'add') {
                    const target = args[0] ? args[0].replace(/\D/g, '') + '@c.us' : null;
                    if (!target) return msg.reply('Mana nomornya Akhi? (Gunakan format 628xxx)');
                    await freshChat.addParticipants([target]);
                }
                
                msg.reply('✅ Sukses!');
            } catch (err) {
                console.log('Error Admin Command:', err);
                msg.reply('❌ Gagal mengeksekusi perintah. Kemungkinan karena WhatsApp sedang update sistem ID (LID). Coba lakukan manual atau jadikan bot admin ulang.');
            }
        }

        else if (command === 'tebakgambar') {
            if (!chat.isGroup) return msg.reply('Cuma bisa di grup!');
            if (games[gid]) return msg.reply('Selesaikan dulu game yang tadi!');
            try {
                msg.reply('⏳ Menyiapkan soal...');
                const res = await axios.get('https://raw.githubusercontent.com/BochilTeam/database/master/games/tebakgambar.json');
                const gIdx = Math.floor(Math.random() * res.data.length);
                const item = res.data[gIdx];
                games[gid] = { jawaban: item.jawaban };
                const media = await MessageMedia.fromUrl(item.img);
                await client.sendMessage(msg.from, media, { caption: '🧩 *TEBAK GAMBAR!* \n\nApa jawaban dari gambar di atas? \n_Hadiah: 50 Koin & 20 XP_' });
            } catch { msg.reply('Gagal memulai game.'); }
        }

        else if (command === 'vnislami' || command === 'ceramah') {
            try {
                const vnItems = [
                    'https://github.com/ArielRazaq/Haikal-Base/raw/main/src/vn/ceramah1.mp3',
                    'https://github.com/ArielRazaq/Haikal-Base/raw/main/src/vn/ceramah2.mp3',
                    'https://github.com/ArielRazaq/Haikal-Base/raw/main/src/vn/sholawat.mp3'
                ];
                const lucky = vnItems[Math.floor(Math.random() * vnItems.length)];
                const response = await axios.get(lucky, { responseType: 'arraybuffer' });
                const media = new MessageMedia('audio/mp3', response.data.toString('base64'));
                await client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
            } catch { msg.reply('Gagal kirim VN.'); }
        }

        else if (command === 'play') {
            if (!args[0]) return msg.reply('Surah ke berapa? (1-114)');
            try {
                const res = await axios.get(`https://equran.id/api/v2/surat/${args[0]}`);
                msg.reply(`⏳ Menyiapkan audio: *${res.data.data.namaLatin}*...`);
                const audioUrl = res.data.data.audioFull['01'];
                const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(response.data, 'binary').toString('base64');
                const media = new MessageMedia('audio/mpeg', base64, 'murottal.mp3');
                await client.sendMessage(msg.from, media, { sendMediaAsDocument: response.data.byteLength > 10000000 });
            } catch { msg.reply('Gagal putar murottal.'); }
        }

        else if (command === 'setsholat') {
            if (!args[0]) return msg.reply('Ketik kotanya, contoh: */setsholat jakarta*');
            try {
                const res = await axios.get(`https://api.myquran.com/v1/sholat/kota/cari/${args[0]}`);
                const k = res.data.data[0];
                const j = (await axios.get(`https://api.myquran.com/v1/sholat/jadwal/${k.id}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`)).data.data.jadwal;
                db.groups[gid].sholatCity = k.lokasi;
                db.groups[gid].sholatSchedule = j;
                saveDB();
                msg.reply(`✅ *Reminder Adzan ${k.lokasi} Aktif!* 🕌\n\nJadwal hari ini:\nSubuh: ${j.subuh}\nDzuhur: ${j.dzuhur}\nAshar: ${j.ashar}\nMaghrib: ${j.maghrib}\nIsya: ${j.isya}`);
            } catch { msg.reply('Gagal cari kota.'); }
        }

        else if (command === 'sholawat') {
            db.global.totalSholawat++; saveDB();
            msg.reply(`📿 Sholawat terkumpul hari ini: *${db.global.totalSholawat}* \nAllahumma sholli 'ala sayyidina Muhammad.`);
        }

        else if (command === 'confess') {
            const raw = args.join(' ').split('|');
            if (raw.length < 2) return msg.reply('Format: */confess no|pesan* \nContoh: */confess 628xxx|Halo Ukhti*');
            let target = raw[0].trim().replace(/\D/g, '');
            if (!target.endsWith('@c.us')) target += '@c.us';
            await client.sendMessage(target, `💌 *MENFESS:* "${raw[1].trim()}" \n_Anonim via Habib Bot_ 🤐`);
            msg.reply('✅ Pesan rahasiamu sudah ana sampaikan!');
        }

        // Antilink Logic
        if (chat.isGroup && db.groups[gid].antilink && body.includes('chat.whatsapp.com')) {
            const author = msg.author || msg.from;
            const participants = chat.participants;
            const userPart = participants.find(p => p.id._serialized === author);
            
            // Jangan tendang admin atau owner
            if (userPart && !userPart.isAdmin && !isOwner) {
                await msg.delete(true);
                const botPart = participants.find(p => p.id._serialized === client.info.wid._serialized);
                if (botPart && botPart.isAdmin) {
                    msg.reply(`⛔ *LINK TERDETEKSI!* Maaf @${author.split('@')[0]} ana kick karena kirim link grup lain.`, { mentions: [author] });
                    setTimeout(() => chat.removeParticipants([author]), 2000);
                } else {
                    msg.reply(`⚠️ *LINK TERDETEKSI!* Ente kirim link tapi ana bukan admin, jadi cuma bisa ana hapus pesannya.`);
                }
                return;
            }
        }

        // Toxic Auto-Delete & Warn
        if (chat.isGroup) {
            const baseToxic = ['anjing', 'babi', 'ngentot', 'bangsat', 'goblok', 'memek', 'kontol', 'ajg', 'kntl', 'gblk', 'mmk', 'tolol', 'asu', 'bgst'];
            const customToxic = db.groups[gid].toxicWords || [];
            const toxic = [...baseToxic, ...customToxic];
            
            if (toxic.some(w => body.toLowerCase().includes(w))) {
                const author = msg.author || msg.from;
                if (!db.groups[gid].warnings) db.groups[gid].warnings = {};
                if (!db.groups[gid].warnings[author]) db.groups[gid].warnings[author] = 0;
                db.groups[gid].warnings[author]++; saveDB();
                await msg.delete(true);
                if (db.groups[gid].warnings[author] >= 3) {
                    msg.reply(`⛔ *SUDAH 3X PERINGATAN!* Maaf @${author.split('@')[0]} ana kick karena terlalu toxic.`, { mentions: [author] });
                    const botPart = chat.participants.find(p => p.id._serialized === client.info.wid._serialized);
                    if (botPart && botPart.isAdmin) setTimeout(() => chat.removeParticipants([author]), 2000);
                    db.groups[gid].warnings[author] = 0; saveDB();
                } else {
                    msg.reply(`⚠️ *TOXIC TERDETEKSI!* @${author.split('@')[0]} jangan kasar ya Akhi. Peringatan: ${db.groups[gid].warnings[author]}/3`, { mentions: [author] });
                }
                return;
            }
        }

        // Auto AI Chat (Simi)
        if (!isCommand && msg.body.length > 3 && (msg.body.includes('bot') || msg.body.includes('habib') || (msg.hasMentions && msg.body.includes(client.info.wid.user)))) {
            try {
                const aiRes = await puter.ai.chat(msg.body + " (Balas dengan gaya bahasa Habib yang ramah, sopan, dan singkat dalam bahasa Indonesia)");
                msg.reply(`🤖 *Habib AI:* \n${aiRes.toString()}`);
            } catch {
                try {
                    const res = await axios.get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(body)}&lc=id`);
                    if (res.data && res.data.success) msg.reply(`🤖 ${res.data.success}`);
                } catch {}
            }
        }

        // Basic Interaction
        if (body.toLowerCase() === 'halo' || body.toLowerCase() === 'hi' || body.toLowerCase() === 'assalamualaikum') {
            msg.reply('Walaikumsalam Akhi/Ukhti! Ketik */menu* buat liat fitur-fitur ana yang super lengkap.');
        } 


    } catch (e) { console.log(e); }
});

client.initialize();

// Render / Cloud Hosting Support (Port Binding)
app.get('/', (req, res) => {
    res.send('HABIB BOT V7.5 IS RUNNING... 🚀');
});

app.listen(port, () => {
    console.log(`Server sedang memantau port: ${port}`);
});
