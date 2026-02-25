import { Object3D } from 'three';

export class Physics_Object extends Object3D{
    physics_body = null;
    _add_physics(world) {
        if (this.physics_body) {
            world.addBody(this.physics_body);
        }
    }
    _remove_physics(world) {
        if (this.physics_body) {
            world.removeBody(this.physics_body);
        }
    }
    //_physics_update(){}
    //_update() {}
    constructor(){
        super()
    }
}