import { ChatHistory, ChatMessage } from "../llm/chat";
import { GrazieModelParams } from "../llm/grazieService/grazieModelParams";
import { GrazieServiceInterface } from "../llm/grazieService/grazieServiceInterface";
import { EventLogger } from "../logging/eventLogger";

export interface ProgramGenerationParams {
    chat: ChatHistory;
    modelParams: GrazieModelParams;
}

export function defaultProgramGenerationParams(
    modelForInference: string,
    isFunctional: boolean = false
): ProgramGenerationParams {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error(
            "Please make sure that Grazie API Key is set in the environment"
        );
    }

    const systemPrompt =
        "You are an expert Python programmer. You will be given a question (problem specification) and will generate a correct Python program that matches the specification and passes all tests. You will NOT return anything except for the program. NEVER add if __name__ == '__main__': block.";
    const referenceProblem =
        "Add two input integer numbers together and print the result. Input: 3\n2 Output: 5";

    let referenceMessage;
    let referenceSolution;
    if (isFunctional) {
        const referenceStarterCode =
            "```python\nclass Solution:\n    def addTwoNumbers(self, a: int, b: int) -> int:\n```";
        referenceMessage =
            referenceProblem +
            "\nYOUR CODE SHOULD START WITH CODE BELOW\n" +
            referenceStarterCode +
            "\nAND SHOULD PASS PRIVATE INPUT/OUTPUT TESTS from main(), i.e. you should be able to input and output\n";
        referenceSolution =
            "```python\nclass Solution:\n    def addTwoNumbers(self, a: int, b: int) -> int:\n        return a + b\n\ndef main():\n    solution = Solution()\n    a = int(input())\n    b = int(input())\n    print(solution.addTwoNumbers(a, b))\n\nmain()```";
    } else {
        referenceMessage = referenceProblem;
        referenceSolution =
            "```python\na = int(input())\nb = int(input())\nprint(a + b)\n```";
    }

    const oneShotExample: ChatHistory = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: referenceMessage,
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
