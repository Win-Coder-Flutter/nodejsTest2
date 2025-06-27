require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user_model");
const { formatMsg } = require("../helpers/responseFormatter");

const SECRET_KEY = process.env.SECRET_KEY;

exports.memberRegister = async (req, res) => {
    const { name, age, password, gender } = req.body;

    if (!name || !age || !password || !gender) {
        return res.status(400).json(formatMsg("Name, age, gender, and password are required", "400"));
    }

    try {
        const existing = await User.findOne({ name });
        if (existing) {
            return res.status(400).json(formatMsg("User already exists", "400"));
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ name, age, gender, password: hashedPassword });

        const token = jwt.sign({ id: newUser._id, name: newUser.name }, SECRET_KEY, { expiresIn: "1h" });

        res.status(201).json(formatMsg("Member registered successfully", "201", {
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                age: newUser.age,
                gender: newUser.gender
            }
        }));
    } catch (err) {
        res.status(500).json(formatMsg("Error registering user", "500"));
    }
};

exports.login = async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json(formatMsg("Name and password are required", "400"));
    }

    try {
        const user = await User.findOne({ name });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json(formatMsg("Invalid credentials", "401"));
        }

        const token = jwt.sign({ id: user._id, name: user.name }, SECRET_KEY, { expiresIn: "1h" });

        res.status(200).json(formatMsg("Login successful", "200", {
            token,
            user: {
                id: user._id,
                name: user.name,
                age: user.age,
                gender: user.gender
            }
        }));
    } catch (err) {
        res.status(500).json(formatMsg("Login failed", "500"));
    }
};

exports.getAllUser = async (req, res) => {
    try {
        const users = await User.find({}, "-password -__v");
        res.status(200).json(formatMsg("Success", "200", users));
    } catch (err) {
        res.status(500).json(formatMsg("Server error", "500"));
    }
};

exports.singleUser = async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json(formatMsg("User ID is required", "400"));

    try {
        const user = await User.findById(id).select("-password -__v");
        if (user) {
            res.status(200).json(formatMsg("Success", "200", user));
        } else {
            res.status(404).json(formatMsg("User Not Found", "404"));
        }
    } catch (err) {
        res.status(400).json(formatMsg("Invalid user ID", "400"));
    }
};

exports.filterByName = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json(formatMsg("Name is required", "400"));
    }

    try {
        const matched = await User.find({ name: new RegExp(name, "i") }).select("-password -__v");
        if (matched.length > 0) {
            res.status(200).json(formatMsg("Success", "200", matched));
        } else {
            res.status(404).json(formatMsg("No users matched", "404"));
        }
    } catch (err) {
        res.status(500).json(formatMsg("Server error", "500"));
    }
};
