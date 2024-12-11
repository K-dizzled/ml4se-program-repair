import { Err, Ok, Result } from "ts-results";

import { LineError } from "../core/datasetGenerator";
import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";

import { SolutionValidator } from "./solutionValidator";

export class MockSolutionValidator implements SolutionValidator {
    private answerSolutionCorrect = false;

    async validateSolution(
        _datasetItem: LiveCodeBenchItem,
        _solution: string
    ): Promise<Result<string, LineError[]>> {
        if (this.answerSolutionCorrect) {
            return Ok("Good job!");
        }

        this.answerSolutionCorrect = !this.answerSolutionCorrect;

        return Err([
            {
                line: -1,
                content: "Incorrect solution",
                type: "WA",
            },
        ]);
    }
}
