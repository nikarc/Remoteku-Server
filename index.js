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
  const redirectUrl = `/redirectToApp?access_token=${access_token}&expires_in=${expires_in}&refresh_token=${refresh_token}&user_id=${user_id}`;
  const html = `
    <style>
      html, body {
        padding: 0;
        margin: 0;
      }
      .main {
        width: 100vw;
        height: 100vh;
        background-color: #8565AA;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Helvetica', 'sans-serif';
        font-size: 3em;
        color: white;
      }
    </style>
    <div class="main">
      <h3>Authorizing...</h3>
    </div>
    <script>
      window.HerokuAccessToken = '${access_token}';
      window.HerokuRefreshToken = '${refresh_token}';
      window.HerokuTokenExpires = '${expires_in}';
      window.HerokuUserId = '${user_id}';
    </script>
  `;

  res.send(html);
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
