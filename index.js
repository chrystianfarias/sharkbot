const { Client, MessageMedia } = require('whatsapp-web.js');
const EventsCommands = require('./commands/eventsCommands');
const MembersCommands = require('./commands/membersCommands');
const MainCommands = require('./commands/mainCommands');
const MembersController = require('./controllers/membersController');
const EventsController = require('./controllers/eventsController');

//HTTP
const express = require('express');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;
let connected = false;
let qrCode = "Loading...";

app.use(cors());
app.use(bodyParser.json());

global.client = new Client({ 
    restartOnAuthFail: true,
    puppeteer: {
      args: [ 
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  });

client.on('ready', async () => {
  console.log('Client is ready!');
  connected = true;
});
client.on('qr', qr => {
  qrCode = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(qr);
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
app.post("/payReceive", async(req, res) => {
  const {memberId, eventId} = req.body;
  const member = await MembersController.getById(memberId);
  const event = await EventsController.getEvent(eventId);

  client.sendMessage(member.number + "@c.us", `${member.name}, seu pagamento para o evento ${event.name} foi *recebido*, valeu! ✅`);

  const webpImage = MessageMedia.fromFilePath('assets/stickers/hiago.webp');
  client.sendMessage(member.number + "@c.us", webpImage, { sendMediaAsSticker: true });

  return res.status(200).json({});
});
app.get("/connect", async(req, res) => {
  if (connected == false)
  {
    return res.send(`<img alt="qrcode" src="${qrCode}"/>`);
  }
  return res.send("Connected.");
});

server.listen(port, () =>
  console.log(`Server HTTP running on ${port}`),
);
module.exports = server;