#!/usr/bin/env node

/**
 * AI Wellness Coach Testing Script
 * Run this to quickly test various scenarios
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const scenarios = [
  {
    name: "Free User - Wednesday First Use",
    description: "Tests name collection and first conversation",
    steps: [
      "1. Set device date to Wednesday",
      "2. Clear app data",
      "3. Enable AI Wellness as free user",
      "4. Wait for 2 PM notification",
      "5. Reply with 'Hello!'",
      "6. Should receive name request",
      "7. Reply with your name",
      "8. Should receive personalized greeting"
    ]
  },
  {
    name: "Free User - Usage Limit",
    description: "Tests daily limit enforcement",
    steps: [
      "1. Complete first conversation",
      "2. Try another conversation same day",
      "3. Should see usage limit message",
      "4. Should see upgrade prompt",
      "5. Tap upgrade button",
      "6. Should open subscription modal"
    ]
  },
  {
    name: "Free User - Wrong Day",
    description: "Tests Wednesday-only restriction",
    steps: [
      "1. Set device date to Tuesday",
      "2. Try to use AI Wellness",
      "3. Should see Wednesday-only message",
      "4. Should see upgrade option"
    ]
  },
  {
    name: "Premium User - Any Day",
    description: "Tests unlimited premium access",
    steps: [
      "1. Upgrade to premium",
      "2. Test on any day",
      "3. Have multiple conversations",
      "4. Should have no limits",
      "5. Check daily notifications scheduled"
    ]
  },
  {
    name: "Effectiveness Tracking",
    description: "Tests 30-minute follow-up",
    steps: [
      "1. Report issue: 'My back hurts'",
      "2. Receive stretch suggestion",
      "3. Wait 30 minutes",
      "4. Should receive effectiveness check",
      "5. Test Yes/Somewhat/No options",
      "6. Future suggestions should improve"
    ]
  },
  {
    name: "Error Handling",
    description: "Tests offline and errors",
    steps: [
      "1. Turn on airplane mode",
      "2. Try to send message",
      "3. Should see fallback response",
      "4. Turn internet back on",
      "5. Should work normally"
    ]
  }
];

function displayMenu() {
  console.log('\n🤖 AI Wellness Coach Test Scenarios\n');
  scenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   ${scenario.description}\n`);
  });
  console.log('0. Exit\n');
}

function displayScenario(index) {
  const scenario = scenarios[index];
  console.log(`\n📋 ${scenario.name}\n`);
  console.log('Steps to test:');
  scenario.steps.forEach(step => console.log(`   ${step}`));
  console.log('\n✅ Mark each step as you complete it');
  console.log('📝 Note any issues or unexpected behavior\n');
}

function prompt() {
  rl.question('Select test scenario (0-6): ', (answer) => {
    const choice = parseInt(answer);
    
    if (choice === 0) {
      console.log('\n👋 Happy testing!');
      rl.close();
      return;
    }
    
    if (choice >= 1 && choice <= scenarios.length) {
      displayScenario(choice - 1);
      
      rl.question('\nPress Enter to continue...', () => {
        displayMenu();
        prompt();
      });
    } else {
      console.log('\n❌ Invalid choice. Try again.');
      prompt();
    }
  });
}

// Start
console.log('🚀 AI Wellness Coach Testing Guide');
console.log('===================================');
displayMenu();
prompt();