# Lead Scraper - Render Deployment Guide

A premium lead sourcing webapp ready for deployment on Render.

## Features
- **Frontend**: Vanilla JS, CSS, and HTML (Inter Font).
- **Backend**: Node.js, Express, MongoDB Native Driver.
- **Security**: Environment variable configuration.

---

## 🚀 Deployment to Render

Follow these steps to deploy your application:

### 1. Push to GitHub
If you haven't already, push your project to a GitHub repository.

### 2. Connect to Render
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.

### 3. Configure the Service
- **Name**: `lead-scraper` (or your choice).
- **Environment**: `Node`.
- **Build Command**: `npm install`.
- **Start Command**: `node server.js`.

### 4. Environment Variables ⚠️
In the **Environment** tab, click **Add Environment Variable** and add the following:

| Key | Value | Description |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://...` | Your MongoDB connection string. |
| `WEBHOOK_URL` | `https://n8n...` | Your n8n webhook URL. |
| `NODE_VERSION` | `22.19.0` | (Recommended) Matches your local environment. |

### 5. Deploy
Click **Create Web Service**. Render will build and deploy your app. You'll receive a unique `.onrender.com` URL once complete.

---

## Local Development
1. Clone the repo.
2. Run `npm install`.
3. Set your environment variables (optional, defaults are provided in `server.js`).
4. Run `npm start`.
