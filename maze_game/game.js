import { Scene } from 'three';
import { World, Vec3 } from "https://esm.sh/cannon-es";

export class Game {
    #world = new World({ gravity: new Vec3(0.0, -9.82, 0.0) });
    get world() { return this.#world; }

    //the base scene
    #scene = new Scene();
    get scene() { return this.#scene; }

    #renderer = null; get renderer(){return this.#renderer} 
    set renderer(value){
        const old_renderer = this.#renderer;
        this.#renderer=value;
        this.renderer_changed(this.#renderer,old_renderer);
    }
    renderer_changed(new_renderer, old_renderer){} 
    
    #camera = null; get camera(){return this.#camera}
    set camera(value){
        const old_camera = this.#camera;
        this.#camera=value;
        this.camera_changed(this.#camera,old_camera);
    } 
    camera_changed(new_camera, old_camera){}

    #level = null; get level(){return this.#level}
    set level(value){
        const old_level = this.#level;
        this.#level=value;
        this.level_changed(this.#level,old_level);
    } 
    level_changed(new_level, old_level){}

    #physic_objects = new Set();
    #update_objects = new Set();
    #last_time = performance.now();
    add_to_physics(object) {
        if (this.#physic_objects.has(object)) { return }
        if (typeof object._physics_update === 'function') {
            this.#physic_objects.add(object);
        }

    }
    remove_from_physics(object) {
        this.#physic_objects.remove(object)
    }
    add_to_updates(object) {
        if (this.#update_objects.has(object)) { return }
        if (typeof object._update === 'function') {
            this.#update_objects.add(object);
        }
    }
    remove_from_updates(object) {
        this.#update_objects.remove(object)
    }

    // performance.now()
    update(current_time) {
        const delta = (current_time - this.#last_time) / 1000.0;
        this.#last_time = current_time;

        for (const object of this.#update_objects) {
            object._update(delta);
        }
        this.world.fixedStep();
        for (const object of this.#physic_objects) {
            object._physics_update(delta);
        }
        if (this.renderer && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    connect_object(event) {
        if (event.child) {
            if (typeof event.child.addEventListener === 'function') {
                event.child.addEventListener('childadded', (e) => this.connect_object(e));
                event.child.addEventListener('childremoved', (e) => this.disconnect_object(e));
            }
            this.add_to_physics(event.child);
            this.add_to_updates(event.child);
            if (typeof event.child._add_physics === 'function') {
                event.child._add_physics(this.world);
            }
        }
    }
    disconnect_object(event) {
        if (event.child) {
            if (typeof event.child.removeEventListener === 'function') {
                event.child.removeEventListener('childadded', (e) => this.connect_object(e))
                event.child.removeEventListener('childremoved', (e) => this.disconnect_object(e))
            }
            this.remove_from_physics(event.child);
            this.remove_from_updates(event.child);

            if (typeof event.child._remove_physics === 'function') {
                event.child._remove_physics(this.world)
            }
        }
    }
    constructor(renderer,camera) {
        this.renderer = renderer;
        this.camera = camera
        this.scene.addEventListener('childadded', (e) => this.connect_object(e));
        this.scene.addEventListener('childremoved', (e) => this.disconnect_object(e))
    }


}

