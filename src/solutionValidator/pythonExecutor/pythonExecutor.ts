import { exec } from "child_process";
import { Err, Ok, Result } from "ts-results";

import {
    LiveCodeBenchItem,
    TestCase,
} from "../../liveCodeBench/liveCodeBenchItem";
import { SolutionValidator } from "../solutionValidator";

export class PythonExecutor implements SolutionValidator {
    async validateSolution(
        _datasetItem: LiveCodeBenchItem,
        _solution: string
    ): Promise<Result<string, string>> {
        for (const testCase of [
            ..._datasetItem.publicTestCases,
            ..._datasetItem.privateTestCases,
        ]) {
            const result = await this.runPythonCode(_solution, testCase);
            if (result.startsWith("EXECUTION ERROR")) {
                return Err(`EXECUTION ERROR: ${result}`);
            }
            if (result.trim() !== testCase.output.trim()) {
                return Err(
                    `SOLUTION ERROR: Expected ${testCase.output}, got ${result}`
                );
            }
        }
        return Ok("Good job!");
    }

    private async runPythonCode(
        solution: string,
        testCase: TestCase
    ): Promise<string> {
        const pythonCode = `
import sys
from io import StringIO

# Redirect stdout to capture print output and stdin to simulate input
old_stdout = sys.stdout
old_stdin = sys.stdin
sys.stdout = StringIO()
sys.stdin = StringIO('''${testCase.input}''')

try:
    # Execute the solution code as a single-quoted multiline string to avoid shell issues
    exec('''${solution.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}''')
    # Capture the output from sys.stdout
    output = sys.stdout.getvalue().strip()
except Exception as e:
    output = "EXECUTION ERROR " + str(e)

# Restore stdout and stdin
sys.stdout = old_stdout
sys.stdin = old_stdin

# Explicitly print the captured result so it can be returned
print(output)
`;
        return new Promise((resolve) => {
            const pythonCodeBase64 = Buffer.from(pythonCode).toString("base64");
            exec(
                `python -c "import base64; exec(base64.b64decode('${pythonCodeBase64}').decode('utf-8'))"`,
                (error, stdout, stderr) => {
                    if (error) {
                        resolve(`EXECUTION ERROR: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        resolve(`EXECUTION ERROR: ${stderr}`);
                        return;
                    }
                    resolve(stdout);
                }
            );
        });
    }
}
