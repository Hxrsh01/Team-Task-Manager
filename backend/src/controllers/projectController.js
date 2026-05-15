const { validationResult } = require('express-validator');
const pool = require('../config/db');

// Create project - creator becomes admin
async function createProject(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const project = await client.query(
      'INSERT INTO projects (name, description, created_by) VALUES ($1,$2,$3) RETURNING *',
      [name, description, userId]
    );

    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3)',
      [project.rows[0].id, userId, 'admin']
    );

    await client.query('COMMIT');
    res.status(201).json(project.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
}

// Get all projects for current user
async function getMyProjects(req, res) {
  try {
    const result = await pool.query(
      `SELECT p.*, pm.role, 
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Get single project (with members)
async function getProject(req, res) {
  const { id } = req.params;
  try {
    const membership = await pool.query(
      'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (membership.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

    const project = await pool.query('SELECT * FROM projects WHERE id=$1', [id]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const members = await pool.query(
      `SELECT u.id, u.name, u.email, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1`,
      [id]
    );

    res.json({ ...project.rows[0], role: membership.rows[0].role, members: members.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Add member (admin only)
async function addMember(req, res) {
  const { id } = req.params;
  const { email, role = 'member' } = req.body;

  try {
    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const userResult = await pool.query('SELECT id, name, email FROM users WHERE email=$1', [email]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userResult.rows[0];
    const existing = await pool.query(
      'SELECT id FROM project_members WHERE project_id=$1 AND user_id=$2',
      [id, user.id]
    );
    if (existing.rows.length > 0) return res.status(409).json({ error: 'User already a member' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1,$2,$3)',
      [id, user.id, role]
    );

    res.status(201).json({ message: 'Member added', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Remove member (admin only)
async function removeMember(req, res) {
  const { id, userId } = req.params;

  try {
    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id=$1 AND user_id=$2',
      [id, userId]
    );

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Delete project (admin only)
async function deleteProject(req, res) {
  const { id } = req.params;

  try {
    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query('DELETE FROM projects WHERE id=$1', [id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createProject, getMyProjects, getProject, addMember, removeMember, deleteProject };
