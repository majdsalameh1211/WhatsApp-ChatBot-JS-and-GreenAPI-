// ConversationClass.js
class Conversation {
    constructor() {
        this.conversations = [];
    }

    inputQuestion(question) {
        this.conversations.push({ question, answer: "" });
    }

    inputAnswer(answer) {
        if (this.conversations.length > 0) {
            this.conversations[this.conversations.length - 1].answer = answer;
        }
    }

    toJSON() {
        return { 
            conversations: this.conversations
        };
    }
    

    // Rebuild the conversation from JSON
    static fromJSON(jsonData) {
        const conversation = new Conversation();
        conversation.conversations = jsonData.conversations || [];
        return conversation;
    }
}
module.exports = Conversation;
