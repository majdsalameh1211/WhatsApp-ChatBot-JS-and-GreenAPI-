const axios = require('axios');
require('dotenv').config();

const instanceId = process.env.GREEN_API_INSTANCE_ID;
const token = process.env.GREEN_API_TOKEN;

const apiReceiveNotificationUrl = `https://api.green-api.com/waInstance${instanceId}/receiveNotification/${token}`;
const apiDeleteNotificationUrl = `https://api.green-api.com/waInstance${instanceId}/deleteNotification/${token}`;

// Fetch all notifications in the queue
const fetchAllNotifications = async () => {
    try {
        const response = await axios.get(apiReceiveNotificationUrl);
        return response.data ? [response.data] : [];
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        return [];
    }
};

// Delete a specific notification by receiptId
const deleteNotification = async (receiptId) => {
    try {
        await axios.delete(`${apiDeleteNotificationUrl}/${receiptId}`);
        console.log(`Deleted notification with receiptId: ${receiptId}`);
    } catch (error) {
        console.error(`Error deleting notification with receiptId ${receiptId}:`, error.message);
    }
};

// Delete all notifications in parallel
const deleteAllNotifications = async () => {
    while (true) {
        const notifications = await fetchAllNotifications();

        // Ensure we have valid notifications
        if (!Array.isArray(notifications) || notifications.length === 0) {
            console.log('No more notifications to delete.');
            break;
        }

        // Delete all notifications in parallel
        await Promise.all(
            notifications.map(async (notification) => {
                const receiptId = notification.receiptId;
                if (receiptId) {
                    await deleteNotification(receiptId);
                }
            })
        );
    }
};

// Call the function to delete all notifications
deleteAllNotifications();
