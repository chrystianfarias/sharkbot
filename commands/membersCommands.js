const { List } = require("whatsapp-web.js");

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