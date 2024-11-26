import * as dotenv from "dotenv";

import { DatasetGenerator } from "./core/datasetGenerator";
import { LazyDatasetLoader } from "./liveCodeBench/liveCodeBenchItem";
import { GrazieService } from "./llm/grazieService/grazieService";
import { PythonExecutor } from "./solutionValidator/pythonExecutor/pythonExecutor";

dotenv.config();

export function main() {
    const solutionValidator = new PythonExecutor();
    const liveCodeBenchItemsLoader = new LazyDatasetLoader("test4.jsonl");

    const grazieService = new GrazieService();
    const datasetGenerator = new DatasetGenerator(
        liveCodeBenchItemsLoader,
        solutionValidator,
        grazieService
    );
    datasetGenerator.processDataset();

    // Example of how to use the generator

    // (async () => {
    //     for await (const item of liveCodeBenchItemsLoader.loadItems()) {
    //         if (item.metadata) {
    //             console.log(item.metadata);
    //         }
    //     }
    // })();
}

main();
