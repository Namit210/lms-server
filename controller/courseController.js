const express = require("express");
const router = express.Router();
const Course = require("../models/courseSchema");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

// GET all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses", error: error.message });
  }
});

// GET course by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    // Fixed: Combined into one object argument
    res.json(course, {ok: true }); 
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ message: "Error fetching course", error: error.message });
  }
});

// POST save course (Create or Update)
router.post("/", auth, authorize(["admin"]), async (req, res) => {
  try {
    const courseData = req.body;
    let course;

    if (courseData._id) { 
      // Update existing course using a cleaner Mongoose method
      const { __v, _id, ...updateData } = courseData;
      course = await Course.findByIdAndUpdate(_id, updateData, { new: true, runValidators: true });
      
      if (!course) {
        return res.status(404).json({ message: "Course not found for update" });
      }
    } else {
      // Create new course
      course = new Course({
        modules: [],
        quiz: [],
        ...courseData
      });
      await course.save();
    }

    res.status(200).json({ course, ok: true });
  } catch (error) {
    console.error("Error saving course:", error);
    res.status(500).json({ message: "Error saving course", error: error.message });
  }
});

// DELETE course by ID (Fixed to use standard URL parameters)
router.delete("/:id", auth, authorize(["admin"]), async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findByIdAndDelete(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ message: "Course deleted successfully", course });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course", error: error.message });
  }
});

module.exports = router;
