//something that exists. dose not need movement logic and properties
export class Entity {
    static default_properties = {
        x:0.0,
        y:0.0
    }
    image
    #position = [0.0, 0.0];
    #scale = [1.0, 1.0];
    #opacity = 1.0;
    #width = 16.0;
    #height = 16.0;

    //NOTE: may be better to use the position stored here instead of
    //the image position. the only issue is that this position can not be modified
    //or modifcation only will cause bugs (desync with the doc)
    //cant really protect it without turning it into an object
    get position() {
        return this.#position;
    }
    set_position(x = 0.0, y = 0.0) {
        this.#position[0] = x;
        this.#position[1] = y;
        this.image.style.left = this.#position[0] + 'px'
        this.image.style.top = this.#position[1] + 'px'
    }
    get scale() {
         return this.#scale; 
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

    get opacity() {
        return this.#opacity;
    }
    set opacity(value) {
        this.#opacity = value;
        this.update_opacity();
    }
    update_opacity(){
        this.image.style.opacity = this.opacity;
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
    update(delta = 1.0) {
    }
    save(){
        return {
            x:this.position[0],
            y:this.position[1],
            width:this.width,
            height:this.height,
            img_src:this.image.src,
            scale_x:this.scale[0],
            scale_y:this.scale[1],
            opacity:this.opacity,
        }
    }
    load(data = Entity.default_properties) {
        //could also have arrays or object rep random math unless there is a sting eva for that already 
        //(look like evaluateExpression can handle math, but the random numbers would have to added via code)
        if (data.width !== undefined) {
            this.width = parseInt(data.width) || 0;
        }
        if (data.height !== undefined) {
            this.height = parseInt(data.height) || 0;
        }
        if (data.img_src !== undefined) {
            this.image.src = data.img_src
        }
        if (data.x !== undefined || data.y !== undefined) {
            this.set_position(parseFloat(data.x) || 0.0, parseFloat(data.y) || 0.0);
        }
        if (data.scale_x !== undefined || data.scale_y !== undefined) {
            this.set_scale(parseFloat(data.scale_x) || 1.0, parseFloat(data.scale_y) || 1.0)
        }
        if (data.opacity !== undefined) {
            this.opacity = parseFloat(data.opacity) || 1.0;
        }

    }
    //const build the nessary peices while setup assign world related data
    constructor(data = Entity.default_properties, world = undefined) {
        this.world = world;
        this.image = document.createElement('img');
        this.image.style.position = 'absolute';
        //this.image.src = img_src;
        this.image.style.zIndex = "2";
        this.image.setAttribute('draggable', 'false');
        //this.width = width;
        //this.height = height;
        this.load(data)
    }
}