// import { Result, Ok, Err }
import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";

export interface SolutionValidator {
    // TODO: Rewrite to result
    // validateSolution(): Result

    validateSolution(
        datasetItem: LiveCodeBenchItem,
        solution: string
    ): Promise<[boolean, string | undefined]>;
}
