import * as dotenv from "dotenv";

import { DatasetGenerator } from "./core/datasetGenerator";
import { LazyDatasetLoader } from "./liveCodeBench/liveCodeBenchItem";
import { GrazieService } from "./llm/grazieService/grazieService";
import { PythonExecutor } from "./solutionValidator/pythonExecutor/pythonExecutor";

dotenv.config();

export async function main() {
    const files = ["test4.jsonl", "test.jsonl", "test2.jsonl", "test3.jsonl"];
    for (const file of files) {
        const liveCodeBenchItemsLoader = new LazyDatasetLoader(file);
        const solutionValidator = new PythonExecutor();
        const grazieService = new GrazieService();
        const datasetGenerator = new DatasetGenerator(
            liveCodeBenchItemsLoader,
            solutionValidator,
            grazieService
        );
        await datasetGenerator.processDataset();
    }
    // const solutionValidator = new PythonExecutor();
    // const liveCodeBenchItemsLoader = new LazyDatasetLoader("test2.jsonl");

    // const grazieService = new GrazieService();
    // const datasetGenerator = new DatasetGenerator(
    //     liveCodeBenchItemsLoader,
    //     solutionValidator,
    //     grazieService
    // );
    // datasetGenerator.processDataset();

    // Example of how to use the generator

    // (async () => {
    //     for await (const item of liveCodeBenchItemsLoader.loadItems()) {
    //         if (item.problemTitle === "find-the-occurrence-of-first-almost-equal-substring") {
    //             console.log(item.metadata);
    //             console.log(item.problemTitle);
    //             console.log(item.starterCode);
    //             console.log(item.publicTestCases);
    //         }
    //     }
    // })();
}

main();
