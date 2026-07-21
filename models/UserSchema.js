const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  enrollments: {
    type: [
      {
        courseId:{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Course',
          required: true,
        },
        paymentId: {
          type: String,
          default: null,
        },
        orderId: {
          type: String,
          default: null,
        },
        signature: {
          type: String,
          default: null,
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid', 'failed'],
          default: 'pending',
        },
        amount: {
          type: Number,
          default: 0,
        },
        currency: {
          type: String,
          default: 'INR',
        },
        enrollmentDate: {
          type: Date,
          default: Date.now,
        },
        completedLessons:{
          type: Array,
          default: [],
        },
        completedQuizzes:{
          type: Array,
          default: [],
        },
        completed:{
          type: Boolean,
          default: false,
        }
      }

    ],

    default: [],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;