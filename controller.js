const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const uuid = require('uuid');
const path = require('path');
require('dotenv').config();
const FlowStateManager = require('./flowStateManagerClass');
const Conversation  = require('./ConversationClass');


const instanceId = process.env.GREEN_API_INSTANCE_ID;
const token = process.env.GREEN_API_TOKEN;
const companyName = process.env.COMPANY_NAME;
const apiReceiveNotificationUrl = `https://7103.api.greenapi.com/waInstance${instanceId}/receiveNotification/${token}`;
const apiDeleteNotificationUrl = `https://7103.api.greenapi.com/waInstance${instanceId}/deleteNotification/${token}/`;

const triggerMessage = "start bot";
let active_clients = [];
let fileLocked = false;
// Constants
const companyFolder = path.join(__dirname, companyName);
const activeClientsFilePath = path.join(companyFolder, 'active_clients.json');
const notActiveClientsFilePath = path.join(companyFolder, 'not_active_clients.json');



// Ensure the company folder exists
const ensureFolderExists = () => {
    if (!fs.existsSync(companyFolder)) {
        fs.mkdirSync(companyFolder);
        console.log(`Company folder created: ${companyFolder}`);
    }
};

// Ensure active_clients.json exists
const ensureActiveClientsFileExists = () => {
    if (!fs.existsSync(activeClientsFilePath)) {
        fs.writeFileSync(activeClientsFilePath, JSON.stringify([]));
        console.log(`active_clients.json file created: ${activeClientsFilePath}`);
    }
};

// Ensure active_clients.json exists
const ensureNotActiveClientsFileExists = () => {
    if (!fs.existsSync(notActiveClientsFilePath)) {
        fs.writeFileSync(notActiveClientsFilePath, JSON.stringify([]));
        console.log(`not_active_clients.json file created: ${notActiveClientsFilePath}`);
    }
};
// Utility function to wait for the file to be unlocked
const waitForUnlock = () => new Promise(resolve => {
    const interval = setInterval(() => {
        if (!fileLocked) {
            clearInterval(interval);
            resolve();
        }
    }, 100);
});

// Load active_clients.json
const loadActiveClients = async () => {
    await waitForUnlock();
    fileLocked = true;
    try {
        const data = fs.readFileSync(activeClientsFilePath, 'utf-8');
        active_clients = JSON.parse(data);
    } catch (error) {
        console.error('Error reading active_clients.json.');
        active_clients = [];
    }
    fileLocked = false;
};

// Save active_clients.json
const saveActiveClients = async () => {
    await waitForUnlock();
    fileLocked = true;
    try {
        fs.writeFileSync(activeClientsFilePath, JSON.stringify(active_clients, null, 2));
    } finally {
        fileLocked = false;
    }
};



// Add a client and start conversation
const addToActiveClientsAndStartConversation = async (senderChatId) => {
    const childId = uuid.v4();
    const newClient = {
        clientNumber: senderChatId,
        childId,
        notifications: [],
        lastBotMessageTime: new Date().toISOString(),
        flowStateManager: new FlowStateManager(),  // Ensure correct case for class
       conversation: new Conversation()  // Properly initialize Conversation
    };

    active_clients.push(newClient);
    await saveActiveClients();

    console.log(`Starting conversation for new client: ${senderChatId}`);
    console.log(" Controller : "+childId);
    const conversationProcess = spawn('node', ['./startConversation.js', newClient.clientNumber, newClient.childId]);


    conversationProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    conversationProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    conversationProcess.on('close', (code) => {
        console.log(`startConversation process exited with code ${code}`);
    });
};

// Give access to startConversation for active clients
const giveAccessToConversation = (client) => {
    if (!client) {
        console.error('Client is not defined. Cannot give access to conversation.');
        return;
    }

    console.log(`Giving access to conversation for client: ${client.clientNumber}`);
    const conversationProcess = spawn('node', ['./startConversation.js', client.clientNumber, client.childId]);

    conversationProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    conversationProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    conversationProcess.on('close', (code) => {
        console.log(`startConversation process exited with code ${code}`);
    });
};


// Set to store processed receiptIds
const processedReceiptIds = new Set();

// Handle notifications
const receiveNotifications = async () => {
    console.log("\n\n\npolling **************************");
    try {
        const response = await axios.get(apiReceiveNotificationUrl);
       // console.log('Response from API:', response.data);  // Log full API response

        if (response.data && response.data.body) {
            const receiptId = response.data.receiptId;
            const typeWebhook = response.data.body.typeWebhook;
            const senderData = response.data.body.senderData;
            const chatId = response.data.body.chatId || senderData?.chatId;  // Use chatId from either the sender or body
            const idMessage = response.data.body.idMessage;
            const status = response.data.body.status;
            const messageData = response.data.body.messageData;

            // message from phone of the bot but not the bot
            if (typeWebhook === 'outgoingMessageReceived' || typeWebhook === 'quotaExceeded' || typeWebhook ==='outgoingAPIMessageReceived' ) {
                // Delete the notification after processing
                await axios.delete(`${apiDeleteNotificationUrl}${receiptId}`);
                console.log(`Notification ${receiptId} for ${chatId} deleted from the queue.`);
            }

            // Check if the notification is related to an outgoing message from the bot
            if (typeWebhook === 'outgoingMessageStatus') {
                console.log(`Bot sent message to ${chatId}. Status: ${status}, ID: ${idMessage}`);
                // Delete the notification after processing
                await axios.delete(`${apiDeleteNotificationUrl}${receiptId}`);
                console.log(`Notification ${receiptId} for ${chatId} deleted from the queue.`);
            }
            // Check if the notification has already been processed
            if (processedReceiptIds.has(receiptId)) {
                console.log(`Notification ${receiptId} has already been processed. Skipping...`);
                return;  // Skip processing this notification
            }

            // Add the receiptId to the Set to mark it as processed
            processedReceiptIds.add(receiptId);

            // If the message is a client-sent message (incomingMessageReceived)
            if (typeWebhook === 'incomingMessageReceived') {
                const receivedMessage = messageData?.textMessageData?.textMessage;

                // Load active clients again
                await loadActiveClients();
                const client = active_clients.find(c => c.clientNumber === chatId);

                // If client is found in active_clients.json, process the client message
                if (client) {
                    client.notifications.unshift({
                        message: receivedMessage,
                        timestamp: new Date().toISOString()
                    });
                    await saveActiveClients();
                    await axios.delete(`${apiDeleteNotificationUrl}${receiptId}`);
                    console.log(`Notification ${receiptId} for ${chatId} deleted from the queue.`);

                    // Trigger conversation access
                    giveAccessToConversation(client);
                } else if (receivedMessage && receivedMessage.trim().toLowerCase() === triggerMessage.toLowerCase()) {
                    // Start conversation for a new client
                    console.log(`Trigger message received: ${receivedMessage}. Starting conversation for ${chatId}.`);
                    await addToActiveClientsAndStartConversation(chatId);
                    // Delete the notification after processing
                    await axios.delete(`${apiDeleteNotificationUrl}${receiptId}`);
                    console.log(`Notification ${receiptId} for ${chatId} deleted from the queue.`);
                } else {
                    console.log(`Message received but client ${chatId} is not recognized.`);
                    // Delete the notification after processing
                    await axios.delete(`${apiDeleteNotificationUrl}${receiptId}`);
                    console.log(`Notification ${receiptId} for ${chatId} deleted from the queue.`);
                }
            }

        } else {
            console.log("No new notifications received.");  // Log when no body is present in the response
        }
    } catch (error) {
        console.error('Error receiving notifications:', error.message);
        if (error.response) {
            console.error('Full error response:', error.response.data);  // Log full error response if available
        }
    }
};




// Start polling for notifications
const startPolling = () => {
    console.log("start polling");
    ensureFolderExists();
    ensureActiveClientsFileExists();
    ensureNotActiveClientsFileExists();
    setInterval(receiveNotifications, 500); // Poll every 2 seconds
};

// Start polling process
startPolling();
