import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MenuScene from "./scenes/MenuScene";
import SelectPlayersScene from "./scenes/SelectPlayersScene";
import PlayingGameScene from "./scenes/PlayingGameScene";
import LeaderboardScene from "./scenes/LeaderboardScene";
import SettingsScene from "./scenes/SettingsScene";
import SweepScene from "./scenes/SweepScene";
import { eventBus } from "./core/events";
import { detectAllPlayers, playerMap, deletePlayer, addPoint } from "./gesture/tracker";


// Draw player 1 points on debug canvas every frame
const debugCanvas = document.getElementById('debugPlayerMap') as HTMLCanvasElement | null;
const debugCtx = debugCanvas?.getContext('2d') ?? undefined;

function drawPlayer1Points() {
	if (!debugCtx) return;
	debugCtx.clearRect(0, 0, 640, 480);
	const points = playerMap.get(1);
	if (points) {
		debugCtx.fillStyle = '#ffeb3b';
		for (const [x, y] of points) {
			debugCtx.beginPath();
			debugCtx.arc(x, y, 2, 0, Math.PI * 2);
			debugCtx.fill();
		}
	}
}

// Print detectAllPlayers results every 1 second
setInterval(() => {
	const { results: allResults, elapsedMs } = detectAllPlayers();

	drawPlayer1Points();

	for (const [playerKey, detections] of Object.entries(allResults)) {
		if (!detections || detections.length === 0) {
			continue;
		}
		const validDetections = detections.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
		if (validDetections.length === 0) {
			continue;
		}
		const playerId = Number(playerKey);
		console.log('detectAllPlayers', playerId, validDetections, elapsedMs);
		const maxResult = validDetections.reduce((best, current) => current.Score > best.Score ? current : best);
		console.log('bestDetection', playerId, maxResult);
		if (maxResult.Score > 0.12) {
			deletePlayer(playerId);
			console.log('playerRemoved', playerId, maxResult.Score);
		}
	}
}, 100);





window.addEventListener('load', function () {
	console.log('Starting Rocket Racer game...');
	
	// Check if game container exists
	const gameContainer = document.getElementById('game-container');
	if (!gameContainer) {
		console.error('Game container not found!');
		return;
	}
	
	console.log('Game container found, creating Phaser game...');
	
	const game = new Phaser.Game({
		width: 1280,
		height: 720,
		backgroundColor: "#000000", // Black background
		parent: "game-container",
		scale: {
			mode: Phaser.Scale.ScaleModes.FIT,
			autoCenter: Phaser.Scale.Center.CENTER_BOTH
		},
		scene: [BootScene, MenuScene, SelectPlayersScene, PlayingGameScene, LeaderboardScene, SettingsScene, SweepScene]
	});


	// Attach event bus to game instance
	(game as any).eventBus = eventBus;

	console.log('Game created');
	console.log('Starting Boot scene...');
	game.scene.start("Boot");
});