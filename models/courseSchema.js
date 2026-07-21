const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true }
});

const lessonSchema = new mongoose.Schema({
  // id: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: String, default: "15 mins" },
  videoUrl: { type: String, default: "" },
  content: { type: String, default: "" },
  resources: [resourceSchema]
});

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true }
});

const moduleSchema = new mongoose.Schema({
  // id: { type: String, required: true },
  title: { type: String, required: true },
  lessons: [lessonSchema],
  quiz: [quizQuestionSchema]
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  longDescription: { type: String, default: "" },
  price: { type: String, default: "Free" },
  level: { type: String, default: "Beginner" },
  duration: { type: String, default: "2 Hours" },
  modules: [moduleSchema],
  quiz: [quizQuestionSchema],
  imgUrl: { type: String, default: process.env.DEFAULT_COURSE_IMG }
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
