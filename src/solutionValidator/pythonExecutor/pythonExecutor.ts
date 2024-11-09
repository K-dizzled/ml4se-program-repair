import { LiveCodeBenchItem } from "../../liveCodeBench/liveCodeBenchItem";
import { SolutionValidator } from "../solutionValidator";

export class PythonExecutor implements SolutionValidator {
    async validateSolution(
        _datasetItem: LiveCodeBenchItem
    ): Promise<[boolean, string]> {
        throw new Error("Method not implemented.");
    }
}
