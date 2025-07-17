#!/bin/bash

# Script to set up Firebase Functions environment variables
# Run this script to configure your API keys in Firebase Functions

echo "Setting up Firebase Functions environment variables..."
echo "Make sure you have the Firebase CLI installed and are logged in."
echo ""

# Prompt for API keys
read -p "Enter your OpenRouter API key: " OPENROUTER_KEY
read -p "Enter your Groq API key (optional, press Enter to skip): " GROQ_KEY
read -p "Enter your ZeroBounce API key: " ZEROBOUNCE_KEY
read -p "Enter your Google Speech API key: " GOOGLE_SPEECH_KEY

# Set OpenRouter API key
firebase functions:config:set openrouter.api_key="$OPENROUTER_KEY"

# Set Groq API key if provided
if [ ! -z "$GROQ_KEY" ]; then
    firebase functions:config:set groq.api_key="$GROQ_KEY"
fi

# Set ZeroBounce API key
firebase functions:config:set zerobounce.api_key="$ZEROBOUNCE_KEY"

# Set Google Speech API key
firebase functions:config:set google_speech.api_key="AIzaSyBO2JhhIaHt0N4qTOxqq8X0WA_qjb0GANM"

echo ""
echo "Configuration set! Run 'firebase functions:config:get' to verify."
echo "Don't forget to deploy your functions: 'npm run deploy' from the functions directory."