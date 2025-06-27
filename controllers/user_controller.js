require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user_model");
const { formatMsg } = require("../helpers/responseFormatter");


const SECRET_KEY = process.env.SECRET_KEY;

exports.memberRegister = async (req, res) => {
    const { name, email, age, password, gender } = req.body;

    if (!name || !email || !age || !password || !gender) {
        return res.status(400).json(formatMsg("Name, email, age, gender, and password are required", "400"));
    }

    try {
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json(formatMsg("Email already registered", "400"));
        }

        const existingName = await User.findOne({ name });
        if (existingName) {
            return res.status(400).json(formatMsg("Username already taken", "400"));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            age,
            gender,
            password: hashedPassword
        });

        const token = jwt.sign(
            { id: newUser._id, name: newUser.name },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        // ✅ Fixed: include email in the response
        res.status(201).json(formatMsg("Member registered successfully", "201", {
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email, // ✅ this was missing before
                age: newUser.age,
                gender: newUser.gender
            }
        }));
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json(formatMsg("Error registering user", "500"));
    }
};


exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json(formatMsg("Email and password are required", "400"));
    }

    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json(formatMsg("Invalid credentials", "401"));
        }

        const token = jwt.sign({ id: user._id, name: user.name }, SECRET_KEY, { expiresIn: "1h" });

        res.status(200).json(formatMsg("Login successful", "200", {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                gender: user.gender,
                profile: user.profile
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
exports.editProfile = async (req, res) => {
    const { id, name, age, gender, password, profile } = req.body;

    if (!id) {
        return res.status(400).json(formatMsg("User ID is required", "400"));
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json(formatMsg("User not found", "404"));
        }

        // Update fields
        if (name) user.name = name;
        if (age) user.age = age;
        if (gender) user.gender = gender;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        if (profile) {
            let imageBuffer;
            let imageType = "png"; // fallback

            if (profile.startsWith("data:")) {
                const matches = profile.match(/^data:(.+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                    return res.status(400).json(formatMsg("Invalid base64 image format", "400"));
                }
                imageBuffer = Buffer.from(matches[2], "base64");
                imageType = matches[1].split("/")[1];
            } else {
                // raw base64 string without data URI prefix
                try {
                    imageBuffer = Buffer.from(profile, "base64");
                } catch {
                    return res.status(400).json(formatMsg("Invalid base64 string", "400"));
                }
            }

            const uploadDir = path.join(__dirname, "../uploads");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir);
            }

            // Delete old image if exists
            if (user.profile) {
                const oldImagePath = path.join(uploadDir, path.basename(user.profile));
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            const fileName = `profile_${Date.now()}.${imageType}`;
            const filePath = path.join(uploadDir, fileName);

            fs.writeFileSync(filePath, imageBuffer);

            user.profile = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
        }

        await user.save();

        res.status(200).json(
            formatMsg("Profile updated successfully", "200", {
                id: user._id,
                name: user.name,
                age: user.age,
                gender: user.gender,
                profile: user.profile,
            })
        );
    } catch (err) {
        console.error("Edit profile error:", err);
        res.status(500).json(formatMsg("Failed to update profile", "500"));
    }
};

exports.deleteAccount = async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json(formatMsg("User ID is required", "400"));
    }

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json(formatMsg("User not found", "404"));
        }

        // Delete profile image if exists
        if (user.profile) {
            const uploadDir = path.join(__dirname, "../uploads");
            const imagePath = path.join(uploadDir, path.basename(user.profile));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete user from DB
        await User.findByIdAndDelete(id);

        res.status(200).json(formatMsg("Account deleted successfully", "200"));
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json(formatMsg("Failed to delete account", "500"));
    }
};