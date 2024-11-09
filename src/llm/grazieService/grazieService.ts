import { EventLogger } from "../../logging/eventLogger";
import { ChatHistory, ChatMessage } from "../chat";

import { GrazieApi, GrazieChatRole, GrazieFormattedHistory } from "./grazieApi";
import { GrazieModelParams } from "./grazieModelParams";
import { GrazieServiceInterface } from "./grazieServiceInterface";

export type CompletionAnswer = string;

export class GrazieService implements GrazieServiceInterface {
    private readonly api = new GrazieApi(this.eventLogger);

    constructor(private readonly eventLogger?: EventLogger) {}

    async generateCompletion(
        chatHistory: ChatHistory,
        params: GrazieModelParams
    ): Promise<CompletionAnswer> {
        const formattedChat = this.formatChatHistory(chatHistory);
        const historyAsJSON = JSON.stringify(formattedChat);

        this.eventLogger?.log(
            "completion-with-histury",
            `Issued completion with history: ${historyAsJSON}`
        );

        const completion = await this.api.requestChatCompletion(
            params,
            formattedChat
        );

        return completion;
    }

    private formatChatHistory(chat: ChatHistory): GrazieFormattedHistory {
        return chat.map((message: ChatMessage) => {
            const grazieRoleName =
                message.role[0].toUpperCase() + message.role.slice(1);
            return {
                role: grazieRoleName as GrazieChatRole,
                text: message.content,
            };
        });
    }
}
