import { ComponentDialog } from 'botbuilder-dialogs';
export declare class ScrumPokerDialog extends ComponentDialog {
    private userProfile;
    constructor(userState: any);
    run(turnContext: any, accessor: any): Promise<void>;
    transportStep(step: any): Promise<any>;
    nameStep(step: any): Promise<any>;
    nameConfirmStep(step: any): Promise<any>;
    ageStep(step: any): Promise<any>;
    confirmStep(step: any): Promise<any>;
    summaryStep(step: any): Promise<any>;
    agePromptValidator(promptContext: any): Promise<boolean>;
}
export declare class UserProfile {
    transport: any;
    name: any;
    age: any;
    constructor();
}
