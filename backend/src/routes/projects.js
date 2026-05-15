const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const {
  createProject, getMyProjects, getProject,
  addMember, removeMember, deleteProject
} = require('../controllers/projectController');

router.use(auth);

router.get('/', getMyProjects);
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required'),
], createProject);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', [
  body('email').isEmail().withMessage('Valid email required'),
], addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
