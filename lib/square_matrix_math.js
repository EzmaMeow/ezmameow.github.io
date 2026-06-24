//Note: this will follow column base matrix and will act more of a lib
//the work with float arrays instead of objects that act like matrices

//this contains share functions between matrix types
export class Matrix {
    static isRowOrdered = false;
    static identity(target) {
        if (!target) {
            target = new Float32Array()
        }
        else {
            target.fill(0)
        }
        return target;
    }
    //this is a generic multiply and won't work with diffrent size matrices
    //might use mat4 for reason and only allow mat3 with mat4 support for later
    //NOTE: make sure row/column Order is not needed for this to work. the row into column I assume works both way
    //will add isRowOrdered  just incase
    static multiply(matrixA, matrixB, target, limit = Infinity, offset = 0, isRowOrdered = this.isRowOrdered) {
        if (!(matrixA instanceof Float32Array) || !(matrixB instanceof Float32Array)) {
            throw new Error("Matrices must be Float32Array.");
        }
        if (matrixA.length !== matrixB.length) {
            throw new Error("Matrices must be the same size.");
        }
        if (!target) {
            target = new Float32Array(matrixA.length);
        }
        this.identity(target)
        const size = Math.sqrt(matrixA.length)
        const range = Math.min(limit, size)
        if (isRowOrdered) {
            for (let row = offset; row < range; row++) {
                for (let column = offset; column < range; column++) {
                    for (let i = offset; i < range; i++) {
                        target[row * size + column] += matrixA[row * size + i] * matrixB[i * size + column];
                    }
                }
            }
        }
        else {

            for (let column = offset; column < range; column++) {
                for (let row = offset; row < range; row++) {
                    for (let i = offset; i < range; i++) {
                        target[column * size + row] += matrixA[column * size + i] * matrixB[i * size + row];
                    }
                }
            }
        }
    }
    //Note: Offset applies only to the matrix
    //Todo: test this when needed
    //NOTE: this return a vector, not a matrix
    static multiplyVector(matrix, vector, target, isRowOrdered = this.isRowOrdered, offset = 0) {
        //NOTE: skiping the check. vector length should be the same as the row/column length
        const size = Math.sqrt(matrixA.length)
        if (!target) {
            target = Float32Array(size)
        }
        if (isRowOrdered) {
            for (let i = 0; i < size; i++) {
                target[i] = 0.0;
                for (let row = 0; row < size; row++) {
                    target[i] += vector[row] * matrix[row * size + i];
                }
            }

        }
        else {
            for (let i = 0; i < size; i++) {
                target[i] = 0.0;
                for (let column = offset; column < size; column++) {
                    target[i] += matrix[i * size + column] * vector[column];
                }
            }
        }
        return target;
    }
    //todo: make sure this adds correctly with the provided offsets or without
    //add with ways to limit zones. row offset of 3 and will start at row 3. added the row order bool since it will allow
    static add(matrixA, matrixB, target, rowLimit = Infinity, rowOffset = 0, columnLimit = Infinity, columnOffset = 0, isRowOrdered = this.isRowOrdered) {
        const size = Math.sqrt(matrixA.length)
        const rowRange = Math.min(rowLimit, size)
        const columnRange = Math.min(columnLimit, size)
        if (!target) {
            target = new Float32Array(matrixA.length);
        }
        this.identity(target)
        if (isRowOrdered) {
            for (let row = rowOffset; row < rowRange; row++) {
                for (let column = columnOffset; column < columnRange; column++) {
                    const pos = row * size + column
                    target[pos] = matrixA[pos] + matrixB[pos];
                }
            }
        }
        else {
            for (let column = columnOffset; column < columnRange; column++) {
                for (let row = rowOffset; row < rowRange; row++) {
                    const pos = column * size + row;
                    target[pos] = matrixA[pos] + matrixB[pos];
                }
            }
        }
        return target;
    }

    static transpose(matrix, target) {
        const size = Math.sqrt(matrix.length);
        if (!target) {
            target = new Float32Array(matrix.length);
        }
        //this.identity(target) //not needed since this should override every index
        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                target[column * size + row] = matrix[row * size + column];
            }
        }
        return matrix;
    }
    //Determinant and then invert stuff could be useful, but not needed yet

    //note: need to do the other math stuff
    //also may need to rename or make a maxtrix to represent transfromation
    //could also just write out each case for mat3 and mat4 or figure out
    //a way to defind it abstractly like translation using the sqrt(-1) addtion 
    //or well offset and sqrt adj that way

}

//mat3 and mat4 could override functions to improve it
export class Mat3 extends Matrix {
    static identity(targetMatrix) {
        if (!targetMatrix) {
            targetMatrix = new Float32Array(9);
        }
        targetMatrix.set([
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
        ]);
        return targetMatrix;
    }
    static getPositionX(matrix, isRowOrdered = this.isRowOrdered) {
        return isRowOrdered ? matrix[2] : matrix[6];
    }
    static getPositionY(matrix, isRowOrdered = this.isRowOrdered) {
        return isRowOrdered ? matrix[5] : matrix[7];
    }
    static getPosition(matrix, targetVector = new Float32Array(2), isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            matrix[2] = targetVector[0];
            matrix[5] = targetVector[1];
        }
        else {
            matrix[6] = targetVector[0];
            matrix[7] = targetVector[1];
        }
        return targetVector
    }
    static setPosition(matrix, x = 0.0, y = 0.0, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            matrix[2] = x;
            matrix[5] = y;
        }
        else {
            matrix[6] = x;
            matrix[7] = y;
        }
    }
    static addPosition(matrix, x = 0.0, y = 0.0, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            matrix[2] += x;
            matrix[5] += y;
        }
        else {
            matrix[6] += x;
            matrix[7] += y;
        }
    }
    static getXScale(matrix, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            return Math.hypot(matrix[0], matrix[1])
        }
        return Math.hypot(matrix[0], matrix[3])
    }
    static getYScale(matrix, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            return Math.hypot(matrix[3], matrix[4])
        }
        return Math.hypot(matrix[1], matrix[4])
    }
    static getRightVector(matrix, target = new Float32Array(2), isRowOrdered = this.isRowOrdered) {
        const sizeX = this.getXScale(matrix, isRowOrdered)
        if (sizeX > 0) {
            target[0] = matrix[0] / sizeX
            target[1] = isRowOrdered ? matrix[1] / sizeX : matrix[3] / sizeX;
            return target
        }
        target[0] = matrix[0]
        target[1] = isRowOrdered ? matrix[1] : matrix[3];
        return target
    }
    static getUpVector(matrix, target = new Float32Array(2), isRowOrdered = this.isRowOrdered) {
        const sizeY = this.getYScale(matrix, isRowOrdered)
        if (sizeY > 0) {
            target[0] = isRowOrdered ? matrix[3] / sizeY : matrix[1] / sizeY;
            target[1] = matrix[4] / sizeY;
            return target
        }
        target[0] = isRowOrdered ? matrix[3] : matrix[1];
        target[1] = matrix[4];
        return target
    }
    static setScale(matrix, x, y, isRowOrdered = this.isRowOrdered) {
        const direction = new Float32Array(2);
        if (isRowOrdered) {
            this.getRightVector(matrix, direction, isRowOrdered);
            matrix[0] = direction[0] * x;
            matrix[1] = direction[1] * x;
            this.getUpVector(matrix, direction, isRowOrdered);
            matrix[3] = direction[0] * y;
            matrix[4] = direction[1] * y;
        }
        else {
            this.getRightVector(matrix, direction, isRowOrdered);
            matrix[0] = direction[0] * x;
            matrix[3] = direction[1] * x;
            this.getUpVector(matrix, direction, isRowOrdered);
            matrix[1] = direction[0] * y;
            matrix[4] = direction[1] * y;
        }
    }
}

export class Mat4 extends Matrix {
    static identity(targetMatrix) {
        if (!targetMatrix) {
            targetMatrix = new Float32Array(16)
        }
        targetMatrix.set([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        return targetMatrix;
    }
    static getPositionX(matrix, isRowOrdered = this.isRowOrdered) {
        return isRowOrdered ? matrix[3] : matrix[12];
    }
    static getPositionY(matrix, isRowOrdered = this.isRowOrdered) {
        return isRowOrdered ? matrix[7] : matrix[13];
    }
    static getPositionZ(matrix, isRowOrdered = this.isRowOrdered) {
        return isRowOrdered ? matrix[11] : matrix[14];
    }
    static getPosition(matrix, targetVector = new Float32Array(3), isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            matrix[3] = targetVector[0];
            matrix[7] = targetVector[1];
            matrix[11] = targetVector[2];
        }
        else {
            matrix[12] = targetVector[0];
            matrix[13] = targetVector[1];
            matrix[14] = targetVector[2];
        }
        return targetVector
    }
    static setPosition(matrix, x = 0.0, y = 0.0, z = 0.0, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            matrix[3] = x;
            matrix[7] = y;
            matrix[11] = z;
        }
        else {
            matrix[12] = x;
            matrix[13] = y;
            matrix[14] = z;
        }
    }
    static addPosition(matrix, x = 0.0, y = 0.0, z = 0.0, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            matrix[3] += x;
            matrix[7] += y;
            matrix[11] += z;
        }
        else {
            matrix[12] += x;
            matrix[13] += y;
            matrix[14] += z;
        }
    }
    static getXScale(matrix, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            return Math.hypot(matrix[0], matrix[1], matrix[3])
        }
        return Math.hypot(matrix[0], matrix[4], matrix[8])
    }
    static getYScale(matrix, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            return Math.hypot(matrix[4], matrix[5], matrix[6])
        }
        return Math.hypot(matrix[1], matrix[5], matrix[9])
    }
    static getZScale(matrix, isRowOrdered = this.isRowOrdered) {
        if (isRowOrdered) {
            return Math.hypot(matrix[8], matrix[9], matrix[10])
        }
        return Math.hypot(matrix[2], matrix[6], matrix[10])
    }
    static getRightVector(matrix, target = new Float32Array(3), isRowOrdered = this.isRowOrdered) {
        const size = this.getXScale(matrix, isRowOrdered)
        if (size > 0) {
            target[0] = matrix[0] / size
            target[1] = isRowOrdered ? matrix[1] / size : matrix[4] / size;
            target[2] = isRowOrdered ? matrix[2] / size : matrix[8] / size;
            return target
        }
        target[0] = matrix[0]
        target[1] = isRowOrdered ? matrix[1] : matrix[4];
        target[2] = isRowOrdered ? matrix[2] : matrix[8];
        return target
    }
    static getUpVector(matrix, target = new Float32Array(3), isRowOrdered = this.isRowOrdered) {
        const size = this.getYScale(matrix, isRowOrdered)
        if (size > 0) {
            target[0] = isRowOrdered ? matrix[4] / size : matrix[1] / size;
            target[1] = matrix[5] / size;
            target[2] = isRowOrdered ? matrix[6] / size : matrix[9] / size;
            return target
        }
        target[0] = isRowOrdered ? matrix[4] : matrix[1];
        target[1] = matrix[5];
        target[2] = isRowOrdered ? matrix[6] : matrix[9];
        return target
    }
    static getForwardVector(matrix, target = new Float32Array(3), isRowOrdered = this.isRowOrdered) {
        const size = this.getZScale(matrix, isRowOrdered)
        if (size > 0) {
            target[0] = isRowOrdered ? matrix[8] / size : matrix[2] / size;

            target[1] = isRowOrdered ? matrix[9] / size : matrix[6] / size;
            target[2] = matrix[10] / size;
            return target
        }
        target[0] = isRowOrdered ? matrix[8] : matrix[2];
        target[1] = isRowOrdered ? matrix[9] : matrix[6];
        target[2] = matrix[10];
        return target
    }
    static setScale(matrix, x, y, z, isRowOrdered = this.isRowOrdered) {
        if (x === 0.0) { y = 1e-6 }
        if (y === 0.0) { x = 1e-6 }
        if (z === 0.0) { z = 1e-6 }
        const direction = new Float32Array(3);
        if (isRowOrdered) {
            this.getRightVector(matrix, direction, isRowOrdered);
            matrix[0] = direction[0] * x;
            matrix[1] = direction[1] * x;
            matrix[2] = direction[2] * x;
            this.getUpVector(matrix, direction, isRowOrdered);
            matrix[4] = direction[0] * y;
            matrix[5] = direction[1] * y;
            matrix[6] = direction[2] * y;
            this.getForwardVector(matrix, direction, isRowOrdered);
            matrix[8] = direction[0] * z;
            matrix[9] = direction[1] * z;
            matrix[10] = direction[2] * z;
        }
        else {
            this.getRightVector(matrix, direction, isRowOrdered);
            matrix[0] = direction[0] * x;
            matrix[4] = direction[1] * x;
            matrix[8] = direction[2] * x;
            this.getUpVector(matrix, direction, isRowOrdered);
            matrix[1] = direction[0] * y;
            matrix[5] = direction[1] * y;
            matrix[9] = direction[2] * y;
            this.getForwardVector(matrix, direction, isRowOrdered);
            matrix[2] = direction[0] * z;
            matrix[6] = direction[1] * z;
            matrix[10] = direction[2] * z;
        }
    }
}

