import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPhone } from "react-icons/fa6";
import { Device } from "@twilio/voice-sdk";

const TwilioCall = () => {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callerName, setCallerName] = useState("");
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

    setEmail(userEmail);
    setCallerName(userName);
    setReceiverProfilePic(userProfilePic);
    setIsReceiver(receiver === "true");

    if (userEmail) {
      const fetchToken = async () => {
        try {
          const response = await axios.get(
            "https://twilio-call-server.vercel.app/api/token",
            {
              params: { email: userEmail },
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
    const newDevice = new Device(token, {
      // Enable incoming calls
      enableRingingState: true,
    });
    
    // Handle incoming calls
    newDevice.on('incoming', (call) => {
      setIncomingCall(call);
      
      // Get custom parameters from the call
      const callerInfo = call.customParameters.get('callerInfo');
      if (callerInfo) {
        const { name, profilePic } = JSON.parse(callerInfo);
        setCallerName(name);
        setReceiverProfilePic(profilePic);
      }
    });

    newDevice.on('disconnect', (call) => {
      console.log('Call has been disconnected');
      setCallInProgress(false);
      setCurrentCall(null);
      setIncomingCall(null);
    });

    newDevice.on('error', (error) => {
      console.error('Twilio device error:', error);
      setCallInProgress(false);
      setCurrentCall(null);
      setIncomingCall(null);
    });

    setDevice(newDevice);
  };

  const initiateCall = async () => {
    if (!token || !receiverNumber) {
      alert(token ? "Please provide a receiver number." : "Missing authentication token.");
      return;
    }
  
    try {
      const params = {
        // Format the phone number to E.164 format
        To: receiverNumber.startsWith('+') ? receiverNumber : `+${receiverNumber}`,
        From: process.env.REACT_APP_TWILIO_PHONE_NUMBER, // Add this to your .env file
        callerInfo: JSON.stringify({
          name: callerName,
          profilePic: receiverProfilePic,
        })
      };
  
      const call = await device.connect({ params });
      
      call.on('accept', () => {
        console.log('Call accepted');
        setCallInProgress(true);
      });
  
      call.on('disconnect', () => {
        console.log('Call ended');
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
      alert("Unable to make the call. Please check your connection.");
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

  // Incoming call UI
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

  // Regular call UI (same as before)
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-900">
      {!callInProgress ? (
        <>
          <div className="text-center">
            {receiverProfilePic && (
              <img
                src={receiverProfilePic}
                alt="Receiver Profile"
                className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white"
              />
            )}
            <h1 className="text-white text-3xl font-bold mb-2">
              {receiverName || "Unknown Receiver"}
            </h1>
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
        </>
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