
function toNumeralsAM(num) {
    var ones = ['', 'አንድ', 'ሁለት', 'ሶስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ', 'አሥር',
      'አስራ አንድ', 'አስራ ሁለት', 'አስራ ሶስት', 'አስራ አራት', 'አስራ አምስት', 'አስራ ስድስት', 'አስራ ሰባት', 'አስራ ስምንት', 'አስራ ዘጠኝ'];
    var tens = ['', '', 'ሀያ', 'ሰላሳ', 'አርባ', 'ሀምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠና'];
    var zero = 'ዜሮ';
  
    var numString = num.toString();
  
    dotPos = numString.indexOf('.');
  
    try {
      // 0
      if (num === 0) return zero;
      // 1 - 20
      else if (num < 20) {
        return ones[num];
      }
      // 20 - 99
      else if (numString.length === 2) {
        var end = +(numString[1]);
        if (end === 0) return tens[numString[0]];
        return tens[numString[0]] + ' ' + ones[numString[1]];
      }
      // 100 - 999 
      else if (numString.length == 3) {
        var end = +(numString.slice(1))
        if (end === 0)
          return ones[numString[0]] + ' መቶ';
        return ones[numString[0]] + ' መቶ ' + toNumeralsAM(+(numString[1] + numString[2]));
      }
      // 1000 - 9999
      else if (numString.length === 4) {
        var end = +(numString.slice(1));
        if (end === 0) return ones[numString[0]] + ' ሺህ';
        else if (end < 100) return ones[numString[0]] + ' ሺህ ' + toNumeralsAM(end);
        return ones[numString[0]] + ' ሺህ ' + toNumeralsAM(end);
      }
      // 10,000 - 99,999
      else if (numString.length === 5) {
        var end = +(numString.slice(2));
        if (end === 0) return toNumeralsAM(numString.slice(0, 2)) + ' ሺህ';
        return toNumeralsAM(numString.slice(0, 2)) + ' ሺህ ' + toNumeralsAM(end);
      }
      // 100,000 - 999,999
      else if (numString.length === 6) {
        var end = +(numString.slice(3));
        if (end === 0) return toNumeralsAM(numString.slice(0, 3)) + ' ሺህ';
        return toNumeralsAM(numString.slice(0, 3)) + ' ሺህ ' + toNumeralsAM(end);
      }
      // 1,000,000 - 9,999,999
      else if (numString.length === 7) {
        var end = +(numString.slice(1));
        if (end === 0) return ones[numString[0]] + ' ሚሊዮን';
        else if (end < 100) return ones[numString[0]] + ' ሚሊዮን ' + toNumeralsAM(numString.slice(5));
        return ones[numString[0]] + ' ሚሊዮን ' + toNumeralsAM(end);
      }
      // 10,000,000 - 99,999,999
      else if (numString.length === 8) {
        var end = +(numString.slice(2));
        if (end === 0) return toNumeralsAM(numString.slice(0, 2)) + ' ሚሊዮን';
        return toNumeralsAM(numString.slice(0, 2)) + ' ሚሊዮን ' + toNumeralsAM(end);
      }
      // 100,000,000 - 999,999,999
      else if (numString.length === 9) {
        var end = +(numString.slice(3));
        if (end === 0) return toNumeralsAM(numString.slice(0, 3)) + ' ሚሊዮን';
        return toNumeralsAM(numString.slice(0, 3)) + ' ሚሊዮን ' + toNumeralsAM(end);
      }
      // < 0 or > 999,999,999
      else if (num < 0 || num > 999, 999, 999) {
        throw new Error('ከ 0 እስከ 999,999,999 ያሉ ቁጥሮች ብቻ ይፈቀዳሉ!');
      }
    }
    catch (error) {
      return error;
    }
  }
  
  /**
   * Converts numbers to Amharic currency.
   * @param {number} num The number to be formatted as a word currency, decimal numbers in the range 0.00 to 999,999,999.99 are supported! Otherwise an Error is thrown.
   * @return {string}
   */
  function toCurrencyAM(num) {
    try {
      var numString = num.toString();
      var dotPos = numString.indexOf('.');
      var numString = num.toPrecision(dotPos + 2).toString();
      if (dotPos > 0) {
        var currency = toNumeralsAM(+numString.slice(0, dotPos)) + ' ብር ከ ' + toNumeralsAM(+numString.slice(dotPos + 1)) + ' ሳንቲም';
        return currency;
      }
      else throw new Error("Number not supported as a currency.")
    }
    catch (error) {
      return error;
    }
  }
  module.exports = { toNumeralsAM ,toCurrencyAM};