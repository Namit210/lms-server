const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Course = require('../models/courseSchema');
const User = require('../models/UserSchema');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZOR_KEY,
  key_secret: process.env.RAZOR_SECRET,
});

function parseCourseAmount(coursePrice) {
  if (coursePrice == null) return 0;
  const normalized = String(coursePrice).toLowerCase().trim();
  if (!normalized || normalized === 'free') return 0;

  const numeric = normalized.replace(/[^0-9.]/g, '');
  const amount = Number.parseFloat(numeric);
  if (Number.isNaN(amount) || amount <= 0) return 0;

  return Math.round(amount * 100);
}

function buildReceipt(courseId, userId) {
  const coursePart = String(courseId).slice(-6);
  const userPart = String(userId).slice(-6);
  const timePart = Date.now().toString().slice(-6);
  return `c${coursePart}u${userPart}t${timePart}`;
}

router.post('/create-order', async (req, res) => {
  try {
    const { courseId, userId } = req.body;

    if (!courseId || !userId) {
      return res.status(400).json({ message: 'courseId and userId are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid courseId or userId' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const amount = parseCourseAmount(course.price);
    if (amount === 0) {
      return res.status(400).json({ message: 'This course does not require payment' });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: buildReceipt(course._id, user._id),
      notes: {
        courseId: String(course._id),
        userId: String(user._id),
      },
    });

    res.status(200).json({
      ok: true,
      order,
      key: process.env.RAZOR_KEY,
      amount,
      currency: 'INR',
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { courseId, userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!courseId || !userId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification data' });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid courseId or userId' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZOR_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingEnrollment = user.enrollments.find((enrollment) => String(enrollment.courseId) === String(courseId));
    if (existingEnrollment) {
      existingEnrollment.paymentId = razorpay_payment_id;
      existingEnrollment.orderId = razorpay_order_id;
      existingEnrollment.signature = razorpay_signature;
      existingEnrollment.paymentStatus = 'paid';
    } else {
      user.enrollments.push({
        courseId: course._id,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        signature: razorpay_signature,
        paymentStatus: 'paid',
        amount: parseCourseAmount(course.price),
        currency: 'INR',
        enrollmentDate: new Date(),
        completedLessons: [],
        completedQuizzes: [],
        completed: false,
      });
    }

    await user.save();

    res.status(200).json({ ok: true, message: 'Payment verified and course enrolled', user });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

module.exports = router;