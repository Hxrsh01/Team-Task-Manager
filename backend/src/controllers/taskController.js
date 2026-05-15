const { validationResult } = require('express-validator');
const pool = require('../config/db');

// Helper: check project membership + return role
async function getMembership(projectId, userId) {
  const result = await pool.query(
    'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
    [projectId, userId]
  );
  return result.rows[0] || null;
}

// Get all tasks for a project
async function getProjectTasks(req, res) {
  const { projectId } = req.params;

  try {
    const membership = await getMembership(projectId, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const result = await pool.query(
      `SELECT t.*, 
        u.name AS assigned_to_name, u.email AS assigned_to_email,
        c.name AS created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.project_id = $1
       ORDER BY 
         CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Create task (admin only)
async function createTask(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { title, description, assigned_to, priority, due_date } = req.body;

  try {
    const membership = await getMembership(projectId, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });
    if (membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    // Validate assigned_to is a project member
    if (assigned_to) {
      const isMember = await getMembership(projectId, assigned_to);
      if (!isMember) return res.status(400).json({ error: 'Assigned user is not a project member' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, priority, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, projectId, assigned_to || null, req.user.id, priority || 'medium', due_date || null]
    );

    // Fetch with user info
    const full = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email, c.name AS created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Update task
async function updateTask(req, res) {
  const { projectId, taskId } = req.params;

  try {
    const membership = await getMembership(projectId, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const taskResult = await pool.query('SELECT * FROM tasks WHERE id=$1 AND project_id=$2', [taskId, projectId]);
    if (taskResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const task = taskResult.rows[0];
    const isAdmin = membership.role === 'admin';
    const isAssigned = task.assigned_to === req.user.id;

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }

    // Members can only update status
    const { title, description, assigned_to, priority, due_date, status } = req.body;

    let updatedTitle = task.title;
    let updatedDesc = task.description;
    let updatedAssigned = task.assigned_to;
    let updatedPriority = task.priority;
    let updatedDueDate = task.due_date;
    let updatedStatus = status !== undefined ? status : task.status;

    if (isAdmin) {
      if (title !== undefined) updatedTitle = title;
      if (description !== undefined) updatedDesc = description;
      if (assigned_to !== undefined) updatedAssigned = assigned_to;
      if (priority !== undefined) updatedPriority = priority;
      if (due_date !== undefined) updatedDueDate = due_date;
    }

    const result = await pool.query(
      `UPDATE tasks SET title=$1, description=$2, assigned_to=$3, priority=$4, due_date=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [updatedTitle, updatedDesc, updatedAssigned, updatedPriority, updatedDueDate, updatedStatus, taskId]
    );

    const full = await pool.query(
      `SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email, c.name AS created_by_name
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assigned_to
       LEFT JOIN users c ON c.id = t.created_by
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    res.json(full.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Delete task (admin only)
async function deleteTask(req, res) {
  const { projectId, taskId } = req.params;

  try {
    const membership = await getMembership(projectId, req.user.id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query('DELETE FROM tasks WHERE id=$1 AND project_id=$2', [taskId, projectId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Dashboard stats for a project
async function getDashboard(req, res) {
  const { projectId } = req.params;

  try {
    const membership = await getMembership(projectId, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const [totalResult, statusResult, userResult, overdueResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM tasks WHERE project_id=$1', [projectId]),
      pool.query(
        `SELECT status, COUNT(*) as count FROM tasks WHERE project_id=$1 GROUP BY status`,
        [projectId]
      ),
      pool.query(
        `SELECT u.id, u.name, COUNT(t.id) as task_count,
          SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END) as done_count
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
         LEFT JOIN tasks t ON t.assigned_to = u.id AND t.project_id = pm.project_id
         WHERE pm.project_id = $1
         GROUP BY u.id, u.name
         ORDER BY task_count DESC`,
        [projectId]
      ),
      pool.query(
        `SELECT COUNT(*) FROM tasks 
         WHERE project_id=$1 AND due_date < NOW() AND status != 'done'`,
        [projectId]
      ),
    ]);

    const statusMap = { todo: 0, in_progress: 0, done: 0 };
    statusResult.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });

    res.json({
      total: parseInt(totalResult.rows[0].count),
      by_status: statusMap,
      by_user: userResult.rows,
      overdue: parseInt(overdueResult.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getProjectTasks, createTask, updateTask, deleteTask, getDashboard };
