const express = require('express');
const twilio = require('twilio');
require('dotenv').config();
const cors = require('cors');
const VoiceResponse = require('twilio').twiml.VoiceResponse;


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
app.use(express.urlencoded({ extended: true }));
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
  
// Voice webhook endpoint

// Voice webhook endpoint
app.post('/voice', (req, res) => {
  const params = {
    ...req.query,
    ...req.body
  };

  console.log('Voice webhook received:', {
    params,
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  
  const twiml = new VoiceResponse();
  
  // Get parameters from both body and query
  // const to = req.body.To || req.query.To;
  // const from = req.body.From || req.query.From || process.env.TWILIO_PHONE_NUMBER;
  // const callerName = req.body.callerName || req.query.callerName;
  
  // console.log('Call parameters:', { to, from, callerName });

  const formatPhoneNumber = (number) => {
    if (!number) return null;
    // Remove any non-digit characters
    let cleaned = number.toString().replace(/\D/g, '');
    
    // Handle South African numbers
    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    } else if (!cleaned.startsWith('27')) {
      cleaned = '27' + cleaned;
    }
    
    return '+' + cleaned;
  };

  
  try {
    const to = params.To || params.to;
    const from = params.From || params.from || process.env.TWILIO_PHONE_NUMBER;
    const callerName = params.CallerName || params.callerName;
    const callSubject = params.CallSubject || params.callSubject;
    const callerInfo = params.CallerInfo ? JSON.parse(params.CallerInfo) : null;
    
    console.log('Extracted call parameters:', { to, from, callerName, callSubject, callerInfo });

    if (!to) {
      console.error('No destination number found in request');
      twiml.say('Please provide a valid destination number.');
      return res.type('text/xml').send(twiml.toString());
    }

    const formattedTo = formatPhoneNumber(to);
    const formattedFrom = formatPhoneNumber(from);

    // Create the dial verb
    const dial = twiml.dial({
      callerId: formattedFrom,
      answerOnBridge: true,
      timeout: 20
    });
    
    // Add the Client element with custom parameters
    const client = dial.client();
    client.identity(formattedTo);
    
    // Add custom parameters that will be displayed on the receiver's end
    client.parameter({
      name: 'callerName',
      value: callerName || 'Unknown Caller'
    });
    
    client.parameter({
      name: 'callSubject',
      value: callSubject || 'No Subject'
    });

    if (callerInfo) {
      client.parameter({
        name: 'callerInfo',
        value: JSON.stringify(callerInfo)
      });
    }
    
    console.log('Generated TwiML:', twiml.toString());
    
  } catch (error) {
    console.error('Error in voice webhook:', error);
    twiml.say('An error occurred while processing your call.');
  }

  res.type('text/xml').send(twiml.toString());
});

// Add debugging to the call-status endpoint
app.post('/call-status', (req, res) => {
  console.log('Call Status Update:', {
    callSid: req.body.CallSid,
    callStatus: req.body.CallStatus,
    to: req.body.To,
    from: req.body.From,
    timestamp: new Date().toISOString(),
    direction: req.body.Direction,
    error: req.body.ErrorCode ? {
      code: req.body.ErrorCode,
      message: req.body.ErrorMessage
    } : null,
    fullBody: req.body
  });
  res.sendStatus(200);
});

// Update the make-call endpoint to use formatted numbers
app.post('/api/make-call', (req, res) => {
  const { to, from, callerName } = req.body;
  console.log('Request to make call:', req.body);

  if (!to || !from || !callerName) {
    console.error('Missing required fields: ', { to, from, callerName });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Format both numbers
  const formattedTo = formatPhoneNumber(to);
  const formattedFrom = formatPhoneNumber(from);

  console.log('Formatted numbers:', {
    to: formattedTo,
    from: formattedFrom
  });

  client.calls
    .create({
      to: formattedTo,
      from: formattedFrom,
      url: `${process.env.BASE_URL}/voice`, // Use your actual voice endpoint URL
      statusCallback: `${process.env.BASE_URL}/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    })
    .then(call => {
      console.log('Call initiated:', call.sid);
      res.status(200).send({ callSid: call.sid });
    })
    .catch(error => {
      console.error('Error making call:', error);
      res.status(500).send({ 
        error: 'There was an issue making the call.',
        details: error.message 
      });
    });
});
  

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
