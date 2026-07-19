const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const ADMIN = "212621268935@s.whatsapp.net";
const BOT_NAME = "𝐆𝐮𝐬𝐭𝐚𝐯𝐨";

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log(`${BOT_NAME} خدام بنجاح ✅`);
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        startBot();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const command = text.trim().toLowerCase();

    const isAdmin = sender === ADMIN;

    if (command === "اوامر") {
      await sock.sendMessage(from, {
        text:
`╭━━━〔 ${BOT_NAME} 〕━━━╮

📌 الأوامر:

👋 ترحيب
🚫 منع
🧹 مح
👢 طرد
👢 طرد كولشي
🛡️ ادمين
🖼️ ستكرز
🌐 دارك ويب
📱 جهاز اتصال
🔗 روابط
⚙️ اوامر

╰━━━━━━━━━━━━╯`
      });
    }

    if (command === "ترحيب") {
      await sock.sendMessage(from, {
        text: "مرحبا بيك فالمجموعة 👋🔥"
      });
    }

    if (command === "طرد") {
      if (!isAdmin) {
        return sock.sendMessage(from, {
          text: "❌ غير Gustavo هو اللي يقدر يستعمل هاد الأمر."
        });
      }

      if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
        return sock.sendMessage(from, {
          text: "⚠️ منشن الشخص اللي بغيتي تطرد."
        });
      }

      const users =
        msg.message.extendedTextMessage.contextInfo.mentionedJid;

      await sock.groupParticipantsUpdate(from, users, "remove");

      await sock.sendMessage(from, {
        text: "👢 تم الطرد بنجاح."
      });
    }

    if (command === "طرد كولشي") {
      if (!isAdmin) {
        return sock.sendMessage(from, {
          text: "❌ هاد الأمر خاصو Gustavo."
        });
      }

      const metadata = await sock.groupMetadata(from);

      const users = metadata.participants
        .map(p => p.id)
        .filter(id => id !== ADMIN);

      if (users.length > 0) {
        await sock.groupParticipantsUpdate(
          from,
          users,
          "remove"
        );
      }

      await sock.sendMessage(from, {
        text: "👢 تم طرد الأعضاء."
      });
    }

    if (command === "ادمين") {
      if (!isAdmin) {
        return sock.sendMessage(from, {
          text: "❌ غير Gustavo يقدر يعطي صلاحيات الأدمن."
        });
      }

      const mentioned =
        msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentioned || mentioned.length === 0) {
        return sock.sendMessage(from, {
          text: "⚠️ منشن الشخص اللي بغيتي تعطيه الأدمن."
        });
      }

      await sock.groupParticipantsUpdate(
        from,
        mentioned,
        "promote"
      );

      await sock.sendMessage(from, {
        text: "🛡️ تم إعطاء صلاحيات الأدمن."
      });
    }

    if (command === "منع") {
      await sock.sendMessage(from, {
        text: "🚫 تم تفعيل المنع."
      });
    }

    if (command === "مح") {
      await sock.sendMessage(from, {
        text: "🧹 تم تنفيذ الأمر."
      });
    }

    if (command === "ستكرز") {
      await sock.sendMessage(from, {
        text: "🖼️ ستكرز ممنوعة فهاد المجموعة 🚫"
      });
    }

    if (command === "دارك ويب") {
      await sock.sendMessage(from, {
        text: "🌐 محتوى دارك ويب ممنوع 🚫"
      });
    }

    if (command === "جهاز اتصال") {
      await sock.sendMessage(from, {
        text: "📱 جهاز الاتصال ممنوع 🚫"
      });
    }

    if (command === "روابط") {
      await sock.sendMessage(from, {
        text: "🔗 الروابط ممنوعة 🚫"
      });
    }

    if (
      command.includes("بوت") &&
      command.includes("غير")
    ) {
      await sock.sendMessage(from, {
        text:
"❌ سير تقود 😂 هادا بوت ديال 𝐆𝐮𝐬𝐭𝐚𝐯𝐨 بوحدو 🔥"
      });
    }
  });
}

startBot();
