
//problem 1:
/**
 * @return {Array<number>} an array with the specified length. the array elements will be from 0 to the length(value of length not included) .
 * @param {number} length number of elements
 * @example createArray(3) => [0,1,2]
 * @example createArray(5) => [0,1,2,3,4]
 */

exports.createArray = (length) => Array.from(Array(length).keys());

// test cases:  
/*  
    1-test that the return value of type array
    2-test if we pass 2 it will return array of length 2 and test it includes 1
    3-test if we pass 3 it will return array of length 3 and test it doesn't include 3
*/

//problem 2:
/**
 * @return {number} a random number in range of min and max (including min and max).
 * @param {number} min starting of the range
 * @param {number} max end of the range
 
 * @example random(2,9) => a random number in range (2,3,4,...,9)
 */
exports.random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// test cases:
/* 
    1-test that the return value is a number
    2-test if we pass 5,7 it will return a number >= 5 and <= 7
    3-test if we pass one parameter it will return NaN
*/
// /////////////////////////////////////////////////////////////////////////////////////////
