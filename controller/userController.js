const router = require("express").Router();
const User = require("../models/UserSchema");
const bcrypt = require("bcryptjs");
const Course = require("../models/courseSchema");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

// GET all users
router.get("/",auth,authorize(["admin"]), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// GET user by ID
router.get("/:id",auth,authorize(["admin","user"]), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
});

// POST update user
router.post("/",auth,authorize(["admin","user"]), async (req, res) => {
  try {
    const userData = req.body;
    if (userData._id) { // Update existing user
      let user = await User.findById(userData._id);
      if (user) {
        Object.assign(user, userData);
        await user.save();
      } else {
        return res.status(404).json({ message: "User not found for update" });
      }
    } else{
      res.status(400).json({ message: "User ID is required for update" });
    }
    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({ message: "Error saving user", error: error.message });
  }
});

// DELETE user by ID
router.delete("/",auth,authorize(["admin","user"]), async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully", ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
});
//==========================================================

// route for enrolling a user in a course
router.post("/enroll",auth,authorize(["admin","user"]), async (req, res) => {
  try {
    const { courseId, userId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is already enrolled in the course
    const isAlreadyEnrolled = user.enrollments.some(enrollment => enrollment.courseId.toString() === courseId);
    if (isAlreadyEnrolled) {
      return res.status(200).json({ message: "User is already enrolled in this course", user, ok: true });
    }

    // Add the enrollment to the user's enrollments array
    user.enrollments.push({
      courseId: course._id,
      enrollmentDate: new Date(),
      completedLessons: [],
      completedQuizzes: [],
      completed: false
    });

    await user.save();

    res.status(200).json({ message: "User enrolled successfully", user, ok: true });

    
  } catch (error) {
    res.status(500).json({ message: "Error enrolling user", error: error.message });
  }
});

// route for marking a lesson as completed
router.post("/complete-lesson",auth,authorize(["admin","user"]), async (req, res) => {
  try {
    const { courseId, userId, lessonId } = req.body;

    if(!courseId || !userId || !lessonId){
      return res.status(400).json({ message: "courseId, userId, and lessonId are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the enrollment for the specified course
    const enrollment = user.enrollments.find(enrollment => enrollment.courseId.toString() === courseId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found for this course" });
    }

    // Check if the lesson is already marked as completed
    if (enrollment.completedLessons.includes(lessonId)) {
      return res.status(400).json({ message: "Lesson already marked as completed" });
    }

    // Mark the lesson as completed
    enrollment.completedLessons.push(lessonId);

    // Check if all lessons in the course are completed
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const allLessonIds = course.modules.flatMap(module => module.lessons.map(lesson => lesson._id.toString()));
    const isCourseCompleted = allLessonIds.every(lessonId => enrollment.completedLessons.includes(lessonId));

    // Update the completed status of the enrollment
    enrollment.completed = isCourseCompleted;

    await user.save();

    res.status(200).json({ message: "Lesson marked as completed", enrollment, ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error marking lesson as completed", error: error.message });
  }
});

// route for submitting a module quiz result
router.post("/submit-quiz",auth,authorize(["admin","user"]), async (req, res) => {
  try {
    const { courseId, moduleId, userId, score, passed } = req.body;

    if (!courseId || !moduleId || !userId) {
      return res.status(400).json({ message: "courseId, moduleId, and userId are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollment = user.enrollments.find((entry) => entry.courseId.toString() === courseId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found for this course" });
    }

    const submission = {
      moduleId,
      score: Number(score) || 0,
      passed: Boolean(passed),
      submittedAt: new Date(),
    };

    const completedQuizzes = Array.isArray(enrollment.completedQuizzes) ? [...enrollment.completedQuizzes] : [];
    const existingIndex = completedQuizzes.findIndex((quiz) => String(quiz.moduleId) === String(moduleId));

    if (existingIndex >= 0) {
      completedQuizzes[existingIndex] = submission;
    } else {
      completedQuizzes.push(submission);
    }

    enrollment.completedQuizzes = completedQuizzes;

    const allLessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson._id.toString()));
    const allLessonsCompleted = allLessonIds.every((lessonId) => enrollment.completedLessons.includes(lessonId));
    const quizModuleIds = course.modules
      .filter((module) => Array.isArray(module.quiz) && module.quiz.length > 0)
      .map((module) => module._id.toString());
    const passedQuizModuleIds = new Set(
      completedQuizzes
        .filter((quiz) => quiz.passed)
        .map((quiz) => String(quiz.moduleId))
    );
    const allQuizzesPassed = quizModuleIds.length === 0 || quizModuleIds.every((quizModuleId) => passedQuizModuleIds.has(quizModuleId));

    enrollment.completed = allLessonsCompleted && allQuizzesPassed;

    await user.save();

    res.status(200).json({ message: "Quiz submitted successfully", enrollment, ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error submitting quiz", error: error.message });
  }
});

module.exports = router;