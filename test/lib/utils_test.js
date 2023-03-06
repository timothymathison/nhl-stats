import chai from "chai";
import {
  validateDate,
  validateSeason,
  compact
} from "../../lib/utils.js";

chai.should();

describe("utils", () => {
  describe("#validateDate", () => {
    it("succeeds with valid ISO format date", () => {
      validateDate("2023-03-06").should.eq(true);
    });

    it("fails with invalid date", () => {
      // TODO: implement
    });
  });

  describe("#validateSeason", () => {
    it("succeeds with valid season format", () => {
      validateSeason("20222023").should.eq(true);
    });
  });

  describe("#compact", () => {
    it("removes undefined object properties", () => {
      compact({
        v: 1,
        uv: undefined
      }).should.eql({
        v: 1
      })
    });
  });
});
