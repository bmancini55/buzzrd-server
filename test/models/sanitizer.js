var Sanitizer = require('../../models/sanitizer')
  , chai = require('chai')
  , expect = chai.expect;


describe('Sanitizer', function() {
  var sut;

  beforeEach(function () {
    sut = new Sanitizer();
  });

  it('should have a default maxMessageLength of 256', function() {
    expect(sut.maxMessageLength).to.equal(256);
  });

  it('should have a default maxNewLines of 3', function() {
    expect(sut.maxNewLines).to.equal(3);
  });

  describe('cleanMessage', function(next) {

    it('should retain entire message shorter than maxMessageLength', function(next) {      
      var message = 'Hello';
      sut.cleanMessage(message, function(err, result) {
        expect(result).to.equal('Hello');
        next();  
      });      
    });

    it('should retain entire message equal to maxMessageLength', function(next) {
      var message = 'Hello';
      sut.maxMessageLength = 5;
      sut.cleanMessage(message, function(err, result) {
        expect(result).to.equal('Hello');
        next();
      });
    });

    it('should truncate messages longer than maxMessageLength', function(next) {
      var message = 'Hellooooo';
      sut.maxMessageLength = 4;
      sut.cleanMessage(message, function(err, result) {
        expect(result).to.equal('Hell');
        next();
      });
    });

    it('should replace more than 3 LF with 3 LF', function(next) {
      var message = 'Hello\nWorld\nNext\nLine\nIs\nHere';
      sut.cleanMessage(message, function(err, result) {
        expect(result).to.equal('Hello\nWorld\nNext\nLine Is Here');
        next();
      })
    });

    it('should replace CRLF with LF', function(next) {
      var message = 'Hello\r\nWorld';
      sut.cleanMessage(message, function(err, result) {
        expect(result).to.equal('Hello\nWorld');
        next();
      });
    });

  });

});