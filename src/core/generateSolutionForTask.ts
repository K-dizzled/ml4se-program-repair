import { ChatHistory, ChatMessage } from "../llm/chat";
import { GrazieModelParams } from "../llm/grazieService/grazieModelParams";
import { GrazieServiceInterface } from "../llm/grazieService/grazieServiceInterface";
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
        "Generate a solution to the problems in python. Please answer with valid python code and produce nothing rather than the solution code.";
    const referenceProblem =
        "Add two numbers together. The function should take two arguments, a and b, and return their sum. Call this function";
    const referenceSolution = "def sum(a, b):\n    return a + b\n\nsum(1, 2)";

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
    grazieService: GrazieServiceInterface,
    programGenerationParams: ProgramGenerationParams,
    eventLogger?: EventLogger
): Promise<[string, ChatHistory]> {
    eventLogger?.log(
        "start-program-generation",
        `Started generating completion for problem ${problemStatement}`
    );

    const problemMessage: ChatMessage = {
        role: "user",
        content: problemStatement,
    };

    const historyWithProblem =
        programGenerationParams.chat.concat(problemMessage);

    const completionMessage = await grazieService.generateCompletion(
        historyWithProblem,
        programGenerationParams.modelParams
    );
    const solutionMessage: ChatMessage = {
        role: "assistant",
        content: completionMessage,
    };

    const modifiedHistory = historyWithProblem.concat(solutionMessage);

    return [completionMessage, modifiedHistory];
}
