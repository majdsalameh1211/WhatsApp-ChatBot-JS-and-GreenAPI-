# 💬 WhatsApp ChatBot – JS & GreenAPI

This project is a **WhatsApp automation chatbot** built with **Node.js** and **Green API**. It dynamically manages conversations with clients, stores them in structured JSON files, and exports data to external systems like **Google Docs** or **CRM platforms** for seamless business integration.

---

## 🤖 WhatsApp Chatbot for Client Interaction

This bot is designed to streamline communication between businesses and clients on WhatsApp by automating responses and tracking client interactions efficiently.

---

## 🔹 Features

- 📩 **Automated Message Handling**  
  Responds to incoming WhatsApp messages based on a predefined conversation flow.

- 🔄 **Client State Management**  
  Tracks active vs inactive clients to manage session continuity.

- 📝 **Conversation Logging**  
  Saves full client conversations in `.json` files for record-keeping and analysis.

- 📊 **Export to Google Docs / CRM**  
  Integrates easily with external tools for reporting or customer relationship management.

- ⚡ **Efficient Automation**  
  Powered by **Node.js** and **Green API**, ensuring lightweight and fast operation.

---

## 🚀 How It Works

1. Clients message your WhatsApp number.
2. The bot receives messages through Green API.
3. It responds with predefined replies based on the current stage of the conversation.
4. Every interaction is saved in a `.json` file (one per client).
5. Conversations can be exported automatically or manually to Google Docs or your CRM system.

---

## 📦 Tech Stack

- **Node.js** – Core logic and automation
- **Green API** – WhatsApp messaging and webhook interface
- **File System (fs)** – For storing JSON conversation logs
- **Google Docs API** *(optional)* – For exporting conversations
- **CRM API** *(optional)* – For business data integration

---

## 🛠 Setup Instructions

1. **Clone the Repository**
```bash
git clone https://github.com/majdsalameh1211/WhatsApp-ChatBot-JS-and-GreenAPI.git
cd WhatsApp-ChatBot-JS-and-GreenAPI
