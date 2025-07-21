/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const resetPassword_func = async (password, passwordConfirm, token) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: `/api/v1/users/resetPassword/${token}`,
      data: { password, passwordConfirm }
    });

    if (res?.data?.status === 'success') {
      showAlert('success', 'Password reset successfully!');
      setTimeout(() => {
        location.assign('/login');
      }, 1500);
    }
  } catch (err) {
    console.error('Reset password error:', err);

    // Safe fallback if error has no response
    const message =
      err?.response?.data?.message || 'Something went wrong. Try again.';
    showAlert('error', message);
  }
};
