# AI-Based Task Estimation System

This project helps users improve time estimation by comparing planned hours with actual hours and turning the result into practical planning feedback.

## Features

- User registration and login with JWT authentication
- Add completed tasks with estimated time, actual time, and optional due date
- Capture prediction parameters: category, complexity, priority, experience, task type, requirement clarity, tool familiarity, focus, interruptions, energy, team size, dependencies, risk, and review effort
- Accuracy score capped between 0% and 100%
- 10% tolerance band for realistic "Accurate" classification
- Dashboard metrics for total tasks, average accuracy, average error, and planning bias
- Chart-based breakdown of accurate, overestimated, and underestimated tasks
- Search and filter task history
- Smart suggestions based on similar previous tasks
- Weighted time prediction using task name similarity plus matching task context
- Prediction adjustment considers unclear requirements, unfamiliar tools, dependencies, risk, review effort, team size, and task type
- Light and dark mode

## Estimation Logic

The backend calculates accuracy using actual time as the reference:

```text
percentage error = |actual time - estimated time| / actual time * 100
accuracy = 100 - percentage error
```

Accuracy is clamped between 0 and 100. A task is treated as accurate when the error is within 10%.

## Technologies Used

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: bcrypt and JSON Web Tokens

## Start Project

Start MongoDB locally first, then run:

```powershell
cd C:\Users\Asus\ai-task-estimation-system\backend
npm.cmd install
npm.cmd start
```

Then open:

```text
http://localhost:3000
```

You can also run the frontend separately during development:

```powershell
npm run frontend:dev
```

## Environment

Create or update `backend/.env`:

```text
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/task_estimation_system
JWT_SECRET=replace_with_a_secure_secret
```

## Deploy

Deploy this repository as one Node web service.

Use these commands on the hosting platform:

```text
Build command: npm install
Start command: npm start
```

Set these environment variables:

```text
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_long_random_secret
NODE_ENV=production
```

The backend serves the frontend from `/frontend`, so the deployed app uses one public URL for both the UI and API.
