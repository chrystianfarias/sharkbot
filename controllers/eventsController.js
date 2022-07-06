const api = require('../services/api');
const { List, Location, MessageMedia } = require('whatsapp-web.js');
const MembersController = require('./membersController.js');
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
            if (status.confirmed == undefined || (event.pix && status.paid == false))
            {
                var _phoneId = await client.getNumberId(member.number)
                var _isValid = await client.isRegisteredUser(_phoneId._serialized)
                var msg = "";
                if (event.pix && status.paid == false && status.confirmed)
                {
                    msg = "🚫 Você confirmou mas ainda não efetuou o pagamento";
                    msg += "\n🪪 PIX: " + event.pix;
                    msg += "\n💵 Valor: " + event.price.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    });;
                }
                if(_isValid) {
                    client.sendMessage(_phoneId._serialized, new List(`*${event.name}*\n\n📆${event.date}\n🕑${event.hour}\n📌${event.Local.name}\n${msg}`, "Ações", [
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
                    ], `${member.name}, evento do SharkRunners`, "Clique no botão abaixo para ver algumas ações"));
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
    static async updateEvent(event, msg) {
        return await api.put("/events/" + event.id, event).catch(err => {console.error(err); msg.reply(`⚠️ *${err.data}*`);});
    }
    static async deleteEvent(event, msg) {
        return await api.delete("/events/" + event.id).catch(err => {console.error(err); msg.reply(`⚠️ *${err.data}*`);});
    }
    static async searchEvents(search) {
        const res = await api.get("/search/events/" + encodeURIComponent(search));
        return res.data;
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
        
        let chat = await msg.getChat();
        let member = await MembersController.get(msg.from);
        if (chat.isGroup) {
            const senderContact = await msg.getContact();
            member = await MembersController.get(senderContact.number);
        }

      const event = await EventsController.getEvent(id);
      var priceStr = "";
      if (event.price)
      {
         priceStr += "\n💵 Valor: " + event.price.toLocaleString('pt-BR', {
           style: 'currency',
           currency: 'BRL',
         });
         priceStr += "\nPara pagar, *me chama no privado*!"
      }
      const participants = await EventsController.getEventParticipants(event);
      if (participants.length == 0)
      {
        client.sendMessage(msg.from, "Ninguém confirmou presença nesse evento.");
      }
      else
      {
        if (event.media_url)
        {
           const media = await MessageMedia.fromUrl(event.media_url);
           await client.sendMessage(msg.from, media);
        }

        const newMsg = await client.sendMessage((chat.isGroup && member.role == "admin") || chat.isGroup == false ? msg.from : member.number + "@c.us",
        new List(complete ? `📆${event.date}\n🕑${event.hour}\n📌${event.Local.name}\n\nResponda *Quero ir* para confirmar sua presença, ou chame no privado.`:`Lista de presença`, "👥 Ver participantes", [
            {
              title: "Participantes",
              rows: await Promise.all(participants.map(async (part, index) => {
                    var friendStr = "";
                    if (part.Member.friend_id != null)
                    {
                        const friend = await MembersController.getById(part.Member.friend_id);
                        friendStr = ` (Convidado de ${friend.name}) `
                    }
                    var confirmedStr = friendStr;
                    if (part.confirmed == false)
                    {
                        confirmedStr += "🚫Recusou a presença ";
                    }
                    if (part.checkin)
                    {
                        confirmedStr += "✅Check-in foi feito ";
                    }
                    if (part.paid)
                    {
                        confirmedStr += "💲Pagamento realizado ";
                    }
                    
                    return {
                        id: `member_itm_${part.Member.id}_event_${id}`,
                        title: `${index + 1} - ${part.Member.name}`,
                        description: confirmedStr
                    }
                  }))
            }
        ], event.name, "Clique no botão abaixo para ver os participantes"));
        replyMsg[newMsg.id] = event.id;
      }
      if (chat.isGroup && member.role != "admin")
      {
         msg.reply("Respondido no privado.");
      }
    } 
    static async showEvents(msg, chat) {
        let member = await MembersController.get(msg.from);
        if (chat.isGroup) {
            const senderContact = await msg.getContact();
            member = await MembersController.get(senderContact.number);
        }
        const events = await EventsController.getEvents();
        const admCommands = member.role == "admin" && chat.isGroup == false? [
              {
                 title: 'Comandos de Administrador',
                 rows:[
                    {
                          id: "add_event_itm",
                          title: "➕ Criar evento",
                          description: "Criar um novo evento"
                    }
                 ]
              }
        ] : [];
     
        const eventList = events.length > 0 ?[{
           rows: events.map(event => {
              if (member.role == "guest" && event.member_only)
              {
                 return {
                    id: "event_select_member",
                    title: event.name,
                    description: "🚫Evento apenas para membros"
                 }
              }
              return {
                 id: "event_select_" + event.id,
                 title: event.name,
                 description: event.canceled == true ? `🚫Evento cancelado` : `📆 ${event.date}`
              }
           })
        }] : [{
           rows: [{
              title: "Sem eventos"
           }]
        }];
     
        client.sendMessage((chat.isGroup && member.role == "admin") || chat.isGroup == false ? msg.from : member.number + "@c.us", new List("Aqui está a lista de eventos", "Selecione um", [
           ...eventList,
           ...admCommands
        ], "Eventos 📆"))
        if (chat.isGroup && member.role != "admin")
        {
           msg.reply("Respondido no privado.");
        }
      }
    static async showLocation(id, msg, chat) {
        let member = await MembersController.get(msg.from);
        if (chat.isGroup) {
            const senderContact = await msg.getContact();
            member = await MembersController.get(senderContact.number);
        }
        const event = await EventsController.getEvent(id);
        const location = new Location(event.Local.latitude, event.Local.longitude, event.Local.name);
        client.sendMessage((chat.isGroup && member.role == "admin") || chat.isGroup == false ? msg.from : member.number + "@c.us", location);
        if (chat.isGroup && member.role != "admin")
        {
        msg.reply("Respondido no privado.");
        }
    }
    static async showEvent(id, msg, chat) {
        let member = await MembersController.get(msg.from);
         if (chat.isGroup) {
            const senderContact = await msg.getContact();
            member = await MembersController.get(senderContact.number);
         }
         const event = await EventsController.getEvent(id);
         const admCommands = member.role == "admin" && chat.isGroup == false? [
             {
                 title: 'Comandos de Administrador',
                 rows:[
                     {
                        id: "notify_event_" + event.id,
                        title: "⚠️ Notificar evento",
                        description: "para todos os membros não confirmados"
                     },
                     event.canceled ? {
                         id: "event_uncancel_" + event.id,
                         title: "❇️ Descancelar evento"
                     } : {
                        id: "event_cancel_" + event.id,
                        title: "🚫 Cancelar evento"
                     },
                     {
                         id: "event_edit_" + event.id,
                         title: "✏️ Editar evento"
                     }
                 ]
             }
         ] : [];
         var status = await MembersController.getStatus(msg.from, event);
         var confirmed = false;
         var confirmedStr = "❔Você ainda não confirmou a presença";
         var priceStr = "";
         var payItems = [];
         if (status)
         {
            if (status.confirmed == true)
            {
               confirmedStr = "✅Você confirmou a presença";
               confirmed = true;
            }
            if (status.confirmed == false)
            {
               confirmedStr = "🚫Você recusou a presença";
            }
         }
         if (status.checkin)
         {
            confirmedStr = "✅Seu check-in foi feito";
         }
         if (status.paid)
         {
            confirmedStr += "\n✅Seu pagamento foi recebido";
         }
         else
         {
            if (event.payable && confirmed)
            {
               confirmedStr += "\n❗Seu pagamento ainda não foi recebido";
               payItems = [{
                    id: "pay_link_" + event.id,
                    title: "🤝 Pagar com MercadoPago",
                    description: "Recurso BETA"
                }];
                if (event.pix)
                {
                   priceStr += "\n🪪 PIX: " + event.pix;
                   payItems = [];
                }
            }
         }
         if (event.price)
         {
            priceStr += "\n💵 Valor: " + event.price.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            });
         }
         var confirmedItems = chat.isGroup ? [] : [
            confirmed == false ? {
               id: "confirm_event_" + event.id,
               title: "✅ Confirmar presença"
            }:{
               id: "recuse_event_" + event.id,
               title: "🚫 Cancelar presença"
            }
         ]
         if (event.media_url)
         {
            const media = await MessageMedia.fromUrl(event.media_url);
            await client.sendMessage(msg.from, media);
         }
         client.sendMessage((chat.isGroup && member.role == "admin") || chat.isGroup == false ? msg.from : member.number + "@c.us", 
         new List(`📆${event.date}\n🕑${event.hour}\n📌${event.Local.name}` + (chat.isGroup == false ? `\n\n${confirmedStr}` : '') + priceStr, "Ações", [
            {
               title: "Ações",
               rows: [
                  ...confirmedItems,
                  {
                     id: "locate_event_" + event.id,
                     title: "📌 Onde fica?"
                  },
                  {
                      id: "event_participants_" + event.id,
                      title: "👥 Ver participantes"
                  },
                  ...payItems
               ]
            },
            ...admCommands
         ], event.name, "Clique no botão abaixo para ver algumas ações"));
         if (chat.isGroup == false)
         {
            if (event.pix && status.paid == false && event.payable)
            {
                client.sendMessage(msg.from, "Se você já pagou, aguarde até processarmos seu pagamento.")
            }
         }
         if (chat.isGroup && member.role != "admin")
         {
            msg.reply("Respondido no privado.");
         }
    }
}
module.exports = EventsController;