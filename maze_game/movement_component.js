import { Vec3, Ray } from "https://esm.sh/cannon-es";
import { Controller } from './controller.js'
import { VEC3, get_forward_direction } from './game_utility.js'

export class Movement_Component {
    world = null; //This will interface with the world
    #body = null; get body() { return this.#body } //this should have at least a single body to focus on.
    set body(value) {
        const old_body = this.#body;
        this.#body = value;
        if (old_body) {
            old_body.removeEventListener("collide", (event, component = this) => this.on_collide(event, component))
        }
        if (this.#body) {
            this.#body.addEventListener("collide", (event, component = this) => this.on_collide(event, component))
        }
    }

    #max_speed = 5.0; //speed will be move here instead of player since it regulates the moving the body
    speed_mod = 1.0; 
    acceleration = 5.0;
    on_ground = false;
    last_collide = {
        normal: new Vec3(),
        body: null,
    }
    velocity_change = new Vec3();
    //NOTE: controller will have signals such as action(jump) that need to be manage. some actions the player or other systems will manage
    #controller; 
    get controller() {
        if (!this.#controller) {
            this.#controller = new Controller();
            this.controller.on_action.connect(()=>this.jump());
        }
        return this.#controller
    }
    set controller(new_controller) {
        const old_controller = this.#controller;
        this.#controller = new_controller;
        if (this.#controller){this.#controller.on_action.connect(()=>this.jump());}
        if (old_controller){old_controller.on_action.disconnect(()=>old_controller.jump());}
    }
    get_speed() {
        return this.#max_speed * this.controller.states.speed * this.speed_mod * (this.is_on_ground()? 1.0 : 0.25 );//too much speed in the air causes odd long grabbling hops. 
        // the hops work fine for the character idea, but the distance travel may be a pain to work with. 0.25 reduction seem to make it manageable
    }
    is_ascending() {
        return (this.body.velocity.y > 0.5)
    }
    is_descending() {
        return (this.body.velocity.y < -0.5)
    }
    is_on_ground() {
        //on_ground is set when there is a ground colsion, my be better to call it jumpped. the other 
        //checks will make sure it not falling or accending
        return this.on_ground && !this.is_ascending() && !this.is_descending();
    }
    ray = new Ray();
    //not sure if this will be used. it is a bit unreliable
    check_ground(distance = 0.1, x = this.body.aabb.lowerBound.x, z = this.body.aabb.lowerBound.z) {
        if (this.world && this.body) {
            this.ray.from.set(x, this.body.aabb.lowerBound.y, z);
            this.ray.to.set(x, this.body.aabb.lowerBound.y - distance, z);
            this.ray.intersectWorld(this.world, { collisionFilterMask: this.body.collisionFilterMask, skipBackfaces: false });
            return this.ray.hasHit;
        }
        return null;
    }
    on_collide(event, component = this) {
        //todo: convert these const to a last collide object to reuse vectors and ref the last collsion
        //data. also could store extra data like last floor body and the shape normal.
        //NOTE: this may run a few time a frame if same body but on the seam of shapes so when caching, need to
        //decide if how to handle it. floor would be the one with the ideal normal, but the last may be the last hanlde since array may be too much to handle.
        component.last_collide.normal.copy(event.contact.ni);
        component.last_collide.body = event.contact.bi === component.body ? event.contact.bj : event.contact.bi;

        if (event.contact.bi.id === component.body.id) {
            component.last_collide.normal.negate();
        }
        if (component.last_collide.normal.dot(VEC3.DOWN) > 0.5) {
            component.on_ground = true;
        }

    }
    jump() {
        if (this.is_on_ground()) {
            this.body.velocity.y = this.body.velocity.y + 6.0;
            this.on_ground = false;
        }
    }
    physics_update(delta = 1.0) {
        if (this.controller.direction.lengthSquared() === 0 || !this.body) {
            return;
        };
        this.controller.direction.scale(this.acceleration, this.velocity_change)
        //could ignore height, but since we are adding, all it would do is reduce directional speed when falling or accending too fast.
        //ignoring height will limit y velocity change from being limited, and so the full length is being checked.  
        //if (Math.sqrt(this.body.velocity.x * this.body.velocity.x + this.body.velocity.z * this.body.velocity.z) < this.get_speed()) {
        if (this.body.velocity.length() < this.get_speed()) {
            this.body.velocity.vadd(this.velocity_change, this.body.velocity)
        }
    }
    constructor(controller = new Controller()){
        this.controller = controller;
    }
}