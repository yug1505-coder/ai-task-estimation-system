-- ===============================
-- USERS QUERIES
-- ===============================

-- Create new user
INSERT INTO users (name, email, password)
VALUES (?, ?, ?);

-- Get user by email (for login)
SELECT * FROM users
WHERE email = ?;


-- ===============================
-- TASK QUERIES
-- ===============================

-- Create a new task
INSERT INTO tasks (user_id, task_name, category, expected_time)
VALUES (?, ?, ?, ?);

-- Get all tasks of a user
SELECT * FROM tasks
WHERE user_id = ?;

-- Get pending tasks
SELECT * FROM tasks
WHERE user_id = ? AND status = 'Pending';

-- Get completed tasks
SELECT * FROM tasks
WHERE user_id = ? AND status = 'Completed';


-- ===============================
-- TASK COMPLETION
-- ===============================

-- Update task after completion
UPDATE tasks
SET actual_time = ?, status = 'Completed'
WHERE task_id = ?;


-- ===============================
-- AI ANALYSIS QUERIES
-- ===============================

-- Insert analysis result
INSERT INTO task_analysis (task_id, difference, accuracy, estimation_type)
VALUES (?, ?, ?, ?);

-- Get analysis for a task
SELECT * FROM task_analysis
WHERE task_id = ?;


-- ===============================
-- DASHBOARD QUERIES
-- ===============================

-- Get tasks with analysis (for dashboard)
SELECT
    t.task_name,
    t.expected_time,
    t.actual_time,
    a.difference,
    a.accuracy,
    a.estimation_type
FROM tasks t
JOIN task_analysis a
ON t.task_id = a.task_id
WHERE t.user_id = ?;

-- Get average accuracy
SELECT AVG(accuracy) AS avg_accuracy
FROM task_analysis;

-- Count estimation types
SELECT estimation_type, COUNT(*) AS count
FROM task_analysis
GROUP BY estimation_type;


-- ===============================
-- SUGGESTION (ADVANCED FEATURE)
-- ===============================

-- Get average actual time for same task name
SELECT AVG(actual_time) AS suggested_time
FROM tasks
WHERE task_name = ? AND actual_time IS NOT NULL;