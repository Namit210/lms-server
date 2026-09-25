const express =require( "express");
const mongoose = require( "mongoose");
const User = require( "../models/UserSchema.js");
const Course =require( "../models/courseSchema.js");
const { internalPaymentAuth } =require( "../middleware/internalPaymentAuth.js");

const router = express.Router();

router.post(
  "/internal/enroll",
  internalPaymentAuth,
  async (req, res) => {
    try {
      const {
        user_id,
        course_id,
        payment_id,
        order_id,
        signature,
        amount,
        currency = "INR",
      } = req.body;

      // -----------------------------------------
      // Validate required fields
      // -----------------------------------------

      if (!user_id || !course_id) {
        return res.status(400).json({
          success: false,
          message: "user_id and course_id are required",
        });
      }

      if (!payment_id) {
        return res.status(400).json({
          success: false,
          message: "payment_id is required",
        });
      }

      // -----------------------------------------
      // Validate MongoDB IDs
      // -----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user_id",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(course_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course_id",
        });
      }

      // -----------------------------------------
      // Find user
      // -----------------------------------------

      const user = await User.findById(user_id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // -----------------------------------------
      // Find course
      // -----------------------------------------

      const course = await Course.findById(course_id);

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }


      // -----------------------------------------
      // Check if already enrolled
      // -----------------------------------------

      const existingEnrollment =
        user.enrollments.find(
          (enrollment) =>
            String(enrollment.courseId) ===
            String(course_id)
        );

      if (existingEnrollment) {

        // Already paid
        if (existingEnrollment.paymentStatus === "paid") {
          return res.status(200).json({
            success: true,
            message: "User already enrolled",
            alreadyEnrolled: true,
          });
        }

        // If an old pending/failed enrollment exists,
        // update it instead of creating another one.
        existingEnrollment.paymentId = payment_id;
        existingEnrollment.orderId = order_id || null;
        existingEnrollment.signature =
          signature || null;
        existingEnrollment.paymentStatus = "paid";
        existingEnrollment.amount = amount || 0;
        existingEnrollment.currency = currency;

        await user.save();

        return res.status(200).json({
          success: true,
          message: "Enrollment updated",
          alreadyEnrolled: false,
        });
      }

      //duplicate payment check
      const existingPayment = user.enrollments.find(
  (enrollment) =>
    enrollment.paymentId === payment_id
);

if (existingPayment) {
  return res.status(200).json({
    success: true,
    message: "Payment already processed",
    alreadyProcessed: true,
  });
}


      // -----------------------------------------
      // Create new enrollment
      // -----------------------------------------

      user.enrollments.push({
        courseId: course_id,
        paymentId: payment_id,
        orderId: order_id || null,
        signature: signature || null,
        paymentStatus: "paid",
        amount: amount || 0,
        currency,
        enrollmentDate: new Date(),
        completedLessons: [],
        completedQuizzes: [],
        completed: false,
      });

      await user.save();

      return res.status(201).json({
        success: true,
        message: "User enrolled successfully",
      });

    } catch (error) {
      console.error(
        "Internal enrollment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Enrollment failed",
      });
    }
  }
);

module.exports = router;
