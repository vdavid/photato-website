/**
 * Serverless Form Service
 */

/* custom authorizer */
module.exports.auth = require('./lib/auth');

/* Update forms table and form entries table on form submission */
module.exports.handleFormEntry = require('./lib/handleFormEntry');

/* Delete form entry & update form submission count */
module.exports.deleteFormEntry = require('./lib/deleteFormEntry');

/* Get list of forms */
module.exports.getForms = require('./lib/getForms');

/*  Get entries from form entries table */
module.exports.getFormEntries = require('./lib/getFormEntries');

/*  Update form settings for notifications */
module.exports.updateFormSettings = require('./lib/updateFormSettings');
