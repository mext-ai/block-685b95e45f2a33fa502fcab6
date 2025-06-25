import React, { useEffect, useState, useRef, useCallback } from 'react';

interface BlockProps {
  title?: string;
  description?: string;
}

interface Point {
  x: number;
  y: number;
}

interface TrackElement {
  id: string;
  type: 'straight' | 'curve' | 'chicane' | 'start' | 'pit';
  points: Point[];
  width: number;
}

interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
}

const Block: React.FC<BlockProps> = ({ title = "Concepteur de Circuit F1", description }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Point[]>([]);
  const [completedTracks, setCompletedTracks] = useState<TrackElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'erase'>('draw');
  const [trackWidth, setTrackWidth] = useState(40);
  const [isRacing, setIsRacing] = useState(false);
  const [car, setCar] = useState<Car>({ x: 100, y: 100, angle: 0, speed: 0 });
  const [lapTime, setLapTime] = useState(0);
  const [bestLap, setBestLap] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  // Fonction pour dessiner la piste
  const drawTrack = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Fond d'herbe
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Texture d'herbe
    ctx.fillStyle = '#1a3d17';
    for (let i = 0; i < 100; i++) {
      ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 2, 2);
    }

    // Dessiner les pistes complétées
    completedTracks.forEach(track => {
      if (track.points.length > 1) {
        // Asphalte
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = track.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(track.points[0].x, track.points[0].y);
        track.points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();

        // Lignes blanches centrales
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(track.points[0].x, track.points[0].y);
        track.points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Dessiner la piste en cours
    if (currentTrack.length > 1) {
      ctx.strokeStyle = '#2c2c2c';
      ctx.lineWidth = trackWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentTrack[0].x, currentTrack[0].y);
      currentTrack.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentTrack[0].x, currentTrack[0].y);
      currentTrack.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ligne de départ/arrivée
    if (completedTracks.length > 0) {
      const firstTrack = completedTracks[0];
      if (firstTrack.points.length > 0) {
        const startPoint = firstTrack.points[0];
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(startPoint.x - 20, startPoint.y - trackWidth/2, 40, trackWidth);
        
        // Damier
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < Math.floor(trackWidth/5); j++) {
            if ((i + j) % 2 === 0) {
              ctx.fillStyle = '#000000';
              ctx.fillRect(startPoint.x - 20 + i * 5, startPoint.y - trackWidth/2 + j * 5, 5, 5);
            }
          }
        }
      }
    }

    // Dessiner la voiture
    if (isRacing) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      
      // Corps de la voiture
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-15, -6, 30, 12);
      
      // Aileron avant
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(-18, -4, 5, 8);
      
      // Aileron arrière
      ctx.fillRect(15, -4, 3, 8);
      
      // Roues
      ctx.fillStyle = '#000000';
      ctx.fillRect(-12, -8, 6, 4);
      ctx.fillRect(-12, 4, 6, 4);
      ctx.fillRect(8, -8, 6, 4);
      ctx.fillRect(8, 4, 6, 4);
      
      // Numéro
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('1', 0, 4);
      
      ctx.restore();
    }
  }, [currentTrack, completedTracks, trackWidth, car, isRacing]);

  // Gestion de la souris
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRacing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === 'draw') {
      setIsDrawing(true);
      setCurrentTrack([{ x, y }]);
    } else if (selectedTool === 'erase') {
      // Supprimer les pistes proches du clic
      setCompletedTracks(prev => prev.filter(track => {
        return !track.points.some(point => 
          Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < trackWidth
        );
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isRacing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentTrack(prev => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (isDrawing && currentTrack.length > 1) {
      const newTrack: TrackElement = {
        id: Date.now().toString(),
        type: 'straight',
        points: [...currentTrack],
        width: trackWidth
      };
      setCompletedTracks(prev => [...prev, newTrack]);
    }
    setIsDrawing(false);
    setCurrentTrack([]);
  };

  // Animation de la voiture
  useEffect(() => {
    if (!isRacing) return;

    const interval = setInterval(() => {
      setCar(prev => {
        let newX = prev.x + Math.cos(prev.angle) * prev.speed;
        let newY = prev.y + Math.sin(prev.angle) * prev.speed;
        
        // Garder la voiture dans les limites
        newX = Math.max(15, Math.min(CANVAS_WIDTH - 15, newX));
        newY = Math.max(15, Math.min(CANVAS_HEIGHT - 15, newY));
        
        return { ...prev, x: newX, y: newY };
      });

      // Mettre à jour le temps
      if (startTime) {
        setLapTime(Date.now() - startTime);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isRacing, startTime]);

  // Gestion du clavier pour la voiture
  useEffect(() => {
    if (!isRacing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      setCar(prev => {
        let newCar = { ...prev };
        
        switch (e.key) {
          case 'ArrowUp':
            newCar.speed = Math.min(5, prev.speed + 0.2);
            break;
          case 'ArrowDown':
            newCar.speed = Math.max(-2, prev.speed - 0.2);
            break;
          case 'ArrowLeft':
            newCar.angle -= 0.1;
            break;
          case 'ArrowRight':
            newCar.angle += 0.1;
            break;
        }
        
        return newCar;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setCar(prev => ({
          ...prev,
          speed: prev.speed * 0.95 // Friction
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRacing]);

  // Dessiner le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawTrack(ctx);
  }, [drawTrack]);

  const clearTrack = () => {
    setCompletedTracks([]);
    setCurrentTrack([]);
  };

  const startRace = () => {
    if (completedTracks.length === 0) {
      alert('Dessinez d\'abord une piste !');
      return;
    }
    
    const firstTrack = completedTracks[0];
    if (firstTrack.points.length > 0) {
      setCar({
        x: firstTrack.points[0].x,
        y: firstTrack.points[0].y,
        angle: 0,
        speed: 0
      });
    }
    
    setIsRacing(true);
    setStartTime(Date.now());
    setLapTime(0);
  };

  const stopRace = () => {
    setIsRacing(false);
    if (startTime && lapTime > 3000) { // Au moins 3 secondes
      const currentLapTime = lapTime;
      if (!bestLap || currentLapTime < bestLap) {
        setBestLap(currentLapTime);
      }
    }
    setStartTime(null);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  // Envoyer l'événement de completion
  useEffect(() => {
    window.postMessage({ type: 'BLOCK_COMPLETION', blockId: 'race-track-designer', completed: true }, '*');
    window.parent.postMessage({ type: 'BLOCK_COMPLETION', blockId: 'race-track-designer', completed: true }, '*');
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      padding: '20px'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        textAlign: 'center',
        marginBottom: '20px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
      }}>
        🏎️ {title}
      </h1>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '15px',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🛠️ Outils</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={() => setSelectedTool('draw')}
              style={{
                padding: '8px 16px',
                background: selectedTool === 'draw' ? '#e74c3c' : 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ✏️ Dessiner
            </button>
            <button
              onClick={() => setSelectedTool('erase')}
              style={{
                padding: '8px 16px',
                background: selectedTool === 'erase' ? '#e74c3c' : 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              🗑️ Effacer
            </button>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Largeur piste: {trackWidth}px</label>
            <input
              type="range"
              min="20"
              max="80"
              value={trackWidth}
              onChange={(e) => setTrackWidth(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '15px',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🏁 Course</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {!isRacing ? (
              <button
                onClick={startRace}
                style={{
                  padding: '8px 16px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🏎️ Démarrer
              </button>
            ) : (
              <button
                onClick={stopRace}
                style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                🛑 Arrêter
              </button>
            )}
            <button
              onClick={clearTrack}
              style={{
                padding: '8px 16px',
                background: '#f39c12',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              🧹 Effacer tout
            </button>
          </div>
          {isRacing && (
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              ⌨️ Utilisez les flèches pour conduire
            </p>
          )}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '15px',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>⏱️ Chronos</h3>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Temps: {formatTime(lapTime)}
            </p>
            {bestLap && (
              <p style={{ margin: '5px 0', fontSize: '16px', color: '#f1c40f' }}>
                🏆 Meilleur: {formatTime(bestLap)}
              </p>
            )}
            <p style={{ margin: '5px 0', fontSize: '12px' }}>
              Vitesse: {Math.round(car.speed * 10)}/50
            </p>
          </div>
        </div>
      </div>

      <div style={{
        border: '3px solid #ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            display: 'block',
            cursor: selectedTool === 'draw' ? 'crosshair' : selectedTool === 'erase' ? 'pointer' : 'default'
          }}
        />
      </div>

      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '10px',
        backdropFilter: 'blur(10px)',
        maxWidth: '600px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>📋 Instructions</h3>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Dessiner:</strong> Cliquez et glissez pour créer votre circuit
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Conduire:</strong> Utilisez ↑↓ pour accélérer/freiner, ←→ pour tourner
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Objectif:</strong> Créez un circuit excitant et battez votre meilleur temps !
        </p>
      </div>
    </div>
  );
};

export default Block;