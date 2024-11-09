import { ChatHistory } from "../chat";

import { GrazieModelParams } from "./grazieModelParams";
import { CompletionAnswer } from "./grazieService";

export interface GrazieServiceInterface {
    generateCompletion(
        chatHistory: ChatHistory,
        params: GrazieModelParams
    ): Promise<CompletionAnswer>;
}
