const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const factory = require('./handlerFactory');
// const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Checkout session.
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) {
    return res.redirect('/?alert=booking_failed');
  }

  // Prefer X-Forwarded-Proto (set by the CDN/proxy) so success/cancel URLs
  // stay on https even if Node sees the local hop as http.
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol =
    (typeof forwardedProto === 'string' && forwardedProto.split(',')[0]) ||
    req.protocol;
  const host = req.get('host');

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      success_url: `${protocol}://${host}/my-tours?alert=booking`,
      cancel_url: `${protocol}://${host}/tour/${tour.slug}`,
      customer_email: req.user.email,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${tour.name} Tour`,
              description: tour.summary,
              images: [
                `${protocol}://${host}/img/tours/${tour.imageCover}`,
              ],
            },
            unit_amount: tour.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
    });
  } catch (err) {
    // Never leak Stripe internals (incl. partial secret key) to the
    // client. Log server-side and redirect with a generic alert.
    console.error('Stripe checkout session creation failed:', err.message);
    return res.redirect(`/tour/${tour.slug}?alert=booking_failed`);
  }

  return res.redirect(303, session.url);
});

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email }))?.id;
  const price = session.amount_total / 100;

  if (!tour || !user) {
    console.log('⚠️ Tour or user not found. Skipping booking creation.');
    return;
  }

  await Booking.create({ tour, user, price });
  console.log('✅ Booking created:', { tour, user, price });
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
