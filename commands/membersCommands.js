const { List } = require("whatsapp-web.js");
const EventsController = require("../controllers/eventsController");
const MembersController = require("../controllers/membersController");

const proccessMessage = async (msg, chat) => {
   if (msg.type == "list_response")
   {
      if (msg.selectedRowId == "members_itm")
      {
         client.sendMessage(msg.from, "Área de membros em construção.");
         return 0;
         client.sendMessage(msg.from, new List("Gerenciamento de membros", "Selecione uma opção", [
            {
               rows: [
                  {
                     title: "➕ Adicionar membro",
                     id: "add_member"
                  },
                  {
                     title: "🚫 Banir membro",
                     id: "ban_member"
                  }
               ]
            }
         ], "Membros 👥"))
         currentChat[msg.from] = "members";
         return 0;
      }
      if (msg.selectedRowId == "add_member")
      {
         currentChat[msg.from] = {page: "add_member_contact"};
         client.sendMessage(msg.from, "Por favor, envie o contato do membro que deseja adicionar");
         return 0;
      }
      if (msg.selectedRowId.includes("member_itm_"))
      {
         //member_itm_X_event_X
         const splt = msg.selectedRowId.split("_event_");
         const idMember = parseInt(splt[0].replace("member_itm_", ""));
         const idEvent = parseInt(splt[1].replace("_event_", ""));

         const memberSelected = await MembersController.getById(idMember);
         const eventSelected = await EventsController.getEvent(idEvent);
         
         let member = await MembersController.get(msg.from);
         if (member.role == "admin")
         {
            client.sendMessage(msg.from, new List("No contexto do evento " + eventSelected.name, "Ações", [
               {
                  rows: [
                     {
                        id: `checkin_member_${idMember}_event_${idEvent}`,
                        title: "✅ Fazer Check-in",
                        description: "Confirmar presença do membro no evento"
                     },
                     {
                        id: `checkout_member_${idMember}_event_${idEvent}`,
                        title: "🚫 Fazer Check-out",
                        description: "Desfazer o check-in"
                     },
                     {
                        id: `paid_member_${idMember}_event_${idEvent}`,
                        title: "✅ Confirmar pagamento",
                        description: "Atenção para esta informação! Uma vez confirmado, não há como retirar."
                     }
                  ]
               }], memberSelected.name
            ));
         }
         else
         {
            msg.reply("Sem interações");
         }
      }

      if (msg.selectedRowId.includes("checkin_member_"))
      {
         //checkin_member_X_event_X
         const splt = msg.selectedRowId.split("_event_");
         const idMember = parseInt(splt[0].replace("checkin_member_", ""));
         const idEvent = parseInt(splt[1].replace("_event_", ""));
         const memberSelected = await MembersController.getById(idMember);
         const eventSelected = await EventsController.getEvent(idEvent);
         
         await MembersController.checkin(msg, memberSelected, eventSelected);
      }
      if (msg.selectedRowId.includes("checkout_member_"))
      {
         //checkout_member_X_event_X
         const splt = msg.selectedRowId.split("_event_");
         const idMember = parseInt(splt[0].replace("checkout_member_", ""));
         const idEvent = parseInt(splt[1].replace("_event_", ""));
         const memberSelected = await MembersController.getById(idMember);
         const eventSelected = await EventsController.getEvent(idEvent);
         
         await MembersController.checkout(msg, memberSelected, eventSelected);
      }
      if (msg.selectedRowId.includes("paid_member_"))
      {
         //paid_member_X_event_X
         const splt = msg.selectedRowId.split("_event_");
         const idMember = parseInt(splt[0].replace("paid_member_", ""));
         const idEvent = parseInt(splt[1].replace("_event_", ""));
         const memberSelected = await MembersController.getById(idMember);
         const eventSelected = await EventsController.getEvent(idEvent);
         
         await MembersController.pay(msg, memberSelected, eventSelected);
      }
   }

   if (msg.type === "vcard")
   {
      if (currentChat[msg.from].page == "add_member_contact")
      {
         msg.react("✅");
         const waid = msg.vCards[0].split("waid=")[1].split(":")[0];
         console.log(waid);
         return 0;
      }
   }
   return 1;
};
 module.exports = proccessMessage;