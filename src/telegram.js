const TeleBot = require('telebot');
const web3 = require('web3');

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

class Telegram {
  constructor() {
    this.bot = new TeleBot(token);
    this.chatId = chatId;
    this.bot.start();
  }

  async sendMessage(data) {
    // const message = this.processData(data);
    // data ? await this.bot.sendMessage(this.chatId, message) : null;
    await this.bot.sendMessage(this.chatId, data);
  }
}

module.exports = Telegram;
