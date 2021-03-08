const TeleBot = require('telebot');

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

class Telegram {
  constructor() {
    this.bot = new TeleBot(token);
    this.chatId = chatId;
    this.bot.start();
  }

  async sendMessage(data) {
    await this.bot.sendMessage(this.chatId, data);
  }
}

module.exports = Telegram;
