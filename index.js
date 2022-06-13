const { Buttons, Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const client = new Client();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
    console.log('Client is ready!');
});

const getMembers = () => {
    let rawdata = fs.readFileSync('members.json');
    return JSON.parse(rawdata);
}
const getMember = (number) => {
    let members = getMembers();
    return members.find(m => m.number == number);
}
const eventStringify = (event) => {
    return `*EVENTO*\n\n${event.name}\nData: ${event.date}\nLocal: ${event.local}`;
}
const confirmPresence = (member, event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.confirmed.push(member.number);
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const cancelPresence = (member, event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.confirmed.filter(n => n !== member.number);
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const memberInEvent = (member, event) => {
    return event.confirmed.find(con => con == member.number) != undefined;
}
const notificateAllMembers = (event) => {
    let members = getMembers();
    let eventString = eventStringify(event);
    members.forEach(async member => {
        let inEvent = memberInEvent(member, event);
        if (inEvent == false)
        {
            var _phoneId = await client.getNumberId(member.number)
            var _isValid = await client.isRegisteredUser(_phoneId._serialized)
            if(_isValid) {
                client.sendMessage(_phoneId._serialized, `Olá ${member.name}! Evento novo do SharkRunners`);
                client.sendMessage(_phoneId._serialized, eventString);
                client.sendMessage(_phoneId._serialized, `Digite 1 para *confirmar presença*\nDigite 2 para negar a presença.`);
                currentChat[_phoneId._serialized] = "event_response";
            }
            else
            {
                console.error(`O número do ${member.name} é invalido! (${member.number})`);
            }
        }
    });
}
const listPresences = (member) => {
    const events = getEvents();
    var msg = "*LISTA DE PRESENÇA*\n";
    for(var i=0; i<events.length; i++)
    {
        const event = events[i];
        const confirmed = event.confirmed.find(con => con == member.number) != undefined;
        msg += "\n- " + event.name + " " + (confirmed ? "✅ Confirmado!" : "❌ Não confirmado");
    }
    return msg;
}
const getEvents = () => {
    const eventsDir = fs.readdirSync("events");
    var events = []
    for(var i=0; i<eventsDir.length; i++)
    {
        const event = JSON.parse(fs.readFileSync("events/" + eventsDir[i]));
        events.push(event);
    }
    return events;
}
const listEvents = () => {
    var eventsList = "*EVENTOS*";
    var events = getEvents();
    for(var i=0; i<events.length; i++)
    {
        eventsList += "\n" + (i+1) + " - " + events[i].name;
    }
    return eventsList;
}

var currentChat = {}
var createEvent = {}
var currentEvent = {}

const adminCommands = msg => {
    const member = getMember(msg.from.split("@")[0]);
    if (msg.body == "!notificar evento")
    {
        if (member.isAdmin)
        {
            currentChat[msg.from] = "select_notify_event";
            client.sendMessage(msg.from, `Olá ${member.name}!`);
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Desculpe, você não tem autorização para criar um evento");
        }
        return;
    }
    if (msg.body == "!criar evento")
    {
        if (member.isAdmin)
        {
            currentChat[msg.from] = "create_event_name";
            client.sendMessage(msg.from, `Olá ${member.name}!`);
            client.sendMessage(msg.from, "Qual seria o nome do evento?");
        }
        else
        {
            msg.reply("Desculpe, você não tem autorização para criar um evento");
        }
        return;
    }

    //Create event
    if (currentChat[msg.from] == "create_event_name")
    {
        createEvent.name = msg.body;
        client.sendMessage(msg.from, "Certo, e a data?");
        currentChat[msg.from] = "create_event_date";
        return;
    }
    if (currentChat[msg.from] == "create_event_date")
    {
        createEvent.date = msg.body;
        client.sendMessage(msg.from, "OK, o local?");
        currentChat[msg.from] = "create_event_local";
        return;
    }
    if (currentChat[msg.from] == "create_event_local")
    {
        createEvent.local = msg.body;
        createEvent.id = uuidv4();
        createEvent.confirmed = [];
        client.sendMessage(msg.from, "Evento criado, deseja novitificar todos os membros?\n1 - para SIM\n2 - para NÃO");
        currentChat[msg.from] = "create_event_notificate";
        fs.writeFileSync("events/" + createEvent.id + ".json", JSON.stringify(createEvent));
        return;
    }
    if (currentChat[msg.from] == "create_event_notificate")
    {
        if (msg.body == "1")
        {
            notificateAllMembers(createEvent)
            client.sendMessage(msg.from, "Notificado!");
            currentChat[msg.from] = undefined;
        }
        else if (msg.body == "2")
        {
            client.sendMessage(msg.from, "Certo.");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite:\n1 - para SIM\n2 - para NÃO");
        }
        return;
    }
    //Notify event
    if (currentChat[msg.from] == "select_notify_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        if (events[selectedId + 1])
        {
            createEvent = events[selectedId + 1];
            client.sendMessage(msg.from, "Membros notificados!");
            notificateAllMembers(createEvent);
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
    }
}
const mainCommands = msg => {
    if (currentChat[msg.from] == undefined)
    {
        const member = getMember(msg.from.split("@")[0]);
        if (member)
        {
            client.sendMessage(msg.from, `Olá ${member.name}!`);
            client.sendMessage(msg.from, `O que você deseja?\n\n1 - Lista de eventos\n2 - Minhas presenças`);
            if (member.isAdmin)
            {
                client.sendMessage(msg.from, "Vi também que você é ADM, aqui alguns comandos:\n\n!criar evento - Criar evento\n!notificar evento - Notificar todos os membros de um evento");
            }
            currentChat[msg.from] = "main_response";
        }
        else
        {
            client.sendMessage(msg.from, `Olá, você não está na lista de membros, converse com um administrador.`);
        }
        return;
    }
    //Main
    if (currentChat[msg.from] == "main_response")
    {
        const member = getMember(msg.from.split("@")[0]);
        if (msg.body == "1")
        {
            client.sendMessage(msg.from, listEvents());
            currentChat[msg.from] = "main_select_event";
        }
        else if (msg.body == "2")
        {
            client.sendMessage(msg.from, listPresences(member));
            client.sendMessage(msg.from, "Para confirmar a presença em um evento, vá até a lista de eventos no menu principal.");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi");
            currentChat[msg.from] = undefined;
        }
        return;
    }
    if (currentChat[msg.from] == "main_select_event")
    {
        const member = getMember(msg.from.split("@")[0]);
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        if (events[selectedId + 1])
        {
            currentEvent[msg.from] = events[selectedId + 1];
            client.sendMessage(msg.from, eventStringify(currentEvent[msg.from]));
            const confirmed = currentEvent[msg.from].confirmed.find(con => con == member.number) != undefined;
            
            if (confirmed)
            {
                client.sendMessage(msg.from, "Você já está confirmado nesse evento, deseja cancelar?\n\n1 - para SIM\n2 - para NÃO");
                currentChat[msg.from] = "main_select_event_cancel_presence";
            }
            else
            {
                client.sendMessage(msg.from, "Você não está confirmado nesse evento, deseja participar?\n\n1 - para SIM\n2 - para NÃO");
                currentChat[msg.from] = "main_select_event_confirm_presence";
            }
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    if (currentChat[msg.from] == "main_select_event_confirm_presence")
    {
        const member = getMember(msg.from.split("@")[0]);
        if (msg.body == "1")
        {
            confirmPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, "OK, Cancelado!");
            currentChat[msg.from] = undefined;
        }
        else if (msg.body == "2")
        {
            client.sendMessage(msg.from, "bele!");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite:\n1 - para SIM\n2 - para NÃO");
        }
        return;
    }
    if (currentChat[msg.from] == "main_select_event_cancel_presence")
    {
        const member = getMember(msg.from.split("@")[0]);
        if (msg.body == "1")
        {
            cancelPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, "OK, Cancelado!");
            currentChat[msg.from] = undefined;
        }
        else if (msg.body == "2")
        {
            client.sendMessage(msg.from, "bele!");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite:\n1 - para SIM\n2 - para NÃO");
        }
        return;
    }
    //Event presence
    if (currentChat[msg.from] == "event_response")
    {
        if (msg.body == "1")
        {
            const member = getMember(msg.from.split("@")[0]);
            confirmPresence(member, createEvent);
            client.sendMessage(msg.from, "Certo, bom evento!");
            currentChat[msg.from] = undefined;
        }
        else if (msg.body == "2")
        {
            client.sendMessage(msg.from, "Então vai tomar no cu 💓");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite:\n1 - para SIM\n2 - para NÃO");
        }
        return;
    }
}
const proccessMessage = msg => {
    adminCommands(msg);
    mainCommands(msg);
}

client.on('message', proccessMessage);

client.initialize();