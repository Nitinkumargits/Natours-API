/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51PZqQ5IxMdURXTfy804fwNYPiXxWqX3f0D8zenRYfUpIzQLm42AES8oYA9KStVh4k1dS7w967AxlRYUNnJQLCx5w00gg5TBMP1'
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    showAlert('error', err);
  }
};
