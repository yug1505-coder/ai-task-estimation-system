CREATE DATABASE IF NOT EXISTS task_estimation_system;
USE task_estimation_system;

--stores users accounts

CREATE TABLE users (
user_id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--stores task information and time estimation

CREATE TABLE tasks (
task_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
task_name VARCHAR(255) NOT NULL,
category VARCHAR(100),
expected_time FLOAT NOT NULL,
actual_time FLOAT,
status VARCHAR(50) DEFAULT 'Pending',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- stores ai rule based analysis result

CREATE TABLE task_analysis (
analysis_id INT AUTO_INCREMENT PRIMARY KEY,
task_id INT,
difference FLOAT,
accuracy FLOAT,
estimation_type VARCHAR(50),
analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);