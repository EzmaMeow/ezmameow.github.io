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