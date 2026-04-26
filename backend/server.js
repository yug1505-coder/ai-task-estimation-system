const express = require("express");
const cors = require("cors");

const app = express();

const db = require("./db");
const queries = require("./queries");

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    res.send("AI Task Estimation Server Running");
});

// Adding Task API
app.post("/addTask", async (req, res) => {
    try {
        const { task_name, expected_time, actual_time } = req.body;

        // Basic validating
        if (!task_name || !expected_time || !actual_time) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const expected = parseFloat(expected_time);
        const actual = parseFloat(actual_time);

    // Validation

        if (isNaN(expected) || isNaN(actual)) {
    return res.status(400).json({
        message: "Expected and Actual time must be numbers"
    });
}

        if (expected <= 0 || actual <= 0) {
    return res.status(400).json({
        message: "Time must be positive values"
    });
}

        if (actual === 0) {
    return res.status(400).json({
        message: "Actual time cannot be zero"
    });
}

        // AI Logic (basic)

        let estimation_type = "";
        let accuracy = 0;

        if (actual > expected) {
            estimation_type = "Underestimation";
        } else if (actual < expected) {
            estimation_type = "Overestimation";
        } else {
            estimation_type = "Accurate";
        }

        accuracy = ((expected / actual) * 100).toFixed(2);

         // Save task
        const [taskResult] = await db.execute(
            queries.createTask,
            [1, task_name, "General", expected]
        );

        const task_id = taskResult.insertId;

        // Save analysis
        const difference = Math.abs(expected - actual);

        await db.execute(
            queries.insertAnalysis,
            [task_id, difference, accuracy, estimation_type]
        );

        // Update task
        await db.execute(
            queries.updateTask,
            [actual, task_id]
        );

        // console log use (for demo)

        
        console.log("Task Name:", task_name);
        console.log("Expected Time:", expected);
        console.log("Actual Time:", actual);
        console.log("Estimation Type:", estimation_type);
        console.log("Accuracy:", accuracy + "%");

        // Response
        res.json({
        message: "Task added successfully",
        estimation_type: estimation_type,
        accuracy: accuracy + "%"
});

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// ==========================
// DATABASE APIs ADDED
// ==========================

// Register User
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        await db.execute(
            queries.createUser,
            [name, email, password]
        );

        res.json({
            message: "User registered successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration error"
        });
    }
});


// Login User
app.post("/login", async (req, res) => {
    try {
        const { email } = req.body;

        const [rows] = await db.execute(
            queries.getUserByEmail,
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(rows[0]);

    } catch (error) {
        res.status(500).json({
            message: "Login error"
        });
    }
});


// Get All Tasks of User
app.get("/tasks/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;

        const [rows] = await db.execute(
            queries.getTasksByUser,
            [user_id]
        );

        res.json(rows);

    } catch (error) {
        res.status(500).json({
            message: "Fetch tasks error"
        });
    }
});


// Dashboard Data
app.get("/dashboard/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;

        const [rows] = await db.execute(
            queries.getDashboard,
            [user_id]
        );

        res.json(rows);

    } catch (error) {
        res.status(500).json({
            message: "Dashboard error"
        });
    }
});


// Suggested Time
app.get("/suggest/:task_name", async (req, res) => {
    try {
        const { task_name } = req.params;

        const [rows] = await db.execute(
            queries.getSuggestion,
            [task_name]
        );

        res.json(rows[0]);

    } catch (error) {
        res.status(500).json({
            message: "Suggestion error"
        });
    }
});

// Server start
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
