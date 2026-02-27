import { Vector3, PointLight } from 'three';
import { Cylinder, Body, Sphere, Vec3, Ray, RaycastResult } from "https://esm.sh/cannon-es";
import { Physics_Object } from './game_objects.js'

export class Player_Character extends Physics_Object {
    //TODO: Move all the player base logic here and maybe create a dedicated character object
    speed = 2.00;
    camera = null;

    _physics_update() {
        //console.log(this.on_ground)
        this.on_ground = false;
        this.position.copy(this.physics_body.position)
        //below is not needed to prevent messing with viewing
        //this.quaternion.copy(this.body.quaternion)
    }

    //ray = new CANNON.Ray();
    //checkGround() {
    //    this.ray.from.copy(playerBody.position);
    //    this.ray.to.set(playerBody.position.x, playerBody.position.y - 1.1, playerBody.position.z);

    //    const result = new CANNON.RaycastResult();
    //    this.ray.intersectWorld(world, { collisionFilterMask: -1 }, result);

    //    return result.hasHit;
   // }
    jump(){
        if (this.can_jump){
            this.physics_body.velocity.y = this.physics_body.velocity.y + 6.0;
            this.can_jump = false
        }
    }

    constructor(options = {
        'position': new Vector3(),
    }) {
        super();
        if (options['position']) { this.position.copy(options['position']) }
        let height = 1.0;
        let radius = 0.25;
        this.physics_body = new Body({
            mass: 60.0, // kg
            shape: new Cylinder(radius, radius, height, 8),
        })
        //top sphere
        this.physics_body.addShape(new Sphere(radius), new Vec3(0, height / 2.0, 0));
        //bottom sphere
        this.physics_body.addShape(new Sphere(radius), new Vec3(0, -height / 2.0, 0));
        this.physics_body.angularFactor.set(0, 0, 0)
        this.physics_body.position.copy(this.position) // m

        this.light = new PointLight(0x3a3a4f, 1.0, 128, 1.0);
        this.light.position.y = height / 2.0;
        this.add(this.light);

        //below do not work since it almost always calling false. by try tracing
        this.can_jump = false;
        //const on_ground = this.on_ground;
        //const physics_body = this.physics_body;

        this.physics_body.addEventListener("collide", (event, character = this) => {
            const contact = event.contact;

            // Normal is given relative to the body that receives the event
            const normal = contact.ni.clone();

            // If the normal points downward relative to the player, flip it
            if (contact.bi.id === character.physics_body.id) {
                normal.negate();
            }

            // Check if the normal is mostly pointing up
            if (normal.y < -0.5) {
                //Note: this only works when colliding. dose not work when falling
                character.can_jump = true;
            }
        });

    }
}