require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const DATA_FILE = 'dataGalaktika.json';

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        return {};
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// /find command to search by exact name or surname
bot.onText(/\/find (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1].toLowerCase();
    const data = readData();

    const students = Object.values(data).filter(student => 
        student.isRegistered && 
        (student.name.toLowerCase() === query || student.surname.toLowerCase() === query)
    );

    if (students.length === 0) {
        bot.sendMessage(chatId, "Hech qanday o'quvchi topilmadi!");
        return;
    }

    let response = `Topilgan o'quvchilar:\n`;
    students.forEach((student, index) => {
        response += `${index + 1}. ${student.name} ${student.surname} - ${student.subject} - Room ${student.room}\n`;
    });

    bot.sendMessage(chatId, response);
});

// /count command to display the number of registered students
bot.onText(/\/count/, (msg) => {
    const chatId = msg.chat.id;
    const data = readData();
    const studentCount = Object.values(data).filter(student => student.isRegistered).length;

    bot.sendMessage(chatId, `Royxatdan o'tganlar soni: ${studentCount}`);
});

// /start command and callback_query events
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const data = readData();

    if (!data[chatId]) {
        data[chatId] = {};
    }

    bot.sendMessage(chatId, "Ismingizni kiriting:")
        .then(sentMessage => {
            bot.once('message', (msg) => {
                const name = msg.text;
                data[chatId].name = name;

                bot.deleteMessage(chatId, sentMessage.message_id);
                bot.deleteMessage(chatId, msg.message_id);

                bot.sendMessage(chatId, `Assalamu alaykum ${name}, familiyangizni kiriting:`)
                    .then(sentMessage => {
                        bot.once('message', (msg) => {
                            const surname = msg.text;
                            data[chatId].surname = surname;

                            saveData(data);

                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, msg.message_id);

                            bot.sendMessage(chatId, "Fanlaringizni tanlang:", {
                                reply_markup: {
                                    inline_keyboard: [
                                        [{ text: "Matematika & Fizika", callback_data: "Matematika & Fizika" }],
                                        [{ text: "Matematika & Ingliz-tili", callback_data: "Matematika & Ingliz-tili" }],
                                        [{ text: "Kimyo & Biologiya", callback_data: "Kimyo & Biologiya" }]
                                    ]
                                }
                            });
                        });
                    });
            });
        });
});

bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const subject = callbackQuery.data;
    const data = readData();

    data[message.chat.id].subject = subject;

    bot.deleteMessage(message.chat.id, message.message_id);

    bot.sendMessage(message.chat.id, "Xona raqamingizni kiriting:")
        .then(sentMessage => {
            bot.once('message', (msg) => {
                const room = msg.text;
                data[msg.chat.id].room = room;
                data[msg.chat.id].isRegistered = true;

                saveData(data);

                bot.deleteMessage(msg.chat.id, sentMessage.message_id);
                bot.deleteMessage(msg.chat.id, msg.message_id);

                bot.sendMessage(msg.chat.id, "Ro'yxatdan o'tganingiz uchun rahmat!");
            });
        });
});

console.log('Bot is running...');
