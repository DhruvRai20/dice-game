"use client";

// App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const App = () => {
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState(0);
  const [previousServerSeed, setPreviousServerSeed] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load balance from localStorage if available
    const savedBalance = localStorage.getItem('diceGameBalance');
    if (savedBalance) {
      setBalance(parseFloat(savedBalance));
    }
    
    // Initialize game
    fetchNewSeeds();
  }, []);

  useEffect(() => {
    // Save balance to localStorage whenever it changes
    localStorage.setItem('diceGameBalance', balance.toString());
  }, [balance]);

  const fetchNewSeeds = async () => {
    try {
      const response = await axios.get('https://dice-game-fke2.onrender.com/api/get-seeds');
      setServerSeed(response.data.serverSeedHash);
      setClientSeed(response.data.clientSeed);
      setPreviousServerSeed(response.data.previousServerSeed || '');
      setNonce(0);
    } catch (err) {
      setError('Failed to initialize game. Please refresh.');
    }
  };

  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value > balance) {
      setBetAmount(balance);
    } else if (value < 1) {
      setBetAmount(1);
    } else {
      setBetAmount(value);
    }
  };

  const rollDice = async () => {
    if (isRolling || betAmount > balance || betAmount <= 0) return;
    
    setIsRolling(true);
    setError('');
    
    try {
      const response = await axios.post('https://dice-game-fke2.onrender.com/api/roll-dice', {
        betAmount,
        clientSeed,
        serverSeedHash: serverSeed,
        nonce
      });
      
      // Animate dice rolling
      const rollAnimation = setInterval(() => {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
      
      // Stop animation after 1 second and show the actual result
      setTimeout(() => {
        clearInterval(rollAnimation);
        setDiceValue(response.data.roll);
        setBalance(response.data.newBalance);
        setNonce(nonce + 1);
        
        // Add to history
        setHistory([
          {
            roll: response.data.roll,
            bet: betAmount,
            result: response.data.roll >= 4 ? 'win' : 'loss',
            profit: response.data.roll >= 4 ? betAmount : -betAmount,
            nonce
          },
          ...history.slice(0, 9)
        ]);
        
        // Check if we need new seeds (after 10 rolls)
        if ((nonce + 1) % 10 === 0) {
          fetchNewSeeds();
        }
        
        setIsRolling(false);
      }, 1000);
    } catch (err) {
      setIsRolling(false);
      setError(err.response?.data?.message || 'Error rolling dice. Try again.');
    }
  };

  const verifyRoll = async () => {
    if (!previousServerSeed) {
      setError('No previous round to verify yet.');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await axios.post('https://dice-game-fke2.onrender.com/api/verify', {
        serverSeed: previousServerSeed,
        clientSeed,
        nonce: nonce - 1
      });
      
      alert(`Verification Result: ${response.data.verified ? 'Success' : 'Failed'}\nExpected Roll: ${response.data.roll}`);
    } catch (err) {
      setError('Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const maxBet = () => {
    setBetAmount(balance);
  };

  const halfBet = () => {
    setBetAmount(Math.floor(balance / 2));
  };

  // Render dice face based on the current value
  const renderDiceFace = () => {
    if (!diceValue) return 'Roll the dice!';
    
    const dots = [];
    for (let i = 0; i < diceValue; i++) {
      dots.push(<div key={i} className="dot"></div>);
    }
    
    return (
      <div className={`dice-face dice-${diceValue}`}>
        {dots}
      </div>
    );
  };
  
  return (
    <div className="app-container">
      <header>
        <h1>Provably Fair Dice Game</h1>
      </header>
      
      <div className="game-container">
        <div className="balance-info">
          <h2>Balance: ${balance.toFixed(2)}</h2>
        </div>
        
        <div className="dice-container">
          <motion.div 
            className="dice"
            animate={{ 
              rotate: isRolling ? [0, 360, 720, 1080] : 0 
            }}
            transition={{ duration: 1 }}
          >
            {renderDiceFace()}
          </motion.div>
          
          {diceValue && (
            <div className={`result ${diceValue >= 4 ? 'win' : 'loss'}`}>
              {diceValue >= 4 ? 'You Win!' : 'You Lose!'}
            </div>
          )}
        </div>
        
        <div className="bet-controls">
          <div className="bet-input-group">
            <label htmlFor="bet-amount">Bet Amount:</label>
            <input
              id="bet-amount"
              type="number"
              value={betAmount}
              onChange={handleBetChange}
              min="1"
              max={balance}
            />
            <div className="bet-shortcuts">
              <button onClick={halfBet}>1/2</button>
              <button onClick={maxBet}>Max</button>
            </div>
          </div>
          
          <button 
            className="roll-button"
            onClick={rollDice}
            disabled={isRolling || balance < betAmount || betAmount <= 0}
          >
            {isRolling ? 'Rolling...' : 'Roll Dice'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>
      
      <div className="provably-fair-section">
        <h3>Provably Fair System</h3>
        <div className="seeds-info">
          <div>
            <strong>Server Seed Hash:</strong> 
            <span className="hash">{serverSeed.substring(0, 20)}...</span>
          </div>
          <div>
            <strong>Client Seed:</strong> 
            <span>{clientSeed}</span>
          </div>
          <div>
            <strong>Nonce:</strong> 
            <span>{nonce}</span>
          </div>
        </div>
        
        <button 
          className="verify-button"
          onClick={verifyRoll}
          disabled={!previousServerSeed || verifying}
        >
          {verifying ? 'Verifying...' : 'Verify Previous Roll'}
        </button>
        
        <div className="fair-explanation">
          <p>
            Our dice game uses a provably fair system that ensures the outcome cannot be manipulated.
            Each roll is determined by combining a server seed (which is hashed), your client seed, and a nonce.
            After a series of rolls, you can verify that the previous outcomes were fair.
          </p>
        </div>
      </div>
      
      <div className="history-section">
        <h3>Roll History</h3>
        <table>
          <thead>
            <tr>
              <th>Roll</th>
              <th>Bet</th>
              <th>Result</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item, index) => (
              <tr key={index} className={item.result}>
                <td>{item.roll}</td>
                <td>${item.bet.toFixed(2)}</td>
                <td>{item.result.toUpperCase()}</td>
                <td>${item.profit.toFixed(2)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan="4">No rolls yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;