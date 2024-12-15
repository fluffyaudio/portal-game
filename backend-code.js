const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game state
let gameState = {
  players: new Map(), // player -> {name, ready, tiles, correctTiles}
  gameStarted: false,
  initialTiles: null
};

// Function to check if a tile is in the correct position
const isCorrectPosition = (tile, index) => {
  return tile === index + 1;
};

// Function to count correct tiles
const countCorrectTiles = (tiles) => {
  return tiles.flat().reduce((count, tile, index) => {
    return count + (isCorrectPosition(tile, index) ? 1 : 0);
  }, 0);
};

// Function to generate a valid puzzle configuration
const generateValidPuzzle = () => {
  const isValidPermutation = (arr) => {
    let inversions = 0;
    const flatArr = arr.flat().filter(n => n !== 16);
    
    for (let i = 0; i < flatArr.length - 1; i++) {
      for (let j = i + 1; j < flatArr.length; j++) {
        if (flatArr[i] > flatArr[j]) inversions++;
      }
    }

    const emptyRowFromBottom = 4 - Math.floor(arr.flat().indexOf(16) / 4);
    return (emptyRowFromBottom % 2 === 0 && inversions % 2 === 1) ||
           (emptyRowFromBottom % 2 === 1 && inversions % 2 === 0);
  };

  let numbers;
  do {
    numbers = Array.from({length: 16}, (_, i) => i + 1)
      .sort(() => Math.random() - 0.5);
    numbers = Array.from({length: 4}, (_, i) => 
      numbers.slice(i * 4, (i + 1) * 4)
    );
  } while (!isValidPermutation(numbers));

  return numbers;
};

io.on('connection', (socket) => {
  console.log('Client connected');

  // Player joins
  socket.on('join', ({ name }) => {
    gameState.players.set(socket.id, {
      name,
      ready: false,
      tiles: null,
      correctTiles: 0
    });
    
    // Broadcast updated player list
    io.emit('playerList', Array.from(gameState.players.entries()).map(([id, player]) => ({
      id,
      name: player.name,
      ready: player.ready,
      correctTiles: player.correctTiles
    })));
  });

  // Player marks as ready
  socket.on('ready', () => {
    const player = gameState.players.get(socket.id);
    if (player) {
      player.ready = true;
      
      // Check if all players are ready
      const allReady = Array.from(gameState.players.values()).every(p => p.ready);
      if (allReady && !gameState.gameStarted) {
        gameState.gameStarted = true;
        gameState.initialTiles = generateValidPuzzle();
        
        // Send initial configuration to all players
        io.emit('gameStart', gameState.initialTiles);
      }

      // Broadcast updated player list
      io.emit('playerList', Array.from(gameState.players.entries()).map(([id, player]) => ({
        id,
        name: player.name,
        ready: player.ready,
        correctTiles: player.correctTiles
      })));
    }
  });

  // Player makes a move
  socket.on('move', (tiles) => {
    const player = gameState.players.get(socket.id);
    if (player && gameState.gameStarted) {
      player.tiles = tiles;
      player.correctTiles = countCorrectTiles(tiles);
      
      // Broadcast updated player list
      io.emit('playerList', Array.from(gameState.players.entries()).map(([id, player]) => ({
        id,
        name: player.name,
        ready: player.ready,
        correctTiles: player.correctTiles
      })));
    }
  });

  // Player disconnects
  socket.on('disconnect', () => {
    gameState.players.delete(socket.id);
    
    // If no players left, reset game state
    if (gameState.players.size === 0) {
      gameState.gameStarted = false;
      gameState.initialTiles = null;
    }
    
    // Broadcast updated player list
    io.emit('playerList', Array.from(gameState.players.entries()).map(([id, player]) => ({
      id,
      name: player.name,
      ready: player.ready,
      correctTiles: player.correctTiles
    })));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});