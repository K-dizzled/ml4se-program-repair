import { ChatHistory, ChatMessage } from "../llm/chat";
import { GrazieModelParams } from "../llm/grazieService/grazieModelParams";
import { GrazieServiceInterface } from "../llm/grazieService/grazieServiceInterface";
import { EventLogger } from "../logging/eventLogger";

export interface ProgramRepairParams {
    chat: ChatHistory;
    modelParams: GrazieModelParams;
}

export function defaultProgramInterpretParams(
    generationHistory: ChatHistory,
    modelForRepairment: string
): ProgramRepairParams {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error(
            "Please make sure that Grazie API Key is set in the environment"
        );
    }

    const repairPrompt = `Check your last solution. There can be an error. If it contains a error in one of the lines, you should return the NUMBER of the FIRST line with the error, the LINE itself and TRACE FIELD with Python type of ERROR. SEND IT BACK IN THE FOLLOWING FORMAT "INTERPRETATION" \`\`\`Number: <line number>\nLine: <line content>\nTrace: <type of error>\`\`\` Example: "INTERPRETATION" \`\`\`Number: 3 Line: print(a + b Trace: SyntaxError\n\`\`\`\n!STRICTLY FOLLOW THE FORMAT!`;
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

export async function interpretSolution(
    grazieService: GrazieServiceInterface,
    generationHistory: ChatHistory,
    modelForInterpretation: string,
    eventLogger?: EventLogger,
    programRepairParams: ProgramRepairParams = defaultProgramInterpretParams(
        generationHistory,
        modelForInterpretation
    )
): Promise<string> {
    eventLogger?.log(
        "start-program-repair",
        `Started interpreting code using ${modelForInterpretation}`
    );

    return grazieService.generateCompletion(
        programRepairParams.chat,
        programRepairParams.modelParams
    );
}
