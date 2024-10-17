const express = require('express');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Twilio credentials from your Twilio console
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const cors = require('cors');


// app.use(cors())


app.use(express.json());

// Endpoint to initiate a call
app.post('/make-call', (req, res) => {
  const { to, from} = req.body;
  console.log('Req from adalo:', req.body)

  client.calls
    .create({
      to: to,
      from: from,
      url: 'https://handler.twilio.com/twiml/EH9eb88eaea0d52d22fb0038266e2e7948', // This is the TwiML URL with instructions for the call
    })
    .then(call => res.status(200).send({ callSid: call.sid }))
    .catch(error => res.status(500).send({ error: error.message }));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
