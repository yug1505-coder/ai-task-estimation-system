const LOCAL_API_URL = 'http://localhost:3000';
const API_URL = (
  window.location.protocol === 'file:' ||
  (['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '3000')
) ? LOCAL_API_URL : '';
const ACCURATE_TOLERANCE = 10;

const state = {
  token: localStorage.getItem('token') || null,
  userId: localStorage.getItem('userId') || null,
  userName: localStorage.getItem('userName') || null,
  tasks: [],
  dashboard: {
    totalTasks: 0,
    avgAccuracy: 0,
    avgErrorHours: 0,
    breakdown: { underestimation: 0, overestimation: 0, accurate: 0 }
  },
  isLoginMode: true,
  taskToDelete: null,
  chartInstance: null,
  searchTerm: '',
  statusFilter: 'all'
};

const els = {
  authSection: document.getElementById('authSection'),
  appSection: document.getElementById('appSection'),
  authForm: document.getElementById('authForm'),
  authName: document.getElementById('authName'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  nameGroup: document.getElementById('nameGroup'),
  authTitle: document.getElementById('authTitle'),
  authSubmitText: document.getElementById('authSubmitText'),
  toggleAuthMode: document.getElementById('toggleAuthMode'),
  authError: document.getElementById('authError'),
  logoutBtn: document.getElementById('logoutBtn'),
  userNameDisplay: document.getElementById('userNameDisplay'),
  heroAccuracy: document.getElementById('heroAccuracy'),
  taskForm: document.getElementById('taskForm'),
  taskName: document.getElementById('taskName'),
  taskCategory: document.getElementById('taskCategory'),
  complexity: document.getElementById('complexity'),
  priority: document.getElementById('priority'),
  experienceLevel: document.getElementById('experienceLevel'),
  taskType: document.getElementById('taskType'),
  requirementClarity: document.getElementById('requirementClarity'),
  toolFamiliarity: document.getElementById('toolFamiliarity'),
  expectedTime: document.getElementById('expectedTime'),
  actualTime: document.getElementById('actualTime'),
  dueDate: document.getElementById('dueDate'),
  focusLevel: document.getElementById('focusLevel'),
  interruptionLevel: document.getElementById('interruptionLevel'),
  energyLevel: document.getElementById('energyLevel'),
  teamSize: document.getElementById('teamSize'),
  dependencyCount: document.getElementById('dependencyCount'),
  riskLevel: document.getElementById('riskLevel'),
  reviewEffort: document.getElementById('reviewEffort'),
  suggestedTimeBox: document.getElementById('suggestedTimeBox'),
  nameError: document.getElementById('nameError'),
  expectedError: document.getElementById('expectedError'),
  actualError: document.getElementById('actualError'),
  formGeneralError: document.getElementById('formGeneralError'),
  totalTasks: document.getElementById('totalTasks'),
  accurateTasks: document.getElementById('accurateTasks'),
  overTasks: document.getElementById('overTasks'),
  underTasks: document.getElementById('underTasks'),
  avgAccuracy: document.getElementById('avgAccuracy'),
  avgError: document.getElementById('avgError'),
  planningBias: document.getElementById('planningBias'),
  planningBiasNote: document.getElementById('planningBiasNote'),
  progressFill: document.getElementById('progressFill'),
  insightText: document.getElementById('insightText'),
  taskTableBody: document.getElementById('taskTableBody'),
  emptyState: document.getElementById('emptyState'),
  taskSearch: document.getElementById('taskSearch'),
  statusFilter: document.getElementById('statusFilter'),
  modalOverlay: document.getElementById('modalOverlay'),
  cancelDelete: document.getElementById('cancelDelete'),
  confirmDelete: document.getElementById('confirmDelete'),
  darkToggle: document.getElementById('darkToggle'),
  toggleIcon: document.getElementById('toggleIcon'),
  toggleLabel: document.getElementById('toggleLabel'),
  estimationChart: document.getElementById('estimationChart'),
  editModalOverlay: document.getElementById('editModalOverlay'),
  editTaskForm: document.getElementById('editTaskForm'),
  editTaskName: document.getElementById('editTaskName'),
  editExpectedTime: document.getElementById('editExpectedTime'),
  editActualTime: document.getElementById('editActualTime'),
  cancelEdit: document.getElementById('cancelEdit'),
  csvExportBtn: document.getElementById('csvExportBtn')
};

const formatNumber = (value, digits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return numeric.toFixed(digits).replace(/\.0$/, '');
};

const formatHours = (value) => `${formatNumber(value, 1)}h`;

const getTaskContextPayload = () => ({
  category: els.taskCategory.value,
  complexity: Number(els.complexity.value),
  priority: els.priority.value,
  experience_level: els.experienceLevel.value,
  task_type: els.taskType.value,
  requirement_clarity: Number(els.requirementClarity.value),
  tool_familiarity: Number(els.toolFamiliarity.value),
  focus_level: Number(els.focusLevel.value),
  interruption_level: Number(els.interruptionLevel.value),
  energy_level: Number(els.energyLevel.value),
  team_size: Number(els.teamSize.value),
  dependency_count: Number(els.dependencyCount.value),
  risk_level: Number(els.riskLevel.value),
  review_effort: Number(els.reviewEffort.value)
});

const buildQueryString = (params) => new URLSearchParams(params).toString();

const escapeText = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const getTaskAccuracy = (task) => {
  const expected = Number(task.expected_time) || 0;
  const actual = Number(task.actual_time) || 0;

  if (Number.isFinite(Number(task.accuracy))) {
    return Math.max(0, Math.min(100, Number(task.accuracy)));
  }

  if (actual === 0 && expected === 0) return 100;
  if (actual === 0) return 0;

  const errorRate = Math.abs(actual - expected) / actual;
  return Math.max(0, 100 - errorRate * 100);
};

const getTaskType = (task) => {
  if (task.estimation_type) return task.estimation_type;

  const expected = Number(task.expected_time) || 0;
  const actual = Number(task.actual_time) || 0;
  if (actual === 0 && expected === 0) return 'Accurate';

  const denominator = actual || expected || 1;
  const errorPct = Math.abs(actual - expected) / denominator * 100;
  if (errorPct <= ACCURATE_TOLERANCE) return 'Accurate';
  return actual > expected ? 'Underestimation' : 'Overestimation';
};

const getTaskVariance = (task) => Number(task.actual_time || 0) - Number(task.expected_time || 0);

const initTheme = () => {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateToggleUI(saved);
};

const updateToggleUI = (theme) => {
  els.toggleIcon.textContent = theme === 'dark' ? 'Sun' : 'Moon';
  els.toggleLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
};

const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateToggleUI(next);
  renderChart();
};

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${state.token}`
});

const renderView = () => {
  if (state.token) {
    els.authSection.style.display = 'none';
    els.appSection.style.display = 'flex';
    els.logoutBtn.style.display = 'inline-flex';
    els.userNameDisplay.textContent = state.userName || 'User';
    refreshData();
    return;
  }

  els.authSection.style.display = 'grid';
  els.appSection.style.display = 'none';
  els.logoutBtn.style.display = 'none';
};

const setAuthMode = (isLoginMode) => {
  state.isLoginMode = isLoginMode;
  els.nameGroup.style.display = isLoginMode ? 'none' : 'flex';
  els.authTitle.textContent = isLoginMode ? 'Login to System' : 'Create an Account';
  els.authSubmitText.textContent = isLoginMode ? 'Login' : 'Register';
  els.toggleAuthMode.textContent = isLoginMode ? 'Need an account? Register' : 'Already have an account? Login';
  els.authPassword.setAttribute('autocomplete', isLoginMode ? 'current-password' : 'new-password');
  els.authError.textContent = '';
};

const refreshData = async () => {
  await Promise.all([fetchDashboard(), fetchTasks()]);
  renderInsight();
};

const fetchDashboard = async () => {
  try {
    const res = await fetch(`${API_URL}/dashboard`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    state.dashboard = await res.json();
    renderDashboard();
    renderChart();
  } catch (err) {
    console.error(err);
    els.insightText.textContent = 'Backend is not reachable. Start the Node server and MongoDB, then refresh this page.';
  }
};

const fetchTasks = async () => {
  try {
    const res = await fetch(`${API_URL}/tasks`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    state.tasks = await res.json();
    renderTasks();
    renderAdvancedMetrics();
    renderChart();
  } catch (err) {
    console.error(err);
  }
};

const renderDashboard = () => {
  const breakdown = state.dashboard.breakdown || {};
  const avg = Number(state.dashboard.avgAccuracy || 0);

  els.totalTasks.textContent = state.dashboard.totalTasks || 0;
  els.accurateTasks.textContent = breakdown.accurate || 0;
  els.overTasks.textContent = breakdown.overestimation || 0;
  els.underTasks.textContent = breakdown.underestimation || 0;
  els.avgAccuracy.textContent = `${formatNumber(avg, 1)}%`;
  els.heroAccuracy.textContent = `${formatNumber(avg, 1)}%`;
  els.progressFill.style.width = `${Math.min(avg, 100)}%`;
};

const renderAdvancedMetrics = () => {
  if (!state.tasks.length) {
    els.avgError.textContent = '0h';
    els.planningBias.textContent = 'Balanced';
    els.planningBiasNote.textContent = 'No trend yet';
    return;
  }

  const totalVariance = state.tasks.reduce((sum, task) => sum + getTaskVariance(task), 0);
  const avgError = state.tasks.reduce((sum, task) => sum + Math.abs(getTaskVariance(task)), 0) / state.tasks.length;
  const avgAccuracy = state.tasks.reduce((sum, task) => sum + getTaskAccuracy(task), 0) / state.tasks.length;

  els.avgError.textContent = formatHours(avgError);
  els.avgAccuracy.textContent = `${formatNumber(avgAccuracy, 1)}%`;
  els.heroAccuracy.textContent = `${formatNumber(avgAccuracy, 1)}%`;
  els.progressFill.style.width = `${Math.min(avgAccuracy, 100)}%`;

  if (Math.abs(totalVariance) < 0.1) {
    els.planningBias.textContent = 'Balanced';
    els.planningBiasNote.textContent = 'Estimates are close overall';
  } else if (totalVariance > 0) {
    els.planningBias.textContent = 'Optimistic';
    els.planningBiasNote.textContent = `${formatHours(totalVariance)} more than planned`;
  } else {
    els.planningBias.textContent = 'Conservative';
    els.planningBiasNote.textContent = `${formatHours(Math.abs(totalVariance))} less than planned`;
  }
};

const renderInsight = () => {
  if (!state.tasks.length) {
    els.insightText.textContent = 'Add a few completed tasks to build a reliable pattern.';
    return;
  }

  const totalExpected = state.tasks.reduce((sum, task) => sum + Number(task.expected_time || 0), 0);
  const totalActual = state.tasks.reduce((sum, task) => sum + Number(task.actual_time || 0), 0);
  const avgAccuracy = state.tasks.reduce((sum, task) => sum + getTaskAccuracy(task), 0) / state.tasks.length;

  if (!totalExpected || !totalActual) {
    els.insightText.textContent = 'Your estimates need more completed history before a useful adjustment can be calculated.';
    return;
  }

  const adjustment = ((totalActual / totalExpected) - 1) * 100;
  const confidence = state.tasks.length >= 10 ? 'high' : state.tasks.length >= 5 ? 'moderate' : 'early';

  if (Math.abs(adjustment) <= ACCURATE_TOLERANCE) {
    els.insightText.textContent = `Your planning is balanced. Current average accuracy is ${formatNumber(avgAccuracy, 1)}%, and your history only needs small task-by-task refinements. Confidence: ${confidence}.`;
  } else if (adjustment > 0) {
    els.insightText.textContent = `You usually need about ${formatNumber(adjustment, 0)}% more time than planned. Increase similar future estimates by this amount until your average accuracy stabilizes. Confidence: ${confidence}.`;
  } else {
    els.insightText.textContent = `You usually finish about ${formatNumber(Math.abs(adjustment), 0)}% faster than planned. You can reduce estimates for similar tasks while keeping a small buffer. Confidence: ${confidence}.`;
  }
};

const renderChart = () => {
  if (!els.estimationChart || typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f8fafc' : '#111827';
  const gridColor = isDark ? '#263244' : '#dbe3ee';
  const breakdown = state.dashboard.breakdown || {};

  if (state.chartInstance) state.chartInstance.destroy();

  state.chartInstance = new Chart(els.estimationChart.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Accurate', 'Overestimated', 'Underestimated'],
      datasets: [{
        data: [
          breakdown.accurate || 0,
          breakdown.overestimation || 0,
          breakdown.underestimation || 0
        ],
        backgroundColor: ['#16803c', '#b45309', '#b42318'],
        borderColor: gridColor,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: textColor,
            boxWidth: 12,
            font: { family: 'Inter', size: 12, weight: 700 }
          }
        }
      },
      cutout: '68%'
    }
  });
};

const getFilteredTasks = () => state.tasks.filter((task) => {
  const type = getTaskType(task);
  const matchesStatus = state.statusFilter === 'all' || type === state.statusFilter;
  const matchesSearch = task.task_name.toLowerCase().includes(state.searchTerm.toLowerCase());
  return matchesStatus && matchesSearch;
});

const renderTasks = () => {
  const tasks = getFilteredTasks();
  els.taskTableBody.innerHTML = '';

  if (!tasks.length) {
    els.emptyState.classList.add('visible');
    return;
  }

  els.emptyState.classList.remove('visible');

  const rows = tasks.map((task) => {
    const type = getTaskType(task);
    const badgeClass = type === 'Accurate' ? 'accurate' : type === 'Overestimation' ? 'over' : 'under';
    const variance = getTaskVariance(task);
    const varianceClass = Math.abs(variance) <= 0.1 ? 'good' : variance > 0 ? 'under' : 'over';
    const dateDisplay = task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date';
    const context = [
      task.category || 'General',
      task.task_type || 'Feature',
      `C${task.complexity || 3}`,
      task.priority || 'Medium',
      task.experience_level || 'Intermediate',
      `Risk ${task.risk_level || 3}`,
      `${task.dependency_count || 0} dep`
    ].join(' / ');
    const taskId = escapeText(task.task_id);

    return `
      <tr>
        <td class="task-name-cell">${escapeText(task.task_name)}</td>
        <td class="muted-cell">${escapeText(context)}</td>
        <td>${formatHours(task.expected_time)}</td>
        <td>${formatHours(task.actual_time)}</td>
        <td><span class="variance ${varianceClass}">${variance >= 0 ? '+' : ''}${formatHours(variance)}</span></td>
        <td class="muted-cell">${escapeText(dateDisplay)}</td>
        <td><span class="status-badge ${badgeClass}">${type}</span></td>
        <td><strong>${formatNumber(getTaskAccuracy(task), 1)}%</strong></td>
        <td class="action-cell">
          <button class="icon-action" type="button" title="Edit task" data-edit-id="${taskId}">✎</button>
          <button class="icon-action" type="button" title="Duplicate task" data-duplicate-id="${taskId}">⊕</button>
          <button class="icon-action danger" type="button" title="Delete task" data-delete-id="${taskId}">✕</button>
        </td>
      </tr>
    `;
  }).join('');

  els.taskTableBody.innerHTML = rows;
};

let suggestionTimer;
const handleTaskSuggestion = () => {
  const value = els.taskName.value.trim();
  els.suggestedTimeBox.textContent = '';
  clearTimeout(suggestionTimer);

  if (value.length < 3 || !state.token) return;

  suggestionTimer = setTimeout(async () => {
    try {
      const query = buildQueryString(getTaskContextPayload());
      const res = await fetch(`${API_URL}/suggest/${encodeURIComponent(value)}?${query}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.suggested_time) {
        const topMatch = data.top_match ? ` Best match: ${data.top_match}.` : '';
        els.suggestedTimeBox.textContent = `Prediction: ${formatHours(data.suggested_time)} (${data.confidence} confidence, ${data.based_on} match(es)).${topMatch}`;
        if (!els.expectedTime.value) els.expectedTime.placeholder = String(data.suggested_time);
      }
    } catch (err) {
      els.suggestedTimeBox.textContent = '';
    }
  }, 450);
};

const resetTaskErrors = () => {
  els.nameError.textContent = '';
  els.expectedError.textContent = '';
  els.actualError.textContent = '';
  els.formGeneralError.textContent = '';
};

els.darkToggle.addEventListener('click', toggleTheme);

els.toggleAuthMode.addEventListener('click', () => {
  setAuthMode(!state.isLoginMode);
});

els.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.authError.textContent = '';

  const email = els.authEmail.value.trim().toLowerCase();
  const password = els.authPassword.value.trim();
  const name = els.authName.value.trim();

  if (!email || !password) {
    els.authError.textContent = 'Email and password are required.';
    return;
  }

  if (!state.isLoginMode && !name) {
    els.authError.textContent = 'Name is required for registration.';
    return;
  }

  if (!state.isLoginMode && password.length < 6) {
    els.authError.textContent = 'Password must be at least 6 characters.';
    return;
  }

  const endpoint = state.isLoginMode ? '/login' : '/register';
  const payload = state.isLoginMode ? { email, password } : { name, email, password };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    state.token = data.token;
    state.userId = data.userId;
    state.userName = data.name || name || 'User';

    localStorage.setItem('token', state.token);
    localStorage.setItem('userId', state.userId);
    localStorage.setItem('userName', state.userName);

    els.authForm.reset();
    renderView();
  } catch (err) {
    els.authError.textContent = err.message;
  }
});

els.logoutBtn.addEventListener('click', () => {
  state.token = null;
  state.userId = null;
  state.userName = null;
  state.tasks = [];
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  renderView();
});

els.taskName.addEventListener('input', handleTaskSuggestion);
[
  els.taskCategory,
  els.complexity,
  els.priority,
  els.experienceLevel,
  els.taskType,
  els.requirementClarity,
  els.focusLevel,
  els.interruptionLevel,
  els.energyLevel,
  els.teamSize,
  els.dependencyCount,
  els.riskLevel,
  els.reviewEffort
].forEach((control) => control.addEventListener('change', handleTaskSuggestion));

els.taskSearch.addEventListener('input', (e) => {
  state.searchTerm = e.target.value;
  renderTasks();
});

els.statusFilter.addEventListener('change', (e) => {
  state.statusFilter = e.target.value;
  renderTasks();
});

els.taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetTaskErrors();

  const task_name = els.taskName.value.trim();
  const context = getTaskContextPayload();
  const expected_time = Number(els.expectedTime.value);
  const actual_time = Number(els.actualTime.value);
  const due_date = els.dueDate.value || null;

  let valid = true;
  if (task_name.length < 3) {
    els.nameError.textContent = 'Enter a task name with at least 3 characters.';
    valid = false;
  }
  if (!Number.isFinite(expected_time) || expected_time < 0) {
    els.expectedError.textContent = 'Enter a valid non-negative estimate.';
    valid = false;
  }
  if (!Number.isFinite(actual_time) || actual_time < 0) {
    els.actualError.textContent = 'Enter a valid non-negative actual time.';
    valid = false;
  }
  if (expected_time === 0 && actual_time > 0) {
    els.expectedError.textContent = 'Use a realistic estimate above 0 for measurable work.';
    valid = false;
  }

  if (!valid) return;

  try {
    const res = await fetch(`${API_URL}/addTask`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ task_name, ...context, expected_time, actual_time, due_date })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add task');

    els.taskForm.reset();
    els.suggestedTimeBox.textContent = '';
    await refreshData();
  } catch (err) {
    els.formGeneralError.textContent = err.message;
  }
});

els.taskTableBody.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-id]');
  const editButton = event.target.closest('[data-edit-id]');
  const duplicateButton = event.target.closest('[data-duplicate-id]');

  if (deleteButton) {
    state.taskToDelete = deleteButton.dataset.deleteId;
    els.modalOverlay.classList.add('active');
  } else if (editButton) {
    openEditModal(editButton.dataset.editId);
  } else if (duplicateButton) {
    duplicateTask(duplicateButton.dataset.duplicateId);
  }
});

const closeDeleteModal = () => {
  state.taskToDelete = null;
  els.modalOverlay.classList.remove('active');
};

const openEditModal = (taskId) => {
  const task = state.tasks.find(t => t.task_id === taskId);
  if (!task) return;
  
  state.taskToEdit = taskId;
  els.editTaskName.value = task.task_name;
  els.editExpectedTime.value = task.expected_time;
  els.editActualTime.value = task.actual_time;
  els.editModalOverlay.classList.add('active');
};

const closeEditModal = () => {
  state.taskToEdit = null;
  els.editTaskForm.reset();
  els.editModalOverlay.classList.remove('active');
};

const duplicateTask = (taskId) => {
  const task = state.tasks.find(t => t.task_id === taskId);
  if (!task) return;
  
  els.taskName.value = task.task_name + ' (copy)';
  els.taskCategory.value = task.category;
  els.complexity.value = task.complexity;
  els.priority.value = task.priority;
  els.experienceLevel.value = task.experience_level;
  els.taskType.value = task.task_type;
  els.requirementClarity.value = task.requirement_clarity;
  els.expectedTime.value = task.expected_time;
  els.focusLevel.value = task.focus_level;
  els.interruptionLevel.value = task.interruption_level;
  els.energyLevel.value = task.energy_level;
  els.teamSize.value = task.team_size;
  els.dependencyCount.value = task.dependency_count;
  els.riskLevel.value = task.risk_level;
  els.reviewEffort.value = task.review_effort;
  
  window.scrollTo(0, 0);
};

const exportToCSV = () => {
  if (!state.tasks.length) {
    alert('No tasks to export');
    return;
  }

  const headers = ['Task Name', 'Category', 'Estimated (h)', 'Actual (h)', 'Variance (h)', 'Outcome', 'Accuracy (%)', 'Due Date'];
  const rows = state.tasks.map(task => [
    task.task_name,
    task.category || 'General',
    task.expected_time,
    task.actual_time,
    getTaskVariance(task),
    getTaskType(task),
    getTaskAccuracy(task).toFixed(1),
    task.due_date || 'No due date'
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

state.taskToEdit = null;

els.csvExportBtn.addEventListener('click', exportToCSV);

els.cancelDelete.addEventListener('click', closeDeleteModal);

els.modalOverlay.addEventListener('click', (event) => {
  if (event.target === els.modalOverlay) closeDeleteModal();
});

els.confirmDelete.addEventListener('click', async () => {
  if (!state.taskToDelete) return;

  try {
    const res = await fetch(`${API_URL}/task/${state.taskToDelete}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error('Failed to delete task');
    closeDeleteModal();
    await refreshData();
  } catch (err) {
    els.formGeneralError.textContent = err.message;
    closeDeleteModal();
  }
});

els.cancelEdit.addEventListener('click', closeEditModal);

els.editModalOverlay.addEventListener('click', (event) => {
  if (event.target === els.editModalOverlay) closeEditModal();
});

els.editTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.taskToEdit) return;

  const task_name = els.editTaskName.value.trim();
  const expected_time = Number(els.editExpectedTime.value);
  const actual_time = Number(els.editActualTime.value);

  if (!task_name || expected_time < 0 || actual_time < 0) {
    alert('Please fill all fields with valid values');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/task/${state.taskToEdit}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ task_name, expected_time, actual_time })
    });

    if (!res.ok) throw new Error('Failed to update task');
    closeEditModal();
    await refreshData();
  } catch (err) {
    alert(err.message);
  }
});

initTheme();
setAuthMode(state.isLoginMode);
renderView();
