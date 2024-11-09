import { Severity } from "../logging/eventLogger";

export interface ExecutionParams {
    severity: Severity;
    weakModel: string;
    strongModel: string;
}

export const defaultExecutionParams: ExecutionParams = {
    severity: Severity.DEBUG,
    weakModel: "grazie-chat-llama-v2-13b",
    strongModel: "gpt-4o",
};
