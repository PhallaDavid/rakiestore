import axios from 'axios';

export const sendOTP = async (phone, otp) => {
  const privateKey = "5U3ro4gz4DS_ncwb6i1cs5YuHQrIC9oWJpL4zAN__EqlecHKv-D59mXrtX9Ol9RUIiYz_JqVmhUKxKe1bEo1Fg"
  const secret = "$5$rounds=535000$YBHOX8NqOxzgUbvB$kvHYSvd1TOl1eXo7UkOunKrvrrjPgiP7kg4cKItNRH2"
  const sender = "PlasGateUAT";

  if (!privateKey || !secret) {
    console.error('Plasgate credentials missing in .env');
    throw new Error('SMS service configuration error');
  }

  const url = `https://cloudapi.plasgate.com/rest/send?private_key=${privateKey}`;
  const data = {
    sender: sender,
    to: phone,
    content: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'X-Secret': secret,
        'Content-Type': 'application/json'
      }
    });

    console.log('Plasgate response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending OTP via Plasgate:', error.response ? error.response.data : error.message);
    throw new Error('Failed to send OTP');
  }
};
