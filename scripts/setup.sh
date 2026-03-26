#!/bin/bash

# Setup script for Identity Hub

echo "Starting Identity Hub Setup..."

# Backend Setup
echo "Setting up Backend..."
cd backend
npm install
cp .env.example .env
cd ..

# Frontend Setup
echo "Setting up Frontend..."
cd frontend
npm install
cd ..

# AI Setup
echo "Setting up AI..."
cd ai
# pip install -r requirements.txt
cd ..

# Card Setup
echo "Setting up Card Simulation..."
cd card
npm install
cd ..

echo "Setup Complete!"
