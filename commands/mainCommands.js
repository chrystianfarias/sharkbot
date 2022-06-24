const { List } = require('whatsapp-web.js');
const EventsController = require('../controllers/EventsController');
const MemberController = require('../controllers/membersController');

const maintenance = false;
const testers = ["554884891617@c.us", "554896380303@c.us"]

const proccessMessage = async (msg, chat) => {
    const member = await MemberController.get(msg.from);
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
                    return 0;
                }
                if (msg.body.includes("localização "))
                {
                    const search = msg.body.split("localização ")[1];
                    const event = await EventsController.searchEvent(search);
                    if (event)
                    {
                        await EventsController.showLocation(event.id, msg, chat);
                    }
                    else
                    {
                        msg.reply("Evento não localizado");
                    }
                    return 0;
                }
                if (msg.body.includes("evento "))
                {
                    const search = msg.body.split("evento ")[1];
                    const event = await EventsController.searchEvent(search);
                    if (event)
                    {
                        await EventsController.showEvent(event.id, msg, chat);
                    }
                    else
                    {
                        msg.reply("Evento não localizado");
                    }
                    return 0;
                }
                if (msg.body.includes("eventos"))
                {
                    await EventsController.showEvents(msg, chat);
                    return 0;
                }
                if(msg.hasMedia) {
                    const media = await msg.downloadMedia();
                    chat.sendMessage(media, {sendMediaAsSticker: true });
                    return 0;
                }
                msg.reply("Cara, não entendi o que tu quer");
                return 0;
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
        {
            if (lastMsg[msg.from])
            {
                const spam = Date.now() - lastMsg[msg.from];
                if (spam < 10000)
                    return 0;
            }
            mainMenu(msg, member);
            lastMsg[msg.from] = Date.now();
        }
        return 0;
}
    return 1;
};

const mainMenu = (msg, member) => {
    if (member.role == "unk")
    {
        client.sendMessage(msg.from, "Olá, você não está cadastrado como membro ou convidado do *SharkRunners*, por favor, entre em contato com um administrador.");
        return 1;
    }
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