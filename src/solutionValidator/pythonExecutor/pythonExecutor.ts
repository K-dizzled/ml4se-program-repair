import { spawn } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { Err, Ok, Result } from "ts-results";

import { LineError } from "../../core/datasetGenerator";
import { LiveCodeBenchItem } from "../../liveCodeBench/liveCodeBenchItem";
import { SolutionValidator } from "../solutionValidator";

export class PythonExecutor implements SolutionValidator {
    async validateSolution(
        _datasetItem: LiveCodeBenchItem,
        _solution: string
    ): Promise<Result<string, LineError[]>> {
        console.log(`Running test cases for ${_datasetItem.problemTitle}`);

        const codeBlockRegex = /```(?:python)?\s*([\s\S]*?)\s*```/g;
        const match = codeBlockRegex.exec(_solution);
        const formattedSolution = match ? match[1] : "";

        // console.log("Formatted solution:", formattedSolution);

        const allTestCases = [
            ..._datasetItem.publicTestCases.map((tc) => ({
                ...tc,
                isPublic: 1,
            })),
            // ..._datasetItem.privateTestCases.map((tc) => ({
            //     ...tc,
            //     isPublic: 0,
            // })),
        ];

        try {
            const results = await this.runPythonTests(
                formattedSolution,
                allTestCases
            );
            let errors: LineError[] = [];

            for (const result of results) {
                if (result.error) {
                    errors.push(result.error);
                } else if (
                    (result.output || "").trim() !==
                    result.expectedOutput.trim()
                ) {
                    let content;
                    if (result.isPublic) {
                        content = `Public test case failed. Expected ${result.expectedOutput.trim()}, Got ${(result.output || "").trim()} for input ${result.input}`;
                    } else {
                        content = `Private test case failed. Expected ${result.expectedOutput.trim()}, Got ${(result.output || "").trim()}`;
                    }
                    errors.push({
                        line: -1, // Or a suitable value for WA
                        content: content,
                        type: "WA",
                    });
                }
            }

            if (errors.length > 0) {
                return Err(errors); // Return the array of errors
            } else {
                return Ok("Good job!");
            }
        } catch (err) {
            console.error(err);
            return Err([
                {
                    line: -1,
                    content: "Internal error occurred",
                    type: undefined,
                },
            ]);
        }
    }

    private async runPythonTests(
        solution: string,
        testCases: Array<{
            input: string;
            output: string;
            testType: string;
            isPublic: number;
        }>
    ): Promise<
        Array<{
            input: string;
            expectedOutput: string;
            output: string;
            error: LineError | null;
            isPublic: number;
        }>
    > {
        const solutionCodeBase64 = Buffer.from(solution).toString("base64");
        const pythonScript = generatePythonScript(
            solutionCodeBase64,
            testCases
        );

        return new Promise(async (resolve, reject) => {
            try {
                const tempFilePath = await createTemporaryFile(pythonScript);
                const pythonProcess = spawn("python", [tempFilePath], {
                    shell: true,
                });

                let output = "";
                let errorOutput = "";

                pythonProcess.stdout.on("data", (data) => {
                    output += data.toString();
                });

                pythonProcess.stderr.on("data", (data) => {
                    errorOutput += data.toString();
                });

                pythonProcess.on("close", (code) => {
                    cleanupTemporaryFile(tempFilePath);

                    if (code !== 0 && code !== null) {
                        if (errorOutput.includes("TLE")) {
                            try {
                                const results = JSON.parse(output);
                                resolve(results);
                            } catch (parseError: any) {
                                reject(
                                    `Repairik Error: Failed to parse results: ${parseError.message}`
                                );
                            }
                        } else {
                            handlePythonProcessError(code, errorOutput, reject);
                        }
                    } else {
                        try {
                            const results = JSON.parse(output);
                            resolve(results);
                        } catch (parseError: any) {
                            reject(
                                `Repairik Error: Failed to parse results: ${parseError.message}`
                            );
                        }
                    }
                });
            } catch (err: any) {
                reject(err);
            }
        });
    }
}

function generatePythonScript(
    solutionCodeBase64: string,
    testCases: any[]
): string {
    const pythonScript = `import sys
import json
import base64
from io import StringIO
import signal
import time
import traceback

class TimeoutExpired(Exception):
    def __init__(self, *args, **kwargs):
        Exception.__init__(self, *args, **kwargs)

    def __str__(self):
        return "TimeoutExpired"

def alarm_handler(signum, frame):
    raise TimeoutExpired

old_stdout = sys.stdout
old_stdin = sys.stdin

def run_test_case(test_case):
    sys.stdin = StringIO(test_case['input'])
    sys.stdout = StringIO()
    try:
        namespace = {}  
        # Compile the code first to catch syntax errors
        try: 
            compiled_code = compile(solution_code, '<string>', 'exec')
        except SyntaxError as e:
            sys.stdin = old_stdin
            sys.stdout = old_stdout
            output = None
            line_number = e.lineno if e else -1
            
            error = {
                "type": "RE",
                "content": solution_code.split('\\n')[line_number-1],
                "line": line_number,
                "trace": f"{type(e).__name__}: {str(e)} at line {line_number - 1}: {e.text.strip() if e.text else 'Unknown'}"
            }

            return output, error
        
        exec(compiled_code, namespace)

        output = sys.stdout.getvalue().strip()  # Capture output here

        error = None
    except TimeoutExpired:
        output = None
        error = {
            "type": "TLE",
            "content": "Time Limit Exceeded",
            "line": -1,  
        }
    except Exception as e:
        output = None

        tb = traceback.extract_tb(sys.exc_info()[2])
        line_number = tb[-1].lineno if tb else -1
        
        error = {
            "type": "RE",
            "content": solution_code.split('\\n')[line_number-1],
            "line": line_number,
            "trace": f"{type(e).__name__}: {str(e)} at line {line_number - 1}: {tb[-1].line if tb else 'Unknown'}"
        }
    return output, error



old_stdout = sys.stdout
old_stdin = sys.stdin

test_cases = ${JSON.stringify(testCases)}

solution_code_b64 = '''${solutionCodeBase64}'''
solution_code = base64.b64decode(solution_code_b64).decode('utf-8')


results = []

for test_case in test_cases:
    signal.signal(signal.SIGALRM, alarm_handler)
    signal.alarm(6)

    try:

        output, error = run_test_case(test_case)

        if error and "TimeoutExpired" in error:
            error = "TLE"
    except TimeoutExpired:
        sys.stdout = old_stdout
        sys.stdin = old_stdin
        output = None
        error = "TLE"
    finally:
        sys.stdout = old_stdout
        sys.stdin = old_stdin
        signal.alarm(0)

    results.append({
        'input': test_case['input'],
        'expectedOutput': test_case['output'],
        'output': output,
        'error': error,
        'isPublic': test_case['isPublic'],
    })
        
sys.stdout = old_stdout
sys.stdin = old_stdin
print(json.dumps(results))
`;
    return pythonScript;
}

async function createTemporaryFile(pythonScript: string): Promise<string> {
    const tempFilePath = path.join(os.tmpdir(), `temp_script_${Date.now()}.py`);
    await fs.writeFile(tempFilePath, pythonScript);
    return tempFilePath;
}

function cleanupTemporaryFile(tempFilePath: string): void {
    fs.unlink(tempFilePath).catch(() => {});
}

function handlePythonProcessError(
    code: number,
    errorOutput: string,
    reject: (reason?: any) => void
): void {
    try {
        const errorJson = JSON.parse(errorOutput);
        reject(errorJson);
    } catch (e) {
        reject(
            `Execution Error: Python process exited with code ${code}. ${errorOutput}`
        );
    }
}
