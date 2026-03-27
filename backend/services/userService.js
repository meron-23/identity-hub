const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

/**
 * createUser
 * Creates and persists a new verified user in MongoDB.
 *
 * @param {Object} data - { name, dob, idImage, faceMatchScore }
 * @returns {Object} Saved user document
 */
const createUser = async ({ name, dob, idImage, faceMatchScore }) => {
  const user = new User({
    userId: uuidv4(),
    name,
    dob: dob || null,
    verified: true,
    faceMatchScore: faceMatchScore || null,
    idImage: idImage || null,
  });
  await user.save();
  return user;
};

/**
 * getUserById
 * Retrieves a user from MongoDB by their UUID.
 *
 * @param {string} userId
 * @returns {Object|null} User document or null
 */
const getUserById = async (userId) => {
  return User.findOne({ userId });
};

/**
 * getFirstUser
 * Returns the first enrolled user — used by SSO demo flow.
 *
 * @returns {Object|null}
 */
const getFirstUser = async () => {
  return User.findOne().sort({ createdAt: 1 });
};

/**
 * getAllUsers
 * Returns all enrolled users.
 *
 * @returns {Array}
 */
const getAllUsers = async () => {
  return User.find({});
};

module.exports = { createUser, getUserById, getFirstUser, getAllUsers };
