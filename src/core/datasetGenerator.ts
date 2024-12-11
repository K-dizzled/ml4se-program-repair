import * as fs from "fs";
import * as path from "path";

import {
    LazyDatasetLoader,
    LiveCodeBenchItem,
} from "../liveCodeBench/liveCodeBenchItem";
import { GrazieServiceInterface } from "../llm/grazieService/grazieServiceInterface";
import { EventLogger, Severity } from "../logging/eventLogger";
import Logger from "../logging/logger";
import { SolutionValidator } from "../solutionValidator/solutionValidator";

import { ExecutionParams, defaultExecutionParams } from "./executionParams";
import {
    defaultProgramGenerationParams,
    generateSolutionForTask,
} from "./generateSolutionForTask";
import { interpretSolution } from "./interpretSolutionForTask";
import { repairSolutionFromFeedback } from "./repairSolutionFromFeedback";

export interface DatasetSample {
    problemTitle: string;
    problemStatement: string;
    generation: {
        model: string;
        code: string;
        result: "success" | "failure";
    };
    interpretation?: {
        model: string;
        groundTruthErrorLine: LineError | null;
        predictedErrorLine: LineError | null;
    };
    repair?: {
        model: string;
        code: string;
        feedback: string;
        groundTruthErrorLine: LineError | null;
        predictedErrorLine: LineError | null;
        result: "success" | "failure";
    };
    correctSolution: string; // The final correct solution
}

export interface LineError {
    line: number;
    content: string;
    type?: "TLE" | "RE" | "WA";
    trace?: string;
}

export class DatasetGenerator {
    private readonly eventLogger = new EventLogger();

    private readonly executionParams: ExecutionParams = defaultExecutionParams;
    private readonly logger: Logger;

    constructor(
        private readonly liveCodeBench: LazyDatasetLoader,
        private readonly solutionValidator: SolutionValidator,
        private readonly grazieService: GrazieServiceInterface
    ) {
        this.logger = new Logger(
            this.eventLogger,
            this.executionParams.severity
        );
    }

    // TODO: Refactor to allow partial caching etc.
    async processDataset() {
        // console.log("__dirname:", __dirname);
        const outputFilePath = path.join(__dirname, "../../dataset.jsonl");
        const cacheFilePath = path.join(__dirname, "../../cache.json");
        const processedSamples = new Set<string>();

        if (fs.existsSync(cacheFilePath)) {
            try {
                const data = fs.readFileSync(cacheFilePath, "utf8");
                const parsedData = JSON.parse(data);
                parsedData.forEach((id: string) => processedSamples.add(id));
                console.log(
                    `Loaded ${processedSamples.size} processed samples from cache.`
                );
            } catch (error) {
                console.error("Error reading cache file:", error);
            }
        }

        for await (const liveBenchItem of this.liveCodeBench.loadItems()) {
            // if (liveBenchItem.privateTestCases.length === 0) {
            //     this.eventLogger?.log(
            //         "no-private-test-cases",
            //         `Skipping item ${liveBenchItem.problemTitle} as it has no private test cases`,
            //         liveBenchItem,
            //         Severity.LOGIC
            //     );
            //     continue;
            // }

            // if (
            //     liveBenchItem.problemTitle !==
            //     "find-the-occurrence-of-first-almost-equal-substring"
            // ) {
            //     continue;
            // }

            // Use a unique identifier for each sample
            const sampleId = liveBenchItem.problemTitle;

            if (processedSamples.has(sampleId)) {
                console.log(
                    `Sample "${sampleId}" already processed. Skipping.`
                );
                continue;
            }

            let result: DatasetSample | undefined = undefined;
            try {
                result = await this.processOneSample(liveBenchItem);
            } catch (error) {
                console.error("Error processing sample:", error);
                continue;
            }

            this.eventLogger?.log(
                "sample-processed",
                "Finished processing sample",
                result,
                Severity.LOGIC
            );

            try {
                fs.appendFileSync(
                    outputFilePath,
                    JSON.stringify(result) + "\n",
                    "utf8"
                );
            } catch (error) {
                console.error("Error writing result to JSON file:", error);
            }

            processedSamples.add(sampleId);
            try {
                fs.writeFileSync(
                    cacheFilePath,
                    JSON.stringify(Array.from(processedSamples)),
                    "utf8"
                );
            } catch (error) {
                console.error("Error updating cache file:", error);
            }
        }
    }

    private async processOneSample(
        sample: LiveCodeBenchItem
    ): Promise<DatasetSample | undefined> {
        const solutionModel = this.executionParams.weakModel;
        const repairModel = this.executionParams.strongModel;
        const interpretModel = this.executionParams.weakModel;
        const isFunctional: boolean =
            sample.publicTestCases[0].testType === "functional";
        const programGenerationParams = defaultProgramGenerationParams(
            solutionModel,
            isFunctional
        );
        const [potentialSolution, updatedChatHistory] =
            await generateSolutionForTask(
                sample.problemStatement,
                this.grazieService,
                programGenerationParams
            );

        const validationResults = await this.solutionValidator.validateSolution(
            sample,
            potentialSolution
        );

        const datasetSample: DatasetSample = {
            problemTitle: sample.problemTitle,
            problemStatement: sample.problemStatement,
            generation: {
                model: solutionModel,
                code: potentialSolution,
                result: validationResults.ok ? "success" : "failure",
            },
            correctSolution: "",
        };

        if (validationResults.ok) {
            this.eventLogger?.log(
                "solution-correct",
                `LLM generated correct solution without repairing for problem ${sample.problemTitle}`
            );

            datasetSample.correctSolution = potentialSolution;
            return datasetSample;
        }

        // const errorMsg = validationResults.val;

        const groundTruthErrorLine: LineError = validationResults.val[0];

        if (groundTruthErrorLine.type === "RE") {
            const interpretationResult = await interpretSolution(
                this.grazieService,
                updatedChatHistory,
                interpretModel,
                this.eventLogger
            );

            console.log("Interpretation result:", interpretationResult);

            this.eventLogger?.log(
                "interpreted-solution",
                `LLM generated interpreted solution for problem ${sample.problemTitle} with result: ${interpretationResult}`
            );

            let predictedErrorLine: LineError | null = null;

            const regex =
                /Number: (\d+)\s+Line: (.*?)\s*Trace: (.*?)\n(?:```)?\n?/s;
            const match = interpretationResult.match(regex);

            if (match && match.length === 4) {
                const lineNumber = parseInt(match[1], 10);
                const lineContent = match[2].trim();
                const trace = match[3].trim();

                predictedErrorLine = {
                    line: lineNumber,
                    content: lineContent,
                    type: "RE",
                    trace: trace,
                };
            }

            datasetSample.interpretation = {
                model: interpretModel,
                groundTruthErrorLine: groundTruthErrorLine,
                predictedErrorLine: predictedErrorLine,
            };
        }

        const feedback = this.buildFeedbackFromErrorLine(groundTruthErrorLine);

        const repairedSolution = await repairSolutionFromFeedback(
            feedback,
            this.grazieService,
            updatedChatHistory,
            repairModel
        );

        const [repairedSolutionVerdict, _] =
            await this.solutionValidator.validateSolution(
                sample,
                repairedSolution
            );

        if (repairedSolutionVerdict) {
            this.eventLogger?.log(
                "repairment-success",
                `Strong LLM successfully repaired solution for problem ${sample.problemTitle}`
            );

            datasetSample.correctSolution = repairedSolution;
        } else {
            this.eventLogger?.log(
                "repairment-failed",
                `LLM failed to repair solution for problem ${sample.problemTitle}`
            );
        }

        datasetSample.repair = {
            model: repairModel,
            code: repairedSolution,
            feedback: feedback,
            groundTruthErrorLine: groundTruthErrorLine,
            predictedErrorLine:
                datasetSample.interpretation?.predictedErrorLine || null,
            result: repairedSolutionVerdict ? "success" : "failure",
        };

        return datasetSample;
    }

    private buildFeedbackFromErrorLine(errorLine: LineError): string {
        if (errorLine.type === "TLE") {
            return "Time Limit Exceeded";
        }

        if (errorLine.type === "WA") {
            return `WRONG ANSWER: ${errorLine.content}`;
        }

        return `Error on line ${errorLine.line}: ${errorLine.content}, trace: ${errorLine.trace}`;
    }

    dispose() {
        this.logger.dispose();
    }
}
