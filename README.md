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
- **Database**: SQLite (via `better-sqlite3`)
- **Icons**: Lucide React

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

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

*Note: The SQLite database (`business.db`) will be automatically initialized the first time you load the application.*

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
- `src/lib/db.ts`: SQLite database schema and query logic.
- `src/lib/ai.ts`: Mock AI parsing logic (can be swapped out for OpenAI/Anthropic APIs in the future).

## 🔮 Future Roadmap

- Integration with real LLM APIs (OpenAI/Anthropic) for advanced natural language parsing.
- User authentication and multi-business support.
- Advanced analytics and historical trend charts.
- Exportable financial reports (PDF/CSV).

## 📄 License

This project is licensed under the MIT License.
