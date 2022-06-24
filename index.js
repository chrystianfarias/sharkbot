const { Client, LocalAuth } = require('whatsapp-web.js');
const EventsCommands = require('./commands/eventsCommands');
const MembersCommands = require('./commands/membersCommands');
const MainCommands = require('./commands/mainCommands');
const qrcode = require('qrcode-terminal');

global.client = new Client({
    authStrategy: new LocalAuth({
      clientId: "client-one"
    }),
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
  qrcode.generate(qr, {small: true});
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