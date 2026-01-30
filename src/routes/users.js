const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const Joi = require('joi');

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update current user's name
router.patch('/me', auth, async (req, res) => {
  const schema = Joi.object({ name: Joi.string().required() });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const result = await db.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role', [value.name, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all users - admin only
router.get('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
