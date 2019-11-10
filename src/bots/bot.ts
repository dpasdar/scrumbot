import { ActivityHandler, UserState, ConversationState, CardFactory } from 'botbuilder';
const CONVERSATION_DATA_PROPERTY = 'conversationData';
import * as request from 'request-promise-native';
import estimationCard from '../resources/estimation-card.json';
import ticketInfo from '../resources/ticket-info.json';
export class ScrumJiraBot extends ActivityHandler {
    private conversationDataAccessor;
    private jiraServerUrl: string;
    private jiraEstimationField: string;
    private jiraAuthHeader: string;
    private jiraTicketPrefix: string;
    constructor(private conversationState: ConversationState) {
        super();
        this.jiraServerUrl = process.env.JIRA_SERVER_URL;
        this.jiraEstimationField = process.env.JIRA_ESTIMATION_CUSTOM_FIELD_NAME;
        this.jiraAuthHeader = process.env.JIRA_AUTH_HEADER;
        this.jiraTicketPrefix = process.env.JIRA_TICKET_PREFIX || '';
        if(!this.jiraServerUrl || !this.jiraEstimationField || !this.jiraAuthHeader)
            throw new Error('Missing Required JIRA settings');
        if (!conversationState)
            throw new Error('conversationState is required');

        // Create the state property accessors for the conversation data and user profile.
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);

        this.onMessage(async (turnContext, next) => {
            const conversationData = await this.conversationDataAccessor.get(
                turnContext, { ticket: null, estimates: [] });
            if(turnContext.activity && turnContext.activity.value) {
                await this.processSubmitAction(turnContext, conversationData)
            } else if (!conversationData.ticket) {
                await this.processTicketNumber(turnContext, conversationData);
                if (!conversationData.ticket) {
                    await turnContext.sendActivity('Which ticket num you would like to estimate?');
                }
            } else {
                this.cancel(conversationData);
            }
            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await next();
        });
    }
    async processSubmitAction(turnContext, conversationData) {
        const activityValue = turnContext.activity.value;
        console.log('received activity', activityValue)
        if(activityValue.action === 'cancel') {
            this.cancel(conversationData);
        } else if(activityValue.action === 'add' && activityValue.userEstimate) {
            conversationData.estimates.push(activityValue.userEstimate);
        } else if(activityValue.action === 'finish') {
            if(conversationData.estimates.length > 0) {
                var card = estimationCard;
                card.body[4].value = Math.max(...conversationData.estimates).toString();
                card.body[4].choices = conversationData.estimates.map((s: string) => ({title: s, value: s}));
                card.body[1].text = conversationData.ticket.key;
                card.body[2].text = conversationData.ticket.summary;
                await turnContext.sendActivity({
                    attachments: [CardFactory.adaptiveCard(card)]
                });
            } else {
                this.cancel(conversationData);
            }
        } else if(activityValue.action === 'save' && (activityValue.estimate || activityValue.customEstimate)) {
            const estimate = activityValue.customEstimate ? activityValue.customEstimate : activityValue.estimate;
            if(estimate) {
                await turnContext.sendActivity(`${ conversationData.ticket.key }: Publishing ${estimate} to JIRA`);
                await this.publishToJira(conversationData.ticket, estimate);
            }
            this.cancel(conversationData);
        }

    }
    private cancel(conversationData) {
        conversationData.ticket = null;
        conversationData.estimates = [];
    }
    async getJiraTicketInfo(ticketNumber) {
        console.log('possible ticket number to send to JIRA', ticketNumber);
        var options = {
            method: 'GET',
            uri: `${this.jiraServerUrl}/rest/api/2/search?maxResults=1&validateQuery=false&jql=id=${ticketNumber}`,
            json: true,
            headers : {
                'Authorization': `Basic ${this.jiraAuthHeader}`
            }
        };

        const result = await request.get(options);
        if(result && result.issues && result.issues.length > 0) {
            return new JiraTicket(result.issues[0].key,
                result.issues[0].fields.summary,
                result.issues[0].self, result.issues[0].fields[this.jiraEstimationField]) ;
        }
    }
    async publishToJira(ticket: JiraTicket, estimate) {
        var options = {
            method: 'PUT',
            uri: ticket.link,
            json: true,
            headers : {
                'Authorization': `Basic ${this.jiraAuthHeader}`
            },
            body: {
                fields:{
                    [this.jiraEstimationField] : +estimate
                }
            }
        };

        return request.put(options);
    }
    async processTicketNumber(turnContext, conversationData) {
        const possibleTicketNumber = turnContext.activity.text.replace(/<at>.*<\/at>/, '').trim();
        if(possibleTicketNumber.match(new RegExp(`^${this.jiraTicketPrefix}`))) {
            const ticket = await this.getJiraTicketInfo(possibleTicketNumber);
            if(ticket) {
                conversationData.ticket = ticket;
                const card = ticketInfo;
                card.body[0].text = ticket.key;
                card.body[1].facts[0].value = ticket.summary;
                card.body[1].facts[1].value = (ticket.estimation !== null ? ticket.estimation : 'no estimation');
                await turnContext.sendActivity({
                    attachments: [CardFactory.adaptiveCard(ticketInfo)]
                });
            }
        }
    }
    private removeAt(text) {
        return text.replace(/<at>.*<\/at>/, '').trim();
    }
}

export class JiraTicket {
    constructor(public key: string,
                public summary: string,
                public link:string,
                public estimation:string
    ) {}
}
