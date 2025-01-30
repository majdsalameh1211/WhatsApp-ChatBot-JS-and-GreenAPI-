// flowStateManagerClass.js

class FlowStateManager {
    constructor(currentState = "0", sent = false, answered = false) {
        this.currentState = currentState;
        this.sent = sent;
        this.answered = answered;

    }
    getFlowState(){
        return this.currentState;
    }
    moveToNextStep(nextStep) {
        this.currentState = nextStep;
        this.sent = false;  // Reset sent status as a new question needs to be sent
        console.log(`Moved to next step: ${nextStep}`);
    }

    // Method to get the current flow state from the flow structure
    getFlowState(flowStruct) {
        return flowStruct.find(state => state.state === this.currentState);
    }

    markMessageAsSent() {
        this.sent = true;
    }

    markMessageAsAnswered(){
        this.answered=true;
    }

    toJSON() {
        return {
            currentState: this.currentState,
            sent: this.sent,
            answered: this.answered
        };
    }



    // Rebuild from JSON
    static fromJSON(jsonData) {
        if (!jsonData) {
            console.log('Invalid JSON data, creating new FlowStateManager instance.');
            return new FlowStateManager();
        }
        return new FlowStateManager(
            jsonData.currentState || "0",
            jsonData.sent || false,
            jsonData.answered || false
        );
    }
}

module.exports = FlowStateManager;
