const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task_name: { type: String, required: true },
  category: { type: String, default: 'General' },
  complexity: { type: Number, default: 3, min: 1, max: 5 },
  priority: { type: String, default: 'Medium', enum: ['Low', 'Medium', 'High', 'Urgent'] },
  experience_level: { type: String, default: 'Intermediate', enum: ['Beginner', 'Intermediate', 'Advanced'] },
  task_type: {
    type: String,
    default: 'Feature',
    enum: ['Feature', 'Bug fix', 'Refactor', 'Research spike', 'Review', 'Deployment']
  },
  requirement_clarity: { type: Number, default: 3, min: 1, max: 5 },
  tool_familiarity: { type: Number, default: 3, min: 1, max: 5 },
  focus_level: { type: Number, default: 3, min: 1, max: 5 },
  interruption_level: { type: Number, default: 2, min: 1, max: 5 },
  energy_level: { type: Number, default: 3, min: 1, max: 5 },
  team_size: { type: Number, default: 1, min: 1, max: 20 },
  dependency_count: { type: Number, default: 0, min: 0, max: 20 },
  risk_level: { type: Number, default: 3, min: 1, max: 5 },
  review_effort: { type: Number, default: 1, min: 0, max: 3 },
  expected_time: { type: Number, required: true },
  actual_time: { type: Number, required: true },
  due_date: { type: Date },
  status: { type: String, default: 'Completed' },
  
  // Embedded analysis
  analysis: {
    difference: { type: Number },
    accuracy: { type: Number },
    estimation_type: { type: String, enum: ['Underestimation', 'Overestimation', 'Accurate'] }
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
