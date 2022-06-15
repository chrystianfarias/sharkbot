const { Client, LocalAuth, Buttons } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { maxHeaderSize } = require('http');

const client = new Client({
    ffmpegPath: "/Applications/ffmpeg",
    authStrategy: new LocalAuth({
      clientId: "client-one"
    }),
    puppeteer: {
      headless: false,
    }
  });

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
    console.log('Client is ready!');
    const ver = await client.getWWebVersion();
});
const addMember = async(member) => {
    var members = getMembers();
    const existsMember = members.find(m => m.number == member.number);
    if (!existsMember)
    {
        members.push(member);
        fs.writeFileSync("members.json", JSON.stringify(members));
        
        var _phoneId = await client.getNumberId(member.number)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        var str = "membro";
        if (member.role == "moderador")
            str = "moderador";
        if (member.role == "admin")
            str = "ADM";
        if (member.role == "guest")
            str = "convidado";

        if (_isValid)
            client.sendMessage(_phoneId._serialized, `Olá ${member.name}, seu número foi cadastrado no bot do *SharkRunners* como ` + str);
    }
}
const banMember = (number) => {
    var members = getMembers();
    members = members.filter(m => m.number != number);
    fs.writeFileSync("members.json", JSON.stringify(members));
}
const getMembers = () => {
    let rawdata = fs.readFileSync('members.json');
    return JSON.parse(rawdata);
}
const getMember = (number) => {
    let members = getMembers();
    const member = members.find(m => m.number == number);
    if (member)
        return member;
    else
        return {
            name: number,
            number: number,
            role: "unknown"
        }
}
const formatTwoDecimal = (number) => {
    return number <= 9 ? "0" + number : number;
}
const eventStringify = (event) => {
    const date = new Date(event.date);
    return `*EVENTO*\n${event.name}\n📅 ${formatTwoDecimal(date.getDate())}/${formatTwoDecimal(date.getMonth())}/${formatTwoDecimal(date.getFullYear())}\n🕓 ${formatTwoDecimal(date.getHours())}:${formatTwoDecimal(date.getMinutes())}\n📍 ${event.local}`;
}
const checkinMemberPresence = async (member, event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.checkin.push(member.number);
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
    
    var _phoneId = await client.getNumberId(member.number)
    var _isValid = await client.isRegisteredUser(_phoneId._serialized)
    if(_isValid) {
        client.sendMessage(_phoneId._serialized, `Olá ${member.name}, seu check-in no evento '${event.name}' foi feito ✅`);
        currentChat[_phoneId._serialized] = "event_response";
        currentEvent[_phoneId._serialized] = event;
    }
    else
    {
        console.error(`O número do ${member.name} é invalido! (${member.number})`);
    }
}
const checkoutMemberPresence = (member, event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.checkin = currentEvent.checkin.filter(n => n !== member.number);
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const confirmPresence = (member, event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.confirmed.push(member.number);
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const cancelPresence = (member, event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.confirmed = currentEvent.confirmed.filter(n => n !== member.number);
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const memberInEvent = (member, event) => {
    return event.confirmed.find(con => con == member.number) != undefined;
}
const cancelEvent = (event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.canceled = true;
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const uncancelEvent = (event) => {
    var currentEvent = JSON.parse(fs.readFileSync("events/" + event.id + ".json"));
    currentEvent.canceled = false;
    fs.writeFileSync("events/" + event.id + ".json", JSON.stringify(currentEvent));
}
const getEventParticipants = (event) => {
    var msgParticipants = "*PARTICIPANTES* do evento '" + event.name + "':";
    for(var i=0; i<event.confirmed.length; i++)
    {
        const member = getMember(event.confirmed[i]);
        const present = event.checkin.includes(member.number);
        var guestStr = "";
        if (member.role == "guest")
        {
            const memberFriend = getMember(member.friend);
            guestStr = `(Convidado de ${memberFriend.name})`;
        }
        msgParticipants += `\n${i+1} - ${member.name} ${guestStr} ${present ? "✅ Presente" : ""}`;
        
    }
    return msgParticipants;
}
const notificateAllMembers = (event) => {
    let members = getMembers();
    let eventString = eventStringify(event);
    members.forEach(async member => {
        if (member.role == "guest")
            return;
        let inEvent = memberInEvent(member, event);
        if (inEvent == false)
        {
            var _phoneId = await client.getNumberId(member.number)
            var _isValid = await client.isRegisteredUser(_phoneId._serialized)
            if(_isValid) {
                client.sendMessage(_phoneId._serialized, `*Olá ${member.name}! Evento novo do SharkRunners*\n${eventString}\n\nVocê deseja comparecer? Digite *Sim* ou *Não*`);
                currentChat[_phoneId._serialized] = "event_response";
                currentEvent[_phoneId._serialized] = event;
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
        const eventDate = new Date(event.date);
        if (Date.now() < eventDate)
            events.push(event);
    }
    events = events.sort((a,b) => a.date < b.date);
    return events;
}
const listEvents = (isMember = true) => {
    var eventsList = "*EVENTOS*";
    var events = getEvents();
    for(var i=0; i<events.length; i++)
    {
        if (isMember == false)
            if (events[i].memberonly == true)
            {
                eventsList += `\n${i+1} - ~Evento para membros~`;
                continue;
            }
        const date = new Date(events[i].date);
        eventsList += `\n${i+1} - ${events[i].canceled ? "~" : ""}${events[i].name}, dia ${formatTwoDecimal(date.getDate())}/${formatTwoDecimal(date.getMonth())}/${formatTwoDecimal(date.getFullYear())} ${events[i].canceled ? "~ ❌ Cancelado" : ""}`;
    }
    return eventsList;
}
const afirmativeResponse = msg => {
    const responses = ["s", "sim", "ss", "uhm", "sin", "si", "uhum", "yes", "ahm", "aham"];
    var res = msg.body.toLowerCase();
    return responses.includes(res);
}
const negativeResponse = msg => {
    const responses = ["n", "nao", "ñ", "não", "no", "nop"];
    var res = msg.body.toLowerCase();
    return responses.includes(res);
}

var currentChat = {}
var currentEvent = {}

var createEvent = {}
var createMember = {}

var participateMessage = {}

const proccessMessage = async msg => {
    let chat = await msg.getChat();
    const member = getMember(msg.from.split("@")[0]);
    if (msg.body == "!ping")
    {
        chat.sendMessage(new Buttons("Teste",[{body: "btn1"}, {body: "btn2"}], "title", "footer"));
        return;
    }
    if (msg.body.includes("!sticker"))
    {
        if(msg.hasMedia) {
            const media = await msg.downloadMedia();
            // do something with the media data here
            chat.sendMessage(media, {sendMediaAsSticker: true });
        }
        else
        {
            msg.reply("Manda a foto, arrombado.");
        }
        return;
    }
    if (chat.isGroup) {
        if (msg.body.includes("!participantes"))
        {
            const eventName = msg.body.replace("!participantes ", "");
            const events = getEvents();
            const event = events.find(ev => ev.name.toLowerCase().includes(eventName.toLowerCase()));
            if (event)
            {
                msg.reply(getEventParticipants(event));
                const msgReply = await client.sendMessage(msg.from, "Quer participar desse evento? Responda essa mensagem com *Sim*");
                participateMessage[msgReply.id] = event;
            }
        }
        if (msg.body.includes("!evento"))
        {
            const eventName = msg.body.replace("!evento ", "");
            const events = getEvents();
            const event = events.find(ev => ev.name.toLowerCase().includes(eventName.toLowerCase()));
            if (event)
            {
                msg.reply(eventStringify(event));
            }
        }
        if (msg.body == "!atualizar membros")
        {
            const senderContact = await msg.getContact();
            const member = getMember(senderContact.number.split("@")[0]);
            if (member.role == "admin")
            {
                for(let participant of chat.participants) {
                    var con = await client.getContactById(participant.id._serialized);
                    addMember({
                        name: con.pushname ?? con.number + " (sem nome)",
                        number: con.number,
                        role: "member"
                    })
                }
                msg.reply("Membros atualizados no banco de dados do bot.");
            }
            else
            {
                msg.reply("Só para admins amiguinho.");
            }
        }
        if (msg.body.includes("!eventos"))
        {
            msg.reply(listEvents());
        }
        if (msg.body.includes("!locais"))
        {
            let rawdata = fs.readFileSync('places.json');
            const places = JSON.parse(rawdata);
            var msgStr = "*LUGARES DE EVENTOS*";
            for(var i=0; i<places.length; i++)
            {
                msgStr += `\n- ${places[i]}`;
            }
            msg.reply(msgStr);
        }
        if (msg.body.toLowerCase() == "!local aleatório" || msg.body.toLowerCase() == "!local aleatorio")
        {
            let rawdata = fs.readFileSync('places.json');
            const places = JSON.parse(rawdata);
            msg.reply(places[Math.floor(Math.random()*places.length)]);
        }
        if (msg.body.includes("!comandos"))
        {
            msg.reply("!evento [nome do evento]\n!participantes [nome do evento]\n!eventos\n!locais\n!local aleatório");
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
            if (afirmativeResponse(msg))
            {
                if (participateMessage[quote.id])
                {
                    const senderContact = await msg.getContact();
                    const member = getMember(senderContact.number.split("@")[0]);
                    const confirmed = participateMessage[quote.id].confirmed.find(con => con == member.number) != undefined;

                    if (confirmed)
                    {
                        msg.reply("Sua presença já foi confirmada.");
                        return;
                    }
                    confirmPresence(member, participateMessage[quote.id]);
                    msg.reply("Sua presença no evento foi confirmada " + member.name);
                }
                else
                {
                    msg.reply("O tempo pra responder a essa pergunta expirou, me chama no privado para confirmar.");
                }
            }
        }
        return;
    }

    if (msg.body == "!cancelar")
    {
        currentChat[msg.from] = undefined;
        client.sendMessage(msg.from, "OK, cancelado");
        return;
    }
    if (msg.body == "!notificar evento")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "select_notify_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para notificar um evento");
        }
        return;
    }
    if (msg.body == "!verificar evento")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "select_verify_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para notificar um evento");
        }
        return;
    }
    if (msg.body == "!checkin")
    {
        if (member.role == "admin" || member.role == "moderator")
        {
            currentChat[msg.from] = "checkin_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para fazer checkin");
        }
        return;
    }
    if (msg.body == "!checkout")
    {
        if (member.role == "admin" || member.role == "moderator")
        {
            currentChat[msg.from] = "checkout_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para fazer checkin");
        }
        return;
    }
    if (msg.body == "!cancelar evento")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "cancel_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para cancelar um evento");
        }
        return;
    }
    if (msg.body == "!descancelar evento")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "descancel_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para descancelar um evento");
        }
        return;
    }
    if (msg.body == "!criar evento")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "create_event_name";
            createEvent = {};
            client.sendMessage(msg.from, "Qual seria o nome do evento?");
        }
        else
        {
            msg.reply("Você não tem autorização para criar um evento");
        }
        return;
    }
    if (msg.body == "!editar evento")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "edit_event";
            client.sendMessage(msg.from, "Qual seria o evento?");
            client.sendMessage(msg.from, listEvents());
        }
        else
        {
            msg.reply("Você não tem autorização para editar um evento");
        }
        return;
    }
    //Add member
    if (msg.body == "!add membro")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "add_member_name";
            createMember = {};
            client.sendMessage(msg.from, "Qual é o nome?");
        }
        else
        {
            msg.reply("Você não tem autorização para adicionar um membro");
        }
        return;
    }
    if (currentChat[msg.from] == "add_member_name")
    {
        createMember.name = msg.body;
        currentChat[msg.from] = "add_member_number";
        client.sendMessage(msg.from, "Qual é o número? Digite no padrão (5548XXXXXXXX), ex: 554884891617");
        client.sendMessage(msg.from, "Verifique se o número do whatsapp dessa pessoa possúi o 9 na frente.");
        return;
    }
    if (currentChat[msg.from] == "add_member_number")
    {
        var _phoneId = await client.getNumberId(msg.body)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid)
        {
            createMember.number = msg.body;
            currentChat[msg.from] = "add_member_role";
            client.sendMessage(msg.from, "Qual é o cargo?");
            client.sendMessage(msg.from, "*1* - Membro\n*2* - Moderador\n*3* - Convidado\n\nDigite o número correspondente");
        }
        else
        {
            client.sendMessage(msg.from, "Número inválido!");
        }
        return;
    }
    if (currentChat[msg.from] == "add_member_role")
    {
        if (msg.body == "1")
        {
            createMember.role = "member";
        }
        else if (msg.body == "2")
        {
            createMember.role = "moderador";
        }
        else if (msg.body == "3")
        {
            createMember.role = "guest";
            currentChat[msg.from] = "add_member_friend";
            client.sendMessage(msg.from, "Qual é o número do membro amigo do convidado? Digite no padrão (5548XXXXXXXX), ex: 554884891617");
            return;
        }
        addMember(createMember);
        client.sendMessage(msg.from, "Membro criado!");
        currentChat[msg.from] = undefined;
        return;
    }
    if (currentChat[msg.from] == "add_member_friend")
    {
        var _phoneId = await client.getNumberId(msg.body)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid)
        {
            createMember.friend = msg.body;
            currentChat[msg.from] = undefined;
            addMember(createMember);
            client.sendMessage(msg.from, "Membro criado!");
        }
        else 
        {
            client.sendMessage(msg.from, "Número inválido!");
        }
        return;
    }
    //Ban member

    if (msg.body == "!ban membro")
    {
        if (member.role == "admin")
        {
            currentChat[msg.from] = "ban_member_number";
            createMember = {};
            client.sendMessage(msg.from, "Qual é o número?");
        }
        else
        {
            msg.reply("Você não tem autorização para banir um membro");
        }
        return;
    }
    if (currentChat[msg.from] == "ban_member_number")
    {
        var _phoneId = await client.getNumberId(msg.body)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid)
        {
            banMember(msg.body);
            client.sendMessage(msg.from, "Membro banido.");
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Número inválido!");
        }
        return;
    }
    //Create event
    if (currentChat[msg.from] == "create_event_name")
    {
        createEvent.name = msg.body;
        client.sendMessage(msg.from, "Certo, e a data? Insira no padrão (DD/MM/AAAA)");
        if (createEvent.date)
        {
            const date = new Date(createEvent.date);
            client.sendMessage(msg.from, `Atual: ${formatTwoDecimal(date.getDate())}/${formatTwoDecimal(date.getMonth())}/${formatTwoDecimal(date.getFullYear())}`);
        }
        currentChat[msg.from] = "create_event_date";
        return;
    }
    if (currentChat[msg.from] == "create_event_date")
    {
        const date = msg.body.split('/');
        if (date.length == 3)
        {
            client.sendMessage(msg.from, `Será dia ${date[0]} então, que horas? Insira no padrão (HH:MM)`);
            if (createEvent.date)
            {
                const date = new Date(createEvent.date);
                client.sendMessage(msg.from, `Atual: ${formatTwoDecimal(date.getHours())}:${formatTwoDecimal(date.getMinutes())}`);
            }
            createEvent.date = date;
            currentChat[msg.from] = "create_event_hour";
        }
        else
        {
            client.sendMessage(msg.from, `Formato inválido, use (DD/MM/AAAA)`);
        }
        return;
    }
    if (currentChat[msg.from] == "create_event_hour")
    {
        const hour = msg.body.split(':');
        if (hour.length == 2)
        {
            const date = new Date(parseInt(createEvent.date[2]), parseInt(createEvent.date[1]), parseInt(createEvent.date[0]), parseInt(hour[0]), parseInt(hour[1]));
            createEvent.date = date.toUTCString();
            client.sendMessage(msg.from, "OK, o local? (Digite *Aleatorio* caso queira que o local do evento seja aleatório)");
            if (createEvent.local)
            {
                client.sendMessage(msg.from, `Atual: ${createEvent.local}`);
            }
            currentChat[msg.from] = "create_event_local";
            return;
        }
        else
        {
            client.sendMessage(msg.from, `Formato inválido, use (HH:MM)`);
        }
        return;
    }
    if (currentChat[msg.from] == "create_event_local")
    {
        if (msg.body.toLowerCase() == "aleatorio" || msg.body.toLowerCase() == "aleatório")
        {
            let rawdata = fs.readFileSync('places.json');
            const places = JSON.parse(rawdata);
            createEvent.local = places[Math.floor(Math.random()*places.length)];
            msg.reply("O local será *" + createEvent.local + "*");
        }
        else
        {
            createEvent.local = msg.body;
        }
        client.sendMessage(msg.from, "O evento é apenas para membros?\ndigite *Sim* ou *Não*");
        currentChat[msg.from] = "create_event_private";
        return;
    }
    if (currentChat[msg.from] == "create_event_private")
    {
        if (afirmativeResponse(msg))
        {
            createEvent.memberonly = true;
        }
        else if (negativeResponse(msg))
        {
            createEvent.memberonly = false;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite *Sim* ou *Não*");
            return;
        }

        if (createEvent.id == undefined)
        {
            createEvent.id = uuidv4();
            createEvent.confirmed = [];
            createEvent.checkin = [];
            createEvent.canceled = false;
            client.sendMessage(msg.from, "Evento criado, deseja notificar todos os membros?\ndigite *Sim* ou *Não*");
        }
        else
        {
            client.sendMessage(msg.from, "Evento editado, deseja notificar todos os membros?\ndigite *Sim* ou *Não*");
        }
        currentChat[msg.from] = "create_event_notificate";
        fs.writeFileSync("events/" + createEvent.id + ".json", JSON.stringify(createEvent));
        return;
    }
    if (currentChat[msg.from] == "create_event_notificate")
    {
        if (afirmativeResponse(msg))
        {
            notificateAllMembers(createEvent)
            client.sendMessage(msg.from, "Notificado!");
            currentChat[msg.from] = undefined;
        }
        else if (negativeResponse(msg))
        {
            client.sendMessage(msg.from, "Certo.");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite *Sim* ou *Não*");
        }
        return;
    }
    //Edit event
    if (currentChat[msg.from] == "edit_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        if (events[selectedId - 1])
        {
            createEvent = events[selectedId - 1]
            client.sendMessage(msg.from, "Qual seria o nome do evento?");
            client.sendMessage(msg.from, "Atual: " + createEvent.name);
            currentChat[msg.from] = "create_event_name";
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    //Notify event
    if (currentChat[msg.from] == "select_notify_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        if (events[selectedId - 1])
        {
            notificateAllMembers(events[selectedId - 1]);
            client.sendMessage(msg.from, "Membros notificados!");
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    //Checkin
    if (currentChat[msg.from] == "checkin_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        const event = events[selectedId - 1]
        if (event)
        {
            var msgParticipants = getEventParticipants(event); 
            client.sendMessage(msg.from, "Qual seria o membro?");
            client.sendMessage(msg.from, msgParticipants);
            currentEvent[msg.from] = event;
            currentChat[msg.from] = "checkin_member";
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    if (currentChat[msg.from] == "checkin_member")
    {
        const selectedId = parseInt(msg.body);
        const participant = currentEvent[msg.from].confirmed[selectedId - 1]
        if (participant)
        {
            const member = getMember(participant);
            checkinMemberPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, `Check-in de ${member.name} feito.`);
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Membro inválido");
        }
        return;
    }
    //Checkout
    if (currentChat[msg.from] == "checkout_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        const event = events[selectedId - 1]
        if (event)
        {
            var msgParticipants = getEventParticipants(event); 
            client.sendMessage(msg.from, "Qual seria o membro?");
            client.sendMessage(msg.from, msgParticipants);
            currentEvent[msg.from] = event;
            currentChat[msg.from] = "checkout_member";
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    if (currentChat[msg.from] == "checkout_member")
    {
        const selectedId = parseInt(msg.body);
        const participant = currentEvent[msg.from].confirmed[selectedId - 1]
        if (participant)
        {
            const member = getMember(participant);
            checkoutMemberPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, `Check-out de ${member.name} feito.`);
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Membro inválido");
        }
        return;
    }
    //Verify event
    if (currentChat[msg.from] == "select_verify_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        const event = events[selectedId - 1]
        if (event)
        {
            var msgParticipants = getEventParticipants(event); 
            client.sendMessage(msg.from, msgParticipants);
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    //Cancel event
    if (currentChat[msg.from] == "cancel_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        const event = events[selectedId - 1]
        if (event)
        {
            cancelEvent(event);
            client.sendMessage(msg.from, "Evento cancelado!");
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    //Uncancel event
    if (currentChat[msg.from] == "descancel_event")
    {
        const selectedId = parseInt(msg.body);
        const events = getEvents();
        const event = events[selectedId - 1]
        if (event)
        {
            uncancelEvent(event);
            client.sendMessage(msg.from, "Evento descancelado!");
            currentChat[msg.from] = undefined;
        }
        else
        {
            client.sendMessage(msg.from, "Evento inválido");
        }
        return;
    }
    //Main
    if (currentChat[msg.from] == undefined)
    {
        const member = getMember(msg.from.split("@")[0]);
        if (member.role != "unknown")
        {
            client.sendMessage(msg.from, `Olá ${member.name}!`);
            if (member.role != "guest")
            {
                client.sendMessage(msg.from, `O que você deseja?\n\n*1* - Lista de eventos 📅\n*2* - Minhas presenças ✅${member.role == "admin" ? "\n*!adm* - Comandos de Administrador ⚙️" : ""}\n\nDigite o *número correspondente*`);
                currentChat[msg.from] = "main_response";
            }
            else
            {
                client.sendMessage(msg.from, `Você não é membro do grupo, mas aqui está alguns eventos que você pode participar`);
                client.sendMessage(msg.from, listEvents(false) + "\n\nDigite o número correspondente do evento para informações\nou você pode *!cancelar*");
                currentChat[msg.from] = "main_select_event";
            }
        }
        else
        {
            client.sendMessage(msg.from, `Olá, você não está na lista de membros, entre em contato com os administradores.`);
            currentChat[msg.from] = undefined;
        }
        return;
    }
    if (msg.body.toLowerCase() == "!adm")
    {
        client.sendMessage(msg.from, "!criar evento - Criar evento\n!editar evento - Editar um evento\n!notificar evento - Notificar todos os membros de um evento\n!verificar evento - Verificar lista de confirmados\n!cancelar evento - Cancelar um evento\n!descancelar evento - Descancelar um evento\n!checkin - fazer o Check-in de um membro em um evento\n!checkout - fazer o Check-out de um membro em um evento\n\nVocê pode *!cancelar* um comando a qualquer momento.");
        currentChat[msg.from] = undefined;
        return;
    }
    //Main
    if (currentChat[msg.from] == "main_response")
    {
        const member = getMember(msg.from.split("@")[0]);
        if (msg.body == "1")
        {
            client.sendMessage(msg.from, listEvents() + "\n\nDigite o número correspondente do evento para informações\nou você pode *!cancelar*");
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
        if (events[selectedId - 1])
        {
            if (events[selectedId - 1].memberonly == true && member.role == "guest")
            {
                client.sendMessage(msg.from, "Esse evento é apenas para membros 😔");
                currentChat[msg.from] = undefined;
                return;
            }
            currentEvent[msg.from] = events[selectedId - 1];

            client.sendMessage(msg.from, eventStringify(currentEvent[msg.from]));
            const confirmed = currentEvent[msg.from].confirmed.find(con => con == member.number) != undefined;
            
            if (confirmed)
            {
                client.sendMessage(msg.from, "Você já está confirmado nesse evento, deseja cancelar?\n\ndigite *Sim* ou *Não*");
                currentChat[msg.from] = "main_select_event_cancel_presence";
            }
            else
            {
                client.sendMessage(msg.from, "Você não está confirmado nesse evento, deseja participar?\n\ndigite *Sim* ou *Não*");
                currentChat[msg.from] = "main_select_event_confirm_presence";
            }
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
        if (afirmativeResponse(msg))
        {
            confirmPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, "OK, presença confirmada!");
            currentChat[msg.from] = undefined;
        }
        else if (negativeResponse(msg))
        {
            client.sendMessage(msg.from, "bele!");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite *Sim* ou *Não*");
        }
        return;
    }
    if (currentChat[msg.from] == "main_select_event_cancel_presence")
    {
        const member = getMember(msg.from.split("@")[0]);
        if (afirmativeResponse(msg))
        {
            cancelPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, "OK, Cancelado!");
            currentChat[msg.from] = undefined;
        }
        else if (negativeResponse(msg))
        {
            client.sendMessage(msg.from, "bele!");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, digite *Sim* ou *Não*");
        }
        return;
    }
    //Event presence
    if (currentChat[msg.from] == "event_response")
    {
        if (afirmativeResponse(msg))
        {
            const member = getMember(msg.from.split("@")[0]);
            confirmPresence(member, currentEvent[msg.from]);
            client.sendMessage(msg.from, "Certo, bom evento!");
            currentChat[msg.from] = undefined;
        }
        else if (negativeResponse(msg))
        {
            client.sendMessage(msg.from, "Então vai tomar no cu 💓");
            currentChat[msg.from] = undefined;
        }
        else 
        {
            client.sendMessage(msg.from, "Desculpe, não entendi, é *Sim* ou *Não*?");
        }
        return;
    }
}

client.on('message', (msg) => {
    try {
        proccessMessage(msg);
    }
    catch
    {
        client.sendMessage(msg.from, "❌ *ERRO* ❌\n\nOcorreu algum erro sério no seu comando. Quase morri. Tenta de novo ou contate um administrador.");
    }
});

client.initialize();