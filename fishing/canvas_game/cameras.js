import { Mat4 } from "/lib/square_matrix_math.js"

//TODO: need to figure out scaling in the sence if the window size changes, then the camera will change with it
//

export class Camera {
    transformation = Mat4.identity();
    projection = Mat4.identity();
    viewportMatrix = Mat4.identity();
    #viewport
    set viewport(value) {
        this.#viewport = value;
        this.updateViewport();
    }
    get viewport() {
        return this.#viewport
    }
    updateViewport() {
        const width = this.viewport ? this.viewport.width || 1 : 1;
        const height = this.viewport ? this.viewport.width || 1 : 1;
        Mat4.setScale(this.viewportMatrix, width * 0.5, height * 0.5, 1)
        Mat4.setPosition(this.viewportMatrix, width * 0.5, height * 0.5, 0)
    }
    //NOTE: zoom happens in the transformation (its scale)
    getPosition(targetVector = new Float32Array(3)) {
        return Mat4.getPosition(this.transformation, targetVector)
    }
    setPosition(x = 0.0, y = 0.0, z = 0.0) {
        Mat4.setPosition(this.transformation, -x, -y, -z)
    }
    constructor(viewport) {
        this.viewport = viewport
        this.updateViewport();
    }
}

export class OrthogonalCamera extends Camera {
    top = 0
    bottom = 1
    left = 0
    right = 1
    near = 1e-6;
    far = 100;
    setViewRatio(width = 1.0, height = 1.0, near = this.near, far = this.far) {
        this.near = near
        this.far = far
        this.right = width
        this.bottom = height
        this.updateProjection()
    }
    updateProjection() {
        const xScale = 2 / (this.right - this.left);
        const yScale = 2 / (this.bottom - this.top);
        const zScale = -2 / (this.far - this.near);
        Mat4.setScale(this.projection, xScale, yScale, zScale)
        if (Mat4.isRowOrdered) {
            this.projection[3] = -(this.right + this.left) / (this.right - this.left);
            this.projection[7] = -(this.bottom + this.top) / (this.bottom - this.top);
            this.projection[11] = (this.far + this.near) / (this.far - this.near)

        }
        else {
            this.projection[12] = -(this.right + this.left) / (this.right - this.left);
            this.projection[13] = -(this.bottom + this.top) / (this.bottom - this.top);
            this.projection[14] = (this.far + this.near) / (this.far - this.near)
        }
    }


    constructor(viewport, width = 1.0, height = 1.0, x = 0, y = 0, z = 0, near = 1e-6, far = 100) {
        super(viewport);
        this.right = width
        this.bottom = height
        this.setPosition(x, y, z)
        this.near = near;
        this.far = far;
        this.updateProjection();
    }
}