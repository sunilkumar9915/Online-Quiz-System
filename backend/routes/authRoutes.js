const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const Result = require("../models/Result");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student"
        });

        res.status(201).json({
            message: "Signup successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        res.status(500).json({
            message: "Signup failed"
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

router.get(
    "/stats",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const totalUsers = await User.countDocuments();

            const totalQuizzes = await Quiz.countDocuments();

            const totalAttempts = await Result.countDocuments();

            const averageResult = await Result.aggregate([
                {
                    $group: {
                        _id: null,
                        averageScore: {
                            $avg: "$percentage"
                        }
                    }
                }
            ]);

            const averageScore = averageResult.length > 0
                ? Math.round(averageResult[0].averageScore)
                : 0;

            res.json({
                totalUsers,
                totalQuizzes,
                totalAttempts,
                averageScore
            });
        } catch (error) {
            res.status(500).json({
                message: "Unable to load statistics"
            });
        }
    }
);

module.exports = router;
