import { Mat4 } from "/lib/square_matrix_math.js"

export class Camera {
    transformation = Mat4.identity();
    getPosition(targetVector = new Float32Array(3)) {
        return Mat4.getPosition(this.transformation, targetVector)
    }
    setPosition(x = 0.0, y = 0.0, z = 0.0) {
        Mat4.setPosition(this.transformation, x, y, z)
    }
}

export class OrthogonalCamera extends Camera {
    widthRatio = 1.0;
    heightRatio = 1.0;
    near = 1e-6;
    far = 100;
    x = 0.0
    y = 0.0
    z = 0.0
    setViewRatio(width = 1.0, height = 1.0, near = this.near, far = this.far) {
        this.widthRatio = width
        this.heightRatio = height
        this.near = near
        this.far = far
        this.updateSize()
    }
    updateSize() {
        Mat4.setScale(this.transformation, this.widthRatio, this.heightRatio, (this.far + this.near) / (this.far + this.near))
    }

    constructor(widthRatio = 1.0, heightRatio = 1.0, x = 0, y = 0, z = 0, near = 1e-6, far = 100) {
        super();
        this.widthRatio = widthRatio;
        this.heightRatio = heightRatio;
        this.x = x;
        this.y = y;
        this.z = z;
        this.setPosition(x, y, z)
        this.near = near;
        this.far = far;
        this.updateSize();

    }
}