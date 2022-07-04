const { Client, LocalAuth } = require('whatsapp-web.js');
const EventsCommands = require('./commands/eventsCommands');
const MembersCommands = require('./commands/membersCommands');
const MainCommands = require('./commands/mainCommands');

global.client = new Client({
    puppeteer: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  });

client.on('ready', async () => {
  console.log('Client is ready!');
});
client.on('qr', qr => {
  console.log("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qr));
});

global.currentChat = {}
global.replyMsg = {}
global.lastMsg = {}

const proccessMessage = async msg => {
    let chat = await msg.getChat();
    if (EventsCommands(msg, chat) == 0)
        return;
    if (MembersCommands(msg, chat) == 0)
        return;
    if (MainCommands(msg, chat) == 0)
        return;
}

client.on('message', proccessMessage);

client.initialize();
console.log("initializing...");