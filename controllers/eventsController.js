const api = require('../services/api');
const { List } = require('whatsapp-web.js');
const MembersController = require('./membersController');
const dateFormat = require('dateformat');

class EventsController 
{
    static eventStringify(event) {
        const date = new Date(event.date);
        return `*EVENTO*\n${event.name}\n📅 ${formatTwoDecimal(date.getDate())}/${formatTwoDecimal(date.getMonth())}/${formatTwoDecimal(date.getFullYear())}\n🕓 ${formatTwoDecimal(date.getHours())}:${formatTwoDecimal(date.getMinutes())}\n📍 ${event.local}`;
    }
    static async cancelEvent(event) {
        await api.put("/events/" + event.id + "/cancel")
            .then(console.log)
            .catch(console.error);
    }
    static async uncancelEvent(event) {
        await api.put("/events/" + event.id + "/uncancel")
            .then(console.log)
            .catch(console.error);
    }
    static async getEventParticipants(event) {
        const res = await api.get("/events/" + event.id + "/participants")
            .catch(err => console.error(err));
        return res.data;
    }
    static async notificateAllMembers(id) {
        const event = await EventsController.getEvent(id);
        let members = await MembersController.getAll();
        members.forEach(async member => {
            if (member.role == "guest")
                return;
            let status = await MembersController.getStatus(member.number, event);
            if (status == "pending")
            {
                var _phoneId = await client.getNumberId(member.number)
                var _isValid = await client.isRegisteredUser(_phoneId._serialized)
                if(_isValid) {
                    client.sendMessage(_phoneId._serialized, new List(`*${event.name}*\n\n📆${event.date}\n🕑${event.hour}\n📌${event.Local.name}`, "Ações", [
                       {
                          title: "Ações",
                          rows: [
                             {
                                id: "confirm_event_" + event.id,
                                title: "✅ Confirmar presença"
                             },
                             {
                                id: "recuse_event_" + event.id,
                                title: "🚫 Recusar presença"
                             },
                             {
                                id: "locate_event_" + event.id,
                                title: "📌 Onde fica?"
                             },
                             {
                                 id: "event_participants_" + event.id,
                                 title: "👥 Ver participantes"
                             }
                          ]
                       }
                    ], `${member.name}, evento novo do SharkRunners`, "Clique no botão abaixo para ver algumas ações"));
                }
                else
                {
                    console.error(`O número do ${member.name} é invalido! (${member.number})`);
                }
            }
        });
    }
    static async getEvents() {
        const res = await api.get("/events");

        var events = res.data;
        events = events.map(event => {
            if (event.date == null)
                return {
                    ...event,
                    date: "Sem data confirmada",
                    hour: "Sem horário confirmado"
                }

            const date = new Date(event.date);
            return {
                ...event,
                date: dateFormat(date, "dd/mm/yyyy"),
                hour: dateFormat(date, "HH:MM")
            }
        })
        return events;
    }
    static async getLocals() {
        const res = await api.get("/locals");
        return res.data;
    }
    static async createLocal(local) {
        return await api.post("/locals", local).catch(err => {msg.reply(`⚠️ *${err.data}*`);});
    }
    static async createEvent(event, msg) {
        return await api.post("/events", event).catch(err => {console.error(err); msg.reply(`⚠️ *${err.data}*`);});
    }
    static async searchEvent(search) {
        const res = await api.get("/search/events?search=" + search);
        var event = res.data;
        if (event == null)
            return event;

        if (event.date == null)
            return {
                ...event,
                date: "Sem data confirmada",
                hour: "Sem horário confirmado"
            }
        const date = new Date(event.date);
        return {
            ...event,
            date: dateFormat(date, "dd/mm/yyyy"),
            hour: dateFormat(date, "HH:MM")
        };
    }
    static async getEvent(id) {
        const res = await api.get("/events/" + id);
        var event = res.data;
        if (event.date == null)
            return {
                ...event,
                date: "Sem data confirmada",
                hour: "Sem horário confirmado"
            }
        const date = new Date(event.date);
        return {
            ...event,
            date: dateFormat(date, "dd/mm/yyyy"),
            hour: dateFormat(date, "HH:MM")
        };
    }
    static async showPresenceList(msg, id, complete=false) {
      const event = await EventsController.getEvent(id);
      const participants = await EventsController.getEventParticipants(event);
      if (participants.length == 0)
      {
        client.sendMessage(msg.from, "Ninguém confirmou presença nesse evento.");
      }
      else
      {
        const newMsg = await client.sendMessage(msg.from, new List(complete ? `📆${event.date}\n🕑${event.hour}\n📌${event.Local.name}\n\nResponda *Quero ir* para confirmar sua presença, ou chame no privado.`:`Lista de presença`, "👥 Ver participantes", [
            {
              title: "Participantes",
              rows: await Promise.all(participants.map(async (part, index) => {
                    var friendStr = "";
                    if (part.Member.friend_id != null)
                    {
                        const friend = await MembersController.getById(part.Member.friend_id);
                        friendStr = ` (Convidado de ${friend.name}) `
                    }
                    var confirmedStr = "";
                    switch(part.status)
                    {
                        case "confirmed":
                          confirmedStr = friendStr + "✅Confirmou a presença";
                          break;
                        case "recused":
                          confirmedStr = friendStr + "🚫Recusou a presença";
                          break;
                        case "checkin":
                          confirmedStr = friendStr + "✅Check-in foi feito";
                          break;
                        default:
                          confirmedStr = friendStr + "❔Ainda não confirmou a presença";
                          break;
                    }
                    return {
                        title: `${index + 1} - ${part.Member.name}`,
                        description: confirmedStr
                    }
                  }))
            }
        ], event.name, "Clique no botão abaixo para ver os participantes"));
        replyMsg[newMsg.id] = event.id;
      }
    } 
}
module.exports = EventsController;