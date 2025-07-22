#!/bin/bash

echo "⚙️ Starting FutsalBook Nepal setup..."

# 1. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Copy and create .env file
echo "📁 Setting up backend .env file..."
cp .env.example .env
echo "➡️  Please manually edit 'backend/.env' and update your database credentials + JWT_SECRET"
read -p "Press enter to continue after editing the .env file..."

# 2. Setup database
echo "🗃️ Running database setup..."
npm run db:setup

# 3. Start backend in background
echo "🚀 Starting backend server..."
npm run dev &

# 4. Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Copy and create .env file
echo "📁 Setting up frontend .env file..."
cp .env.example .env

# 5. Start frontend
echo "🚀 Starting frontend server..."
npm start
