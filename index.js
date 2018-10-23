require('dotenv').config();
const {
  NODE_ENV,
  PORT,
  SERVER_URL,
  APP_URL,
  HEROKU_CLIENT_ID,
  JWT_SECRET,
  AUTH_CALLBACK,
  HEROKU_CLIENT_SECRET
} = process.env;
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');

const scopes = ['read', 'write'];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/api/herokuauth', async (req, res) => {
  // Device id in query param
  const { did } = req.query;
  if (!did || !did.length) return res.status(400).send('No device id provided');
  // CSRF Token
  const token = await jwt.sign({ did }, JWT_SECRET);
  res.redirect(
    `https://id.heroku.com/oauth/authorize?client_id=${HEROKU_CLIENT_ID}&response_type=code&scope=${encodeURIComponent(
      scopes.join(' ')
    )}&state=${token}`
  );
});

app.get(AUTH_CALLBACK, async (req, res) => {
  // Get code, state
  const { code, state } = req.query;
  // Swap token for oauth token
  const { data: herokuRes } = await axios.post(
    'https://id.heroku.com/oauth/token',
    querystring.stringify({
      grant_type: 'authorization_code',
      code,
      client_secret: HEROKU_CLIENT_SECRET
    })
  );

  const { access_token, expires_in, refresh_token, user_id } = herokuRes;
  res.redirect(`${APP_URL}${AUTH_CALLBACK}?access_token=${access_token}&expires_in=${expires_in}&refresh_token=${refresh_token}&user_id=${user_id}`);
});

app.listen(PORT, () => {
  console.log(
    `App listening on port ${PORT} ${SERVER_URL}${
      NODE_ENV === 'development' ? `:${PORT}` : ''
    }`
  );
});
