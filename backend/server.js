require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_DB_PATH = path.join(__dirname, 'local-db.json');
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');
const ACCURATE_TOLERANCE_PERCENT = 10;
const DEFAULT_CONTEXT = {
  category: 'General',
  complexity: 3,
  priority: 'Medium',
  experience_level: 'Intermediate',
  task_type: 'Feature',
  requirement_clarity: 3,
  tool_familiarity: 3,
  focus_level: 3,
  interruption_level: 2,
  energy_level: 3,
  team_size: 1,
  dependency_count: 0,
  risk_level: 3,
  review_effort: 1
};

app.use(cors());
app.use(express.json());

let useFileStore = false;
let fileStore = { users: [], tasks: [] };

function readFileStore() {
  try {
    if (!fs.existsSync(FILE_DB_PATH)) return { users: [], tasks: [] };
    const parsed = JSON.parse(fs.readFileSync(FILE_DB_PATH, 'utf8'));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : []
    };
  } catch (error) {
    console.error('Could not read local JSON database, starting with an empty store.');
    return { users: [], tasks: [] };
  }
}

function writeFileStore() {
  fs.writeFileSync(FILE_DB_PATH, JSON.stringify(fileStore, null, 2));
}

function createId() {
  return crypto.randomUUID();
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to local MongoDB');
  } catch (err) {
    console.log('Local MongoDB not found, starting embedded in-memory database...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('Connected to embedded in-memory MongoDB');
    } catch (memoryError) {
      console.error('Database startup failed.');
      console.error('Falling back to local JSON storage.');
      console.error(`MongoDB URI: ${process.env.MONGODB_URI}`);
      useFileStore = true;
      fileStore = readFileStore();
    }
  }
}

async function findUserByEmail(email) {
  if (!useFileStore) return User.findOne({ email });
  return fileStore.users.find((user) => user.email === email) || null;
}

async function createUserRecord({ name, email, password }) {
  if (!useFileStore) {
    return User.create({ name, email, password });
  }

  const now = new Date().toISOString();
  const user = { _id: createId(), name, email, password, createdAt: now, updatedAt: now };
  fileStore.users.push(user);
  writeFileStore();
  return user;
}

async function createTaskRecord(taskData) {
  if (!useFileStore) return Task.create(taskData);

  const now = new Date().toISOString();
  const task = {
    _id: createId(),
    ...taskData,
    due_date: taskData.due_date || null,
    createdAt: now,
    updatedAt: now
  };
  fileStore.tasks.push(task);
  writeFileStore();
  return task;
}

async function findUserTasks(userId) {
  if (!useFileStore) return Task.find({ userId }).sort({ createdAt: -1 });

  return fileStore.tasks
    .filter((task) => String(task.userId) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function findSimilarTasks(userId, taskName, context) {
  if (!useFileStore) {
    const escapedTaskName = taskName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Task.find({
      userId,
      $or: [
        { task_name: { $regex: escapedTaskName, $options: 'i' } },
        { category: context.category }
      ]
    }).limit(50);
  }

  const requested = String(taskName || '').toLowerCase();
  return fileStore.tasks
    .filter((task) => (
      String(task.userId) === String(userId) &&
      (String(task.task_name || '').toLowerCase().includes(requested) || task.category === context.category)
    ))
    .slice(0, 50);
}

async function deleteTaskRecord(taskId, userId) {
  if (!useFileStore) return Task.findOneAndDelete({ _id: taskId, userId });

  const index = fileStore.tasks.findIndex((task) => (
    String(task._id) === String(taskId) && String(task.userId) === String(userId)
  ));
  if (index === -1) return null;
  const [deleted] = fileStore.tasks.splice(index, 1);
  writeFileStore();
  return deleted;
}

async function markOverdueTasks(now) {
  if (!useFileStore) {
    const overdueTasks = await Task.find({
      due_date: { $ne: null, $lt: now },
      status: { $ne: 'Overdue_Notified' }
    }).populate('userId', 'name email');

    for (const task of overdueTasks) {
      if (task.userId) {
        console.log(`Sending overdue alert for task '${task.task_name}' to ${task.userId.email}`);
      }

      task.status = 'Overdue_Notified';
      await task.save();
    }
    return;
  }

  let changed = false;
  for (const task of fileStore.tasks) {
    if (task.due_date && new Date(task.due_date) < now && task.status !== 'Overdue_Notified') {
      const user = fileStore.users.find((item) => String(item._id) === String(task.userId));
      if (user) console.log(`Sending overdue alert for task '${task.task_name}' to ${user.email}`);
      task.status = 'Overdue_Notified';
      task.updatedAt = new Date().toISOString();
      changed = true;
    }
  }

  if (changed) writeFileStore();
}

const analyzeEstimate = (expectedTime, actualTime) => {
  const expected = Number(expectedTime);
  const actual = Number(actualTime);
  const difference = Number((actual - expected).toFixed(2));

  let percentageError = 0;
  if (actual === 0 && expected === 0) {
    percentageError = 0;
  } else if (actual === 0) {
    percentageError = 100;
  } else {
    percentageError = Math.abs(actual - expected) / actual * 100;
  }

  const accuracy = Math.max(0, 100 - percentageError);
  let estimation_type = 'Accurate';

  if (percentageError > ACCURATE_TOLERANCE_PERCENT) {
    estimation_type = actual > expected ? 'Underestimation' : 'Overestimation';
  }

  return {
    difference,
    percentageError: Number(percentageError.toFixed(2)),
    accuracy: Number(accuracy.toFixed(2)),
    estimation_type
  };
};

const clampNumber = (value, min, max, fallback) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const normalizeContext = (body = {}) => ({
  category: String(body.category || DEFAULT_CONTEXT.category).trim() || DEFAULT_CONTEXT.category,
  complexity: clampNumber(body.complexity, 1, 5, DEFAULT_CONTEXT.complexity),
  priority: ['Low', 'Medium', 'High', 'Urgent'].includes(body.priority) ? body.priority : DEFAULT_CONTEXT.priority,
  experience_level: ['Beginner', 'Intermediate', 'Advanced'].includes(body.experience_level)
    ? body.experience_level
    : DEFAULT_CONTEXT.experience_level,
  task_type: ['Feature', 'Bug fix', 'Refactor', 'Research spike', 'Review', 'Deployment'].includes(body.task_type)
    ? body.task_type
    : DEFAULT_CONTEXT.task_type,
  requirement_clarity: clampNumber(
    body.requirement_clarity,
    1,
    5,
    DEFAULT_CONTEXT.requirement_clarity
  ),
  tool_familiarity: clampNumber(body.tool_familiarity, 1, 5, DEFAULT_CONTEXT.tool_familiarity),
  focus_level: clampNumber(body.focus_level, 1, 5, DEFAULT_CONTEXT.focus_level),
  interruption_level: clampNumber(body.interruption_level, 1, 5, DEFAULT_CONTEXT.interruption_level),
  energy_level: clampNumber(body.energy_level, 1, 5, DEFAULT_CONTEXT.energy_level),
  team_size: clampNumber(body.team_size, 1, 20, DEFAULT_CONTEXT.team_size),
  dependency_count: clampNumber(body.dependency_count, 0, 20, DEFAULT_CONTEXT.dependency_count),
  risk_level: clampNumber(body.risk_level, 1, 5, DEFAULT_CONTEXT.risk_level),
  review_effort: clampNumber(body.review_effort, 0, 3, DEFAULT_CONTEXT.review_effort)
});

const calculateSimilarity = (task, taskName, context) => {
  const taskNameLower = String(task.task_name || '').toLowerCase();
  const requestedWords = String(taskName || '').toLowerCase().split(/\s+/).filter(Boolean);
  const matchedWords = requestedWords.filter((word) => taskNameLower.includes(word)).length;
  const nameScore = requestedWords.length ? matchedWords / requestedWords.length : 0;

  let score = 1 + nameScore * 2;
  if (task.category === context.category) score += 1.5;
  if (task.priority === context.priority) score += 0.5;
  if (task.experience_level === context.experience_level) score += 0.5;
  if ((task.task_type || DEFAULT_CONTEXT.task_type) === context.task_type) score += 1;

  score += Math.max(0, 1 - Math.abs((task.complexity || 3) - context.complexity) / 4);
  score += Math.max(0, 1 - Math.abs((task.requirement_clarity ?? 3) - context.requirement_clarity) / 4) * 0.6;
  score += Math.max(0, 1 - Math.abs((task.tool_familiarity ?? 3) - context.tool_familiarity) / 4) * 0.6;
  score += Math.max(0, 1 - Math.abs((task.focus_level ?? 3) - context.focus_level) / 4) * 0.5;
  score += Math.max(0, 1 - Math.abs((task.interruption_level ?? 2) - context.interruption_level) / 4) * 0.5;
  score += Math.max(0, 1 - Math.abs((task.energy_level ?? 3) - context.energy_level) / 4) * 0.5;
  score += Math.max(0, 1 - Math.abs((task.team_size ?? 1) - context.team_size) / 19) * 0.4;
  score += Math.max(0, 1 - Math.abs((task.dependency_count ?? 0) - context.dependency_count) / 20) * 0.7;
  score += Math.max(0, 1 - Math.abs((task.risk_level ?? 3) - context.risk_level) / 4) * 0.7;
  score += Math.max(0, 1 - Math.abs((task.review_effort ?? 1) - context.review_effort) / 3) * 0.4;

  return score;
};

const predictActualTime = (tasks, taskName, context) => {
  if (!tasks.length) return null;

  const weighted = tasks.map((task) => ({
    task,
    weight: calculateSimilarity(task, taskName, context)
  }));

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const weightedAverage = weighted.reduce((sum, item) => (
    sum + item.task.actual_time * item.weight
  ), 0) / totalWeight;

  const adjustment =
    1 +
    (context.complexity - 3) * 0.08 +
    (3 - context.requirement_clarity) * 0.06 +
    (3 - context.tool_familiarity) * 0.05 +
    (context.interruption_level - 2) * 0.05 -
    (context.focus_level - 3) * 0.04 -
    (context.energy_level - 3) * 0.03 +
    (context.dependency_count * 0.025) +
    (context.risk_level - 3) * 0.06 +
    (context.review_effort * 0.04) +
    (context.team_size > 1 ? Math.min(0.12, (context.team_size - 1) * 0.015) : 0) +
    (context.task_type === 'Research spike' ? 0.1 : context.task_type === 'Bug fix' ? 0.04 : 0) +
    (context.experience_level === 'Beginner' ? 0.12 : context.experience_level === 'Advanced' ? -0.08 : 0);

  return {
    suggested_time: Number(Math.max(0.1, weightedAverage * adjustment).toFixed(2)),
    based_on: tasks.length,
    confidence: tasks.length >= 10 ? 'high' : tasks.length >= 5 ? 'moderate' : 'early',
    top_match: weighted.sort((a, b) => b.weight - a.weight)[0]?.task?.task_name || null
  };
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existingUser = await findUserByEmail(email.toLowerCase());
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUserRecord({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = generateToken(user._id);
    res.status(201).json({ message: 'User registered', token, userId: user._id, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(String(email || '').toLowerCase());

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ message: 'Login successful', token, userId: user._id, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/addTask', authenticate, async (req, res) => {
  try {
    const { task_name, expected_time, actual_time, due_date } = req.body;

    if (!task_name || expected_time == null || actual_time == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const expected = Number(expected_time);
    const actual = Number(actual_time);

    if (!Number.isFinite(expected) || !Number.isFinite(actual) || expected < 0 || actual < 0) {
      return res.status(400).json({ error: 'Time values must be valid non-negative numbers' });
    }

    if (expected === 0 && actual > 0) {
      return res.status(400).json({ error: 'Expected time must be greater than 0 for measurable work' });
    }

    const analysis = analyzeEstimate(expected, actual);
    const context = normalizeContext(req.body);

    const task = await createTaskRecord({
      userId: req.userId,
      task_name: task_name.trim(),
      ...context,
      expected_time: expected,
      actual_time: actual,
      due_date: due_date || null,
      status: 'Completed',
      analysis: {
        difference: analysis.difference,
        accuracy: analysis.accuracy,
        estimation_type: analysis.estimation_type
      }
    });

    res.status(201).json({
      message: 'Task added and analyzed',
      task_id: task._id,
      estimation_type: analysis.estimation_type,
      accuracy: analysis.accuracy,
      difference: analysis.difference,
      percentage_error: analysis.percentageError
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.get('/tasks', authenticate, async (req, res) => {
  try {
    const tasks = await findUserTasks(req.userId);
    const mapped = tasks.map((task) => {
      const analysis = analyzeEstimate(task.expected_time, task.actual_time);

      return {
        task_id: task._id,
        task_name: task.task_name,
        category: task.category,
        complexity: task.complexity || DEFAULT_CONTEXT.complexity,
        priority: task.priority || DEFAULT_CONTEXT.priority,
        experience_level: task.experience_level || DEFAULT_CONTEXT.experience_level,
        task_type: task.task_type || DEFAULT_CONTEXT.task_type,
        requirement_clarity: task.requirement_clarity ?? DEFAULT_CONTEXT.requirement_clarity,
        tool_familiarity: task.tool_familiarity ?? DEFAULT_CONTEXT.tool_familiarity,
        focus_level: task.focus_level ?? DEFAULT_CONTEXT.focus_level,
        interruption_level: task.interruption_level ?? DEFAULT_CONTEXT.interruption_level,
        energy_level: task.energy_level ?? DEFAULT_CONTEXT.energy_level,
        team_size: task.team_size ?? DEFAULT_CONTEXT.team_size,
        dependency_count: task.dependency_count ?? DEFAULT_CONTEXT.dependency_count,
        risk_level: task.risk_level ?? DEFAULT_CONTEXT.risk_level,
        review_effort: task.review_effort ?? DEFAULT_CONTEXT.review_effort,
        expected_time: task.expected_time,
        actual_time: task.actual_time,
        due_date: task.due_date,
        status: task.status,
        accuracy: analysis.accuracy,
        estimation_type: analysis.estimation_type,
        difference: analysis.difference,
        percentage_error: analysis.percentageError
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/dashboard', authenticate, async (req, res) => {
  try {
    const tasks = await findUserTasks(req.userId);

    if (tasks.length === 0) {
      return res.json({
        totalTasks: 0,
        avgAccuracy: 0,
        avgErrorHours: 0,
        totalExpected: 0,
        totalActual: 0,
        breakdown: { underestimation: 0, overestimation: 0, accurate: 0 }
      });
    }

    const summary = tasks.reduce((acc, task) => {
      const analysis = analyzeEstimate(task.expected_time, task.actual_time);
      acc.totalExpected += task.expected_time;
      acc.totalActual += task.actual_time;
      acc.totalAccuracy += analysis.accuracy;
      acc.totalAbsError += Math.abs(analysis.difference);
      acc.breakdown[analysis.estimation_type] += 1;
      return acc;
    }, {
      totalExpected: 0,
      totalActual: 0,
      totalAccuracy: 0,
      totalAbsError: 0,
      breakdown: { Underestimation: 0, Overestimation: 0, Accurate: 0 }
    });

    res.json({
      totalTasks: tasks.length,
      avgAccuracy: Number((summary.totalAccuracy / tasks.length).toFixed(2)),
      avgErrorHours: Number((summary.totalAbsError / tasks.length).toFixed(2)),
      totalExpected: Number(summary.totalExpected.toFixed(2)),
      totalActual: Number(summary.totalActual.toFixed(2)),
      breakdown: {
        underestimation: summary.breakdown.Underestimation,
        overestimation: summary.breakdown.Overestimation,
        accurate: summary.breakdown.Accurate
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/suggest/:task_name', authenticate, async (req, res) => {
  try {
    const context = normalizeContext(req.query);
    const similarTasks = await findSimilarTasks(req.userId, req.params.task_name, context);

    const prediction = predictActualTime(similarTasks, req.params.task_name, context);

    if (prediction) {
      return res.json(prediction);
    }

    res.json({ suggested_time: null, message: 'No similar tasks found' });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.delete('/task/:task_id', authenticate, async (req, res) => {
  try {
    const result = await deleteTaskRecord(req.params.task_id, req.userId);
    if (!result) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.put('/task/:task_id', authenticate, async (req, res) => {
  try {
    const { task_name, expected_time, actual_time } = req.body;
    
    if (!task_name || expected_time === undefined || actual_time === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updates = {
      task_name: String(task_name).trim(),
      expected_time: Number(expected_time),
      actual_time: Number(actual_time)
    };

    let updatedTask;
    if (!useFileStore) {
      updatedTask = await Task.findOneAndUpdate(
        { _id: req.params.task_id, userId: req.userId },
        updates,
        { new: true }
      );
    } else {
      const task = fileStore.tasks.find(t => 
        String(t._id) === String(req.params.task_id) && 
        String(t.userId) === String(req.userId)
      );
      if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
      
      Object.assign(task, updates);
      writeFileStore();
      updatedTask = task;
    }

    if (!updatedTask) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: 'Update failed', details: error.message });
  }
});

app.use(express.static(FRONTEND_PATH));

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    await markOverdueTasks(now);
  } catch (error) {
    console.error('Error in cron job:', error.message);
  }
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(() => {
    process.exit(1);
  });
