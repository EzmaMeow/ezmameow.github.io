import { RenderObject } from "./render_object.js"

export class ImageRenderObject extends RenderObject {
    #image
    depth = 1;
    imageLoaded() {
        if (!this.baseWidth) {
            this.baseWidth = this.image.naturalWidth || this.image.videoWidth || this.image.width || 0
        }
        if (!this.baseHeight) {
            this.baseHeight = this.image.naturalHeight || this.image.videoHeight || this.image.height || 0;
        }
        this.updateSize()
        if (this.onImageLoaded) {
            this.onImageLoaded();
        }
        if (this.image.textureAtlas) {
            this.textureWidth = this.image.width / (this.image.textureAtlas.rows || 1);
            this.textureHeight = this.image.height / (this.image.textureAtlas.columns || 1);
        }
        this.renderChange()
    }
    get image() {
        return this.#image;
    }
    set image(value) {
        if (this.#image === value) { return }
        if (this.#image) {
            this.#image.removeEventListener('load', () => this.imageLoaded());
        }
        this.#image = value;
        if (this.#image.complete) {
            this.imageLoaded();
            return
        }
        this.#image.addEventListener('load', () => this.imageLoaded());
    }
    draw(canvasContext, renderState) {
        if (typeof this.opacity !== 'undefined' ){
            canvasContext.globalAlpha = this.opacity;
        }


        if (this.image.textureAtlas) {
            canvasContext.drawImage(
                this.image,
                (this.textureWidth) * (this.textureX || 0),
                (this.textureHeight) * (this.textureY || 0),
                this.textureWidth || this.image.width,
                this.textureHeight || this.image.height,
                0,
                0,
                this.baseWidth,
                this.baseHeight
            );
            return
        }
        //allowing texture width and height here so one can adjust the area to render
        //so texturex, y, width and height will act diffrent for normal vs atlas where atlas treat x and y as cell coords
        //and width and height as cell size.
        canvasContext.drawImage(
            this.image,
            this.textureX || 0,
            this.textureY || 0,
            this.textureWidth || this.image.width,
            this.textureHeight || this.image.height,
            0,
            0,
            this.baseWidth,
            this.baseHeight
        );



    }
    deconstructor() {
        super.deconstructor();
        if (this.#image) {
            this.#image.removeEventListener('load', () => this.imageLoaded());
        }
        this.#image = null;
    }
    //should allow more parameters or options, but the size seem to be the nessary defaults. the starting transformation could be set later
    constructor(image, options) {
        super(options);
        if (options) {
            if (options.textureX) {
                this.textureX = options.textureX;
            }
            if (options.textureY) {
                this.textureY = options.textureY;
            }
        }
        this.image = image;

    }
}