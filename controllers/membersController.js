const api = require('../services/api');

class MembersController
{
    static async add(msg, member) {

        var _phoneId = await client.getNumberId(member.number)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if (_isValid)
        {
            api.post("/members", member)
            .then(res => {
                var str = "membro";
                if (member.role == "moderador")
                    str = "moderador";
                if (member.role == "admin")
                    str = "ADM";
                if (member.role == "guest")
                    str = "convidado";
                client.sendMessage(_phoneId._serialized, `Olá ${member.name}, seu número foi cadastrado no bot do *SharkRunners* como ` + str);
            })
            .catch(err => {
                msg.reply(`⚠️ *${err.body}*`)
            });
        }
        else
        {
            msg.reply(`⚠️ *Número inválido!*`)
        }
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
        var _phoneId = await client.getNumberId(member.number)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid) {
            const res = await api.post(`/events/${event.id}/checkin`, {memberId: member.id})
                .catch(err =>msg.reply(`⚠️ *${err}*`))
                
            msg.reply(`Check-in de ${member.name} feito`);
            client.sendMessage(_phoneId._serialized, `Olá ${member.name}, seu check-in no evento '${event.name}' foi feito ✅`);
            return;
        }
        else
        {
            msg.reply(`⚠️ *Número inválido!*`)
        }
    }
    static async checkout(msg, member, event) {
        var _phoneId = await client.getNumberId(member.number)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid) {
            const res = await api.post(`/events/${event.id}/checkout`, {memberId: member.id})
                .catch(err =>msg.reply(`⚠️ *${err}*`))

            msg.reply(`Check-out de ${member.name} feito`);
            return;
        }
        else
        {
            msg.reply(`⚠️ *Número inválido!*`)
        }
    }
    static async confirmPresence(msg, member, event) {
        var _phoneId = await client.getNumberId(member.number)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid) {
            const res = await api.post(`/events/${event.id}/participants`, {memberId: member.id})
                .catch(err => {msg.reply(`⚠️ *${err}*`)})
            return;
        }
        else
        {
            msg.reply(`⚠️ *Número inválido!*`)
        }
    }
    static async cancelPresence(msg, member, event) {
        var _phoneId = await client.getNumberId(member.number)
        var _isValid = await client.isRegisteredUser(_phoneId._serialized)
        if(_isValid) {
            const res = api.post(`/events/${event.id}/recuse`, {memberId: member.id})
                .catch(err =>msg.reply(`⚠️ *${err}*`))
            return;
        }
        else
        {
            msg.reply(`⚠️ *Número inválido!*`)
        }
    }
}
module.exports = MembersController;