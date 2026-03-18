//canvas based image buffer to store and read image data
export class Canvas_Image_Buffer {
    #image; //Image

    data;	//ImageData
    canvas;
    context;
    is_ready = false; //backup incase it is ready after init


    //SIGNALS, EVENTS, AND CALLABLES
    //overriable function to be called when image is loaded and data is populated
    on_ready() {
        console.log('meow ready ', this.is_ready);
    }

    #on_load(event, source = this) {
        source.context.drawImage(source.#image, 0, 0);
        source.data = source.context.getImageData(0, 0, source.#image.width, source.#image.height).data;
        source.is_ready = true;
        console.log('image size : ', source.image.height, this)
        source.on_ready();
    }
    //GETTERS AND SETTERS
    //may not store the image or other varibles related to the dom
    set image(value) {
        const old_image = this.#image;
        if (this.#image === value) { return; }
        this.#image = value;
        if (value) {
            this.#image.onload = (event) => { this.#on_load(event, this); };
        }
        if (old_image) {
            this.#image.onload = null;
        }
    }
    get image() {
        return this.#image
    }
    //METHOODS
    convert_coord_to_index(x = 0, y = 0) {
        if (x >= this.image.width || y >= this.image.height || x < 0.0 || y < 0.0) {
            return -1
        }
        let id = y * this.image.width + x;
        return id * 4;
    }
    is_pixel_at_index(index) {
        return (index < 0 || index >= this.data.length)
    }
    get_pixel_id(index) {
        return Math.floor(index / 4)
    }
    get_pixel_x(id) {
        return id > 0 ? id % this.image.width : 0;
    }
    get_pixel_y(id) {
        return id > 0 ? Math.floor(id / this.image.width) : 0;
    }
    get_pixel_r(index) {
        return this.data[index];
    }
    get_pixel_g(index) {
        return this.data[index + 1];
    }
    get_pixel_b(index) {
        return this.data[index + 2];
    }
    get_pixel_a(index) {
        return this.data[index + 3];
    }
    get_pixel_info(index, pixel_data = {}) {
        if (this.is_pixel_at_index(index)) {
            pixel_data.id = -1;
            pixel_data.x = 0;
            pixel_data.y = 0;
            pixel_data.r = 0;
            pixel_data.g = 0;
            pixel_data.b = 0;
            pixel_data.a = 0;
        }
        //let pixel_data = { 'id': Math.floor(index / 4) };
        pixel_data.id = this.get_pixel_id(index);

        pixel_data.x = this.get_pixel_x(pixel_data.id);
        pixel_data.y = this.get_pixel_y(pixel_data.id);

        pixel_data.r = this.get_pixel_r(index);
        pixel_data.g = this.get_pixel_g(index);
        pixel_data.b = this.get_pixel_b(index);
        pixel_data.a = this.get_pixel_a(index);
        return pixel_data;
    }
    for_each_pixel(callable = (pixel_info) => { }, start = 0, end = this.data.length, pixel_info_ref = undefined) {
        start = Math.floor(start / 4) * 4;
        for (let i = start; i < end; i += 4) {
            callable(this.get_pixel_info(i, pixel_info_ref ? pixel_info_ref : {}));
        }
    }
    destroy() {
        if (this.image) {
            this.image.onload = null;
        }
    }

    constructor(source_image) {
        this.image = new Image();
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.image.src = source_image;
    }
}