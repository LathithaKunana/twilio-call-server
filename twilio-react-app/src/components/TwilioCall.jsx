import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPhone } from "react-icons/fa6";

const TwilioCall = () => {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [receiverNumber, setReceiverNumber] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverProfilePic, setReceiverProfilePic] = useState("");

  const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  useEffect(() => {
    const userEmail = getQueryParam("email");
    const userName = getQueryParam("name");
    const userProfilePic = getQueryParam("profilePic");

    setEmail(userEmail);
    setCallerName(userEmail); // Set email as caller name
    setReceiverName(userName); // Set receiver's name
    setReceiverProfilePic(userProfilePic); // Set receiver's profile picture

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
          console.log(response.data.token);
        } catch (error) {
          console.error("Error fetching token:", error);
        }
      };

      fetchToken();
    }
  }, []);

  const initiateCall = async () => {
    console.log("Receiver Number:", receiverNumber);
    console.log("Token:", token);

    if (!token) {
      alert("Error: Missing authentication token. Please try again.");
      return;
    }

    if (!receiverNumber) {
      alert("Error: Please provide a receiver number.");
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
    } catch (error) {
      console.error("Error making call:", error.response || error.message);
      if (error.response && error.response.data) {
        alert(
          `Error: ${
            error.response.data.error || "There was an issue making the call."
          }`
        );
      } else {
        alert("Error: Unable to make the call. Please check your connection.");
      }
    }
  };

  const endCall = () => {
    console.log("Ending call...");
    setCallInProgress(false);
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
