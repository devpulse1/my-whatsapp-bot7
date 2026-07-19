const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys')

const pino = require('pino')

const PHONE_NUMBER = '212621268935'

const IMAGE_URL =
  'https://i.ibb.co/279Hyr1f/7d787b74955692d2e6909b6c45d705ed.jpg'

const OWNER_JID = `${PHONE_NUMBER}@s.whatsapp.net`

let antiBadWords = false
let antiLinks = false
let antiMedia = false

const badWords = [
  'زب',
  'زبي',
  'قحبة',
  'قحب',
  'كلوة',
  'كحبة',
  'نيك',
  'منيك',
  'شرموط',
  'شرموطة',
  'fuck',
  'shit'
]

const menuText = `
╭━━━〔 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 〕━━━╮

📌 الأوامر:

🧹 مح
↳ يحيد الأدمن الآخرين
↳ يطرد الأعضاء كاملين
↳ كيبقى المالك والبوت

👢 طرد
↳ منشن عضو باش يطردو

🚫 منع
↳ منع السبان والكلام المسيء

🔗 روابط
↳ منع الروابط

📤 إرسال
↳ منع الصور والفيديوهات والملفات والستكرز

📱 جهاز اتصال
↳ رفض المكالمات

⚙️ اوامر
↳ إظهار صورة البوت والأوامر

╰━━━━━━━━━━━━━━━━━━╯
`

function getText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  )
}

function hasBadWord(text) {
  const lower = text.toLowerCase()
  return badWords.some(word => lower.includes(word))
}

function hasLink(text) {
  return text.includes('http://') ||
    text.includes('https://') ||
    text.includes('www.') ||
    text.includes('t.me/') ||
    text.includes('wa.me/') ||
    text.includes('chat.whatsapp.com')
}

function isMedia(msg) {
  return Boolean(
    msg.message?.imageMessage ||
    msg.message?.videoMessage ||
    msg.message?.documentMessage ||
    msg.message?.stickerMessage ||
    msg.message?.audioMessage
  )
}

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Google Chrome')
  })

  sock.ev.on('creds.update', saveCreds)

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code =
          await sock.requestPairingCode(PHONE_NUMBER)

        console.log('')
        console.log('==============================')
        console.log('🔐 كود الربط ديال 𝐆𝐮𝐬𝐭𝐚𝐯𝐨:')
        console.log(code)
        console.log('==============================')
        console.log('')
      } catch (error) {
        console.log('❌ خطأ فـ كود الربط:', error.message)
      }
    }, 3000)
  }

  sock.ev.on(
    'connection.update',
    ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log('✅ 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 خدام بنجاح')
      }

      if (connection === 'close') {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut

        if (shouldReconnect) {
          console.log('🔄 إعادة الاتصال...')
          startBot()
        } else {
          console.log('🚪 الحساب تسجل الخروج')
        }
      }
    }
  )

  sock.ev.on('call', async calls => {
    for (const call of calls) {
      try {
        await sock.rejectCall(call.id, call.from)
      } catch (error) {
        console.log('❌ خطأ فرفض المكالمة')
      }
    }
  })

  sock.ev.on(
    'messages.upsert',
    async ({ messages }) => {
      try {
        const msg = messages[0]

        if (!msg?.message) return
        if (msg.key.fromMe) return

        const from = msg.key.remoteJid
        const sender =
          msg.key.participant || from

        const text = getText(msg)
        const command =
          text.trim().toLowerCase()

        const isGroup =
          from.endsWith('@g.us')

        const isOwner =
          sender === OWNER_JID

        if (
          isGroup &&
          antiBadWords &&
          !isOwner &&
          hasBadWord(text)
        ) {
          await sock.sendMessage(from, {
            delete: msg.key
          })

          await sock.sendMessage(from, {
            text:
              '🚫 السبان والكلام المسيء ممنوع.'
          })

          return
        }

        if (
          isGroup &&
          antiLinks &&
          !isOwner &&
          hasLink(text)
        ) {
          await sock.sendMessage(from, {
            delete: msg.key
          })

          await sock.sendMessage(from, {
            text:
              '🔗 الروابط ممنوعة.'
          })

          return
        }

        if (
          isGroup &&
          antiMedia &&
          !isOwner &&
          isMedia(msg)
        ) {
          await sock.sendMessage(from, {
            delete: msg.key
          })

          await sock.sendMessage(from, {
            text:
              '📤 إرسال الصور والفيديوهات والملفات والستكرز ممنوع.'
          })

          return
        }

        if (
          command === 'اوامر' ||
          command === 'أوامر'
        ) {
          await sock.sendMessage(from, {
            image: {
              url: IMAGE_URL
            },
            caption: menuText
          })

          return
        }

        if (command
