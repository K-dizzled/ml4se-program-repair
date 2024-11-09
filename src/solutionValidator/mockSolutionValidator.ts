import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";

import { SolutionValidator } from "./solutionValidator";

export class MockSolutionValidator implements SolutionValidator {
    private answerSolutionCorrect = false;

    async validateSolution(
        _datasetItem: LiveCodeBenchItem,
        _solution: string
    ): Promise<[boolean, string | undefined]> {
        if (this.answerSolutionCorrect) {
            return [true, undefined];
        }

        this.answerSolutionCorrect = !this.answerSolutionCorrect;

        return [false, "Bad job, try again :D"];
    }
}
