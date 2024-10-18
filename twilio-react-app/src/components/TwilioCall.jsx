import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPhone } from "react-icons/fa6";

const TwilioCall = () => {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [callInProgress, setCallInProgress] = useState(false);
  const [callerName, setCallerName] = useState("");
  const [receiverNumber, setReceiverNumber] = useState("");

  // Function to get query parameter (email passed from Adalo)
  const getQueryParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  useEffect(() => {
    // Get the email from the query string
    const userEmail = getQueryParam("email");
    setEmail(userEmail);
    setCallerName(userEmail); // Set email as caller name

    if (userEmail) {
      // Fetch the Twilio token when the component loads
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
    // Log the current values of receiverNumber and token
    console.log('Receiver Number:', receiverNumber);
    console.log('Token:', token);
  
    // Check if the token is valid
    if (!token) {
      alert('Error: Missing authentication token. Please try again.');
      return;
    }
  
    // Check if the receiver number is provided
    if (!receiverNumber) {
      alert('Error: Please provide a receiver number.');
      return;
    }
  
    try {
      const response = await axios.post('https://twilio-call-server.vercel.app/api/make-call', {
        to: receiverNumber,
        from: '+27683204951', // Replace with your Twilio number
        callerName: callerName, // Include the caller's name
      });
  
      console.log('Call initiated:', response.data);
      setCallInProgress(true);
    } catch (error) {
      // Log the full error response for more information
      console.error('Error making call:', error.response || error.message);
      
      // Provide a user-friendly error message based on the error response
      if (error.response && error.response.data) {
        alert(`Error: ${error.response.data.error || 'There was an issue making the call.'}`);
      } else {
        alert('Error: Unable to make the call. Please check your connection and try again.');
      }
    }
  };

  const endCall = () => {
    // Logic to end the call can go here (not implemented in this version)
    console.log("Ending call...");
    setCallInProgress(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Twilio In-App Call</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Username (Email):
        </label>
        <input
          type="text"
          value={callerName}
          readOnly
          className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receiver Phone Number:
        </label>
        <input
          type="tel"
          placeholder="Enter the phone number to call"
          value={receiverNumber}
          onChange={(e) => setReceiverNumber(e.target.value)}
          className="w-full border border-gray-300 p-2 rounded-lg"
        />
      </div>

      <div className="flex space-x-4">
        {!callInProgress ? (
          <button
            onClick={initiateCall}
            className="flex items-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full"
          >
            <FaPhone className="mr-2" /> Call
          </button>
        ) : (
          <button
            onClick={endCall}
            className="flex items-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full"
          >
            <FaPhone className="mr-2" /> End Call
          </button>
        )}
      </div>

      {callInProgress && (
        <div className="mt-4 text-green-500 font-bold">
          Call in progress... (Receiver: {receiverNumber})
        </div>
      )}
    </div>
  );
};

export default TwilioCall;
