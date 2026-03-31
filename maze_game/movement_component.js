import { Vec3, Ray, Quaternion, AABB } from "https://esm.sh/cannon-es";
import { Controller } from './controller.js'
import { VEC3, get_forward_direction } from './game_utility.js'
import { Signal } from './lib/reactive_classes.js'
import { rotateQuaternion } from './lib/vector_math.js'

export class Movement_Component {
    //movement state is for additional state that can not be infered by velocity
    static #MOVEMENT_STATE = {
        IDLE: 0, //no state applies 
        MOVING: 1 << 0, //the component is applying or maintaing velocity
        FORCED: 1 << 1, //Something else is applying force
        GROUNDED: 1 << 2, //states that it is on ground (gravity blocking surface) 
    }
    static get MOVEMENT_STATE() { return this.#MOVEMENT_STATE; }
    movement_state = Movement_Component.MOVEMENT_STATE.IDLE;
    #signal_jump = new Signal(); get signal_jump() { return this.#signal_jump }

    #world = null; get world() { return this.#world; }//This will interface with the world
    set world(value) {
        const old_world = this.#world
        this.#world = value;
        if (this.#world) {
            value.addEventListener('postStep', () => this.post_step());
        }
        if (old_world) {
            value.removeEventListener('postStep', () => this.post_step());
        }
    }
    #body = null; get body() { return this.#body } //this should have at least a single body to focus on.
    set body(value) {
        this.#body = value;
    }

    #max_speed = 5.0; //speed will be move here instead of player since it regulates the moving the body
    speed_mod = 1.0;
    jump_strength = 3.0;
    acceleration = 5.0;
    contacts = new Set();
    #contact_normal = new Vec3();
    #velocity_change = new Vec3();
    //NOTE: controller will have signals such as action(jump) that need to be manage. some actions the player or other systems will manage
    //TODO: decide on allowing a null controller. an default is safer than none though
    //NOTE TODO: The signal_action should not directly be bind to jump
    #controller;
    get controller() {
        if (!this.#controller) {
            this.#controller = new Controller();
            this.controller.signal_action.connect((action, data) => this.on_action(action, data));
        }
        return this.#controller
    }
    set controller(new_controller) {
        const old_controller = this.#controller;
        this.#controller = new_controller;
        if (this.#controller) { this.#controller.signal_action.connect((action, data) => this.on_action(action, data)); }
        if (old_controller) { old_controller.signal_action.disconnect((action, data) => old_controller.on_action(action, data)); }
    }
    get_speed() {
        return this.#max_speed * this.controller.states.speed * this.speed_mod * (this.is_on_ground() ? 1.0 : 0.25);//too much speed in the air causes odd long grabbling hops. 
        // the hops work fine for the character idea, but the distance travel may be a pain to work with. 0.25 reduction seem to make it manageable
    }
    //rotate on the y axis by default, but can override if nessary
    rotate(angle = -0.01, x = 0, y = 1, z = 0) {
        rotateQuaternion(this.body.quaternion, x, y, z, angle)
    }
    is_on_ground() {
        //on_ground is set when there is a ground colsion, my be better to call it jumpped. the other 
        //checks will make sure it not falling or accending
        return this.movement_state & Movement_Component.MOVEMENT_STATE.GROUNDED;
    }
    on_action(action, data){
        if (action === this.controller.ACTIONS.JUMP){
            this.jump();
        }
    }
    jump() {
        if (this.is_on_ground()) {
            this.body.velocity.y = this.jump_strength; //setting it is risky, but works for now. adding causes it to stack up which would require more control to fix
            this.movement_state &= ~Movement_Component.MOVEMENT_STATE.GROUNDED; //setting to not grounded to reduce chances of it being called a few times before update
            //may be better to add a flag and add during update
            this.signal_jump.emit()
        }
    }
    physics_update(delta = 1.0) {
        this.movement_state &= ~Movement_Component.MOVEMENT_STATE.MOVING;
        if (this.controller.direction.lengthSquared() === 0 || !this.body) {
            //TODO: should add a flag or state for moving. this would state it is not moving (by player input) while a vector zero velocity means there is no movement
            return;
        };
        this.controller.direction.scale(this.acceleration, this.#velocity_change)
        //could ignore height, but since we are adding, all it would do is reduce directional speed when falling or accending too fast.
        //ignoring height will limit y velocity change from being limited, and so the full length is being checked.  
        //if (Math.sqrt(this.body.velocity.x * this.body.velocity.x + this.body.velocity.z * this.body.velocity.z) < this.get_speed()) {
        if (this.body.velocity.length() < this.get_speed()) {
            //Note: the velocity length could be greater than speed for an instance, but slow down as long as something causing friction or drag
            //meaning this may be fine, but may cause some odd stuff if the changes is too great and there no way to slow down
            this.body.velocity.vadd(this.#velocity_change, this.body.velocity)
        }
        if (this.body.velocity.length() > 0.1) {
            this.movement_state |= Movement_Component.MOVEMENT_STATE.MOVING;
        }
    }
    post_step() {
        //NOTE: currently the contact list is slim but more character would mean more loops
        //so it may be better to expand on the world to loop it once and make maps for the collsiders base on their types
        //though only if there is a lot of characters
        this.contacts.clear();
        this.movement_state &= ~Movement_Component.MOVEMENT_STATE.GROUNDED;
        for (let i = 0; i < this.world.contacts.length; i++) {
            const contact = this.world.contacts[i];
            if (contact.bi === this.body || contact.bj === this.body) {
                this.#contact_normal.copy(contact.ni);
                this.contacts.add(contact)
                if (this.#contact_normal.dot(VEC3.DOWN) > 0.5) {
                    this.movement_state |= Movement_Component.MOVEMENT_STATE.GROUNDED;
                    contact.is_floor = true; //tagging it as a floor collsion for future filtering
                }
            }
        }
        //note: keeping track of what is colliding and what is not may be costly so should be limited to collsion types that are importaint for functions (aka surfaces)
        //and only for objects that need to check for it (characters)
    }
    constructor(controller = new Controller()) {
        this.controller = controller;
    }
}