import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shuffle, Users } from 'lucide-react';

const socket = io('http://localhost:3001');

const MultiplayerSlidingPuzzle = () => {
  const [name, setName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    // Listen for player list updates
    socket.on('playerList', (playerList) => {
      setPlayers(playerList.sort((a, b) => b.correctTiles - a.correctTiles));
    });

    // Listen for game start
    socket.on('gameStart', (initialTiles) => {
      setTiles(initialTiles);
      setGameStarted(true);
    });

    return () => {
      socket.off('playerList');
      socket.off('gameStart');
    };
  }, []);

  const handleJoin = () => {
    if (name.trim()) {
      socket.emit('join', { name: name.trim() });
      setIsJoined(true);
    }
  };

  const handleReady = () => {
    socket.emit('ready');
    setIsReady(true);
  };

  const moveTile = (rowIndex, colIndex) => {
    if (!gameStarted) return;

    const emptyPos = tiles.flat().indexOf(16);
    const emptyRow = Math.floor(emptyPos / 4);
    const emptyCol = emptyPos % 4;
    
    if (
      (Math.abs(rowIndex - emptyRow) === 1 && colIndex === emptyCol) ||
      (Math.abs(colIndex - emptyCol) === 1 && rowIndex === emptyRow)
    ) {
      const newTiles = tiles.map(row => [...row]);
      [newTiles[rowIndex][colIndex], newTiles[emptyRow][emptyCol]] = 
      [newTiles[emptyRow][emptyCol], newTiles[rowIndex][colIndex]];
      
      setTiles(newTiles);
      socket.emit('move', newTiles);
    }
  };

  const getTileStyle = (value) => {
    const baseStyle = "w-16 h-16 flex items-center justify-center text-lg font-bold rounded cursor-pointer transition-all duration-200";
    if (value === 16) return `${baseStyle} bg-gray-200`;
    return `${baseStyle} bg-blue-500 hover:bg-blue-600 text-white`;
  };

  if (!isJoined) {
    return (
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button className="w-full" onClick={handleJoin}>
            Join
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-8">
      <Card className="w-fit">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>15 Puzzle - {name}</CardTitle>
          {!gameStarted && !isReady && (
            <Button onClick={handleReady}>
              Ready
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative pl-8 pt-8">
            <div className="absolute top-0 left-8 right-0 flex">
              {['A', 'B', 'C', 'D'].map(letter => (
                <div key={letter} className="w-16 text-center text-sm text-gray-500">
                  {letter}
                </div>
              ))}
            </div>
            
            <div>
              {tiles.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center">
                  <div className="w-8 text-sm text-gray-500 text-right pr-2">
                    {rowIndex + 1}
                  </div>
                  {row.map((tile, colIndex) => (
                    <div
                      key={colIndex}
                      className={getTileStyle(tile)}
                      onClick={() => moveTile(rowIndex, colIndex)}
                    >
                      {tile === 16 ? '' : tile}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-64">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {players.map((player) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-2 rounded bg-gray-100"
              >
                <span className="font-medium">
                  {player.name}
                  {player.id === socket.id && " (You)"}
                </span>
                <span className="text-sm text-gray-600">
                  {player.ready ? (
                    gameStarted ? `${player.correctTiles}/16` : "Ready"
                  ) : "Waiting"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiplayerSlidingPuzzle;