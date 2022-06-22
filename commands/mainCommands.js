const { List } = require('whatsapp-web.js');
const EventsController = require('../controllers/EventsController');
const MemberController = require('../controllers/membersController');

const maintenance = false;
const testers = [];//["554884891617@c.us", "554896380303@c.us"]

const proccessMessage = async (msg, chat) => {
    const member = await MemberController.get(msg.from);
    if (msg.body.includes("!sticker"))
    {
        if(msg.hasMedia) {
            const media = await msg.downloadMedia();
            chat.sendMessage(media, {sendMediaAsSticker: true });
        }
        else
        {
            msg.reply("Manda a foto, arrombado.");
        }
        return 0;
    }
    if (chat.isGroup) {
        const mentions = await msg.getMentions();
        if (mentions.length == 1)
        {
            if (mentions[0].isMe)
            {
                if (msg.body.includes("participantes "))
                {
                    const search = msg.body.split("participantes ")[1];
                    const event = await EventsController.searchEvent(search);
                    if (event)
                    {
                        await EventsController.showPresenceList(msg, event.id, true);
                    }
                    else
                    {
                        msg.reply("Evento não localizado");
                    }
                }
            }
        }
        
        if(msg.body === '!todos') {
            const senderContact = await msg.getContact();
            const member = getMember(senderContact.number.split("@")[0]);
            let text = "";
            let mentions = [];
            if (member.role == "admin")
            {
    
                for(let participant of chat.participants) {
                    const contact = await client.getContactById(participant.id._serialized);
                    
                    mentions.push(contact);
                    text += `@${participant.id.user} `;
                }
        
                await chat.sendMessage(text, { mentions });
            }
            else
            {
                msg.reply("Você não é ADM");
            }
        }
        const quote = await msg.getQuotedMessage();
        if (quote)
        {
            if (msg.body.toLowerCase() == "quero ir")
            {
                if (replyMsg[quote.id])
                {
                    const senderContact = await msg.getContact();
                    const member = await MemberController.get(senderContact.number);
                    const confirm = await MemberController.confirmPresence(msg, member, {id: replyMsg[quote.id]});
                    msg.reply(`✅ Presença confirmada ${member.name}`);
                }
                else
                {
                    msg.reply("O tempo pra responder a essa pergunta expirou, me chama no privado para confirmar.");
                }
            }
        }
        return;
    }
    else {
        if (maintenance)
        {
            //Beta tester
            if (testers.includes(msg.from) == false)
            {
                client.sendMessage(msg.from, "⚠️ bot em manutenção!");
                return 0;
            }
        }
        if (currentChat[msg.from] == undefined && msg.type != "list_response")
            mainMenu(msg, member);
        return 0;
}
    return 1;
};

const mainMenu = (msg, member) => {
    const admCommands = member.role == "admin" ? [
        {
            title: 'Comandos de Administrador',
            rows:[
                {
                    id: "members_itm",
                    title: "👥 Membros",
                    description: "Exibir lista de membros"
                }
            ]
        }
    ] : [];
    client.sendMessage(msg.from, 
        new List("Aqui estão alguns comandos para você", 
        "Ver comandos", 
        [
            {
                rows:
                [
                    {
                        id:'events_itm',
                        title:'📆 Eventos',
                        description: 'Exibir lista de eventos'
                    }
                ]
            },
            ...admCommands
        ], `Olá ${member.name}! 😁`));
}

module.exports = proccessMessage;