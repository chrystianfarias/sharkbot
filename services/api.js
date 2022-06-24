
const axios = require('axios');
module.exports = axios.create({baseURL: 'https://sharkwpbotapi.herokuapp.com', Headers: {auth: "b6f1eb97-84ad-4156-bde2-f1e14d8e7cdf"}});