const TelegramApi = require("node-telegram-bot-api")

const token = "6600542342:AAGx9B70LnNMUjKGPt_3Yvm3ATeMZrqtQCg"

const bot = new TelegramApi(token, {polling: true})

bot.on("message", msg=>{
    const text = msg.text;
    const chatId = msg.chat.id;

    function word(text){
        text = text.replace("?", '');
        return text.split(" ").reverse()[0]
    }

    bot.sendMessage(chatId, `Cам ти ${word(text)}.`);
    console.log(msg)
})