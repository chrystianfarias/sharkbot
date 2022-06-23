const { Client, LocalAuth } = require('whatsapp-web.js');
const EventsCommands = require('./commands/eventsCommands');
const MembersCommands = require('./commands/membersCommands');
const MainCommands = require('./commands/mainCommands');

global.client = new Client({
    ffmpegPath: "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    authStrategy: new LocalAuth({
      clientId: "client-one"
    }),
    puppeteer: {
      headless: false,
    }
  });

client.on('ready', async () => {
    console.log('Client is ready!');
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