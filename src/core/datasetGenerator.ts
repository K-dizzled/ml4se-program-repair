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
import { repairSolutionFromFeedback } from "./repairSolutionFromFeedback";

export interface DatasetSample {
    problemStatement: string;
    incorrectSolution: string;
    solutionFeedback: string;
    correctSolution: string;
}

export class DatasetGenerator {
    private readonly eventLogger = new EventLogger();

    private readonly executionParams: ExecutionParams = defaultExecutionParams;
    private readonly logger: Logger;

    constructor(
        // TODO: Make it a class that acts like a generator and yields items
        // for processing
        // Done?
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
        for await (const liveBenchItem of this.liveCodeBench.loadItems()) {
            const result = this.processOneSample(liveBenchItem);
            this.eventLogger?.log(
                "sample-processed",
                "Finished processing sample",
                result,
                Severity.LOGIC
            );
        }
    }

    private async processOneSample(
        sample: LiveCodeBenchItem
    ): Promise<DatasetSample | undefined> {
        const programGenerationParams = defaultProgramGenerationParams(
            this.executionParams.weakModel
        );
        const [potentialSolution, updatedChatHistory] =
            await generateSolutionForTask(
                sample.problemStatement,
                this.grazieService,
                programGenerationParams
            );

        const [solutionVerdict, errorMsg] =
            await this.solutionValidator.validateSolution(
                sample,
                potentialSolution
            );

        if (solutionVerdict) {
            this.eventLogger?.log(
                "solution-correct",
                `LLM generated correct solution without repairing for statement ${sample.problemStatement}`
            );

            return undefined;
        }

        if (!errorMsg) {
            throw new Error("Error message unexpectedly undefined");
        }

        const repairedSolution = await repairSolutionFromFeedback(
            errorMsg,
            this.grazieService,
            updatedChatHistory,
            this.executionParams.strongModel
        );

        const [repairedSolutionVerdict, _] =
            await this.solutionValidator.validateSolution(
                sample,
                repairedSolution
            );

        if (repairedSolutionVerdict) {
            this.eventLogger?.log(
                "repairment-success",
                `Strong LLM successfully repaired solution for statement ${sample.problemStatement}`
            );

            return {
                correctSolution: repairedSolution,
                incorrectSolution: potentialSolution,
                problemStatement: sample.problemStatement,
                solutionFeedback: errorMsg,
            };
        } else {
            this.eventLogger?.log(
                "repairment-failed",
                `LLM failed to repair solution for statement ${sample.problemStatement}`
            );

            return undefined;
        }
    }

    dispose() {
        this.logger.dispose();
    }
}
