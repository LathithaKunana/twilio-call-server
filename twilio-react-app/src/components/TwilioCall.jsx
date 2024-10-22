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

  const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  // Function to notify Adalo that call has ended
  // const notifyAdaloCallEnded = () => {
  //   if (window.parent) {
  //     window.parent.postMessage({ type: 'CALL_ENDED' }, '*');
  //   }
  // };

  useEffect(() => {
    const userEmail = getQueryParam("email");
    const userName = getQueryParam("name");
    const userProfilePic = getQueryParam("profilePic");

    setEmail(userEmail);
    setCallerName(userEmail);
    setReceiverName(userName);
    setReceiverProfilePic(userProfilePic);

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
    const newDevice = new Device(token);
    
    newDevice.on('disconnect', (call) => {
      console.log('Call has been disconnected');
      setCallInProgress(false);
      setCurrentCall(null);
      // notifyAdaloCallEnded();
    });

    newDevice.on('error', (error) => {
      console.error('Twilio device error:', error);
      setCallInProgress(false);
      setCurrentCall(null);
      // notifyAdaloCallEnded();
    });

    setDevice(newDevice);
  };

  const initiateCall = async () => {
    if (!token || !receiverNumber) {
      alert(token ? "Please provide a receiver number." : "Missing authentication token.");
      return;
    }

    try {
      const response = await axios.post(
        "https://twilio-call-server.vercel.app/api/make-call",
        {
          to: receiverNumber,
          from: "+27683204951",
          callerName: callerName,
        }
      );

      console.log("Call initiated:", response.data);
      setCallInProgress(true);
      setCurrentCall(response.data.callSid);

    } catch (error) {
      console.error("Error making call:", error);
      alert(error.response?.data?.error || "Unable to make the call. Please check your connection.");
    }
  };

  const endCall = () => {
    if (device && currentCall) {
      device.disconnectAll();
    }
    setCallInProgress(false);
    setCurrentCall(null);
    // notifyAdaloCallEnded();
  };

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
            Call in Progress...
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