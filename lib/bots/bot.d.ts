import { ActivityHandler, ConversationState } from 'botbuilder';
export declare class ScrumJiraBot extends ActivityHandler {
    private conversationState;
    private conversationDataAccessor;
    private jiraServerUrl;
    private jiraEstimationField;
    private jiraAuthHeader;
    constructor(conversationState: ConversationState);
    processSubmitAction(turnContext: any, conversationData: any): Promise<void>;
    private cancel;
    getJiraTicketInfo(ticketNumber: any): Promise<JiraTicket>;
    publishToJira(ticket: JiraTicket, estimate: any): Promise<any>;
    processTicketNumber(turnContext: any, conversationData: any): Promise<void>;
    private removeAt;
}
export declare class JiraTicket {
    key: string;
    summary: string;
    link: string;
    estimation: string;
    constructor(key: string, summary: string, link: string, estimation: string);
}
