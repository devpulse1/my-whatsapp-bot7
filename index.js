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
يطرد الأعضاء كاملين

👢 طرد
منشن عضو باش يطردو

🚫 منع
منع السبان والكلام المسيء

✅ رفع المنع
فتح السبان

🔗 روابط
منع الروابط

🔓 فتح الروابط
فتح الروابط

📤 إرسال
منع الصور والفيديوهات والملفات والستكرز

📥 فتح الإرسال
فتح إرسال الميديا

📱 جهاز اتصال
رفض المكالمات

📊 حالة
شوف حالة الحمايات

👑 المطور
معلومات المطور

⚙️ اوامر
إظهار صورة البوت والأوامر

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
  return /(https?:\/\/|www\.|t\.me\/|wa\.me\/|chat\.whatsapp\.com)/i.test(text)
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
    browser: Browsers.macOS('Google Chrome'),
    printQRInTerminal: false
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

        // منع السبان
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

        // منع الروابط
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

        // منع الميديا
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

        // الأوامر
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

        // منع السبان
        if (command === 'منع') {

          if (!isOwner) return

          antiBadWords = true

          await sock.sendMessage(from, {
            text:
              '🚫 تم تفعيل منع السبان والكلام المسيء.'
          })

          return
        }

        // فتح السبان
        if (
          command === 'رفع المنع' ||
          command === 'فتح المنع'
        ) {

          if (!isOwner) return

          antiBadWords = false

          await sock.sendMessage(from, {
            text:
              '✅ تم فتح السبان.'
          })

          return
        }

        // منع الروابط
        if (command === 'روابط') {

          if (!isOwner) return

          antiLinks = true

          await sock.sendMessage(from, {
            text:
              '🔗 تم تفعيل منع الروابط.'
          })

          return
        }

        // فتح الروابط
        if (
          command === 'فتح الروابط' ||
          command === 'رفع الروابط'
        ) {

          if (!isOwner) return

          antiLinks = false

          await sock.sendMessage(from, {
            text:
              '✅ تم فتح الروابط.'
          })

          return
        }

        // منع الميديا
        if (
          command === 'إرسال' ||
          command === 'ارسال'
        ) {

          if (!isOwner) return

          antiMedia = true

          await sock.sendMessage(from, {
            text:
              '📤 تم تفعيل منع الصور والفيديوهات والملفات والستكرز.'
          })

          return
        }

        // فتح الميديا
        if (
          command === 'فتح الإرسال' ||
          command === 'فتح الارسال' ||
          command === 'رفع الإرسال'
        ) {

          if (!isOwner) return

          antiMedia = false

          await sock.sendMessage(from, {
            text:
              '📥 تم فتح إرسال الصور والفيديوهات والملفات والستكرز.'
          })

          return
        }

        // طرد عضو
        if (command === 'طرد') {

          if (!isGroup || !isOwner) return

          const mentioned =
            msg.message
              ?.extendedTextMessage
              ?.contextInfo
              ?.mentionedJid

          if (
            !mentioned ||
            mentioned.length === 0
          ) {

            await sock.sendMessage(from, {
              text:
                '⚠️ منشن العضو اللي بغيتي تطرد.'
            })

            return
          }

          await sock.groupParticipantsUpdate(
            from,
            mentioned,
            'remove'
          )

          await sock.sendMessage(from, {
            text:
              '👢 تم طرد العضو.'
          })

          return
        }

        // مح المجموعة
        if (command === 'مح') {

          if (!isGroup || !isOwner) return

          const metadata =
            await sock.groupMetadata(from)

          const botJid =
            sock.user.id.split(':')[0] +
            '@s.whatsapp.net'

          const otherAdmins =
            metadata.participants
              .filter(p =>
                p.admin &&
                p.id !== OWNER_JID &&
                p.id !== botJid
              )
              .map(p => p.id)

          if (otherAdmins.length > 0) {

            await sock.groupParticipantsUpdate(
              from,
              otherAdmins,
              'demote'
            )
          }

          const usersToRemove =
            metadata.participants
              .map(p => p.id)
              .filter(id =>
                id !== OWNER_JID &&
                id !== botJid
              )

          if (usersToRemove.length > 0) {

            await sock.groupParticipantsUpdate(
              from,
              usersToRemove,
              'remove'
            )
          }

          await sock.sendMessage(from, {
            text:
`🧹 تم تنفيذ أمر مح.

👑 بقيتي أنت بوحدك المالك
🛡️ تحيدات صلاحيات الأدمن الآخرين
🚫 تطردو الأعضاء الآخرين`
          })

          return
        }

        // حالة البوت
        if (command === 'حالة') {

          await sock.sendMessage(from, {
            text:
`📊 حالة 𝐆𝐮𝐬𝐭𝐚𝐯𝐨:

🚫 منع السبان: ${antiBadWords ? 'مفعل ✅' : 'مغلق ❌'}

🔗 منع الروابط: ${antiLinks ? 'مفعل ✅' : 'مغلق ❌'}

📤 منع الميديا: ${antiMedia ? 'مفعل ✅' : 'مغلق ❌'}`
          })

          return
        }

        // المطور
        if (command === 'المطور') {

          await sock.sendMessage(from, {
            text:
`👑 مطور 𝐆𝐮𝐬𝐭𝐚𝐯𝐨

🤖 البوت: 𝐆𝐮𝐬𝐭𝐚𝐯𝐨
🔥 الحالة: خدام
⚙️ النظام: WhatsApp Bot`
          })

          return
        }

        // أمر تغيير البوت
        if (
          command.includes('بوت') &&
          (
            command.includes('غير') ||
            command.includes('اخر') ||
            command.includes('آخر')
          )
        ) {

          await sock.sendMessage(from, {
            text:
              '❌ سير تقود 😂 هادا ديال 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 بوحدو 🔥'
          })

          return
        }

      } catch (error) {

        console.log(
          '❌ وقع خطأ:',
          error.message
        )
      }
    }
  )
}

startBot()
