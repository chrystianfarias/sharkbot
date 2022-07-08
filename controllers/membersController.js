const api = require('../services/api');
const { List } = require('whatsapp-web.js');
const { default: axios } = require('axios');
class MembersController
{
    static async add(msg, member) {
        api.post("/members", member)
        .then(res => {
            var str = "membro";
            if (member.role == "moderador")
                str = "moderador";
            if (member.role == "admin")
                str = "ADM";
            if (member.role == "guest")
                str = "convidado";
            client.sendMessage(member.number + "@c.us", `Olá ${member.name}, seu número foi cadastrado no bot do *SharkRunners* como ` + str);
        })
        .catch(err => {
            msg.reply(`⚠️ *${err.body}*`)
        });
    }
    static ban (msg, number) {
        api.delete("/members/" + number)
            .then(res => {
                msg.reply(`Membro banido`);
            })
            .catch(err => {
                msg.reply(`⚠️ *${err.body}*`)
            });
    }
    static async getAll() {
        const res = await api.get("/members")
            .catch(console.error);
        return res.data;
    }
    static async get(number) {
        number = number.split('@')[0];
        return await new Promise((res, rej) => {
            api.get("/members/" + number)
                .then(re => res(re.data))
                .catch(err => res({name:number, number, role: "unk"}));
        })
    } 
    static async getById(id) {
        const res = await api.get("/search/members/" + id)
            .catch(console.error);
        return res.data;
    } 
    static async getStatus(number, event) {
        const member = await MembersController.get(number.split('@')[0]);
        return await new Promise((res, rej) => {
            api.get("/members/" + member.id + "/status/" + event.id)
                .then(re => res(re.data))
                .catch(err => res({}));
        })
    }
    static async checkin(msg, member, event) {
        await api.post(`/events/${event.id}/checkin`, {memberId: member.id})
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`))
            
        msg.reply(`Check-in de ${member.name} feito`);
        client.sendMessage(member.number + "@c.us", `Olá ${member.name}, seu check-in no evento '${event.name}' foi feito ✅`);
    }
    static async pay(msg, member, event) {
        await api.post(`/events/${event.id}/pay`, {memberId: member.id})
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`))
            
        msg.reply(`Pagamento de ${member.name} confirmado`);
        client.sendMessage(member.number + "@c.us", `Olá ${member.name}, seu pagamento para o evento *${event.name}* foi recebido, obrigado!`);
            
    }
    static async addCpf(msg, member, cpf) {
        const res = await api.put("/members/" + member.id, {cpf})
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`));
        return res.status == 200;
    }
    static async getPayLink(msg, member, event) {
        await api.post(`https://sharkwpbotapi.herokuapp.com/pay/create`, {memberId: member.id, eventId: event.id})
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`))
        msg.reply(`*Clique no link* abaixo para efetuar o pagamento`);
        client.sendMessage(msg.from, res.data);
    }
    static async checkPayLink(msg, member, event) {
        const res = await axios.get(`https://sharkwpbotapi.herokuapp.com/pay/check?memberId=${member.id}&eventId=${event.id}`)
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`))
        if (res.data == true)
        {
            msg.reply(`✅ Seu pagamento para o evento *${event.name}* foi recebido, obrigado!`);
            return;
        }
        msg.reply("🚫 *Ainda não recebemos seu pagamento*\nAguardo alguns minutos após o pagamento e tente novamente.");
           
    }
    static async checkout(msg, member, event) {
        await api.post(`/events/${event.id}/checkout`, {memberId: member.id})
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`))

        msg.reply(`Check-out de ${member.name} feito`);
    }
    static async confirmPresence(msg, member, event) {
        await api.post(`/events/${event.id}/participants`, {memberId: member.id})
            .catch(err => {msg.reply(`⚠️ *${err.response.data}*`)})
    }
    static async cancelPresence(msg, member, event) {
        api.post(`/events/${event.id}/recuse`, {memberId: member.id})
            .catch(err =>msg.reply(`⚠️ *${err.response.data}*`))
    }
}
module.exports = MembersController;