require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const {
  NODE_ENV,
  PORT,
  SERVER_URL,
  APP_URL,
  HEROKU_CLIENT_ID,
  JWT_SECRET,
  AUTH_CALLBACK,
  HEROKU_CLIENT_SECRET,
} = process.env;

const app = express();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const querystring = require('querystring');

const scopes = ['read', 'write'];

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => res.send('<p>Remoteku Server</p>'));

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
  console.log('AUTH CALLBACK CALLED');
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
  console.log('RESPONSE FROM HEROKU: ', herokuRes);

  const { access_token, expires_in, refresh_token, user_id } = herokuRes;
  const redirectUrl = `${APP_URL}${AUTH_CALLBACK}?access_token=${access_token}&expires_in=${expires_in}&refresh_token=${refresh_token}&user_id=${user_id}`;
  console.log(`Redirecting to: ${redirectUrl}`);
  res.redirect('remoteku://auth/callback?access_token=dac05588-59e7-4f9d-aea9-53bbbe7bec9b&expires_in=28799&refresh_token=eb8b20ea-78cb-4169-baf1-a5b4e7018a3b&user_id=40325aaa-7333-47e1-9b9e-d0a0f64f4c93');
});

// iOS universal link aasa
const aasa = JSON.parse(fs.readFileSync(`${__dirname}/static/apple-app-site-association`, 'utf-8'));
app.get('/apple-app-site-association', (req, res) => {
  res.status(200).json(aasa);
});

app.listen(PORT, () => {
  console.log(
    `App listening on port ${PORT} ${SERVER_URL}${
      NODE_ENV === 'development' ? `:${PORT}` : ''
    }`
  );
});
