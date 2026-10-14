const express = require("express");
const Result = require("../models/Result");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
    try {
        const {
            quiz,
            score,
            totalQuestions,
            percentage
        } = req.body;

        const result = await Result.create({
            user: req.user.id,
            quiz,
            score,
            totalQuestions,
            percentage
        });

        res.status(201).json({
            message: "Result saved successfully",
            result
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/my-results", authMiddleware, async (req, res) => {
    try {
        const results = await Result.find({
            user: req.user.id
        })
        .populate("quiz", "title duration")
        .sort({ completedAt: -1 });

        res.json(results);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get("/", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Admin access required"
            });
        }

        const results = await Result.find()
            .populate("user", "name email")
            .populate("quiz", "title")
            .sort({ completedAt: -1 });

        res.json(results);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;