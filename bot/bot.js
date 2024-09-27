const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in the environment variables');
}

const bot = new TelegramBot(token, { polling: true });

const users = {};

const MINING_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const BASE_MINING_POWER = 0.001;

function getUser(userId) {
  if (!users[userId]) {
    users[userId] = { balance: 0, miningPower: BASE_MINING_POWER, lastMined: 0, walletAddress: null };
  }
  return users[userId];
}

function formatHTC(amount) {
  return amount.toFixed(8);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  getUser(userId); // Initialize user data

  const welcomeMessage = `
Welcome to HackerMiner, l33t h4x0r! 🕵️‍♂️💻

You've entered the dark web of cryptocurrency mining. Here's what you can do:

/mine - Start mining HTC
/upgrade - Upgrade your mining rig
/balance - Check your HTC balance
/leaderboard - See top hackers
/connect_wallet - Connect your crypto wallet
/miniapp - Open the HackerMiner mini-app

Stay low, mine high! 🚀
  `;

  const mainMenuKeyboard = {
    reply_markup: {
      keyboard: [
        [{ text: '🖥️ Mine HTC' }, { text: '⚡ Upgrade Rig' }],
        [{ text: '💰 Check Balance' }, { text: '🏆 Leaderboard' }],
        [{ text: '🔗 Connect Wallet' }, { text: '🕹️ Open Mini-App' }]
      ],
      resize_keyboard: true
    }
  };

  bot.sendMessage(chatId, welcomeMessage, mainMenuKeyboard);
});

bot.onText(/\/mine|🖥️ Mine HTC/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const user = getUser(userId);
  const now = Date.now();

  if (now - user.lastMined < MINING_COOLDOWN) {
    const remainingTime = Math.ceil((MINING_COOLDOWN - (now - user.lastMined)) / 1000);
    bot.sendMessage(chatId, `Whoa there, h4x0r! Your rig needs to cool down. Try again in ${remainingTime} seconds.`);
    return;
  }

  const minedAmount = user.miningPower * (1 + Math.random());
  user.balance += minedAmount;
  user.lastMined = now;

  const miningMessage = `
🖥️ Mining complete, you 1337 h4x0r!

Mined: ${formatHTC(minedAmount)} HTC
Current Balance: ${formatHTC(user.balance)} HTC

Keep mining to become the ultimate crypto lord!
  `;

  bot.sendMessage(chatId, miningMessage);
});

bot.onText(/\/upgrade|⚡ Upgrade Rig/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const user = getUser(userId);
  const upgradeCost = user.miningPower * 1000;
  const upgradeKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: `Upgrade (Cost: ${formatHTC(upgradeCost)} HTC)`, callback_data: 'upgrade_confirm' }],
        [{ text: 'Cancel', callback_data: 'upgrade_cancel' }]
      ]
    }
  };

  const upgradeMessage = `
⚡ Rig Upgrade Available ⚡

Current Mining Power: ${formatHTC(user.miningPower)} HTC/mine
Upgrade Cost: ${formatHTC(upgradeCost)} HTC
New Mining Power: ${formatHTC(user.miningPower * 1.5)} HTC/mine

Do you want to proceed with the upgrade?
  `;

  bot.sendMessage(chatId, upgradeMessage, upgradeKeyboard);
});

bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const userId = callbackQuery.from.id;
  const user = getUser(userId);

  if (callbackQuery.data === 'upgrade_confirm') {
    const upgradeCost = user.miningPower * 1000;
    if (user.balance >= upgradeCost) {
      user.balance -= upgradeCost;
      user.miningPower *= 1.5;
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Upgrade successful! Your rig is now more powerful.' });
      bot.sendMessage(chatId, `Upgrade complete! New mining power: ${formatHTC(user.miningPower)} HTC/mine`);
    } else {
      bot.answerCallbackQuery(callbackQuery.id, { text: 'Not enough HTC for the upgrade. Keep mining!' });
    }
  } else if (callbackQuery.data === 'upgrade_cancel') {
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Upgrade cancelled.' });
  }
});

bot.onText(/\/balance|💰 Check Balance/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const user = getUser(userId);
  const balanceMessage = `
💰 Wallet Status 💰

HTC Balance: ${formatHTC(user.balance)} HTC
Mining Power: ${formatHTC(user.miningPower)} HTC/mine
${user.walletAddress ? `Connected Wallet: ${user.walletAddress}` : 'No wallet connected'}

Keep stacking those HackerCoins, crypto ninja!
  `;

  bot.sendMessage(chatId, balanceMessage);
});

bot.onText(/\/leaderboard|🏆 Leaderboard/, (msg) => {
  const chatId = msg.chat.id;

  const sortedUsers = Object.entries(users)
    .sort(([, a], [, b]) => b.balance - a.balance)
    .slice(0, 5);

  let leaderboardMessage = '🏆 Top 5 Crypto Lords 🏆\n\n';
  sortedUsers.forEach(([userId, user], index) => {
    leaderboardMessage += `${index + 1}. User${userId}: ${formatHTC(user.balance)} HTC\n`;
  });

  leaderboardMessage += '\nCan you hack your way to the top?';

  bot.sendMessage(chatId, leaderboardMessage);
});

bot.onText(/\/connect_wallet|🔗 Connect Wallet/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const user = getUser(userId);

  if (user.walletAddress) {
    bot.sendMessage(chatId, `Your wallet is already connected: ${user.walletAddress}`);
  } else {
    bot.sendMessage(chatId, 'To connect your wallet, please enter your wallet address:');
    bot.once('message', (response) => {
      if (response.text) {
        user.walletAddress = response.text;
        bot.sendMessage(chatId, `Wallet connected successfully: ${user.walletAddress}`);
      }
    });
  }
});

bot.onText(/\/miniapp|🕹️ Open Mini-App/, (msg) => {
  const chatId = msg.chat.id;
  
  const miniAppUrl = 'https://your-deployed-mini-app-url.com'; // Replace with your actual mini-app URL
  
  const miniAppButton = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🕹️ Open HackerMiner Mini-App', web_app: { url: miniAppUrl } }]
      ]
    }
  };

  bot.sendMessage(chatId, 'Ready to take your hacking skills to the next level? Open our HackerMiner mini-app!', miniAppButton);
});

app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
