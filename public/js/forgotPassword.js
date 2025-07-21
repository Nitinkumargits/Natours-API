/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const forgotPassword_funtion = async email => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/forgotPassword', // ✅ Correct path
      data: { email }
    });

    console.log('response', res);
    if (res.data.status === 'success') {
      showAlert('success', 'Kindly check your Email');
    }
  } catch (err) {
    console.log(err.response?.data || err.message);
    showAlert('error', 'Failed to send reset link. Please try again.');
  }
};
