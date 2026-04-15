
import { Vector3, Mesh, WebGLRenderer, PerspectiveCamera, Color, Box3Helper, SphereGeometry, MeshNormalMaterial, PlaneGeometry } from 'three';
import * as Game_Utils from './game_utility.js'
import * as CANNON from "https://esm.sh/cannon-es";
import { Signal, State, Reactive_Object } from '/lib/reactive_classes.js'
import { Physics_Object } from './physics_object.js'
import { Game } from './game.js'
import { Maze_Level } from './maze_level.js'
import { Resource_Manager } from './resource_manager.js'
import { Input_Manager } from './input_manager.js'
import { Player_Character } from './player_character.js'
import { Controller } from './controller.js'
import { getDirectionFromQuaternion } from '/lib/vector_math.js'
import { Mouse } from './characters/mouse.js'

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
	//called when there is a change that may affect a major state such as pausing, starting, loading. used for html elements to update themselves (or untill dedicated signals are added)
	#signal_state_changed = new Signal(); get signal_state_changed() { return this.#signal_state_changed; }
	//NOTE: Key events are redirected to this, but some may need to be redirected to player
	//maybe have a return so the key call chain can stop for more complex cases
	on_key_down(event) {
		const key = Input_Manager.input_event(event, true);

		if (key === Input_Manager.INPUT.LIGHT) {
			if (this.player.light.color.getHex() == 0xf8c377) {
				this.player.light.color.setHex(0x3a3a4f);
			}
			else {
				this.player.light.color.setHex(0xf8c377);
			}
		}
		if (key === Input_Manager.INPUT.DEBUG) {
			if (this.debug_mode) {
				this.debug_mode = false;
				this.player.position.y = 0.0;

			}
			else {
				this.debug_mode = true;
				//need to design a better game state for loading and ready. I would like to use bitflags so values greater than 0 means something going on.
				if (this.game_started && !this.is_loading) {
					this.is_loading = true
					this.signal_state_changed.emit();
					this.level.load('./data/test_level.json'); //okay seem there may be a data.length limit or need to handle it in parts
					//also need to make sure the physics bodys are removed
				}
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
		//using request pointer lock now so enable mouse wont be nessary
		if (event.target === canvas) {
			document.body.requestPointerLock();
		}
		if (event.button === 1) {
			this.input_state.enable_mouse = true;
		}
	}
	on_mouse_move(event) {

		if (document.pointerLockElement === document.body) {
			const movement_x = event.movementX || event.mozMovementX || event.webkitMovementX || 0.0;
			const movement_y = event.movementY || event.mozMovementY || event.webkitMovementY || 0.0;
			//note: need to rotate the body or make this update the body
			this.player.movement_component.rotate(-movement_x * this.input_state.mouseSensitivity)
			//this.player.rotation.y -= movement_x * this.input_state.mouseSensitivity;
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
			this.player.movement_component.rotate(-movement_x * this.input_state.touchSensitivity)
			//this.player.rotation.y -= movement_x * this.input_state.touchSensitivity;
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
	on_ready() {
		let player_x = 0.0; let player_y = 0.0; let player_z = 0.0;
		console.log(this.level.config)
		if (this.level.config) {
			if (this.level.config.objects) {
				if (this.level.config.objects.player_start) {
					const spawn = this.level.config.objects.player_start
					if (spawn.cell_position) {
						player_x = Number(spawn.cell_position.x) * this.level.cell_size.x;
						player_y = Number(spawn.cell_position.y) * this.level.cell_size.y;
						player_z = Number(spawn.cell_position.z) * this.level.cell_size.z;
					}
					if (spawn.offset_position) {
						player_x += Number(spawn.offset_position.x);
						player_y += Number(spawn.offset_position.y);
						player_z += Number(spawn.offset_position.z);
					}
				}
			}
		}
		this.player.set_position(player_x, player_y, player_z);
		console.log(this.player.position)
		console.log(this.player.physics_body.position)
		if (!this.game_started) {
			//not when traveling between level, may need to store exit data. this data is info attach to the exit as well as player state when interacted
			//which will be used to figure the next level spawn else it will use the default spawn point
			this.start_game();
			//startGame(this);
			this.game_started = 1; //using int so that the started state can change (for testing. -1 is reloading atm)
			console.log('mew game loaded', this.player.position, this.player.physics_body.position);
		}
		this.is_loading = false;
		this.signal_state_changed.emit();
	}
	start_game() {
		this.signal_state_changed.emit();
		const game = this;
		function loop() {
			game.main_loop();
			requestAnimationFrame(loop);
		}
		loop()
	}
	main_loop() {
		this.player_controller.direction.set(0, 0, 0);
		this.player_controller.states.speed = 0;
		//NOTE: the speed mod is really the controller.states.speed if moving.
		let speed_mod = Input_Manager.is_key_down(Input_Manager.INPUT.SHIFT) ? 2 : 1
		if (this.debug_mode) { 
			speed_mod *= 2.0 
		}
		this.player_controller.states.speed = speed_mod;
		if (Input_Manager.is_key_down(Input_Manager.INPUT.FORWARD)) {
			getDirectionFromQuaternion(this.player.physics_body.quaternion, this.player_controller.direction)
			//Game_Utils.get_forward_direction(this.player.physics_body, this.player_controller.direction);
			//this.player_controller.states.speed = speed_mod;
		}//need to redesign it. else if because it acts really odd when both are if. probably because of how direction is handled
		else if (Input_Manager.is_key_down(Input_Manager.INPUT.BACK)) {
			getDirectionFromQuaternion(this.player.physics_body.quaternion, this.player_controller.direction)
			//Game_Utils.get_forward_direction(this.player.physics_body, this.player_controller.direction);
			this.player_controller.direction.scale(-1, this.player_controller.direction);
			//this.player_controller.states.speed = speed_mod;
		}

		if (Input_Manager.is_key_down(Input_Manager.INPUT.LEFT)) { this.player.movement_component.rotate(0.05) }
		if (Input_Manager.is_key_down(Input_Manager.INPUT.RIGHT)) { this.player.movement_component.rotate(-0.05); }

		if (Input_Manager.is_key_down(Input_Manager.INPUT.UP)) {
			if (this.debug_mode) {
				//	this.player_controller.direction.y += 1.0;
				//this.player_controller.states.speed = speed_mod;
				this.player_controller.direction.y = 1.0;
			}
			else {
				this.player_controller.trigger_action(this.player_controller.ACTIONS.JUMP)
			}
			//player.jump();
		}
		else if (Input_Manager.is_key_down(Input_Manager.INPUT.DOWN) && this.debug_mode) {
			//this.player_controller.direction.y -= 1.0;
			//this.player_controller.states.speed = speed_mod;
			this.player_controller.direction.y = -1.0;
		}

		this.update(performance.now());

		if (this.resize) {
			const width = canvas_body.clientWidth;
			const height = canvas_body.clientHeight;
			console.log('resizing', width, height);
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix()
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
			this.renderer.setSize(width, height);
			this.resize = false;
		}

	}


	constructor(
		renderer = new WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true }),
		camera = new PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32)
	) {
		super(renderer, camera);
		this.level = new Maze_Level(this.world, 'data/default_level.json');
		const level = this.level;
		this.scene.add(this.level);
		this.scene.background = new Color(0x444444);
		Maze_Game.scene = this.scene; //TODO: add cleanup for static scene and world incase abuses
		Maze_Game.world = this.world;
		Maze_Game.level = this.level;
		const navigation = this.level.navigation
		this.world.navigation = navigation
		this.renderer = renderer//level.renderer;
		//todo: remove all this.level and maze_game.level for Maze_Game.scene
		this.renderer.setSize(canvas_body.clientWidth, canvas_body.clientHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
		//const level_image = this.level.level_image;
		this.player_controller = new Controller(); //NOTE: setting it to the maze game and have a const may be overkill, but it is here for now untill i decide on which approch is better
		this.player = new Player_Character({ 'controller': this.player_controller });
		const player = this.player;
		//const camera = camera //new THREE.PerspectiveCamera(50, canvas_body.clientWidth / canvas_body.clientHeight, 0.001, 32);
		//this.camera = camera;
		camera.position.copy(this.player.center_position);
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
		this.level.readySignal.connect(() => this.on_ready())
		//this.level.level_image.on_ready = () => {
		//	this.level.build()
		//	startGame(this);
		//	console.log('mew game loaded', this.player.position, this.player.physics_body.position);
		//};
		this.level.add(player);

		this.level.add(new Mouse({navigation:navigation}))

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

