import { Router, Request, Response } from 'express';
import express from 'express';
import Stripe from 'stripe';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import CabSplit from '../models/CabSplit';
import emailService from '../services/emailService';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// ─── CREATE PAYMENT INTENT ────────────────────────────────────────────────────
router.post('/create-intent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, amount, type } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'inr',
      metadata: {
        bookingId: bookingId || '',
        userId: req.user!.id,
        type: type || 'ticket',
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ message: 'Error creating payment' });
  }
});

// ─── CONFIRM PAYMENT ──────────────────────────────────────────────────────────
router.post('/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: `Payment not completed. Status: ${paymentIntent.status}`,
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.stripePaymentIntentId = paymentIntentId;
    await booking.save();

    emailService.sendTicketEmail(booking, req.user!.email).catch((err: Error) => {
      console.error('Email send failed:', err);
    });

    booking.ticketEmailed = true;
    await booking.save();

    res.json({ message: 'Payment confirmed! Ticket emailed to you.', booking });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
});

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const intent = event.data.object as Stripe.PaymentIntent;
        if (intent.metadata.type === 'cab') {
          await CabSplit.findOneAndUpdate(
            { 'participants.stripePaymentIntentId': intent.id },
            { $set: { 'participants.$.paid': true } }
          );
        }
        break;
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        break;
      default:
        console.log('Unhandled webhook event:', event.type);
    }

    res.json({ received: true });
  }
);

export default router;