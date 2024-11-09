import { ChatHistory, ChatMessage } from "../llm/chat";
import { GrazieModelParams } from "../llm/grazieService/grazieModelParams";
import { GrazieService } from "../llm/grazieService/grazieService";
import { EventLogger } from "../logging/eventLogger";

export interface ProgramGenerationParams {
    chat: ChatHistory;
    modelParams: GrazieModelParams;
}

export function defaultProgramGenerationParams(
    modelForInference: string
): ProgramGenerationParams {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error(
            "Please make sure that Grazie API Key is set in the environment"
        );
    }

    const systemPrompt =
        "Generate a solution to the problems in python. Please answer with valid python code and produce nothing rather than the solution code. Always name the function solve.";
    const referenceProblem =
        "Write a function that adds up two integer arguments.";
    const referenceSolution = "def solve(a, b):\n    return a + b";

    const oneShotExample: ChatHistory = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: referenceProblem,
        },
        {
            role: "assistant",
            content: referenceSolution,
        },
    ];

    return {
        chat: oneShotExample,
        modelParams: {
            modelName: modelForInference,
            apiKey: apiKey,
            authType: "stgn",
        },
    };
}

export async function generateSolutionForTask(
    problemStatement: string,
    grazieService: GrazieService,
    programGenerationParams: ProgramGenerationParams,
    eventLogger?: EventLogger
): Promise<[string, ChatHistory]> {
    eventLogger?.log(
        "start-program-generation",
        `Started generating completion for problem ${problemStatement}`
    );

    const completionMessage = await grazieService.generateCompletion(
        programGenerationParams.chat,
        programGenerationParams.modelParams
    );
    const solutionMessage: ChatMessage = {
        role: "assistant",
        content: completionMessage,
    };

    const modifiedHistory =
        programGenerationParams.chat.concat(solutionMessage);

    return [completionMessage, modifiedHistory];
}
