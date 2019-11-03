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
Object.defineProperty(exports, "__esModule", { value: true });
const botbuilder_dialogs_1 = require("botbuilder-dialogs");
const request = __importStar(require("request-promise-native"));
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
class ScrumPokerDialog extends botbuilder_dialogs_1.ComponentDialog {
    constructor(userState) {
        super('ScrumPokerDialog');
        this.userProfile = userState.createProperty(USER_PROFILE);
        this.addDialog(new botbuilder_dialogs_1.TextPrompt(NAME_PROMPT));
        this.addDialog(new botbuilder_dialogs_1.ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new botbuilder_dialogs_1.ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new botbuilder_dialogs_1.NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new botbuilder_dialogs_1.WaterfallDialog(WATERFALL_DIALOG, [
            this.nameStep.bind(this),
            this.nameConfirmStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }
    run(turnContext, accessor) {
        return __awaiter(this, void 0, void 0, function* () {
            const dialogSet = new botbuilder_dialogs_1.DialogSet(accessor);
            dialogSet.add(this);
            console.log(turnContext);
            const dialogContext = yield dialogSet.createContext(turnContext);
            const results = yield dialogContext.continueDialog();
            if (results.status === botbuilder_dialogs_1.DialogTurnStatus.empty) {
                yield dialogContext.beginDialog(this.id);
            }
        });
    }
    transportStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(step);
            return yield step.prompt(CHOICE_PROMPT, {
                prompt: 'Please enter your mode of transporting.',
                choices: botbuilder_dialogs_1.ChoiceFactory.toChoices(['Car', 'Bus', 'Bicycle'])
            });
        });
    }
    nameStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(step);
            return yield step.prompt(NAME_PROMPT, 'Please enter the JIRA Ticket #');
        });
    }
    nameConfirmStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            step.values.jiraTicketNumber = step.result.value;
            var options = {
                method: 'GET',
                uri: "https://jira.ecube.de/rest/api/2/search?maxResults=1&validateQuery=false&jql=id=PDCR-816",
                json: true,
                headers: {
                    'Authorization': 'Basic ZGF2b29kLnBhc2Rhcjp4eW5mYWstcm93Zm8zLXBlbWdJYg=='
                }
            };
            const result = yield request.get(options);
            if (result && result.issues && result.issues.length > 0) {
                yield step.context.sendActivity(`Thanks ${result.issues[0].fields.summary}`);
            }
            return yield step.endDialog();
        });
    }
    ageStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            if (step.result) {
                const promptOptions = { prompt: 'Please enter your age.', retryPrompt: 'The value entered must be greater than 0 and less than 150.' };
                return yield step.prompt(NUMBER_PROMPT, promptOptions);
            }
            else {
                return yield step.next(-1);
            }
        });
    }
    confirmStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            step.values.age = step.result;
            const msg = step.values.age === -1 ? 'No age given.' : `I have your age as ${step.values.age}.`;
            yield step.context.sendActivity(msg);
            return yield step.prompt(CONFIRM_PROMPT, { prompt: 'Is this okay?' });
        });
    }
    summaryStep(step) {
        return __awaiter(this, void 0, void 0, function* () {
            if (step.result) {
                const userProfile = yield this.userProfile.get(step.context, new UserProfile());
                userProfile.transport = step.values.transport;
                userProfile.name = step.values.name;
                userProfile.age = step.values.age;
                let msg = `I have your mode of transport as ${userProfile.transport} and your name as ${userProfile.name}.`;
                if (userProfile.age !== -1) {
                    msg += ` And age as ${userProfile.age}.`;
                }
                yield step.context.sendActivity(msg);
            }
            else {
                yield step.context.sendActivity('Thanks. Your profile will not be kept.');
            }
            return yield step.endDialog();
        });
    }
    agePromptValidator(promptContext) {
        return __awaiter(this, void 0, void 0, function* () {
            return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
        });
    }
}
exports.ScrumPokerDialog = ScrumPokerDialog;
class UserProfile {
    constructor() { }
}
exports.UserProfile = UserProfile;
//# sourceMappingURL=dialogs.js.map