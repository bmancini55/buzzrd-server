/**
 * Loader for configuration files
 */

// Module dependencies
var fs    = require('fs')
  , path  = require('path')

// Local variables
  , configDir = path.dirname(require.main.filename)
  , configPath = path.join(configDir, 'config.js')
  , config;


/**
 * Initializes the config
 */
function initialize() {
  config = require(configPath);
}

/** 
 * Gets the environment specific version
 * of the configuration file
 */
function env() {
  var envType = process.env.NODE_ENV || 'development'
    , config = full();

  if(!config[envType]) {
    throw new Error('Config does not contain environment configuration for ' + envType);
  }

  return config[envType];
}

/** 
 * Gets the full configuration file
 */
function full() {

  // inialize the config if we can
  if(!config) {
    initialize();
  }

  return config;
}


// Export the module
module.exports = {
  env: env,
  full: full
};