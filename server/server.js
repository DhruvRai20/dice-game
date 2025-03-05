// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Store server seeds (in production, use a database)
let currentServerSeed = crypto.randomBytes(32).toString('hex');
let previousServerSeed = '';
let currentServerSeedHash = crypto.createHash('sha256').update(currentServerSeed).digest('hex');

// Generate a new set of seeds
const generateNewSeeds = () => {
  previousServerSeed = currentServerSeed;
  currentServerSeed = crypto.randomBytes(32).toString('hex');
  currentServerSeedHash = crypto.createHash('sha256').update(currentServerSeed).digest('hex');
  return {
    serverSeed: currentServerSeed,
    serverSeedHash: currentServerSeedHash
  };
};

// Generate a roll between 1-6 based on seeds
const generateRoll = (serverSeed, clientSeed, nonce) => {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hash = hmac.digest('hex');
  
  // Take the first 8 characters and convert to a number
  const decimal = parseInt(hash.substr(0, 8), 16);
  
  // Get a number between 1-6
  return (decimal % 6) + 1;
};

// Routes
app.get('/api/get-seeds', (req, res) => {
  const clientSeed = crypto.randomBytes(8).toString('hex');
  
  res.json({
    serverSeedHash: currentServerSeedHash,
    clientSeed,
    previousServerSeed
  });
});

app.post('/api/roll-dice', (req, res) => {
  const { betAmount, clientSeed, nonce } = req.body;
  
  if (!betAmount || betAmount <= 0) {
    return res.status(400).json({ message: 'Invalid bet amount' });
  }
  
  // Generate roll
  const roll = generateRoll(currentServerSeed, clientSeed, nonce);
  
  // Determine outcome
  const win = roll >= 4;
  const profitAmount = win ? parseFloat(betAmount) : -parseFloat(betAmount);
  const newBalance = parseFloat(req.body.currentBalance || 1000) + profitAmount;
  
  res.json({
    roll,
    win,
    profitAmount,
    newBalance
  });
});

app.post('/api/verify', (req, res) => {
  const { serverSeed, clientSeed, nonce } = req.body;
  
  if (!serverSeed || !clientSeed || nonce === undefined) {
    return res.status(400).json({ message: 'Missing parameters' });
  }
  
  // Verify the hash
  const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const roll = generateRoll(serverSeed, clientSeed, nonce);
  
  res.json({
    verified: true,
    roll,
    hash
  });
});

// Generate new seeds every hour (in a real app, you'd want more sophisticated rotation)
setInterval(() => {
  generateNewSeeds();
}, 1000 * 60 * 60);

// Start server
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Utils.js (can be a separate file)
// These could be extracted to a separate utils.js file for better organization

/**
 * Verify a previous roll
 * @param {string} serverSeed - The server seed
 * @param {string} clientSeed - The client seed
 * @param {number} nonce - The nonce
 * @param {number} roll - The roll to verify
 * @returns {boolean} - Whether the roll is valid
 */
function verifyRoll(serverSeed, clientSeed, nonce, roll) {
  const expectedRoll = generateRoll(serverSeed, clientSeed, nonce);
  return expectedRoll === roll;
}

/**
 * Generate a SHA-256 hash of the input
 * @param {string} input - The input to hash
 * @returns {string} - The hash
 */
function generateHash(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}