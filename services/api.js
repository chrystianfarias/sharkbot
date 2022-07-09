
const axios = require('axios');
const api = axios.create({baseURL: 'https://api.sharkrunners.com.br/'});
api.defaults.headers.common['auth'] = "b6f1eb97-84ad-4156-bde2-f1e14d8e7cdf";
module.exports = api;