/*
 * Helpers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('../config');

// Container for all the helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = function (str) {
  if (typeof (str) == 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  }
  return false;
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
  try {
    return JSON.parse(str);
  }
  catch (e) {
    return {};
  }
};

// Export the module
module.exports = helpers;