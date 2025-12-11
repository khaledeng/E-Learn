const { sum } = require("./index");

// Suite
describe("here I test some functions", function() {
    it("Test if the params are numbers, should return the summation of the two numbers", function() {
        expect(sum(3, 4)).toBe(7);
    });
});
