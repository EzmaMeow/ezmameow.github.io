
import * as THREE from 'three';
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import * as Game_Utils from './game_ultility.js'
import { Level } from './game_core.js'

const canvas = document.getElementById("game");
//const renderer = new THREE.WebGLRenderer({ canvas });
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);

//let camera;
//let player_light;
let maze_game;
console.log(Game_Utils)
console.log(Game_Utils.line_supercover)


//a share state about the world such as getting objects in
//the world and collsion checks as well as varibles that may be needed
export class World_State {
	line_trace = (x, y) => {
		return {}
	}
	constructor() {
	}
}

//player might be part of maze.js or it could be part of game_core.js
//but most likly a character object will be added to core and player stay here while extending that character
export class Player extends THREE.Object3D {
	//TODO: Move all the player base logic here and maybe create a dedicated character object
	speed = 0.05;
	move(direction, world_state) {

	}
	constructor() {
		super();
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 32);
		this.light = new THREE.PointLight(0x3a3a4f, 0.5, 128, 1.0);
		this.add(this.light);
	}
}

export class Maze_Game {

	on_key_down(event) {
		this.input_state.keys[event.key] = true;

		if (event.key == "l") {
			if (this.player.light.color.getHex() == 0xf8c377) {
				this.player.light.color.setHex(0x3a3a4f);
			}
			else {
				this.player.light.color.setHex(0xf8c377);
			}
		}
		if (event.key == "`") {
			if (this.input_state.debug) {
				this.input_state.debug = false;
				this.player.camera.position.y = 0.0
			}
			else {
				this.input_state.debug = true;
				this.player.camera.position.y = 2.0
			}
			//let test = this.player.camera.position.clone();
			//let direction = new THREE.Vector3();
			//this.player.camera.getWorldDirection(direction);
			//test.add(direction.multiplyScalar(3.0));
			//console.log(Vector_Lib.line_supercover_3d(this.level.get_cell_position(this.player.camera.position),this.level.get_cell_position(test)));
		}
	}
	on_key_up(event) {
		this.input_state.keys[event.key] = false;
	}
	on_mouse_up(event) {
		if (event.button === 1) {
			this.input_state.enable_mouse = false;
		}
	}
	on_mouse_down(event) {
		if (event.button === 1) {
			this.input_state.enable_mouse = true;
		}
	}
	on_mouse_move(event) {
		if (this.input_state.enable_mouse) {
			const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0.0;
			const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0.0;
			this.player.camera.rotation.y -= movementX * this.input_state.mouseSensitivity;
		}
	}

	constructor() {
		const level = new Level("maze.png"); //exposing it for callables
		this.level = level;
		const level_image = level.level_image;
		const player = new Player();
		this.player = player;
		const input_state = {
			mouseSensitivity: 0.01,
			keys: {},
			enable_mouse: false,
			debug: false
		};
		this.input_state = input_state;
		level_image.on_ready = () => {
			level.build()
			startGame();
			console.log('mewmew');
		};
		level.add(player);

		document.addEventListener("keydown", event => this.on_key_down(event));
		document.addEventListener("keyup", event => this.on_key_up(event));
		document.addEventListener('mousedown', event => this.on_mouse_down(event));
		document.addEventListener('mouseup', event => this.on_mouse_up(event));
		document.addEventListener('mousemove', event => this.on_mouse_move(event));

		this.world_state = new World_State();
		//maybe leave line trace as a normal function, but parts of it can be reassign
		//would need to redesign the lookup to get an array of object
		this.world_state.line_trace = (from_position, to_position) => {
			//use the pass x,y,z if old point to desire new point
			//may need to rename it and have it return an object about the collsion
			const static_objects = [];
			const results = {
				collsion: false,
				intersection: to_position.clone(),
			}
			//should also get a collection of anything that intersects the from->to line
			
			if (input_state.debug) {
				return results;
			}

			let cells = Game_Utils.line_supercover(level.get_cell_position(from_position),this.level.get_cell_position(to_position));
			let last_pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(from_position.x, from_position.y));
			cells.forEach((cell_position) => {
				let pixel_info = level_image.get_pixel_info(level_image.convert_coord_to_index(cell_position.x, cell_position.z));
				if (level.is_wall(pixel_info)) {
					results.collsion = true;
					
					//this is used to handle rare cases where speed is too great and collsion will be missed
					//but it dose not provide a slide logic nor an impact point, but it povides the cell of collsion
					//storing the last one is a cheat to reuse the x and y cell check of the safe cell
					//currently can not go all the way into corners (just a little space) which not an issue except
					//it makes sliding feels odd. aabb collsion logic may or may not help. issue is negative cords. need a better
					//way of handling both cases (in theroy i could set the reset axis by rounding to 0 and then adding .9 or -.9) 
					//maybe rounding away from 0
					//also broke
					if (last_pixel_info == null){
						results.intersection.copy(from_position);
						return results
					}
					if (pixel_info == null){
						pixel_info = last_pixel_info;
					}
					let x = from_position.x > to_position.x ? last_pixel_info.x -1 : last_pixel_info.x +1;
					let y = from_position.z > to_position.z ? last_pixel_info.y -1 : last_pixel_info.y +1;
					//need aabb for accuract intersections even if it an object the level provides. 
					if (level.is_wall(level_image.get_pixel_info(level_image.convert_coord_to_index(x, last_pixel_info.y)))) {
						results.intersection.x = from_position.x
					}
					if (level.is_wall(level_image.get_pixel_info(level_image.convert_coord_to_index(last_pixel_info.x, y)))) {
						results.intersection.z = from_position.z
					}
					return results;
				}
				last_pixel_info = pixel_info;
			});

			return results;

		}
	}
}



//todo: move to maze game
function startGame() {
	const speed = 0.05;

	const keys = maze_game.input_state.keys;
	const level = maze_game.level;
	const level_image = level.level_image;
	const player = maze_game.player;
	const camera = maze_game.player.camera;
	const player_light = maze_game.player.light;
	//const debug = maze_game.input_state.debug;

	function loop() {
		requestAnimationFrame(loop);
		//let old_position = camera.position.clone();
		let new_position = camera.position.clone();
		let direction = new THREE.Vector3();
		camera.getWorldDirection(direction);

		if (keys["w"]) new_position.add(direction.multiplyScalar(speed));
		if (keys["s"]) new_position.add(direction.multiplyScalar(-speed));

		if (keys["a"]) camera.rotation.y += 0.05;
		if (keys["d"]) camera.rotation.y -= 0.05;

		let collsion_results = maze_game.world_state.line_trace(camera.position, new_position);
		camera.position.copy(collsion_results.intersection);
		player_light.position.copy(camera.position);
		renderer.render(level, camera);

	}

	loop();
}

maze_game = new Maze_Game();
