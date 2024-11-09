import { DatasetGenerator } from "./core/datasetGenerator";
import { LiveCodeBenchItem } from "./liveCodeBench/liveCodeBenchItem";
import { MockGrazieService } from "./llm/grazieService/mockGrazieService";
import { MockSolutionValidator } from "./solutionValidator/mockSolutionValidator";

export function main() {
    const solutionValidator = new MockSolutionValidator();

    // TODO: Change to an actual generator
    const dataset: LiveCodeBenchItem[] = [
        {
            problemStatement:
                "Write a function that adds up two integer arguments.",
        },
    ];

    const grazieService = new MockGrazieService();
    const datasetGenerator = new DatasetGenerator(
        dataset,
        solutionValidator,
        grazieService
    );
    datasetGenerator.processDataset();
}

main();
