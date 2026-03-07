
import { Vector3, Mesh, WebGLRenderer, PerspectiveCamera, Color, Box3Helper, SphereGeometry, MeshNormalMaterial, PlaneGeometry } from 'three';
import * as Game_Utils from './game_utility.js'
import * as CANNON from "https://esm.sh/cannon-es";
import { Signal, State, Reactive_Object } from './game_core.js'
import { Physics_Object } from './game_objects.js'
import { Game } from './game.js'
import { Maze_Level } from './maze_level.js'
import { Resource_Manager } from './resource_manager.js'
import { Input_Manager } from './input_manager.js'
import { Player_Character } from './player_character.js'
import { Controller } from './controller.js'

const canvas = document.getElementById("game");
const canvas_body = document.getElementById("canvas_body");

//TODO: remove this and try to have the vectors self conatin in the object that handles it (aka player/character)
export class Collsion_Data {
	constructor() {
		this.collided = false;
		this.from = new Vector3();
		this.to = new Vector3(); //this is the fill length. could be used to project more.
		this.direction = new Vector3();
		this.intersection = new Vector3();
		this.collided_object = null;
		this.velocity = new Vector3();
	}
}



export class Maze_Game extends Game {
	static scene; //main scene for rendering reasons
	static world; //main world
	debug_mode = false;
	//NOTE: Key events are redirected to this, but some may need to be redirected to player
	//maybe have a return so the key call chain can stop for more complex cases
	on_key_down(event) {
		const key = Input_Manager.input_event(event, true);

		if (key === Input_Manager.KEYS.INPUT.LIGHT) {
			if (this.player.light.color.getHex() == 0xf8c377) {
				this.player.light.color.setHex(0x3a3a4f);
			}
			else {
				this.player.light.color.setHex(0xf8c377);
			}
		}
		if (key === Input_Manager.KEYS.INPUT.DEBUG) {
			if (this.debug_mode) {
				this.debug_mode = false;
				this.player.position.y = 0.0;

			}
			else {
				this.debug_mode = true;
			}
			//let test = this.player.camera.position.clone();
			//let direction = new THREE.Vector3();
			//this.player.camera.getWorldDirection(direction);
			//test.add(direction.multiplyScalar(3.0));
			//console.log(Vector_Lib.line_supercover_3d(this.level.get_cell_position(this.player.camera.position),this.level.get_cell_position(test)));
		}
	}
	on_key_up(event) {
		const key = Input_Manager.input_event(event, false);
		if (key === null) { return }
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
			const movement_x = event.movementX || event.mozMovementX || event.webkitMovementX || 0.0;
			const movement_y = event.movementY || event.mozMovementY || event.webkitMovementY || 0.0;
			//this.player.physics_body.angularVelocity.set(0, movement_x * this.input_state.touchSensitivity, 0);
			this.player.rotation.y -= movement_x * this.input_state.mouseSensitivity;
			if ((this.camera.rotation.x < 1.0 && movement_y < 0) || (this.camera.rotation.x > -1.0 && movement_y > 0)) {
				this.camera.rotation.x -= movement_y * this.input_state.mouseSensitivity;
			}
		}
	}
	//NOTE: this dose not work. look it up more and try to figure out the values or figure out how to open dev tools in mobile
	on_touch_move(event) {
		event.preventDefault()
		if (event.touches.length > 0) {
			let movement_x = Math.min(Math.max(event.touches[0].clientX - this.input_state.touch_start_x, -100.0), 100.0);
			let movement_y = Math.min(Math.max(event.touches[0].clientY - this.input_state.touch_start_y, -100.0), 100.0);
			this.input_state.touch_start_x = event.touches[0].clientX;
			this.input_state.touch_start_y = event.touches[0].clientY;
			//this.player.physics_body.angularVelocity.set(0, movement_x * this.input_state.touchSensitivity, 0);
			this.player.rotation.y -= movement_x * this.input_state.touchSensitivity;
			if ((this.camera.rotation.x < 1.0 && movement_y < 0) || (this.camera.rotation.x > -1.0 && movement_y > 0)) {
				this.camera.rotation.x -= movement_y * this.input_state.touchSensitivity;
			}
		}
	}
	on_window_resize() {
		if (!this.resize) {
			this.resize = true;
		}
	}

	constructor(
		renderer = new WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true }),
		camera = new PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32)
	) {
		super(renderer, camera);
		this.level = new Maze_Level(canvas, this.world, "assets/maze.png");
		const level = this.level;
		this.scene.add(this.level);
		this.scene.background = new Color(0x444444);
		Maze_Game.scene = this.scene; //TODO: add cleanup for static scene and world incase abuses
		Maze_Game.world = this.world;
		Maze_Game.level = this.level;
		this.renderer = renderer//level.renderer;
		//todo: remove all this.level and maze_game.level for Maze_Game.scene
		this.renderer.setSize(canvas_body.clientWidth, canvas_body.clientHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
		const level_image = this.level.level_image;
		this.player_controller = new Controller(); //NOTE: setting it to the maze game and have a const may be overkill, but it is here for now untill i decide on which approch is better
		this.player = new Player_Character({ 'controller': this.player_controller });
		const player = this.player;
		//const camera = camera //new THREE.PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32);
		//this.camera = camera;
		camera.position.y = 0.5
		this.player.add(camera);
		this.settings = new State();
		//may want to rename it to config or something since input manager handling the bulk of input. this will just handle settings
		this.input_state = {
			mouseSensitivity: 0.01,
			touchSensitivity: 0.01,
			enable_mouse: false,
			touch_start_x: 0.0,
			touch_start_y: 0.0
		};
		this.level.level_image.on_ready = () => {
			this.level.build()
			startGame(this);
			console.log('mew game loaded', this.player.position, this.player.physics_body.position);
		};
		this.level.add(player);
		console.log('meow adding events')
		document.addEventListener("keydown", event => this.on_key_down(event));
		document.addEventListener("keyup", event => this.on_key_up(event));
		document.addEventListener('mousedown', event => this.on_mouse_down(event));
		document.addEventListener('mouseup', event => this.on_mouse_up(event));
		document.addEventListener('mousemove', event => this.on_mouse_move(event));
		canvas.addEventListener('touchmove', event => this.on_touch_move(event));

		window.addEventListener('resize', () => this.on_window_resize());
	}
}


//TODO: try to use a physics library, custom collsion seem to broke. walls will be cubes that hopefully wont cost much. not sure what broke in the old collsion system


function startGame(maze_game) {
	//main ref
	const level = maze_game.level;
	const player = maze_game.player;
	const camera = maze_game.camera;
	const player_controller = maze_game.player_controller;

	//box test
	//const box = level.get_cell_bounds();
	//level.add(new Box3Helper(box, 0x008000)); // green color

	//reuable ref base object
	const collsion_data = new Collsion_Data();

	let moving = false;

	//tests
	const radius = 0.5 // m
	const sphereBody = new CANNON.Body({
		mass: 50, // kg
		shape: new CANNON.Sphere(radius),
	})
	sphereBody.position.set(10, 0.0, 10) // m
	Maze_Game.world.addBody(sphereBody)
	const geometry = new SphereGeometry(radius)
	const material = new MeshNormalMaterial()
	const sphereMesh = new Mesh(geometry, material)
	level.add(sphereMesh)

	function loop() {
		requestAnimationFrame(loop);

		if (maze_game.debug_mode) {
			camera.getWorldDirection(collsion_data.direction);
		}
		else {
			player.getWorldDirection(collsion_data.direction);
			collsion_data.direction.negate() //camera seem to be incorrectly possition by 180 deg (y?)
		}
		collsion_data.from.copy(player.position)
		collsion_data.to.copy(player.position)
		collsion_data.velocity.set(0, 0, 0);
		moving = false;
		player_controller.states.speed = 0;
		//NOTE: the speed mod is really the controller.states.speed if moving.
		let speed_mod = Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.SHIFT) ? 2 : 1
		if (maze_game.debug_mode) { speed_mod *= 2.0 }
		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.FORWARD)) {

			Game_Utils.get_forward_direction(player.physics_body, player_controller.direction);
			player_controller.states.speed = speed_mod;
		}//need to redesign it. else if because it acts really odd when both are if. probably because of how direction is handled
		else if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.BACK)) {
			Game_Utils.get_forward_direction(player.physics_body, player_controller.direction);
			player_controller.direction.scale(-1, player_controller.direction);
			player_controller.states.speed = speed_mod;
		}

		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.LEFT)) { player.rotation.y += 0.05; }
		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.RIGHT)) { player.rotation.y -= 0.05; }

		if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.UP)) {
			if (maze_game.debug_mode) {
				player_controller.direction.y += 1.0;
				player_controller.states.speed = speed_mod;
			}
			player_controller.trigger_action(player_controller.ACTIONS.JUMP)
			//player.jump();
		}
		else if (Input_Manager.is_key_down(Input_Manager.KEYS.INPUT.DOWN) && maze_game.debug_mode) {
			player_controller.direction.y -= 1.0;
			player_controller.states.speed = speed_mod;
		}

		maze_game.update(performance.now());
		//Maze_Game.world.fixedStep();
		//test (note: physics then rendering. test is syncing the positions)
		sphereMesh.position.copy(sphereBody.position)
		sphereMesh.quaternion.copy(sphereBody.quaternion)
		//player.physics_update()
		//test end

		if (maze_game.resize) {
			const width = canvas_body.clientWidth;
			const height = canvas_body.clientHeight;
			console.log('resizing', width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix()
			maze_game.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
			maze_game.renderer.setSize(width, height);
			maze_game.resize = false;
		}


		//level.get_cell_bounds(level.get_cell_position(player.position), box);
		//TODO: try to move this to the update
		//level.renderer.render(level, camera);

	}

	loop();
}
