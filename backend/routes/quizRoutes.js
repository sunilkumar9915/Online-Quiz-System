const express = require("express");
const Quiz = require("../models/Quiz");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
    try {
        const quizzes = await Quiz.find();

        res.json(quizzes);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        res.json(quiz);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const quiz = await Quiz.create(req.body);

            res.status(201).json({
                message: "Quiz created successfully",
                quiz
            });

        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);

router.put(
    "/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const quiz = await Quiz.findByIdAndUpdate(
                req.params.id,
                req.body,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!quiz) {
                return res.status(404).json({
                    message: "Quiz not found"
                });
            }

            res.json({
                message: "Quiz updated successfully",
                quiz
            });

        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);

router.delete(
    "/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const quiz = await Quiz.findByIdAndDelete(
                req.params.id
            );

            if (!quiz) {
                return res.status(404).json({
                    message: "Quiz not found"
                });
            }

            res.json({
                message: "Quiz deleted successfully"
            });

        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);

module.exports = router;