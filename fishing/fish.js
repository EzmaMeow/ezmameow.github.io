import { Entity } from './entity.js'

export class Fish extends Entity {
    move_to = [0.0, 0.0];
    direction = [0.0, 0.0];
    velocity = [0.0, 0.0];
    base_speed = 8.0;
    //depth and opacity are related, but not the same
    //for example if fish base opacity is .8, then it should
    //be .8 at depth of 1
    _depth = 1.0;
    ai_state = 'idle';
    get depth() {
        return this._depth;
    }
    set depth(value = 1.0) {
        this._depth = value;
        this.image.style.zIndex = Math.floor(this._depth * 10);
        this.update_opacity();
    }
    update_opacity() {
        //can not use private depth here due to call order
        //would need to rebuild  how things are updated so the first sync dose not happen in const if want to use private depth
        this.image.style.opacity = this.depth * this.opacity;
    }
    get_speed() {
        return this.base_speed;
    }
    update_animation(delta = 1.0) {

        if (this.velocity[0] < 0) {
            this.image.style.transform = 'scaleX(-1)';
        }
        else {
            this.image.style.transform = 'scaleX(1)';
        }

    }
    ai(delta = 1.0) {
        if (this.ai_state === 'idle') {
            const roll = Math.random() * 20;
            //console.log(roll)
            if (roll >= 17) {
                this.wait = Math.random() * 25 + 5;
                this.ai_state = 'wait'
                return

            }
            else if (roll < 5) {
                if (this.depth <= 0.5) {
                    this.dive = Math.random() * 0.5 + 0.5;
                    this.ai_state = 'surface'
                    this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
                    return

                }
                else {
                    this.dive = Math.random() * 0.5
                    this.ai_state = 'dive'
                    this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
                    return

                }
            }
            else {
                this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
                this.ai_state = 'swiming';
                return
                //console.log('set to swim ', this.move_to);

            }
        }
        else if (this.ai_state === 'wait') {
            this.wait -= delta;
            if (this.wait <= 0.0) {
                this.ai_state = 'idle';
                return
            }

        }
        else if (this.ai_state === 'surface') {
            if (this.depth >= this.dive || this.depth >= 1.0) {
                this.ai_state = 'swiming';
                return
            }
            else {
                this.depth += delta * 0.1;
            }
            if (Math.abs(this.move_to[0] - this.position[0]) <= 1 && Math.abs(this.move_to[1] - this.position[1])
            ) {
                this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
            }

        }
        else if (this.ai_state === 'dive') {
            if (this.depth <= this.dive || this.depth <= 0.0) {
                this.ai_state = 'swiming';
                return
            }
            else {
                this.depth -= delta * 0.1;
            }
            if (Math.abs(this.move_to[0] - this.position[0]) <= 1 && Math.abs(this.move_to[1] - this.position[1])
            ) {
                this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
            }

        }
        if (this.ai_state === 'swiming') {
            if (Math.abs(this.move_to[0] - this.position[0]) <= 1 && Math.abs(this.move_to[1] - this.position[1])
            ) {
                this.ai_state = 'idle';
                return
            }
        }

    }
    update(delta = 1.0) {
        if (!world) { return }
        const position = this.position;
        const speed = this.get_speed()
        this.ai(delta);

        if (this.ai_state === 'idle' || this.ai_state === 'wait') {
            return
        }

        this.direction[0] = this.move_to[0] - position[0];
        this.direction[1] = this.move_to[1] - position[1];

        const length = Math.sqrt(this.direction[0] * this.direction[0] + this.direction[1] * this.direction[1]);

        this.direction[0] /= length;
        this.direction[1] /= length;
        this.velocity[0] = this.direction[0] * speed * this.world.ppu[0] * this.world.world_scale[0] * delta;
        this.velocity[1] = this.direction[1] * speed * this.world.ppu[1] * this.world.world_scale[1] * delta;
        this.set_position(position[0] + this.velocity[0], position[1] + this.velocity[1]);
        if (length > 0.2) {
            this.update_animation(delta);
        }


    }
    load(data) {
        //could also have arrays or object rep random math unless there is a sting eva for that already 
        //(look like evaluateExpression can handle math, but the random numbers would have to added via code)
        super.load(data)
        if (data.depth !== undefined) {
            //will call the update after load
            this.depth = parseFloat(data.depth) || 0.0;
        }
        if (data.base_speed !== undefined) {
            this.base_speed = parseFloat(data.base_speed) || 0.0;
        }
    }
    //const build the nessary peices while setup assign world related data
    constructor(data = {}, world = undefined) {
        super(data, world);
    }
}