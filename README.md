# RideMate - Backend

RideMate is a college-focused ride-sharing and commute coordination application designed specifically for students to share rides, split costs, and reduce their carbon footprint. 

This repository contains the **Node.js + Express backend** service. It handles authentication verification, database storage, and real-time communication via Socket.IO.

---

## 📝 Project Overview
This project serves as the backend API for the RideMate Flutter application. It was built as a part of the Mobile App Development coursework by me as the sole developer at BMSCE.

> [!NOTE]
> This is a student project built with educational purposes in mind. It has scalability limitations and is not intended for large-scale production use without further optimization and security hardening.

---

## 🛠️ Tech Stack
* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: MongoDB (via Mongoose)
* **Authentication**: Firebase Admin SDK
* **Real-time Communication**: Socket.IO

---

## 📁 Project Structure
Here is a high-level overview of the backend directory structure:

```text
backend/
├── config/             # Database and Firebase initialization
├── models/             # Mongoose schemas (User, Ride, Message, Request)
├── routes/             # Express route handlers (Auth, Rides, User)
├── services/           # Socket.IO and cleanup background workers
└── server.js           # Entry point of the application
```

---

## 🚀 Setup Instructions

### Prerequisites
* **Node.js** (v14+ recommended)
* **MongoDB** (Local instance or MongoDB Atlas cluster)
* A **Firebase Project** for authentication

### 1. Clone the Repository
```bash
git clone https://github.com/Arsh1255/RideMate-Backend.git
cd RideMate-Backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a **`.env`** file in the root directory and add the following variables:

```text
PORT=3000
MONGO_URI=your_mongodb_connection_string
```

### 4. Firebase Admin Key Setup
To verify user tokens, the backend requires the Firebase Admin SDK private key:
1. Go to your **Firebase Console** -> Project Settings -> **Service Accounts**.
2. Click **Generate New Private Key**.
3. Download the JSON file and rename it to **`firebase-admin-key.json`**.
4. Place this file directly in the root of the `backend/` folder.

> [!IMPORTANT]
> Both `.env` and `firebase-admin-key.json` contain sensitive secrets and are ignored by Git. Never push them to a public repository!

---

## ▶️ Running the Server

To start the server in development mode:
```bash
node server.js
```
The server will start running at `http://localhost:3000`.

---

## 📱 Connecting with the Frontend
To connect the Flutter frontend to this backend:

1. Open the Flutter project and navigate to `lib/core/constants.dart`.
2. Update the `baseUrl` and `socketUrl` with your backend URL:

```dart
static const String baseUrl = "YOUR_BACKEND_URL/api";
static const String socketUrl = "YOUR_BACKEND_URL";
```

---

## 📜 Disclaimer
This software is provided "as is", without warranty of any kind. This project was developed as a student assignment and is not audited for commercial security standards. Use at your own discretion.
