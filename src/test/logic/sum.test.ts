import { expect, test } from "@jest/globals";

import { sum } from "../../logic/sum";

// While we have no tests to supress warning
test("adds 1 + 2 to equal 3", () => {
    expect(sum(1, 2)).toBe(3);
});
