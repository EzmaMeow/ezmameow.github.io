export class Level {
    element
    background
    objects = [];
    world;
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
    constructor(world = {}) {
        this.world = world;
    }
}