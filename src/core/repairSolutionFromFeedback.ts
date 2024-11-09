import { ChatHistory, ChatMessage } from "../llm/chat";
import { GrazieModelParams } from "../llm/grazieService/grazieModelParams";
import { GrazieService } from "../llm/grazieService/grazieService";
import { EventLogger } from "../logging/eventLogger";

export interface ProgramRepairParams {
    chat: ChatHistory;
    modelParams: GrazieModelParams;
}

export function defaultProgramRepairParams(
    solutionFeedback: string,
    generationHistory: ChatHistory,
    modelForRepairment: string
): ProgramRepairParams {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error(
            "Please make sure that Grazie API Key is set in the environment"
        );
    }

    const repairPrompt = `Your last solution was incorrect, I get such error when executing it: ${solutionFeedback}. Please fix the code and send it back.`;
    const repairMessage: ChatMessage = {
        role: "user",
        content: repairPrompt,
    };

    const chatHistory: ChatHistory = generationHistory.concat(repairMessage);

    return {
        chat: chatHistory,
        modelParams: {
            modelName: modelForRepairment,
            apiKey: apiKey,
            authType: "stgn",
        },
    };
}

// We aim to collect a dataset where code samples
// are repaired in just one step: one feedback error observation leads
// to correctly solving the problem afterwards.
// Therefore architecture assumes repairment in one step
export async function repairSolutionFromFeedback(
    solutionFeedback: string,
    grazieService: GrazieService,
    generationHistory: ChatHistory,
    modelForRepairment: string,
    eventLogger?: EventLogger,
    programRepairParams: ProgramRepairParams = defaultProgramRepairParams(
        solutionFeedback,
        generationHistory,
        modelForRepairment
    )
): Promise<string> {
    eventLogger?.log(
        "start-program-repair",
        `Started repairing code from feedback ${solutionFeedback}`
    );

    return grazieService.generateCompletion(
        programRepairParams.chat,
        programRepairParams.modelParams
    );
}
