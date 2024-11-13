import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPhone } from "react-icons/fa6";
import { Device } from "@twilio/voice-sdk";

const TwilioCall = () => {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [callSubject, setCallSubject] = useState("");
  const [receiverNumber, setReceiverNumber] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverProfilePic, setReceiverProfilePic] = useState("");
  const [device, setDevice] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isReceiver, setIsReceiver] = useState(false);

  const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  useEffect(() => {
    const userEmail = getQueryParam("email");
    const userName = getQueryParam("name");
    const userProfilePic = getQueryParam("profilePic");
    const receiver = getQueryParam("isReceiver");
    const phoneNumber = getQueryParam("phoneNumber");
    const userSubject = getQueryParam("subject");

    setEmail(userEmail);
    setCallerName(userName);
    setReceiverName(userName); // Add this line to set the receiver name
    setCallSubject(userSubject);
    setReceiverProfilePic(userProfilePic);
    setIsReceiver(receiver === "true");
    if (phoneNumber) setReceiverNumber(phoneNumber);

     // Debug logging
     console.log('Query Parameters:', {
      userEmail,
      userName,
      userProfilePic,
      receiver,
      phoneNumber,
      userSubject
    });

    if (userEmail) {
      const fetchToken = async () => {
        try {
          const response = await axios.get(
            "https://twilio-call-server.vercel.app/api/token",
            {
              params: { 
                email: userEmail,
                isReceiver: receiver === "true"
              },
            }
          );
          setToken(response.data.token);
          initializeTwilioDevice(response.data.token);
        } catch (error) {
          console.error("Error fetching token:", error);
        }
      };

      fetchToken();
    }
  }, []);

  const initializeTwilioDevice = (token) => {
    try {
      const newDevice = new Device(token, {
        enableRingingState: true,
        debug: true,
        // Add edge parameter for better connectivity
        edge: ['ashburn', 'dublin', 'singapore']
      });
      
      newDevice.register(); // Important: Register the device

      newDevice.on('registered', () => {
        console.log('Device registered successfully');
      });

      newDevice.on('incoming', (call) => {
        setIncomingCall(call);
        const callerInfo = call.parameters.From || 'Unknown Caller';
        setCallerName(callerInfo);
      });

      newDevice.on('connect', (connection) => {
        console.log('Connection established:', connection);
        setCallInProgress(true);
      });

      newDevice.on('error', (error) => {
        console.error('Twilio device error:', error);
        setCallInProgress(false);
        setCurrentCall(null);
      });

      setDevice(newDevice);
    } catch (error) {
      console.error('Error initializing Twilio device:', error);
    }
  };

  const initiateCall = async () => {
    if (!token || !receiverNumber) {
      alert(token ? "Please provide a receiver number." : "Missing authentication token.");
      return;
    }
  
    try {
      if (!device || device.state !== "registered") {
        console.error('Device not properly registered');
        alert("Device not ready. Please try again in a moment.");
        return;
      }
  
      // Format the phone number
      const formattedNumber = receiverNumber.startsWith('+') 
        ? receiverNumber 
        : `+${receiverNumber.replace(/\D/g, '')}`;
  
      // Create URL-encoded parameters for TwiML
      const twimlParams = new URLSearchParams({
        To: formattedNumber,
        From: "+27683204951",
        CallerName: callerName,
        CallerEmail: email,
        CallSubject: callSubject, // Add call subject
        // Add caller info as a JSON string
        CallerInfo: JSON.stringify({
          name: callerName,
          email: email,
          subject: callSubject,
          profilePic: receiverProfilePic
        })
      }).toString();
  
      console.log('Initiating call with encoded parameters:', twimlParams);
  
      const call = await device.connect({
        params: {
          To: formattedNumber,
          From: "+27683204951",
          CallerName: callerName,
          CallerEmail: email,
          CallSubject: callSubject, // Add call subject here too
          CallerInfo: JSON.stringify({
            name: callerName,
            email: email,
            subject: callSubject,
            profilePic: receiverProfilePic
          }),
          twimlUrl: `https://twilio-call-server.vercel.app/voice?${twimlParams}`
        }
      });
  
      console.log('Call initiated with params:', call.customParameters);

      // Add more detailed call event handling
      call.on('ringing', () => {
        console.log('Call is ringing');
      });

      call.on('accept', (connection) => {
        console.log('Call accepted:', connection);
        setCallInProgress(true);
      });
  
      call.on('disconnect', (connection) => {
        console.log('Call disconnected:', connection);
        setCallInProgress(false);
        setCurrentCall(null);
      });
  
      call.on('error', (error) => {
        console.error('Call error:', error);
        setCallInProgress(false);
        setCurrentCall(null);
      });
  
      setCurrentCall(call);
      setCallInProgress(true);
  
    } catch (error) {
      console.error("Error making call:", error);
      alert(`Call failed: ${error.message}`);
    }
  };

  const acceptIncomingCall = () => {
    if (incomingCall) {
      incomingCall.accept();
      setCallInProgress(true);
      setCurrentCall(incomingCall);
      setIncomingCall(null);
    }
  };

  const rejectIncomingCall = () => {
    if (incomingCall) {
      incomingCall.reject();
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    if (currentCall) {
      currentCall.disconnect();
    }
    setCallInProgress(false);
    setCurrentCall(null);
  };

  if (incomingCall) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-900">
        <div className="text-center">
          {receiverProfilePic && (
            <img
              src={receiverProfilePic}
              alt="Caller Profile"
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white"
            />
          )}
          <h1 className="text-white text-3xl font-bold mb-2">
            Incoming Call from {callerName}
          </h1>
          {callSubject && (
            <p className="text-white text-lg font-medium mb-4">
              Subject: {callSubject}
            </p>
          )}
          <div className="flex space-x-4">
            <button
              onClick={acceptIncomingCall}
              className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full"
            >
              <FaPhone className="mr-2" /> Accept
            </button>
            <button
              onClick={rejectIncomingCall}
              className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full"
            >
              <FaPhone className="mr-2" /> Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-900">
      {!callInProgress ? (
        <div className="text-center">
          {receiverProfilePic && (
            <img
              src={receiverProfilePic}
              alt="Receiver Profile"
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white"
            />
          )}
          <h1 className="text-white text-3xl font-bold mb-2">
            {receiverName || "Unknown Receiver"} {/* This will now show the correct name */}
          </h1>
          {/* Add subject display here */}
          {callSubject && (
            <p className="text-white text-xl mb-4">
              Call Subject: {callSubject}
            </p>
          )}
          <p className="text-white text-lg mb-8">{receiverNumber}</p>

          <input
            type="tel"
            placeholder="Enter the phone number to call"
            value={receiverNumber}
            onChange={(e) => setReceiverNumber(e.target.value)}
            className="mb-4 p-2 w-80 text-black rounded-md border border-gray-300"
          />

          <button
            onClick={initiateCall}
            className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full"
          >
            <FaPhone className="mr-2" /> Call
          </button>
        </div>
      ) : (
        <div className="text-center">
          {receiverProfilePic && (
            <img
              src={receiverProfilePic}
              alt="Receiver Profile"
              className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white"
            />
          )}
          <h1 className="text-white text-3xl font-bold mb-2">
            Call in Progress with {receiverName}
          </h1>
          <p className="text-white text-lg mb-8">{receiverNumber}</p>

          <button
            onClick={endCall}
            className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full"
          >
            <FaPhone className="mr-2" /> End Call
          </button>
        </div>
      )}
    </div>
  );
};

export default TwilioCall;
