import { BotFrameworkAdapter, ConversationState, MemoryStorage, UserState } from "botbuilder";
import * as restify from "restify";
import { config } from "dotenv";
import { ScrumJiraBot } from "./bots/bot";

config();

const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

const adapter = new BotFrameworkAdapter({ 
    appId: (process.env.ENV == "PROD") ? process.env.MICROSOFT_APP_ID  : ""
    , appPassword: (process.env.ENV == "PROD") ? process.env.MICROSOFT_APP_PASSWORD : ""
});

const memoryStorage = new MemoryStorage();

// Create conversation state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);

// Create the main dialog.
const bot = new ScrumJiraBot(conversationState);


server.post("/api/messages", (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        await bot.run(context) ;
    });
});
