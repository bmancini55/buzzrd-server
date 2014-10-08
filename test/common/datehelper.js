var chai = require('chai')
  , expect = chai.expect
  , sut = require('../..//common/datehelper')

describe('DateHelper', function() {

  describe('#daysAgo', function () {

    describe('with past date', function() {
      it('should return correct days ago', function() {
        var testDate = new Date();
        testDate.setDate(testDate.getDate()-1);

        var result = Math.floor(sut.daysAgo(testDate));
        expect(result).to.equal(1);        
      });
    });

    describe('with todays date', function() {
      it('should return 0', function () {
        var testDate = new Date();

        var result = Math.floor(sut.daysAgo(testDate));
        expect(result).to.equal(0);        
      })
    })
  });
  
});