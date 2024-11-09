import { LiveCodeBenchItem } from "../liveCodeBench/liveCodeBenchItem";
import { GrazieService } from "../llm/grazieService/grazieService";
import { EventLogger } from "../logging/eventLogger";
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
    private readonly grazieService = new GrazieService();

    private readonly executionParams: ExecutionParams = defaultExecutionParams;
    private readonly logger: Logger;

    constructor(
        private readonly solutionValidator: SolutionValidator,
    ) {
        this.logger = new Logger(
            this.eventLogger,
            this.executionParams.severity
        )
    }

    async processOneSample(
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
