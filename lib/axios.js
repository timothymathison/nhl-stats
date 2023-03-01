import axios from 'axios';

const NHL_API_URL = 'https://statsapi.web.nhl.com/api/v1/';

export default axios.create({
  baseURL: NHL_API_URL,
  timeout: 5000,
  responseType: 'json', // default
});
