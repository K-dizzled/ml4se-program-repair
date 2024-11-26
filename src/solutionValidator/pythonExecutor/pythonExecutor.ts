import { exec } from "child_process";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
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
        console.log(`Running test cases for ${_datasetItem.problemTitle}`);
        for (const testCase of [
            ..._datasetItem.publicTestCases,
            ..._datasetItem.privateTestCases,
        ]) {
            const formattedSolution = _solution
                .replace("```python", "")
                .replace("```", "");
            const result = await this.runPythonCode(
                formattedSolution,
                testCase
            );
            if (result.startsWith("EXECUTION ERROR")) {
                return Err(`EXECUTION ERROR: ${result}`);
            }
            if (result.trim() !== testCase.output.trim()) {
                return Err(
                    `SOLUTION ERROR: Expected ${testCase.output.trim()}, got ${result.trim()}`
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
        return new Promise(async (resolve, reject) => {
            const tempFilePath = join(tmpdir(), `temp_script_${Date.now()}.py`);
            try {
                // Write the Python code to a temporary file
                await fs.writeFile(tempFilePath, pythonCode);

                exec(`python "${tempFilePath}"`, (error, stdout, stderr) => {
                    // Clean up the temporary file after execution
                    fs.unlink(tempFilePath).catch(() => {});

                    if (error) {
                        resolve(`EXECUTION ERROR: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        resolve(`EXECUTION ERROR: ${stderr}`);
                        return;
                    }
                    resolve(stdout);
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
