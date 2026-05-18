const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorContoller');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');

const app = express();

// Trust the first proxy hop (nginx in front of the Node process) so
// req.secure and req.ip reflect the original client connection.
app.set('trust proxy', 1);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://js.stripe.com',
          'https://cdnjs.cloudflare.com',
        ],
        scriptSrcElem: [
          "'self'",
          'https://api.mapbox.com',
          'https://js.stripe.com',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: [
          "'self'",
          'https://api.mapbox.com',
          'https://fonts.googleapis.com',
          "'unsafe-inline'",
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        workerSrc: ["'self'", 'blob:'],
        connectSrc: [
          "'self'",
          'https://*.mapbox.com',
          'https://api.stripe.com',
          'https://cdnjs.cloudflare.com',
          ...(process.env.NODE_ENV === 'production'
            ? []
            : ['ws://localhost:*', 'ws://127.0.0.1:*']),
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://api.mapbox.com',
          'https://*.tiles.mapbox.com',
          'https://events.mapbox.com',
        ],
        frameSrc: ["'self'", 'https://js.stripe.com'],
      },
    },
  })
);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Stripe webhook — MUST be mounted before express.json() so the raw body
// is preserved for signature verification.
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(compression());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
