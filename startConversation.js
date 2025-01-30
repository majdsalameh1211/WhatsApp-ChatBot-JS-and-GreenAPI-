const fs = require('fs');
const axios = require('axios');
const FlowStateManager = require('./flowStateManagerClass');
const Conversation = require('./ConversationClass');
const { flowStruct } = require('./flowstruct');
require('dotenv').config();
const path = require('path');

const instanceId = process.env.GREEN_API_INSTANCE_ID;
const token = process.env.GREEN_API_TOKEN;

const apiSendMessageUrl = `https://7103.api.greenapi.com/waInstance${instanceId}/sendMessage/${token}`;
let fileLocked = false;

const companyName = process.env.COMPANY_NAME; // should take as input
// Constants
const companyFolder = path.join(__dirname, companyName);
const activeClientsFilePath = path.join(companyFolder, 'active_clients.json');
const notActiveClientsFilePath = path.join(companyFolder, 'not_active_clients.json');


const loadActiveClients = async () => {
    try {
        const data = fs.readFileSync(activeClientsFilePath, 'utf-8');
        const active_clients = JSON.parse(data);

        // Ensure that active_clients is an array
        if (!Array.isArray(active_clients)) {
            throw new Error('Parsed active_clients is not an array');
        }

        return active_clients;
    } catch (error) {
        console.error('Error loading active_clients.json:', error.message);
        return []; // Return an empty array if loading fails or if the content is invalid
    }
};


const saveActiveClients = async (active_clients) => {
    try {
        if (!Array.isArray(active_clients)) {
            throw new Error('active_clients is not an array');
        }
        // Convert the data to a string using JSON.stringify()
        const data = JSON.stringify(active_clients, null, 2); // Pretty-print JSON with 2-space indentation
        fs.writeFileSync(activeClientsFilePath, data);
        console.log('active_clients.json saved successfully.');
    } catch (error) {
        console.error('Error saving active_clients.json:', error.message);
    }
};


const loadNotActiveClients = async () => {
    fileLocked = true;
    try {
        const data = fs.readFileSync(notActiveClientsFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading not_active_clients.json:', error.message);
        throw error;
    } finally {
        fileLocked = false;
    }
};


const saveNotActiveClients = async (not_active_clients) => {
    fileLocked = true;
    try {
        fs.writeFileSync(notActiveClientsFilePath, JSON.stringify(not_active_clients, null, 2));
    } catch (error) {
        console.error('Error saving not_active_clients.json:', error.message);
        throw error;
    } finally {
        fileLocked = false;
    }
};


const moveClientFromActiveToNotActive = async (client) => {
    try {
        // Load both active and not active clients
        let active_clients = await loadActiveClients();
        let not_active_clients = await loadNotActiveClients();

        // Find the client in active_clients based on the clientNumber and childId
        const clientIndex = active_clients.findIndex(c =>
            c.clientNumber === client.clientNumber &&
            c.childId === client.childId
        );

        if (clientIndex !== -1) {
            // Remove the client from active_clients
            const [removedClient] = active_clients.splice(clientIndex, 1);

            // Add the client to not_active_clients
            not_active_clients.push(removedClient);

            // Save the updated files
            await saveActiveClients(active_clients);
            await saveNotActiveClients(not_active_clients);

            console.log(`Client ${client.clientNumber} has been moved to not_active_clients.json.`);
        } else {
            console.log(`Client not found in active_clients.json.`);
        }
    } catch (error) {
        console.error('Error moving client:', error.message);
    }
};



const sendMessage = async (chatId, message) => {
    try {
        console.log(`Sending message to ${chatId}: ${message}`);
        await axios.post(apiSendMessageUrl, { chatId, message });
    } catch (error) {
        console.error(`Error sending message to ${chatId}: ${error.message}`);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
};


const getActive_client = async () => {
    let active_clients = await loadActiveClients();
    let client = active_clients.find(c => c.clientNumber === clientNumber && c.childId === childId);
    return [active_clients, client]; // Return both active_clients and client as an array
};

// get the conversation instance as object
const getConversationAsObject = async (client) => {
    // Deserialize Convresation from JSON stored in active_clients
    let conversation;
    try {
        console.log(client.convresation);
        conversation = Conversation.fromJSON(client.conversation);
        console.log("startConversation -> convresation: ", conversation);
    } catch (error) {
        console.error('Error deserializing FlowStateManager:', error.message);
        conversation = new Conversation(); // Fallback to new instance if deserialization fails
        console.log("new conversation instance", conversation);
    }
    return conversation;
};

// get the flowstatemanager instance as object
const getFlowStateManagerAsObject = async (client) => {

    // Deserialize FlowStateManager from JSON stored in active_clients
    let flowManager;
    try {
        console.log(client.flowStateManager);  // Log the current state of the flow manager in the client
        flowManager = FlowStateManager.fromJSON(client.flowStateManager);  // Deserialize FlowStateManager
        console.log("startConversation -> flowManager: ", flowManager);  // Correct spelling here
    } catch (error) {
        console.error('Error deserializing FlowStateManager:', error.message);
        flowManager = new FlowStateManager(); // Fallback to a new instance if deserialization fails
        console.log("new Flow Manager instance", flowManager);
    }
    return flowManager;
};

const getFlowStateAsObject = async (flowManager, flowStruct) => {
    let flowState;
    try {
        // Ensure flowManager has the getFlowState method
        if (typeof flowManager.getFlowState === 'function') {
            flowState = flowManager.getFlowState(flowStruct);
        } else {
            throw new Error("flowManager does not have a getFlowState method");
        }
    } catch (error) {
        console.error('Error getting FlowState:', error.message);
        flowState = null;
    }
    return flowState;
};


const checkIfTheConversationEnded = async (flowManager) => {


    if (flowManager.currentState.includes('end')) {
        console.log("***********************end message :", flowManager.currentState);
        // check if a new notification with the client answer is in the stack 
        let [active_clients, client] = await getActive_client();

        if (flowManager.sent === false) {
            flowState = await getFlowStateAsObject(flowManager, flowStruct);
            const endmessage = flowState.question;
            console.log("flowState endmessage :" + endmessage);
            await sendMessage(client.clientNumber, endmessage);
            console.log("the message: " + endmessage + " was sent to client :" + clientNumber);


            //mark the question as sent
            flowManager.markMessageAsSent();


        }
        client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
        await saveActiveClients(active_clients);  // Save back to active_clients.json
        console.log("end Conversation");
        // move the client object from active_clients.json --> not_active_clients.json
        await moveClientFromActiveToNotActive(client);

        // Release lock after processing
        fileLocked = false;

        console.log("Terminating startConversation program...");
        process.exit(0);
    }
};
//////////////////////////////////////////////////////////////////////////////
const handleConversation = async (clientNumber, childId) => {


    if (fileLocked) {
        console.log("File is locked, waiting for access...");
        setTimeout(() => handleConversation(clientNumber, childId), 1000); // Retry after 1 second
        return;
    }
    fileLocked = true;


    let [active_clients, client] = await getActive_client();


    console.log("startConversation --> client found :", client);

    if (!client) {
        // Log error if client is not found instead of creating a new one
        console.log("Error: Client with the given childId not found!");
        return;
    }

    // Deserialize FlowStateManager from JSON stored in active_clients
    let flowManager = await getFlowStateManagerAsObject(client);

    // Deserialize Conversation from JSON stored in active_clients
    let conversation = await getConversationAsObject(client);


    let flowState = '';
    let response = '';

    if (flowManager.sent === true) { // the question has been asked --> wait for client response / waiting for clinet to end sending ('e' or 'E')


        let [active_clients, client] = await getActive_client();


        flowState = await getFlowStateAsObject(flowManager, flowStruct);
        console.log("multiple_replies: " + flowState.multiple_replies);

        if (flowState.multiple_replies === true) {// multiple answers required waiting for 'e' or 'E'
            // Ensure client.notifications is initialized
            if (!client.notifications) {
                client.notifications = [];
            }
            if (client.notifications.length !== 0) {


                if (client.notifications[0].message === 'e' || client.notifications[0].message === 'E') {

                    // Remove the 'e' or 'E'

                    client.notifications.splice(0, 1);


                    while (client.notifications.length !== 0) { // merge the answers 
                        response = response + "\t" + client.notifications[client.notifications.length - 1].message;
                        // Remove (pop) the notification from the stack
                        client.notifications.pop();

                    }
                    // save the response as the client answer for the question
                    conversation.inputAnswer(response);

                    //sending the next question 
                    flowState = await getFlowStateAsObject(flowManager, flowStruct);
                    flowManager.moveToNextStep(flowState.nextStep);
                    flowState = await getFlowStateAsObject(flowManager, flowStruct);


                    // After handling the flow, ensure to update the flowStateManager
                    client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                    client.conversation = conversation.toJSON();      // Serialize the updated conversation
                    await saveActiveClients(active_clients);  // Save back to active_clients.json

                    [active_clients, client] = await getActive_client();

                    await checkIfTheConversationEnded(flowManager);

                    if (flowManager.sent === false) {
                        [active_clients, client] = await getActive_client();


                        // Deserialize FlowStateManager from JSON stored in active_clients
                        flowManager = await getFlowStateManagerAsObject(client);

                        flowState = await getFlowStateAsObject(flowManager, flowStruct);
                        console.log("flowState: ", flowState);
                        const question = flowState.question;
                        console.log("flowState question :" + question);
                        await sendMessage(client.clientNumber, question);
                        console.log("the message: " + question + " was sent to client :" + clientNumber);
                        //mark the question as sent
                        flowManager.markMessageAsSent();

                        // save the question as the client answer for the question
                        console.log("Client object:", client);
                        console.log("Conversation object:", client.conversation.conversations);
                        flowState = await getFlowStateAsObject(flowManager, flowStruct);
                        conversation.inputQuestion(question);


                        // After handling the flow, ensure to update the flowStateManager
                        client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                        client.conversation = conversation.toJSON();      // Serialize the updated conversation
                        await saveActiveClients(active_clients);  // Save back to active_clients.json

                        [active_clients, client] = await getActive_client();
                    }

                    // After handling the flow, ensure to update the flowStateManager
                    client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                    client.conversation = conversation.toJSON();      // Serialize the updated conversation
                    await saveActiveClients(active_clients);  // Save back to active_clients.json

                    [active_clients, client] = await getActive_client();

                }
                else { // wait for the client to finish sending answers

                    // No response yet, release lock and wait
                    console.log("Waiting for client response...");
                    fileLocked = false;
                    return; // Exit the function, allowing the controller to resume later
                }

            }
            else {  // wait for the client to answer
                // No response yet, release lock and wait
                console.log("Waiting for client response...");
                fileLocked = false;
                return; // Exit the function, allowing the controller to resume later
            }

        }
        else { // just one answer 
            // Ensure client.notifications is initialized
            if (!client.notifications) {
                client.notifications = [];
            }
            if (client.notifications.length !== 0) {  // the client has answered


                response = client.notifications[0].message;
                console.log("one answer :" + response);
                console.log("notifications :", client.notifications);

                // Remove (pop) the notification from the stack
                client.notifications.pop();

                //flowState get

                flowState = await getFlowStateAsObject(flowManager, flowStruct);

                console.log("flowState.options:", flowState.options);
                //check if there are options for the answer
                if (flowState.options === false) {
                    console.log("no options");

                    //save the answer 
                    conversation.inputAnswer(response);

                    // mark as answered
                    // flowManager.markMessageAsAnswered();
                    flowState = await getFlowStateAsObject(flowManager, flowStruct);
                    flowManager.moveToNextStep(flowState.nextStep);
                    flowState = await getFlowStateAsObject(flowManager, flowStruct);



                    // After handling the flow, ensure to update the flowStateManager
                    client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                    client.conversation = conversation.toJSON();      // Serialize the updated conversation
                    await saveActiveClients(active_clients);  // Save back to active_clients.json

                    //    [active_clients, client] = await getActive_client();

                    await checkIfTheConversationEnded(flowManager);



                    if (flowManager.sent === false) {
                        [active_clients, client] = await getActive_client();
                        flowManager = await getFlowStateManagerAsObject(client);
                        flowState = await getFlowStateAsObject(flowManager, flowStruct);
                        console.log("flowManager", flowManager);
                        console.log("flow State:", flowState);
                        const question = flowState.question;
                        console.log("flowState question :" + question);
                        await sendMessage(client.clientNumber, question);
                        console.log("the message: " + question + " was sent to client :" + clientNumber);


                        //mark the question as sent
                        flowManager.markMessageAsSent();

                        // save the question
                        console.log("Client object:", client);
                        console.log("Conversation object:", client.conversation.conversations);
                        flowState = await getFlowStateAsObject(flowManager, flowStruct);
                        conversation.inputQuestion(question);

                        // After handling the flow, ensure to update the flowStateManager
                        client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                        client.conversation = conversation.toJSON();      // Serialize the updated conversation
                        await saveActiveClients(active_clients);  // Save back to active_clients.json
                        return;


                    }
                    return;

                } else { // there are options


                    flowState = await getFlowStateAsObject(flowManager, flowStruct);
                    const option = flowState.options[response];
                    console.log("there are options", option);
                    if (option) { // valid  --> save the answer , mark as answered , move to the next step

                        //save the answer 
                        conversation.inputAnswer(option.save);

                        //moving to the next step
                        flowState = await getFlowStateAsObject(flowManager, flowStruct);
                        flowManager.moveToNextStep(option.nextStep);
                        flowState = await getFlowStateAsObject(flowManager, flowStruct);


                        // After handling the flow, ensure to update the flowStateManager
                        client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                        client.conversation = conversation.toJSON();      // Serialize the updated conversation
                        await saveActiveClients(active_clients);  // Save back to active_clients.json

                        [active_clients, client] = await getActive_client();

                        await checkIfTheConversationEnded(flowManager);

                        // send the next question
                        if (flowManager.sent === false) {
                            flowState = await getFlowStateAsObject(flowManager, flowStruct);
                            console.log("flowState :", flowState);
                            const question = flowState.question;
                            console.log("flowState question :" + question);
                            await sendMessage(client.clientNumber, question);
                            console.log("the message: " + question + " was sent to client :" + clientNumber);

                            //mark the question as sent
                            flowManager.markMessageAsSent();

                            // save the question
                            console.log("Client object:", client);
                            console.log("Conversation object:", client.conversation.conversations);
                            flowState = await getFlowStateAsObject(flowManager, flowStruct);
                            conversation.inputQuestion(question);
                            // After handling the flow, ensure to update the flowStateManager
                            client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                            client.conversation = conversation.toJSON();      // Serialize the updated conversation
                            await saveActiveClients(active_clients);  // Save back to active_clients.json
                            return;


                        }
                        return;

                    } else { // not valid  --> send error message and wait for the right response



                        // Ensure client.notifications is initialized
                        if (!client.notifications) {
                            client.notifications = [];
                        }
                        //remove the not valid message
                        while (client.notifications.length !== 0) {
                            client.notifications.pop();
                            console.log("error Message deleted from the stack *******************");

                        }
                        // After handling the flow, ensure to update the flowStateManager
                        client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
                        client.conversation = conversation.toJSON();      // Serialize the updated conversation
                        await saveActiveClients(active_clients);  // Save back to active_clients.json

                        [active_clients, client] = await getActive_client();
                        flowManager = await getFlowStateManagerAsObject(client);
                        flowState = await getFlowStateAsObject(flowManager, flowStruct);
                        console.log("flowState: ", flowState);
                        try {
                            // Attempt to retrieve and send the error message
                            if (flowState.error && flowState.error.message) {
                                let errorMessage = flowState.error.message;
                                console.log("Sending error message:", errorMessage);
                                await sendMessage(client.clientNumber, errorMessage);
                            } else {
                                console.error("No error message available in flowState.");
                            }
                        } catch (error) {
                            console.error("Error occurred while handling error message:", error);
                        }


                        // No response yet, release lock and wait
                        console.log("Waiting for client response...");
                        fileLocked = false;
                        return; // Exit the function, allowing the controller to resume later
                    }


                }
            }

        }

    }
    else { // the question has not been asked yet

        [active_clients, client] = await getActive_client();
        console.log(client);
        //remove the start bot
        // Ensure client.notifications is initialized
        if (!client.notifications) {
            client.notifications = [];
        }
        if (client.notifications.length !== 0) {
            client.notifications.pop();
        }

        flowState = await getFlowStateAsObject(flowManager, flowStruct);
        const question = flowState.question;
        console.log("flowState question :" + question);
        await sendMessage(client.clientNumber, question);
        console.log("the message: " + question + " was sent to client :" + clientNumber);

        //mark the question as sent
        flowManager.markMessageAsSent();

        // save the question
        console.log("Client object:", client);
        console.log("Conversation object:", client.conversation.conversations);
        flowState = await getFlowStateAsObject(flowManager, flowStruct);
        conversation.inputQuestion(question);

        // After handling the flow, ensure to update the flowStateManager
        client.flowStateManager = flowManager.toJSON();  // Serialize the updated flow manager
        client.conversation = conversation.toJSON();      // Serialize the updated conversation
        await saveActiveClients(active_clients);  // Save back to active_clients.json

        [active_clients, client] = await getActive_client();

    }
    // Release lock after processing
    fileLocked = false;
}

//////////////////////////////////////////////////////////////////////////////

// Start the conversation
const clientNumber = process.argv[2];
const childId = process.argv[3];

if (clientNumber && childId) {
    console.log(" startConvresation : " + childId);
    handleConversation(clientNumber, childId);
}



