const router = require('express').Router({ mergeParams: true });
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const { getProjectTasks, createTask, updateTask, deleteTask, getDashboard } = require('../controllers/taskController');

router.use(auth);

router.get('/', getProjectTasks);
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
], createTask);
router.put('/:taskId', [
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
], updateTask);
router.delete('/:taskId', deleteTask);
router.get('/dashboard', getDashboard);

module.exports = router;
