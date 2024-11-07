const express = require('express');
const twilio = require('twilio');
require('dotenv').config();
const cors = require('cors');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const app = express();
const port = process.env.PORT || 3000;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_APIKEY_SID;
const apiKeySecret = process.env.TWILIO_APIKEY_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID; // Add this to your .env file
const client = twilio(accountSid, authToken);

if (!accountSid || !authToken || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    console.error('Twilio credentials are not set properly in the .env file');
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Token generation endpoint
app.get('/api/token', (req, res) => {
    const identity = req.query.email;
  
    if (!identity) {
      return res.status(400).json({ error: 'Email parameter is required.' });
    }
  
    try {
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;
  
      const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
        identity: identity,
        ttl: 3600 // Token expires in 1 hour
      });
  
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true
      });
      
      token.addGrant(voiceGrant);
  
      res.json({ token: token.toJwt() });
    } catch (error) {
      console.error('Error generating token:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Voice webhook endpoint
app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    
    console.log('Voice webhook received:', req.body);
    
    try {
        // Handle browser-to-phone calls
        if (req.body.To && !req.body.To.startsWith('client:')) {
            const dial = twiml.dial({
                callerId: process.env.TWILIO_PHONE_NUMBER,
                answerOnBridge: true, // This enables call bridging
                record: 'record-from-answer' // Optional: records the call
            });
            
            dial.number({
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallback: `${process.env.BASE_URL}/call-status`
            }, req.body.To);
        }
        // Handle browser-to-browser calls
        else if (req.body.To && req.body.To.startsWith('client:')) {
            const dial = twiml.dial({
                answerOnBridge: true
            });
            
            dial.client({
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallback: `${process.env.BASE_URL}/call-status`
            }, req.body.To.split(':')[1]);
        }
        // Default response if no valid 'To' parameter
        else {
            twiml.say('Thanks for calling! Please provide a valid destination.');
        }
        
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error in /voice webhook:', error);
        const errorResponse = new VoiceResponse();
        errorResponse.say('An error occurred processing your call.');
        res.type('text/xml');
        res.send(errorResponse.toString());
    }
});

// Call status webhook
app.post('/call-status', (req, res) => {
    console.log('Call Status Update:', req.body);
    res.sendStatus(200);
});

// Handle call status updates


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

  // Add this new endpoint to handle call status updates
app.post('/api/call-ended', async (req, res) => {
  const { userId, appId, status } = req.body;
  
  try {
    // Make a request to your Adalo collection
    const response = await axios.post(`https://api.adalo.com/v0/apps/${appId}/collections/CallStatus`, {
      user_id: userId,
      status: status,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.ADALO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating Adalo:', error);
    res.status(500).json({ error: 'Failed to update call status' });
  }
});
  

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
