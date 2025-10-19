import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MenuScene from "./scenes/MenuScene";
import SelectPlayersScene from "./scenes/SelectPlayersScene";
import TutorialScene from "./scenes/TutorialScene";
import PlayingGameScene from "./scenes/PlayingGameScene";
import LeaderboardScene from "./scenes/LeaderboardScene";
import NameEntryScene from "./scenes/NameEntryScene";
import SettingsScene from "./scenes/SettingsScene";
import BallTrackerScene from "./scenes/BallTrackerScene";
import VisualizerTestScene from "./scenes/VisualizerTestScene";
import WandCalibrationScene from "./scenes/WandCalibrationScene";
import { eventBus } from "./core/events";
// Gesture tracking imports available for scenes that need them


// Debug canvas functionality moved to individual scenes that need it





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
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 } // No gravity for our game
			}
		},
		scale: {
			mode: Phaser.Scale.ScaleModes.FIT,
			autoCenter: Phaser.Scale.Center.CENTER_BOTH
		},
		scene: [BootScene, MenuScene, SelectPlayersScene, TutorialScene, PlayingGameScene, LeaderboardScene, NameEntryScene, SettingsScene, BallTrackerScene, VisualizerTestScene, WandCalibrationScene]
	});


	// Attach event bus to game instance
	(game as any).eventBus = eventBus;

	console.log('Game created');
	console.log('Starting Boot scene...');
	game.scene.start("Boot");
});