
/**
 * Sanitizes things...
 */ 

function Sanitizer(options) {

  // apply default options if non-provided
  options = options || {
    maxMessageLength : 256,
    maxNewLines : 3
  };

  // apply properties
  for(var option in options) {
    this[option] = options[option];
  }
}


/**
 * Expose an instance of `sanitizer`
 */

module.exports = Sanitizer;



/**
 * Cleans a message
 * @param {String} message
 * @param {Function} next - callback with form (err, message)
 */

Sanitizer.prototype.cleanMessage = function(message, next) {
  message = limitMessageLength(message, this.maxMessageLength);
  message = stripNewLines(message, this.maxNewLines);
  next(null, message);
}

function limitMessageLength(message, maxMessageLength) {
  return message.substring(0, maxMessageLength);
}

function stripNewLines(message, maxNewLines) {
  var newLineCount = 0
    , buffer = [];
  buffer = Array.prototype.map.call(message, function(c) {
    if(c === '\n') {
      if(newLineCount < maxNewLines) {
        newLineCount++;
        return '\n';
      } else {
        return ' ';
      }
    } else if (c === '\r') {
      return '';
    } else {
      return c;
    }
  });
  return buffer.join('');
}

