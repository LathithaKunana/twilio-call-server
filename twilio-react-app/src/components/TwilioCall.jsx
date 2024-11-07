import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPhone } from "react-icons/fa6";
import { Device } from "@twilio/voice-sdk";

const TwilioCall = () => {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [device, setDevice] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [receiverNumber, setReceiverNumber] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [isReceiver, setIsReceiver] = useState(false);

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userEmail = params.get("email");
    const userName = params.get("name");
    const userProfilePic = params.get("profilePic");
    const receiver = params.get("isReceiver");

    console.log("URL Parameters:", {
      email: userEmail,
      name: userName,
      profilePic: userProfilePic,
      isReceiver: receiver
    });

    setEmail(userEmail);
    setCallerName(userName);
    setProfilePic(userProfilePic);
    setIsReceiver(receiver === "true");

    // Fetch token if we have an email
    if (userEmail) {
      fetchToken(userEmail);
    }
  }, []);

  const fetchToken = async (userEmail) => {
    try {
      console.log("Fetching token for:", userEmail);
      const response = await axios.get(
        "https://twilio-call-server.vercel.app/api/token",
        {
          params: { email: userEmail }
        }
      );
      console.log("Token received:", response.data.token ? "Token present" : "No token");
      setToken(response.data.token);
      setupDevice(response.data.token);
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  const setupDevice = (newToken) => {
    try {
      // Clean up any existing device
      if (device) {
        device.destroy();
      }

      console.log("Setting up Twilio device");
      const newDevice = new Device(newToken, {
        debug: true, // Enable debug mode for more detailed logs
        enableRingingState: true
      });

      // Device listeners
      newDevice.on("registered", () => {
        console.log("Twilio device registered");
      });

      newDevice.on("error", (error) => {
        console.error("Twilio device error:", error);
      });

      newDevice.on("incoming", handleIncomingCall);

      setDevice(newDevice);
      console.log("Twilio device setup complete");
    } catch (error) {
      console.error("Error setting up device:", error);
    }
  };

  const handleIncomingCall = (call) => {
    console.log("Incoming call received:", call);
    setCurrentCall(call);
    // Auto answer if we're the receiver
    if (isReceiver) {
      call.accept();
      setCallInProgress(true);
    }
  };

  const initiateCall = async () => {
    if (!token || !receiverNumber) {
      alert(token ? "Please enter a phone number" : "Not authenticated");
      return;
    }

    try {
      console.log("Initiating call to:", receiverNumber);
      
      // Format the phone number
      const formattedNumber = receiverNumber.startsWith('+') 
        ? receiverNumber 
        : `+${receiverNumber.replace(/\D/g, '')}`;

      // Make the call through the Twilio Device
      const call = await device.connect({
        params: {
          To: formattedNumber,
          From: process.env.REACT_APP_TWILIO_PHONE_NUMBER,
          CallerName: callerName,
          CallerProfile: profilePic,
        }
      });

      console.log("Call initiated:", call);

      // Set up call listeners
      call.on("accept", () => {
        console.log("Call accepted");
        setCallInProgress(true);
      });

      call.on("disconnect", () => {
        console.log("Call disconnected");
        setCallInProgress(false);
        setCurrentCall(null);
      });

      setCurrentCall(call);
      setCallInProgress(true);

    } catch (error) {
      console.error("Error making call:", error);
      alert("Failed to make call. Please try again.");
      setCallInProgress(false);
    }
  };

  const endCall = () => {
    if (currentCall) {
      currentCall.disconnect();
      setCallInProgress(false);
      setCurrentCall(null);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-900">
      <div className="text-center">
        {profilePic && (
          <img
            src={profilePic}
            alt="Profile"
            className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white"
          />
        )}
        <h1 className="text-white text-3xl font-bold mb-2">
          {callerName || "Unknown User"}
        </h1>

        {!callInProgress ? (
          <>
            <input
              type="tel"
              placeholder="Enter phone number"
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
          </>
        ) : (
          <button
            onClick={endCall}
            className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full"
          >
            <FaPhone className="mr-2" /> End Call
          </button>
        )}
      </div>
    </div>
  );
};

export default TwilioCall;