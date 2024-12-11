import { expect, test } from "@jest/globals";

import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";
import { PythonExecutor } from "../solutionValidator/pythonExecutor/pythonExecutor";

const liveCodeBenchItem: LiveCodeBenchItem = {
    problemTitle: "Test Problem",
    problemStatement: "This is a test problem.",
    platform: "testPlatform",
    questionId: "1",
    contestId: "testContest",
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
    privateTestCases: [],
    metadata: {},
};

const pythonExecutor = new PythonExecutor();

test("PythonExecutor correctly validates solution for addition problem", async () => {
    //     const liveCodeBenchItem: LiveCodeBenchItem = {
    //         problemTitle: "Sum two numbers",
    //         problemStatement: "Given two numbers, return their sum",
    //         platform: "examplePlatform",
    //         questionId: "1",
    //         contestId: "exampleContest",
    //         contestDate: new Date(),
    //         starterCode: "",
    //         difficulty: "Easy",
    //         publicTestCases: [
    //             {
    //                 input: "1\n2",
    //                 output: "3",
    //                 testType: "public",
    //             },
    //         ],
    //         privateTestCases: [
    //             {
    //                 input: "2\n3",
    //                 output: "5",
    //                 testType: "private",
    //             },
    //         ],
    //         metadata: {},
    //     };

    const solution = `\`\`\`python
def sum(a, b):
    return a + b

x = int(input())
y = int(input())
print(sum(x, y))\`\`\``;

    // const pythonExecutor = new PythonExecutor();
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );

    console.log(result);

    expect(result.ok).toBe(true);
}, 10000);

test("PythonExecutor correctly validates functional test", async () => {
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
                testType: "functional",
            },
        ],
        privateTestCases: [],
        metadata: {},
    };

    const solution =
        "```python\nclass Solution:\n    def addTwoNumbers(self, a: int, b: int) -> int:\n        return a + b\n\ndef main():\n    solution = Solution()\n    a = int(input())\n    b = int(input())\n    print(solution.addTwoNumbers(a, b))\n\nmain()```";

    const pythonExecutor = new PythonExecutor();
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );

    console.log(result);

    expect(result.ok).toBe(true);
}, 10000);

test("PythonExecutor should catch syntax errors", async () => {
    const solution = "```python\nprint(1 / 0\n```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    console.log("PythonExecutor should catch syntax errors");
    console.log(result);
    expect(result.err).toBe(true);
    if (Array.isArray(result.val)) {
        expect(result.val[0].type).toBe("RE");
        expect(result.val[0].line).toBe(1);
        expect(result.val[0].content).toBe("print(1 / 0");
    } else {
        console.error("Unexpected error format:", result.val);
        expect(typeof result.val).toBe("string");
    }
}, 10000);

test("PythonExecutor should catch runtime errors", async () => {
    const solution = "```python\nprint(1 / 0)```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    console.log("PythonExecutor should catch runtime errors");
    console.log(result);
    expect(result.err).toBe(true);
    if (Array.isArray(result.val)) {
        expect(result.val[0].type).toBe("RE");
        expect(result.val[0].line).toBe(1);
        expect(result.val[0].content).toBe("print(1 / 0)");
    } else {
        console.error("Unexpected error format:", result.val);
        expect(typeof result.val).toBe("string");
    }
}, 10000);

test("PythonExecutor should catch wrong answers", async () => {
    const solution = "```python\nprint(1)```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    expect(result.err).toBe(true);
    if (Array.isArray(result.val)) {
        expect(result.val[0].type).toBe("WA");
        expect(result.val[0].line).toBe(-1);
        expect(result.val[0].content).toBe(
            "Public test case failed. Expected 3, Got 1 for input 1\n2"
        );
    } else {
        console.error("Unexpected error format:", result.val);
        expect(typeof result.val).toBe("string");
    }
}, 10000);

test("PythonExecutor should catch time limit exceeded errors", async () => {
    const solution = "```python\nwhile True: pass```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    console.log(result);
    expect(result.err).toBe(true);
    if (Array.isArray(result.val)) {
        expect(result.val[0].type).toBe("TLE");
        expect(result.val[0].line).toBe(-1);
        expect(result.val[0].content).toBe("Time Limit Exceeded");
    } else {
        console.error("Unexpected error format:", result.val);
        expect(typeof result.val).toBe("string");
    }
}, 10000);

test("PythonExecutor should handle correct solutions", async () => {
    const solution = "```python\nprint(3)```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    expect(result.ok).toBe(true);
}, 10000);

// Additional tests

test("PythonExecutor should handle solutions with no code", async () => {
    const solution = "```\n```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    expect(result.err).toBe(true);
    // Add more specific expectations based on your error handling for empty code
}, 10000);

test("PythonExecutor should handle solutions with invalid Python syntax", async () => {
    const solution = "```python\nif a == 1 print(1)```";
    const result = await pythonExecutor.validateSolution(
        liveCodeBenchItem,
        solution
    );
    console.log(
        "PythonExecutor should handle solutions with invalid Python syntax"
    );
    console.log(result);

    expect(result.err).toBe(true);
    if (Array.isArray(result.val)) {
        expect(result.val[0].type).toBe("RE");
        // Add expectations for line number and content
    } else {
        console.error("Unexpected error format:", result.val);
        expect(typeof result.val).toBe("string");
    }
}, 10000);

test("PythonExecutor should handle solutions with import statements", async () => {
    const solution = "```python\nimport math\nprint(math.sqrt(4))```";
    const sqrtLiveCodeBenchItem: LiveCodeBenchItem = {
        problemTitle: "Square root",
        problemStatement: "Given a number, return its square root",
        platform: "examplePlatform",
        questionId: "2",
        contestId: "exampleContest",
        contestDate: new Date(),
        starterCode: "",
        difficulty: "Easy",
        publicTestCases: [
            {
                input: "4",
                output: "2.0",
                testType: "functional",
            },
        ],
        privateTestCases: [],
        metadata: {},
    };

    const result = await pythonExecutor.validateSolution(
        sqrtLiveCodeBenchItem,
        solution
    );
    console.log(result);
    // Adjust the expectation based on whether imports are allowed or not
    expect(result.ok).toBe(true);
}, 10000);

test("PythonExecutor should handle solutions with multiple test cases", async () => {
    const multiTestCaseItem: LiveCodeBenchItem = {
        ...liveCodeBenchItem,
        publicTestCases: [
            { input: "1\n2", output: "3", testType: "public" },
            { input: "3\n4", output: "7", testType: "public" },
        ],
    };
    const solution =
        "```python\na = int(input())\nb = int(input())\nprint(a + b)```";
    const result = await pythonExecutor.validateSolution(
        multiTestCaseItem,
        solution
    );
    expect(result.ok).toBe(true);
}, 10000);

test("PythonExecutor should handle solutions with private test cases", async () => {
    const privateTestCaseItem: LiveCodeBenchItem = {
        ...liveCodeBenchItem,
        privateTestCases: [
            { input: "5\n6", output: "11", testType: "private" },
        ],
    };
    const solution =
        "```python\na = int(input())\nb = int(input())\nprint(a + b)```";
    const result = await pythonExecutor.validateSolution(
        privateTestCaseItem,
        solution
    );
    expect(result.ok).toBe(true);
}, 10000);
