# Smart Business Assistant

An AI-powered business intelligence platform designed specifically for Small and Medium Enterprises (SMEs). It converts everyday natural language business transactions into structured financial intelligence, enabling business owners to gain visibility into revenue, profit, credit exposure, and inventory performance without requiring advanced accounting knowledge.

## 🚀 Features

- **Natural Language Input**: Record transactions as you normally speak (e.g., *"Sold 3 sodas to Grace on credit"*).
- **AI Parsing Engine**: Automatically extracts product, quantity, customer, payment type, and amount.
- **Real-time Dashboard**: View core business metrics instantly:
  - Total Revenue
  - Estimated Profit
  - Outstanding Credit
  - Top Selling Products
- **Automated Ledgers**: Automatically updates inventory and customer credit balances based on transactions.
- **Clean UI**: A simple, intuitive interface styled with a professional Red, Black, and White theme.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Data Platform**: Appwrite Databases + Appwrite Storage
- **Authentication**: Appwrite Authentication (email/password sessions)
- **Icons**: Lucide React

## ☁️ Deploy To Appwrite Sites

Use these settings when creating the Site from this repository:

- **Framework**: Next.js
- **Root directory**: `sba-app`
- **Install command**: `npm install`
- **Build command**: `npm run build:sites`
- **Start command**: `npm run start:sites`
- **Output directory**: leave empty (Next.js server deployment)

### Required environment variables in Appwrite Sites

Set the same values you use in `.env.local`, especially:

- `NEXT_PUBLIC_APP_URL` = your Appwrite Site production URL (or custom domain)
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_TRANSACTIONS_COLLECTION_ID`
- `APPWRITE_INVENTORY_COLLECTION_ID`
- `APPWRITE_CREDIT_LEDGER_COLLECTION_ID`
- `APPWRITE_BUCKET_ID`
- `APPWRITE_PROFILE_BUCKET_ID`
- `APPWRITE_BOOTSTRAP_TOKEN`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (optional override)

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/balirwaalvin/smart-business-assistant.git
   cd smart-business-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (copy `.env.example` to `.env.local`) and set:
   - `NEXT_PUBLIC_APP_URL` (for auth verification and password recovery redirects)
   - `APPWRITE_ENDPOINT`
   - `APPWRITE_PROJECT_ID`
   - `APPWRITE_API_KEY`
   - `APPWRITE_DATABASE_ID`
   - `APPWRITE_TRANSACTIONS_COLLECTION_ID`
   - `APPWRITE_INVENTORY_COLLECTION_ID`
   - `APPWRITE_CREDIT_LEDGER_COLLECTION_ID`
   - `APPWRITE_BUCKET_ID`
   - `ANTHROPIC_API_KEY`

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

## 💡 Usage Examples

Try entering the following phrases into the transaction input box:

- **Cash Sale**: *"Sold 5 sodas to James"*
- **Credit Sale**: *"Treasure took 2 cakes on credit"*
- **Inventory Restock**: *"Received 20 bottles of milk from supplier"*
- **Credit Payment**: *"Grace paid 100 on her credit"*

## 🏗️ Project Structure

- `src/app/page.tsx`: Main dashboard view.
- `src/components/`: UI components (`DashboardMetrics`, `TransactionInput`, `RecentTransactions`).
- `src/app/api/`: Backend API routes for handling transactions and fetching metrics.
- `src/lib/db.ts`: Appwrite Databases-backed transaction, inventory, credit, and analytics logic.
- `src/lib/ai.ts`: Anthropic Claude-powered parsing logic with a local fallback parser when no API key is configured.

## 🔮 Future Roadmap

- Expanded Claude prompt tuning and reliability improvements for advanced natural language parsing.
- User authentication and multi-business support.
- Advanced analytics and historical trend charts.
- Exportable financial reports (PDF/CSV).

## 📄 License

This project is licensed under the MIT License.
