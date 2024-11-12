import { DatasetGenerator } from "./core/datasetGenerator";
import { LazyDatasetLoader } from "./liveCodeBench/liveCodeBenchItem";
import { MockGrazieService } from "./llm/grazieService/mockGrazieService";
import { MockSolutionValidator } from "./solutionValidator/mockSolutionValidator";

export function main() {
    const solutionValidator = new MockSolutionValidator();
    const liveCodeBenchItemsLoader = new LazyDatasetLoader("test4.jsonl");

    const grazieService = new MockGrazieService();
    const datasetGenerator = new DatasetGenerator(
        liveCodeBenchItemsLoader,
        solutionValidator,
        grazieService
    );
    datasetGenerator.processDataset();

    // Example of how to use the generator
    //
    // (async () => {
    //     for await (const item of liveCodeBenchItemsLoader.loadItems()) {
    //         console.log(item.problemTitle);
    //         console.log(item.privateTestCases);
    //     }
    // })();
}

main();
