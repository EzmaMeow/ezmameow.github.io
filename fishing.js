
export class World {
    #ppu = [1.0, 1.0] //screen/world size
    get ppu() { return this.#ppu; }
    world_scale = [1.0, 1.0]
    //should be a function. cheap way is divide y by height to get a value between 0-1
    //to scale the size. only issue is that a per render thing so there may be a better approch
    parallax_depth = 0.1; //need to remeber hoe to caculate this. may ned to be a function
    nav_area = [
        0.0,
        256.0,
        256.0 - 82.0,
        256.0,
    ]
    random_point_in_nav_area(agent_width = 16.0, agent_height = 16.0, results = [0.0, 0.0]) {
        const minX = this.nav_area[0] * this.ppu[0];
        const maxX = this.nav_area[1] * this.ppu[0] - agent_width;
        const minY = this.nav_area[2] * this.ppu[1];
        const maxY = this.nav_area[3] * this.ppu[1] - agent_height;
        results[0] = Math.random() * (maxX - minX) + minX;
        results[1] = Math.random() * (maxY - minY) + minY;
        return results
    }
    update_ppu(screen_width = 0.0, screen_height = 0.0, native_width = 0.0, native_height = 0.0) {
        this.#ppu[0] = screen_width / native_width;
        this.#ppu[1] = screen_width / native_width;
    }
}

export class Fish {
    image
    #position = [0.0, 0.0];
    #scale = [1.0, 1.0];
    get scale() { return this.#scale; }
    move_to = [0.0, 0.0];
    direction = [0.0, 0.0];
    velocity = [0.0, 0.0];
    base_speed = 8.0;
    //depth and opacity are related, but not the same
    //for example if fish base opacity is .8, then it should
    //be .8 at depth of 1
    #depth = 1.0;
    #opacity = 0.9;
    #width = 16.0;
    #height = 16.0;
    ai_state = 'idle';

    get position() {
        if (this.image) {
            this.#position[0] = parseFloat(this.image.style.left) || 0.0;
            this.#position[1] = parseFloat(this.image.style.top) || 0.0;
        }
        return this.#position;
    }
    set_position(x = 0.0, y = 0.0) {
        this.#position[0] = x;
        this.#position[1] = y;
        this.image.style.left = this.#position[0] + 'px'
        this.image.style.top = this.#position[1] + 'px'
    }
    get width() {
        return this.#width;
    }
    set width(value) {
        this.#width = value;
        this.update_size();
    }
    get height() {
        return this.#height;
    }
    set height(value) {
        this.#height = value;
        this.update_size();

    }
    get depth() {
        return this.#depth;
    }
    set depth(value = 1.0) {
        this.#depth = value;
        this.image.style.opacity = this.#depth * this.#opacity;
        this.image.style.zIndex = Math.floor(this.#depth * 10);
    }
    get opacity() {
        return parseFloat(this.image.style.opacity) || this.#opacity;
    }
    set opacity(value) {
        this.#opacity = value;
        this.image.style.opacity = this.#depth * this.#opacity;
    }
    update_size() {
        this.image.style.width = this.#width * this.scale[0] + 'px'
        this.image.style.height = this.#height * this.scale[1] + 'px'
    }
    set_scale(x = 1.0, y = 1.0) {
        this.scale[0] = x;
        this.scale[1] = y;
        this.update_size();
    }
    get_speed() {
        return this.base_speed;
    }
    on_ready() {

    }
    #ready() {
        this.on_ready();
    }
    #image_loaded() {
        this.#ready();
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
            if (Math.abs(this.move_to[0] - this.#position[0]) <= 1 && Math.abs(this.move_to[1] - this.#position[1])
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
            if (Math.abs(this.move_to[0] - this.#position[0]) <= 1 && Math.abs(this.move_to[1] - this.#position[1])
            ) {
                this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
            }

        }
        if (this.ai_state === 'swiming') {
            if (Math.abs(this.move_to[0] - this.#position[0]) <= 1 && Math.abs(this.move_to[1] - this.#position[1])
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
    setup(
        x = 0.0, y = 0.0, world = this.world
    ) {
        this.world = world

        this.set_position(x, y);
        if (this.image.complete) {
            this.#image_loaded();
        } else {
            this.image.addEventListener("load", () => this.#image_loaded());
        }
        if (world) {
            this.world.random_point_in_nav_area(this.width, this.height, this.move_to)
        }
    }
    //const build the nessary peices while setup assign world related data
    constructor(img_source, width = 16, height = 16, world = undefined) {
        this.world = world;
        this.image = document.createElement('img');
        this.image.style.position = 'absolute';
        this.image.src = img_source;
        this.image.style.zIndex = "2";
        this.image.setAttribute('draggable', 'false');
        this.width = width;
        this.height = height;
    }

}
export class Level {
    element
    background
    objects = [];
    world = new World();
    update(delta = 1.0) {
        for (const object of this.objects) {
            object.update(delta);
        }
    }
    //on_ are callbacks that can be assign
    //but only one can exist at a time(unless a signal or event is used)
    on_ready() {

    }
    //reserver for object ready logic
    #ready() {
        this.on_ready()
    }
    #background_loaded() {
        this.world.update_ppu(
            this.background.clientWidth,
            this.background.clientHeight,
            this.background.naturalWidth,
            this.background.naturalHeight
        )
        this.#ready()
    }
    setup(element, background, world = this.world) {
        this.element = element;
        this.background = background;
        this.world = world;

        if (this.background.complete) {
            this.#background_loaded();
        } else {
            this.background.addEventListener("load", () => this.#background_loaded());
        }
    }
    constructor(world = new World()) {
        this.world = world;
    }
}