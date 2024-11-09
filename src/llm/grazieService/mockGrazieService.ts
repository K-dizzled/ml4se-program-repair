import { ChatHistory } from "../chat";

import { GrazieModelParams } from "./grazieModelParams";
import { CompletionAnswer } from "./grazieService";
import { GrazieServiceInterface } from "./grazieServiceInterface";

export class MockGrazieService implements GrazieServiceInterface {
    async generateCompletion(
        _chatHistory: ChatHistory,
        _params: GrazieModelParams
    ): Promise<CompletionAnswer> {
        return "def sum(a, b):    return a + b";
    }
}
