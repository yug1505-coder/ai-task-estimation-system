const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
    res.send("AI Task Estimation Server Running");
});

// Adding Task API
app.post("/addTask", (req, res) => {
    try {
        const { task_name, expected_time, actual_time } = req.body;

        // Basic validating
        if (!task_name || !expected_time || !actual_time) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        // Converting to numbers
        const expected = parseFloat(expected_time);
        const actual = parseFloat(actual_time);

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

        // Console log (for demo)

        
        console.log("Task Name:", task_name);
        console.log("Expected Time:", expected);
        console.log("Actual Time:", actual);
        console.log("Estimation Type:", estimation_type);
        console.log("Accuracy:", accuracy + "%");

        // Response
        res.json({
            message: "Task added successfully",
            estimation_type,
            accuracy: accuracy + "%"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

// Server start
app.listen(3000, () => {
    console.log("Server running on port 3000");
});