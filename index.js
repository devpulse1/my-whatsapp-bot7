const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')

// ===============================
// إعدادات 𝐆𝐮𝐬𝐭𝐚𝐯𝐨
// ===============================

const PHONE_NUMBER = '212621268935'

const IMAGE_URL =
  'https://i.ibb.co/279Hyr1f/7d787b74955692d2e6909b6c45d705ed.jpg'

const OWNER_JID = `${PHONE_NUMBER}@s.whatsapp.net`

// ===============================
// الحماية
// ===============================

let antiBadWords = false
let antiLinks = false
let antiMedia = false

const badWords = [
  'زب',
  'زبي',
  'قحبة',
  'قحب',
  'كحبة',
  'كحبة',
  'نيك',
  'منيك',
  'شرموط',
  'شرموطة',
  'fuck',
  'shit'
]

// ===============================
// قائمة الأوامر
// ===============================

const menuText = `
╭━━━〔 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 〕━━━╮

📌 الأوامر:

🧹 مح
↳ يحيد الأعضاء كاملين من المجموعة
↳ كيبقى المالك بوحدو أدمن

👢 طرد
↳ طرد العضو المشار إليه بالرد على رسالته

🚫 منع
↳ تشغيل / إيقاف منع السب والكلام المسيء

🔗 روابط
↳ تشغيل / إيقاف منع الروابط

📵 ميديا
↳ تشغيل / إيقاف منع الصور والفيديوهات

📊 الحالة
↳ عرض حالة الحماية

🏓 ping
↳ اختبار البوت

🤖 bot
↳ معلومات 𝐆𝐮𝐬𝐭𝐚𝐯𝐨

👋 سلام
↳ تحية

╰━━━━━━━━━━━━━━━━━━╯
`

// ===============================
// أدوات مساعدة
// ===============================

function isGroup(jid) {
  return jid.endsWith('@g.us')
}

function getText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  )
}

function getMentionedJid(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
    null
  )
}

function getQuotedParticipant(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    null
  )
}

function hasLink(text) {
  return /(https?:\/\/|www\.|t\.me\/|wa\.me\/|chat\.whatsapp\.com\/)/i.test(
    text
  )
}

function containsBadWord(text) {
  const lower = text.toLowerCase()
  return badWords.some(word => lower.includes(word.toLowerCase()))
}

// ===============================
// تشغيل البوت
// ===============================

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('𝐆𝐮𝐬𝐭𝐚𝐯𝐨'),
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  // ===============================
  // ربط بالكود
  // ===============================

  if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER)
      console.log('==============================')
      console.log('🔑 كود الربط ديال 𝐆𝐮𝐬𝐭𝐚𝐯𝐨:')
      console.log(code)
      console.log('==============================')
    } catch (error) {
      console.log('❌ خطأ في كود الربط:', error.message)
    }
  }

  // ===============================
  // حالة الاتصال
  // ===============================

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 خدام مزيان 🔥')
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      if (shouldReconnect) {
        console.log('🔄 كنعاود نربط...')
        setTimeout(() => startBot(), 3000)
      } else {
        console.log('❌ الحساب تسجل الخروج')
      }
    }
  })

  // ===============================
  // استقبال الرسائل
  // ===============================

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]

      if (!msg?.message) return
      if (msg.key.fromMe) return

      const from = msg.key.remoteJid
      const text = getText(msg).trim()
      const command = text.toLowerCase()

      const group = isGroup(from)

      let metadata = null
      let sender = msg.key.participant || msg.key.remoteJid

      if (group) {
        metadata = await sock.groupMetadata(from)
      }

      const admins = group
        ? metadata.participants
            .filter(p => p.admin)
            .map(p => p.id)
        : []

      const isAdmin = admins.includes(sender)
      const isOwner = sender === OWNER_JID

      // ===============================
      // الحماية من السب
      // ===============================

      if (
        group &&
        antiBadWords &&
        !isAdmin &&
        !isOwner &&
        containsBadWord(text)
      ) {
        await sock.sendMessage(from, {
          delete: msg.key
        })

        await sock.sendMessage(from, {
          text: '🚫 ممنوع السب والكلام المسيء هنا.'
        })

        return
      }

      // ===============================
      // الحماية من الروابط
      // ===============================

      if (
        group &&
        antiLinks &&
        !isAdmin &&
        !isOwner &&
        hasLink(text)
      ) {
        await sock.sendMessage(from, {
          delete: msg.key
        })

        await sock.sendMessage(from, {
          text: '🔗 ممنوع إرسال الروابط هنا.'
        })

        return
      }

      // ===============================
      // الأمر: اوامر
      // ===============================

      if (
        command === 'اوامر' ||
        command === 'أوامر' ||
        command === 'menu'
      ) {
        await sock.sendMessage(from, {
          image: {
            url: IMAGE_URL
          },
          caption: menuText
        })

        return
      }

      // ===============================
      // الأمر: سلام
      // ===============================

      if (
        command === 'سلام' ||
        command === 'salam' ||
        command === 'hello'
      ) {
        await sock.sendMessage(from, {
          text: 'وعليكم السلام خويا 🤖🔥\n𝐆𝐮𝐬𝐭𝐚𝐯𝐨 خدام مزيان!'
        })

        return
      }

      // ===============================
      // الأمر: ping
      // ===============================

      if (command === 'ping') {
        await sock.sendMessage(from, {
          text: '🏓 Pong!\n\n🤖 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 خدام ✅'
        })

        return
      }

      // ===============================
      // الأمر: bot
      // ===============================

      if (command === 'bot') {
        await sock.sendMessage(from, {
          text: `
🤖 الاسم: 𝐆𝐮𝐬𝐭𝐚𝐯𝐨
⚡ الحالة: Online
🔥 النظام: WhatsApp Bot
✅ خدام مزيان
          `
        })

        return
      }

      // ===============================
      // أوامر الإدارة خاصها مجموعة
      // ===============================

      if (
        ['مح', 'طرد', 'منع', 'روابط', 'ميديا', 'الحالة'].includes(command) &&
        !group
      ) {
        await sock.sendMessage(from, {
          text: '❌ هاد الأمر خدام غير فالمجموعات.'
        })

        return
      }

      // ===============================
      // الأمر: مح
      // يحيد الأعضاء كاملين
      // ويبقى المالك بوحدو أدمن
      // ===============================

      if (command === 'مح') {
        if (!isOwner) {
          await sock.sendMessage(from, {
            text: '❌ غير مالك البوت يقدر يستعمل هاد الأمر.'
          })

          return
        }

        const toDemote = metadata.participants
          .filter(p => p.admin && p.id !== OWNER_JID)
          .map(p => p.id)

        const toRemove = metadata.participants
          .filter(p => p.id !== OWNER_JID)
          .map(p => p.id)

        if (toDemote.length > 0) {
          await sock.groupParticipantsUpdate(
            from,
            toDemote,
            'demote'
          )
        }

        if (toRemove.length > 0) {
          await sock.groupParticipantsUpdate(
            from,
            toRemove,
            'remove'
          )
        }

        await sock.sendMessage(from, {
          text: '🧹 تم تنظيف المجموعة.\n👑 بقى المالك بوحدو أدمن.'
        })

        return
      }

      // ===============================
      // الأمر: طرد
      // بالرد على رسالة العضو
      // ===============================

      if (command === 'طرد') {
        if (!isAdmin && !isOwner) {
          await sock.sendMessage(from, {
            text: '❌ خاصك تكون أدمن.'
          })

          return
        }

        const target =
          getQuotedParticipant(msg) ||
          getMentionedJid(msg)

        if (!target) {
          await
