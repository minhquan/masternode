// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');

// Constants
const ALL_HTTP_METHODS = ['post', 'get', 'put', 'delete'];
const TOKEN_LENGTH = 20;
const CHECK_LENGTH = 20;

// Define the handlers
var handlers = {};

// Users handler
handlers.users = function (data, callback) {
    let acceptableMethods = ALL_HTTP_METHODS;
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
    // Check that all required fields are filled out
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone, (err, data) => {
            // If there was an error finding a user by phone, it means the user with that phone doesn't already exist
            if (err) {
                // Hash the password
                let hashedPassword = helpers.hash(password);

                // Create the user object
                if (hashedPassword) {
                    let userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    // Store the user
                    _data.create('users', phone, userObject, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                } else {
                    callback(500, { 'Error': `Could not hash the user's password` });
                }
            } else {
                callback(400, { 'Error': 'A user with that phone number already exists' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

// Users - get
// Required data: phone
// Optional data: none
// Only let an authenticated user access their object. Don't let them access anyone else's
handlers._users.get = function (data, callback) {
    // Check that the phone number is valid
    let phone = data.queryStringObject.phone;
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    if (phone) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if (isValid) {
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        // Remove the hashed password from the user object before returing it to the requester
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// Only let an authenticated user update their own object. Don't let them update anyone else's
handlers._users.put = function (data, callback) {
    // Check for the required field
    let phone = data.payload.phone;
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;

    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    // Error if the phone is invalid
    if (phone) {
        // Error if nothing is sent to update
        if (firstName || lastName || password) {
            // Get the token from the headers
            let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, (isValid) => {
                if (isValid) {
                    // Look up the user
                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            // Update necessary fields
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // Store the new updates
                            _data.update('users', phone, userData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, { 'Error': 'Could not update the user' });
                                }
                            });
                        } else {
                            callback(400, { 'Error': 'The specified user does not exist' });
                        }
                    });
                } else {
                    callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    }
};

// Users - delete
// Required field: phone
// Only let an authenticated user delete their object. Don't let them delete anyone else's
// @TODO Cleanup (delete) any other data fiels associated with this user
handlers._users.delete = function (data, callback) {
    // Check that the phone number is valid
    let phone = data.queryStringObject.phone;
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    if (phone) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (isValid) => {
            if (isValid) {
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, { 'Error': 'Could not delete the specified user' });
                            }
                        });
                    } else {
                        callback(404, { 'Error': 'Could not find the specified user' });
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Tokens
handlers.tokens = function (data, callback) {
    let acceptableMethods = ALL_HTTP_METHODS;
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
handlers._tokens.post = (data, callback) => {
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                // Hash the sent password and compare it to the password stored in the user object
                let hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiration date 1 hour in the future
                    let tokenId = helpers.createRandomString(TOKEN_LENGTH);
                    let expires = Date.now() + 1000 * 60 * 60;
                    let tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, { 'Error': 'Could not create the new token' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Password did not match the specified user password' });
                }
            } else {
                callback(404, { 'Error': 'Could not find the specified user' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
    // Check that the id is valid
    let id = data.queryStringObject.id;
    id = typeof (id) == 'string' && id.trim().length == TOKEN_LENGTH ? id.trim() : false;
    if (id) {
        // Lookup the token id
        _data.read('tokens', id, (err, data) => {
            if (!err && data) {
                callback(200, data);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == TOKEN_LENGTH ? data.payload.id.trim() : false;
    let extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, (err, data) => {
            if (!err && data) {
                // Check the token to make sure the token isn't already expired
                if (data.expires > Date.now()) {
                    // Set the expiration an hour from now
                    data.expires = Date.now() + 1000 * 60 * 60;
                    // Store the new updates
                    _data.update('tokens', id, data, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { 'Error': `Could not update the token's expiration` });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'The token has already expired, and cannot be extended' });
                }
            } else {
                callback(400, { 'Error': 'Specified token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing require fields or fields are invalid' });
    }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
    // Check that the token is valid
    let id = data.queryStringObject.id;
    id = typeof (id) == 'string' && id.trim().length == TOKEN_LENGTH ? id.trim() : false;
    if (id) {
        // Lookup the token
        _data.read('tokens', id, (err, data) => {
            if (!err && data) {
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { 'Error': 'Could not delete the specified token' });
                    }
                });
            } else {
                callback(404, { 'Error': 'Could not find the specified token' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, data) => {
        if (!err && data) {
            // Check that the token is for the given user and has not expired
            if (data.phone == phone && data.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// Checks
handlers.checks = function (data, callback) {
    let acceptableMethods = ALL_HTTP_METHODS;
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for all the tokens methods
handlers._checks = {};

// checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
    // Check that the id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        // Look up the check
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                // Get the token from the headers
                let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // Return the check data
                        callback(200, checkData);
                    } else {
                        callback(403, { 'Error': 'Missing required token in header, or token is invalid' });
                    }
                });
            } else {
                callback(404);
            }
        });
    }
};

// Checks - post
// Required data: protocol, url, method, sucessCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
    // Validate inputs
    let protocol = data.payload.protocol;
    let url = data.payload.url;
    let method = data.payload.method;
    let successCode = data.payload.successCode;
    let timeoutSeconds = data.payload.timeoutSeconds;

    protocol = typeof (protocol) == 'string' && ['https', 'http'].indexOf(protocol) > -1 ? protocol : false;
    url = typeof (url) == 'string' && url.trim().length > 0 ? url.trim() : false;
    method = typeof (method) == 'string' && ALL_HTTP_METHODS.indexOf(method) > -1 ? method : false;
    successCode = typeof (successCode) == 'object' && successCode instanceof Array && successCode.length > 0 ? successCode : false;
    timeoutSeconds = typeof (timeoutSeconds) == 'number' && timeoutSeconds % 1 == 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

    if (protocol && url && method && successCode && timeoutSeconds) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        // Lookup the user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if (!err && tokenData) {
                let userPhone = token.phone;

                // Lookup the user data
                _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                        let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                        // Verify that the user has less than the number of max checks per user
                        if (userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            let checkId = helpers.createRandomString(CHECK_LENGTH);

                            // Create the check object, and include the user's phone
                            let checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'successCode': successCode,
                                'timeoutSeconds': timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks', checkId, checkObject, (err) => {
                                if (!err) {
                                    // Add the check id to the user object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, (err) => {
                                        if (!err) {
                                            // Return the data about the new check
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, { 'Error': 'Could not update the user with the new check' });
                                        }
                                    });
                                } else {
                                    callback(500, { 'Error': 'Could not create the new check' });
                                }
                            });
                        } else {
                            callback(400, { 'Error': `The user already has the maxium number of checks (${config.maxChecks})` });
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required inputs, or inputs are invalid' });
    }
};

handlers._checks.put = function (data, callback) {
    // Check for the required field
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

    // Check for the optional fields
    let protocol = data.payload.protocol;
    let url = data.payload.url;
    let method = data.payload.method;
    let successCode = data.payload.successCode;
    let timeoutSeconds = data.payload.timeoutSeconds;

    protocol = typeof (protocol) == 'string' && ['https', 'http'].indexOf(protocol) > -1 ? protocol : false;

    url = typeof (url) == 'string' && url.trim().length > 0 ? url.trim() : false;
    method = typeof (method) == 'string' && ALL_HTTP_METHODS.indexOf(method) > -1 ? method : false;
    successCode = typeof (successCode) == 'object' && successCode instanceof Array && successCode.length > 0 ? successCode : false;
    timeoutSeconds = typeof (timeoutSeconds) == 'number' && timeoutSeconds % 1 == 0 && timeoutSeconds >= 1 && timeoutSeconds <= 5 ? timeoutSeconds : false;

    // Check to make sure if is valid
    if (id) {
        // Check to make sure one or more optional fields has been sent
        if (protocol || url || method || successCode || timeoutSeconds) {
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    // Get the token from the headers
                    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                    // Verify that the given token is valid for the phone number
                    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            // Update the check where necessary
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (successCode) {
                                checkData.successCode = successCode;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            // Store the new updates
                            _data.update('checks', id, checkData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, { 'Error': 'Could not update the check' });
                                }
                            });
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Check ID did not exist' });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

// Sample handler
handlers.sample = (data, callback) => {
    // Callback a http status code, and a payload object
    callback(406, { 'name': 'sample handler' });
};

// Ping handler
handlers.ping = (data, callback) => {
    callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => callback(404);

// Export the handlers
module.exports = handlers;