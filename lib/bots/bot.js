"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const botbuilder_1 = require("botbuilder");
const CONVERSATION_DATA_PROPERTY = 'conversationData';
const request = __importStar(require("request-promise-native"));
const estimation_card_json_1 = __importDefault(require("../resources/estimation-card.json"));
const ticket_info_json_1 = __importDefault(require("../resources/ticket-info.json"));
class ScrumJiraBot extends botbuilder_1.ActivityHandler {
    constructor(conversationState) {
        super();
        this.conversationState = conversationState;
        this.jiraServerUrl = process.env.JIRA_SERVER_URL;
        this.jiraEstimationField = process.env.JIRA_ESTIMATION_CUSTOM_FIELD_NAME;
        this.jiraAuthHeader = process.env.JIRA_AUTH_HEADER;
        if (!this.jiraServerUrl || !this.jiraEstimationField || !this.jiraAuthHeader)
            throw new Error('Missing Required JIRA settings');
        if (!conversationState)
            throw new Error('conversationState is required');
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);
        this.onMessage((turnContext, next) => __awaiter(this, void 0, void 0, function* () {
            const conversationData = yield this.conversationDataAccessor.get(turnContext, { ticket: null, estimates: [] });
            if (turnContext.activity && turnContext.activity.value) {
                yield this.processSubmitAction(turnContext, conversationData);
            }
            else if (!conversationData.ticket) {
                yield this.processTicketNumber(turnContext, conversationData);
                if (!conversationData.ticket) {
                    yield turnContext.sendActivity('Which ticket number you would like to estimate?');
                }
            }
            else {
                const possibleEstimation = this.removeAt(turnContext.activity.text);
                if (possibleEstimation.match(/^\d+$/)) {
                    console.log('received estimation', possibleEstimation);
                    conversationData.estimates.push(possibleEstimation);
                }
                else {
                    console.log('received quit', conversationData);
                    if (conversationData.estimates.length > 0) {
                        var card = estimation_card_json_1.default;
                        card.body[4].value = Math.max(...conversationData.estimates).toString();
                        card.body[4].choices = conversationData.estimates.map((s) => ({ title: s, value: s }));
                        card.body[1].text = conversationData.ticket.key;
                        card.body[2].text = conversationData.ticket.summary;
                        yield turnContext.sendActivity({
                            attachments: [botbuilder_1.CardFactory.adaptiveCard(card)]
                        });
                    }
                    else {
                        this.cancel(conversationData);
                    }
                }
            }
            yield next();
        }));
        this.onDialog((context, next) => __awaiter(this, void 0, void 0, function* () {
            yield this.conversationState.saveChanges(context, false);
            yield next();
        }));
    }
    processSubmitAction(turnContext, conversationData) {
        return __awaiter(this, void 0, void 0, function* () {
            const activityValue = turnContext.activity.value;
            console.log('received activity', activityValue);
            if (activityValue.action === 'save' && (activityValue.estimate || activityValue.customEstimate)) {
                const estimate = activityValue.customEstimate ? activityValue.customEstimate : activityValue.estimate;
                if (estimate) {
                    yield turnContext.sendActivity(`${conversationData.ticket.key}: Publishing ${estimate} to JIRA`);
                    yield this.publishToJira(conversationData.ticket, estimate);
                }
            }
            this.cancel(conversationData);
        });
    }
    cancel(conversationData) {
        conversationData.ticket = null;
        conversationData.estimates = [];
    }
    getJiraTicketInfo(ticketNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('possible ticket number to send to JIRA', ticketNumber);
            var options = {
                method: 'GET',
                uri: `${this.jiraServerUrl}/rest/api/2/search?maxResults=1&validateQuery=false&jql=id=${ticketNumber}`,
                json: true,
                headers: {
                    'Authorization': `Basic ${this.jiraAuthHeader}`
                }
            };
            const result = yield request.get(options);
            if (result && result.issues && result.issues.length > 0) {
                return new JiraTicket(result.issues[0].key, result.issues[0].fields.summary, result.issues[0].self, result.issues[0].fields[this.jiraEstimationField]);
            }
        });
    }
    publishToJira(ticket, estimate) {
        return __awaiter(this, void 0, void 0, function* () {
            var options = {
                method: 'PUT',
                uri: ticket.link,
                json: true,
                headers: {
                    'Authorization': `Basic ${this.jiraAuthHeader}`
                },
                body: {
                    fields: {
                        [this.jiraEstimationField]: +estimate
                    }
                }
            };
            return request.put(options);
        });
    }
    processTicketNumber(turnContext, conversationData) {
        return __awaiter(this, void 0, void 0, function* () {
            const possibleTicketNumber = turnContext.activity.text.replace(/<at>.*<\/at>/, '').trim();
            if (possibleTicketNumber.match(/^PDCR-\d+$/)) {
                const ticket = yield this.getJiraTicketInfo(possibleTicketNumber);
                if (ticket) {
                    conversationData.ticket = ticket;
                    const card = ticket_info_json_1.default;
                    card.body[0].text = ticket.key;
                    card.body[1].facts[0].value = ticket.summary;
                    card.body[1].facts[1].value = (ticket.estimation !== null ? ticket.estimation : 'no estimation');
                    yield turnContext.sendActivity({
                        attachments: [botbuilder_1.CardFactory.adaptiveCard(ticket_info_json_1.default)]
                    });
                }
            }
        });
    }
    removeAt(text) {
        return text.replace(/<at>.*<\/at>/, '').trim();
    }
}
exports.ScrumJiraBot = ScrumJiraBot;
class JiraTicket {
    constructor(key, summary, link, estimation) {
        this.key = key;
        this.summary = summary;
        this.link = link;
        this.estimation = estimation;
    }
}
exports.JiraTicket = JiraTicket;
//# sourceMappingURL=bot.js.map