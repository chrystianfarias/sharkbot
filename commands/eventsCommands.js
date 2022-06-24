const { List, Location } = require('whatsapp-web.js');
const EventsController = require('../controllers/EventsController');
const MemberController = require('../controllers/membersController');

 const proccessMessage = async(msg, chat) => {
   if (msg.type == "list_response")
   {
      if (msg.selectedRowId == "events_itm")
      {
         const member = await MemberController.get(msg.from);
         const events = await EventsController.getEvents();
         const admCommands = member.role == "admin" ? [
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
      
         client.sendMessage(msg.from, new List("Aqui está a lista de eventos", "Selecione um", [
            ...eventList,
            ...admCommands
         ], "Eventos 📆"))
         return 0;
      }
      if (msg.selectedRowId == "event_select_member")
      {
         msg.reply("Só é permitido membros visualizar esse evento.");
         return 0;
      }
      if (msg.selectedRowId.includes("event_select_"))
      {
         const member = await MemberController.get(msg.from);
         const id = parseInt(msg.selectedRowId.replace("event_select_", ""));
         const event = await EventsController.getEvent(id);
         const admCommands = member.role == "admin" ? [
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
         var status = await MemberController.getStatus(msg.from, event);
         var confirmed = false;
         var confirmedStr = "❔Você ainda não confirmou a presença";
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
            }
         }
         
         client.sendMessage(msg.from, new List(`📆${event.date}\n🕑${event.hour}\n📌${event.Local.name}\n\n${confirmedStr}`, "Ações", [
            {
               title: "Ações",
               rows: [
                  confirmed == false ? {
                     id: "confirm_event_" + event.id,
                     title: "✅ Confirmar presença"
                  }:{
                     id: "recuse_event_" + event.id,
                     title: "🚫 Cancelar presença"
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
            },
            ...admCommands
         ], event.name, "Clique no botão abaixo para ver algumas ações"));
         return 0;
      }
      if (msg.selectedRowId.includes("event_cancel_"))
      {
         const id = parseInt(msg.selectedRowId.replace("event_cancel_", ""));
         const event = await EventsController.getEvent(id);
         await EventsController.cancelEvent(event);
         client.sendMessage(msg.from, "*Evento cancelado!*");
      }
      if (msg.selectedRowId.includes("event_uncancel_"))
      {
         const id = parseInt(msg.selectedRowId.replace("event_uncancel_", ""));
         const event = await EventsController.getEvent(id);
         await EventsController.uncancelEvent(event);
         client.sendMessage(msg.from, "*Evento descancelado!*");
      }
      if (msg.selectedRowId.includes("confirm_event_"))
      {
         const id = parseInt(msg.selectedRowId.replace("confirm_event_", ""));
         const event = await EventsController.getEvent(id);
         const member = await MemberController.get(msg.from);
         await MemberController.confirmPresence(msg, member, event);
         client.sendMessage(msg.from, "✅Presença confirmada!");
      }
      if (msg.selectedRowId.includes("recuse_event_"))
      {
         const id = parseInt(msg.selectedRowId.replace("recuse_event_", ""));
         const event = await EventsController.getEvent(id);
         const member = await MemberController.get(msg.from);
         await MemberController.cancelPresence(msg, member, event);
         client.sendMessage(msg.from, "🚫Presença cancelada!");
      }
      if (msg.selectedRowId.includes("event_participants_"))
      {
         const id = parseInt(msg.selectedRowId.replace("event_participants_", ""));
         await EventsController.showPresenceList(msg, id);
      }
      if (msg.selectedRowId.includes("locate_event_"))
      {
         const id = parseInt(msg.selectedRowId.replace("locate_event_", ""));
         const event = await EventsController.getEvent(id);
         const location = new Location(event.Local.latitude, event.Local.longitude, event.Local.name);
         client.sendMessage(msg.from, location);
      }
      if (msg.selectedRowId.includes("notify_event_"))
      {
         const id = parseInt(msg.selectedRowId.replace("notify_event_", ""));
         await EventsController.notificateAllMembers(id);
         client.sendMessage(msg.from, "Membros notificados.");
         return 0;
      }
      if (msg.selectedRowId.includes("event_edit_"))
      {
         const id = parseInt(msg.selectedRowId.replace("event_edit_", ""));
         const event = await EventsController.getEvent(id);
         currentChat[msg.from].event = event;

         client.sendMessage(msg.from, "Função em construção.");
         return 0;
      }
      if (msg.selectedRowId.includes("remove_event_"))
      {
         //const id = parseInt(msg.selectedRowId.replace("event_edit_", ""));
         //const event = await EventsController.getEvent(id);
         client.sendMessage(msg.from, "Função em construção.");
         return 0;
      }
      if (msg.selectedRowId == "add_event_itm")
      {
         currentChat[msg.from] = {page: "add_event_name", event: {}};
         client.sendMessage(msg.from, "Qual o nome do evento?");
         return 0;
      }
   }
   if (currentChat[msg.from] == undefined)
      return 1;

   if (currentChat[msg.from].page == "add_event_name")
   {
      currentChat[msg.from].event.name = msg.body;
      msg.react("✅");

      currentChat[msg.from].page = "add_event_date";
      client.sendMessage(msg.from, "Qual a data do evento? (DD/MM/AAAA)");
      return 0;
   }
   if (currentChat[msg.from].page == "add_event_date")
   {
      const date = msg.body.split('/');
      if (date.length == 3)
      {
         currentChat[msg.from].event.date = date;
         msg.react("✅");
   
         currentChat[msg.from].page = "add_event_hour";
         client.sendMessage(msg.from, "Qual o horário do evento? (HH:MM)");
         return 0;
      }
      else
      {
         msg.react("🚫");
         return 0;
      }
   }
   if (currentChat[msg.from].page == "add_event_hour")
   {
      const date = msg.body.split(':');
      if (date.length == 2)
      {
         currentChat[msg.from].event.hour = date;
         msg.react("✅");
   
         currentChat[msg.from].page = "add_event_local";
         const locals = await EventsController.getLocals();
         client.sendMessage(msg.from, new List("Qual local do evento?", "Locais", [
            {
               title: "Locais cadastrados",
               rows: locals.map(local => {
                  return {
                     id: "local_" + local.id,
                     title: local.name,
                  }
               })
            },
            {
               title: "Outras opções",
               rows: [
                  {
                     id: "random_place",
                     title: "Aleatório",
                     description: "Gerar um local aleatório da lista"
                  },
                  {
                     id: "new_place",
                     title: "Digitar local",
                     description: "Local não está na lista, quero digitar"
                  }
               ]
            }
         ]))
         return 0;
      }
      else
      {
         msg.react("🚫");
         return 0;
      }
   }
   if (currentChat[msg.from].page == "add_event_local")
   {
      if (msg.type == "list_response")
      {
         if (msg.selectedRowId == "random_place")
         {
            const locals = await EventsController.getLocals();
            const local = locals[Math.floor(Math.random()*locals.length)];
            msg.react("✅");
            msg.reply("Local aleatório: " + local.name);
            currentChat[msg.from].event.local_id = local.id;
         }
         else if (msg.selectedRowId == "new_place")
         {
            currentChat[msg.from].page = "add_event_new_local";
            return 0;
         }
         else
         {
            currentChat[msg.from].event.local_id = parseInt(msg.selectedRowId.replace("local_", ""));
            msg.react("✅");
         }
         memberQuestion(msg);
         return 0;
      }
   }
   if (currentChat[msg.from].page == "add_event_new_local")
   {
      const newLocal = await EventsController.createLocal({name: msg.body, random: false}, msg);
      currentChat[msg.from].event.local_id = newLocal.id;
      msg.react("✅");
      memberQuestion(msg);
      return 0;
   }
   if (currentChat[msg.from].page == "add_event_member_question")
   {
      if (msg.type == "list_response")
      {
         if (msg.selectedRowId == "add_event_members")
         {
            currentChat[msg.from].event.member_only = true;
         }
         if (msg.selectedRowId == "add_event_nonmembers")
         {
            currentChat[msg.from].event.member_only = false;
         }
         msg.react("✅");
         client.sendMessage(msg.from, new List("Esse evento é pago?💲", "Escolha", [
            {
               rows: [
                  {
                     id: "add_event_pay",
                     title: "✅ É pago"
                  },
                  {
                     id: "add_event_nopay",
                     title: "🚫 Não é pago"
                  }
               ]
            }]
         ))
         currentChat[msg.from].page = "add_event_pay";
         return 0;
      }
   }
   if (currentChat[msg.from].page == "add_event_pay")
   {
      if (msg.type == "list_response")
      {
         if (msg.selectedRowId == "add_event_pay")
         {
            currentChat[msg.from].event.payable = true;
         }
         if (msg.selectedRowId == "add_event_nopay")
         {
            currentChat[msg.from].event.payable = false;
         }
         msg.react("✅");
         client.sendMessage(msg.from, new List("Deseja notificar os membros?", "Escolha", [
            {
               rows: [
                  {
                     id: "add_event_notify",
                     title: "✅ Notificar membros"
                  },
                  {
                     id: "add_event_nonotify",
                     title: "🚫 Não notificar membros"
                  }
               ]
            }]
         ))
         currentChat[msg.from].page = "add_event_notify_question";
         return 0;
      }
   }
   if (currentChat[msg.from].page == "add_event_notify_question")
   {
      var { event } = currentChat[msg.from];
      event.date = new Date(parseInt(event.date[2]), parseInt(event.date[1]), parseInt(event.date[0]), parseInt(event.hour[0]), parseInt(event.hour[1])).toUTCString();
      if (event.id)
      {
         const res = await EventsController.updateEvent(event, msg);
         client.sendMessage(msg.from, "*Evento atualizado!*");
      }
      else
      {
         const res = await EventsController.createEvent(event, msg);
         const newEvent = res.data;
         client.sendMessage(msg.from, "*Evento criado!*");
         if (msg.type == "list_response")
         {
            if (msg.selectedRowId == "add_event_notify")
            {
               EventsController.notificateAllMembers(newEvent.id);
            }
            msg.react("✅");
            return 0;
         }
      }
      currentChat[msg.from] = undefined;
   }
   return 1;
 };
 const memberQuestion = (msg) => {
   currentChat[msg.from].page = "add_event_member_question";
   client.sendMessage(msg.from, new List("Evento apenas para membros?", "Escolha", [
      {
         rows: [
            {
               id: "add_event_members",
               title: "👥 Apenas membros",
               description: "Não é permitido convidados neste evento"
            },
            {
               id: "add_event_nonmembers",
               title: "✅ Permitir convidados",
               description: "É permitido a participação de convidados neste evento"
            }
         ]
      }]
   ))
   return 0;
 }
 module.exports = proccessMessage;