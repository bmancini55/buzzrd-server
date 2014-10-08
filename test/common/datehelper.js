var chai = require('chai')
  , expect = chai.expect
  , sut = require('../..//common/datehelper')

describe('DateHelper', function() {

  describe('#daysAgo', function () {

    it('should return correct days ago', function() {
      var testDate = new Date();
      testDate.setDate(testDate.getDate()-1);

      var result = Math.floor(sut.daysAgo(testDate));
      expect(result).to.equal(1);        
    });
    
    it('should return 0 for todays date', function () {
      var testDate = new Date();

      var result = Math.floor(sut.daysAgo(testDate));
      expect(result).to.equal(0);        
    });
  });


  describe('#addDays', function() {

    it ('should not mutate original date', function() {
      var testDate = new Date(2014, 10, 8);
      var ticks = testDate.getDate();
      sut.addDays(testDate, 1);
      expect(testDate.getDate()).to.equal(ticks);
    });
    
    it('should add days', function() {
      var testDate = new Date('2014-10-08');
      var result = sut.addDays(testDate, 1);
      expect(result.toISOString()).to.equal('2014-10-09T00:00:00.000Z')
    });

    it('should subtract days', function() {
      var testDate = new Date('2014-10-08');
      var result = sut.addDays(testDate, -1);
      expect(result.toISOString()).to.equal('2014-10-07T00:00:00.000Z')
    });

    it('should add days through next month', function() {
      var testDate = new Date('2014-10-31');
      var result = sut.addDays(testDate, 1);
      expect(result.toISOString()).to.equal('2014-11-01T00:00:00.000Z')
    });

    it('should subtract days through previous month', function() {
      var testDate = new Date('2014-10-01');
      var result = sut.addDays(testDate, -1);
      expect(result.toISOString()).to.equal('2014-09-30T00:00:00.000Z')
    });

    it('should add days through next year', function() {
      var testDate = new Date('2014-12-31');
      var result = sut.addDays(testDate, 1);
      expect(result.toISOString()).to.equal('2015-01-01T00:00:00.000Z')
    });

    it('should subtract days through previous year', function() {
      var testDate = new Date('2015-01-01');
      var result = sut.addDays(testDate, -1);
      expect(result.toISOString()).to.equal('2014-12-31T00:00:00.000Z')
    });

  });
});