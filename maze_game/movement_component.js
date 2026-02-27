import { Vec3, Ray, RaycastResult } from "https://esm.sh/cannon-es";

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
    acceleration = 1.0;
    on_ground = false;
    get_speed() {
        return this.#max_speed; //may use a getter to overide what is the max speed so sprint can be inserted
    }
    get_direction() {
        //override function to get the movement directional vector
        //by default it will create a vector to use
        if (this.direction) { return this.direction }
        this.direction = new Vec3();
        return this.direction;
    }

    ray = new Ray();
    //not sure if this will be used. it is a bit unreliable
    check_ground() {
        if (this.world && this.body) {
            this.ray.from.set(this.body.position.x, this.body.aabb.lowerBound.y, this.body.position.z);
            this.ray.to.set(this.body.position.x, this.body.aabb.lowerBound.y - 0.1, this.body.position.z);
            this.ray.intersectWorld(this.world, { collisionFilterMask: -1, skipBackfaces: false });
            return this.ray.hasHit;
        }
        return null;
    }
    on_collide(event, component = this) {
        const normal = event.contact.ni.clone();

        if (event.contact.bi.id === component.body.id) {
            normal.negate();
        }

        if (normal.y < -0.5) {
            //Note: this only works when colliding. dose not work when falling
            component.on_ground = true;
        }
    }
    physics_update(delta = 1.0) {
        //this.on_ground = this.check_ground();
        if (this.body) {
            //maybe use this with the body colision event (to stop the bounce)
            //TODO: rename to reprsent fall and accending or make two bool or use a bitflag or neither and check as needed.
            //though falling may be good enough since if not falling but not on ground, then either stuck in a wall or miss a
            //ground landing
            //this.is_falling = this.body.velocity.y > -0.1 && this.body.velocity.y < 0.1;
        }
        else {
            return
        }
        //console.log(this.direction)
        if (this.get_direction().lengthSquared() === 0) {
            //should handle it diffrently when on ground and when not. for now reseting
            //x and z
            //this.body.velocity.x = 0.0;
            //this.body.velocity.z = 0.0;
            return
        };

        //todo: move the const to a last_update state so that the vectors are reused
        //and can be ref if needed.

        const velocity_change = this.get_direction().scale(this.acceleration)
        if (this.body.velocity.length() < this.get_speed()) {
            this.body.velocity.vadd(velocity_change, this.body.velocity)
        }

    }
}