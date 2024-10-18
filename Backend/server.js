const express = require('express');
const twilio = require('twilio');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Twilio credentials from your Twilio console
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_APIKEY_SID; // API Key SID for Twilio
const apiKeySecret = process.env.TWILIO_APIKEY_SECRETE;
const client = twilio(accountSid, authToken);

if (!accountSid || !authToken || !apiKeySid || !apiKeySecret) {
    console.error('Twilio credentials are not set properly in the .env file');
    process.exit(1);
}

// Uncomment this to handle cross-origin requests if needed
app.use(cors());
app.use(express.json());

app.get('/api/token', (req, res) => {
    const identity = req.query.email; // Use email as the identity
  
    // Check if the email parameter is provided
    if (!identity) {
      console.error('No email parameter provided.');
      return res.status(400).json({ error: 'Email parameter is required.' });
    }
  
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
  
    try {
      // Create an access token
      const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
        identity: identity // Set the user's email as the token identity
      });
  
      // Create a Voice grant and add it to the token
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: 'AP0abf44b1624ac279caae9a4fba3a2b4d', // TwiML App SID
        incomingAllow: true, // Allow incoming calls to this identity
      });
      token.addGrant(voiceGrant);
  
      // Return the token to the client
      res.json({ token: token.toJwt() });
    } catch (error) {
      console.error('Error generating token:', error); // Log the error for debugging
      res.status(500).json({ error: 'Internal Server Error' }); // Return a 500 error
    }
  });
  
  

// Endpoint to initiate a call
app.post('/api/make-call', (req, res) => {
    const { to, from, callerName } = req.body;
    console.log('Request from Adalo:', req.body);
  
    if (!to || !from || !callerName) {
        console.error('Missing required fields: ', { to, from, callerName });
        return res.status(400).json({ error: 'Missing required fields' });
    }
  
    client.calls
        .create({
            to: to,
            from: from,
            url: `https://handler.twilio.com/twiml/EH9eb88eaea0d52d22fb0038266e2e7948?callerName=${encodeURIComponent(callerName)}&To=${encodeURIComponent(to)}`, 
          })
        .then(call => res.status(200).send({ callSid: call.sid }))
        .catch(error => {
            console.error('Error making call:', error);
            res.status(500).send({ error: 'There was an issue making the call.' });
        });
  });
  

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
