module.exports = {

    createUser: `
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
    `,

    getUserByEmail: `
        SELECT * FROM users
        WHERE email = ?
    `,

    createTask: `
        INSERT INTO tasks (user_id, task_name, category, expected_time)
        VALUES (?, ?, ?, ?)
    `,

    updateTask: `
        UPDATE tasks
        SET actual_time = ?, status = 'Completed'
        WHERE task_id = ?
    `,

    insertAnalysis: `
        INSERT INTO task_analysis
        (task_id, difference, accuracy, estimation_type)
        VALUES (?, ?, ?, ?)
    `,

    getTasksByUser: `
        SELECT * FROM tasks
        WHERE user_id = ?
    `,

    getDashboard: `
        SELECT t.task_name, t.expected_time, t.actual_time,
               a.difference, a.accuracy, a.estimation_type
        FROM tasks t
        JOIN task_analysis a
        ON t.task_id = a.task_id
        WHERE t.user_id = ?
    `,

    getAvgAccuracy: `
        SELECT AVG(accuracy) AS avg_accuracy
        FROM task_analysis
    `,

    getSuggestion: `
        SELECT AVG(actual_time) AS suggested_time
        FROM tasks
        WHERE task_name = ? AND actual_time IS NOT NULL
    `
};