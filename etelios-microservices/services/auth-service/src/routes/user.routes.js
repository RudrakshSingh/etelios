const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();
const userController = new UserController('auth-service');

// User management routes
router.get('/', userController.getAllUsers.bind(userController));
router.get('/:id', userController.getUserById.bind(userController));
router.put('/:id', userController.updateUser.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));
router.put('/:id/status', userController.updateUserStatus.bind(userController));
router.put('/:id/roles', userController.updateUserRoles.bind(userController));

module.exports = router;
