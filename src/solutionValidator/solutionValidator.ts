import { Result } from "ts-results";

import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";

export interface SolutionValidator {
    validateSolution(
        datasetItem: LiveCodeBenchItem,
        solution: string
    ): Promise<Result<string, string>>;
}
