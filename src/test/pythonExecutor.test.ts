import { expect, test } from "@jest/globals";

import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";
import { PythonExecutor } from "../solutionValidator/pythonExecutor/pythonExecutor";

test("PythonExecutor correctly validates solution for addition problem", async () => {
    const liveCodeBenchItem: LiveCodeBenchItem = {
        problemTitle: "Sum two numbers",
        problemStatement: "Given two numbers, return their sum",
        platform: "examplePlatform",
        questionId: "1",
        contestId: "exampleContest",
        contestDate: new Date(),
        starterCode: "",
        difficulty: "Easy",
        publicTestCases: [
            {
                input: "1\n2",
                output: "3",
                testType: "public",
            },
        ],
        privateTestCases: [
            {
                input: "2\n3",
                output: "5",
                testType: "private",
            },
        ],
        metadata: {},
    };

    const solution = `def sum(a, b):
    return a + b

x = int(input())
y = int(input())
print(sum(x, y))`;

    const pythonExecutor = new PythonExecutor();
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );

    console.log(result);

    expect(result.ok).toBe(true);
});
