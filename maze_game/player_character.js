import { Vector3, PointLight } from 'three';
import { Character } from './character.js'
import { Movement_Component } from './movement_component.js'
import { Controller } from './controller.js';

import { Audio_Manager } from './audio_manager.js'
import { Footsteps } from './sound_scripts/footsteps.js'

export class Player_Character extends Character {
    camera = null;//may need a camera component that hold the camera ref. that would allow controlling the camera position and rot without modifing the camera
    step_cooldown = 0;

    _physics_update(delta = 1.0) {
        super._physics_update(delta);
        if (this.movement_component.movement_state & Movement_Component.MOVEMENT_STATE.GROUNDED && this.movement_component.movement_state & Movement_Component.MOVEMENT_STATE.MOVING) {
            this.play_footsteps(this.movement_component.get_speed() > 5 ? 0.25 : 0.5); //checking max speed for now to reduce loop cost for now
        }
        if (this.step_cooldown > 0) { this.step_cooldown -= delta; }
    }

    jump() {
        //TODO: it seems rotation is a bit off. need to see how input rotates character to make sure the character is rotating at least when left/right is presses
        //mouse look dose not need to be that strict though
        this.play_footsteps();
    }
    //this is a test untill I work on handling the sound better (or modify the footsteps to be flag on and off and loop while on)
    play_footsteps(cooldown = 0.25) {
        if (this.step_cooldown <= 0) {
            Audio_Manager.get_sound('player_footsteps').play();
            this.step_cooldown = cooldown;
            return
        }
    }
    constructor(options = {
        'position': new Vector3(0.0, 0.0, 0.0),
        'controller': new Controller(),
        'Movement_Component': Movement_Component,
        'height': 1.0,
        'radius': 0.25,
        'mass': 60.0,
    }) {
        super(options);

        this.light = new PointLight(0x3a3a4f, 1.0, 128, 1.0);
        this.light.position.y = this.collsion_height / 2.0;
        this.add(this.light);

        Audio_Manager.add_sound('player_footsteps', Footsteps);
        this.movement_component.signal_jump.connect(() => this.jump());
    }
}