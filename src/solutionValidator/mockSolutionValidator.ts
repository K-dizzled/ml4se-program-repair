import { Err, Ok, Result } from "ts-results";

import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";

import { SolutionValidator } from "./solutionValidator";

export class MockSolutionValidator implements SolutionValidator {
    private answerSolutionCorrect = false;

    async validateSolution(
        _datasetItem: LiveCodeBenchItem,
        _solution: string
    ): Promise<Result<string, string>> {
        if (this.answerSolutionCorrect) {
            return Ok("Good job!");
        }

        this.answerSolutionCorrect = !this.answerSolutionCorrect;

        return Err("Incorrect solution");
    }
}
