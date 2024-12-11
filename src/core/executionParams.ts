import { Severity } from "../logging/eventLogger";

export interface ExecutionParams {
    severity: Severity;
    weakModel: string;
    strongModel: string;
}

export const defaultExecutionParams: ExecutionParams = {
    severity: Severity.DEBUG,
    weakModel: "anthropic-claude",
    strongModel: "anthropic-claude",
};
