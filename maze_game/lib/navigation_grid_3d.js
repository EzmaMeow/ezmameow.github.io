
//This is to flag connection between cells in a 3d space
export class NavigationGrid3D {
    static #CONN_DIR = {
        BLOCKED: 0, OPEN: 1 << 0, UP: 1 << 1, DOWN: 1 << 2,

        NORTH: 1 << 3, NORTH_EAST: 1 << 4, EAST: 1 << 5, SOUTH_EAST: 1 << 6, SOUTH: 1 << 7, SOUTH_WEST: 1 << 8, WEST: 1 << 9, NORTH_WEST: 1 << 10,

        UP_NORTH: 1 << 11, UP_NORTH_EAST: 1 << 12, UP_EAST: 1 << 13, UP_SOUTH_EAST: 1 << 14, UP_SOUTH: 1 << 15, UP_SOUTH_WEST: 1 << 16, UP_WEST: 1 << 17, UP_NORTH_WEST: 1 << 18,

        DOWN_NORTH: 1 << 19, DOWN_NORTH_EAST: 1 << 20, DOWN_EAST: 1 << 21, DOWN_SOUTH_EAST: 1 << 22, DOWN_SOUTH: 1 << 23, DOWN_SOUTH_WEST: 1 << 24, DOWN_WEST: 1 << 25, DOWN_NORTH_WEST: 1 << 26,

        STATE_1: 1 << 27, STATE_2: 1 << 28, STATE_3: 1 << 29, STATE_4: 1 << 30, //can have 1 << 31(will flip to negaive), but keeping it at 30. also state is helper flags to skip certain loop ups
    };
    static get CONN_DIR() { return this.#CONN_DIR; }
    static #CONN_DIR_TYPE = { SAME: 0, UP: 1, DOWN: 2 }
    static get CONN_DIR_TYPE() { return this.#CONN_DIR_TYPE; }
    static #DIRECTION = {
        NONE:0, NORTH: 1, NORTH_EAST: 2, EAST: 3, SOUTH_EAST: 4, SOUTH: 5, SOUTH_WEST: 6, WEST: 7, NORTH_WEST: 8
    }
    static get DIRECTION() { return this.#DIRECTION; }
    static #DIR_OFFSET = [3, 11, 19];

    //where it exists in the world
    #position; get position() { return this.#position; }
    //how many cells in each axis
    #cellSize; get cellSize() { return this.#cellSize; }
    //how large each cell is
    #width; get width() { return this.#width; }
    #height; get height() { return this.#height; }
    #depth; get depth() { return this.#depth; }

    static getConnDir(type = 0, direction = 0) {
        if (type < 0 || type >= this.#DIR_OFFSET.length) {
            throw new Error(`Invalid type: ${type}. Valid types: ${this.CONN_DIR_TYPE.join(", ")}`);
        }
        //if (Math.abs(direction) >= this.DIRECTION.length) {
        //    throw new Error(`Invalid type: ${direction}. Valid types as numbers: ${this.DIRECTION} as well as the negative to invert.`);
        //} //NOTE: May not need this check since I think the direction will loop over
        if (direction === 0) {
            return 1 << type;
        }
        let direction_id = (direction > 0 ? (direction-1) : -(direction-1));
        if (direction < 0) {
            direction_id = (direction_id + 4) % 8;
        }
        else if (direction >= this.DIRECTION.length){
            //this is to correct out of bounds directions ideally looping so one can offset with math without worry
            //may not need negatives, just need to offset it by 8 (+1 if the pass direction dose not support 0 as none)
            direction_id = direction_id % 8
        }
        return 1 << (this.#DIR_OFFSET[type] + direction_id)
    }
    static getConnState(id = 0) {
        if (id >= 0 && id < 4) {
            return 1 << (27 + id)
        }
        //returns the extra flag states
    }

    #cellConnections; get cellConnections() { return this.#cellConnections; }
    getCellIndex(x, y, z) {
        if (x < 0 || y < 0 || z < 0) { return -1 }
        if (x >= this.width || y >= this.height || z >= this.depth) { return -1 }
        return x + (y *this.width) + (z * this.width * this.height)
    }
    getCellCoords(index, targetVector = {x:0,y:0,z:0}){
        targetVector.x = index % this.width;
        targetVector.y = Math.floor(index / this.width) % this.height;
        targetVector.z = Math.floor(index / (this.width * this.height));
        return targetVector
    }
    getCellLocalPosition(index, targetVector = {x:0,y:0,z:0}){
        targetVector.x = (index % this.width)*this.cellSize.x;
        targetVector.y = (Math.floor(index / this.width) % this.height)*this.cellSize.y;
        targetVector.z = (Math.floor(index / (this.width * this.height)))*this.cellSize.z;
        return targetVector
    }
    getCellPosition(index, targetVector = {x:0,y:0,z:0}){
        targetVector.x = (index % this.width)*this.cellSize.x + this.position.x;
        targetVector.y = (Math.floor(index / this.width) % this.height)*this.cellSize.y+ this.position.y;
        targetVector.z = (Math.floor(index / (this.width * this.height)))*this.cellSize.z+ this.position.z;
        return targetVector
    }
    getCellConn(x, y, z) {
        const index = this.getCellIndex(x, y, z);
        if (index < 0) { return -1; }
        return this.cellConnections[index];
    }
    setCellConn(x, y, z, bitflag = 0) {
        const index = this.getCellIndex(x, y, z);
        if (index < 0) { return; }
        this.cellConnections[index] = bitflag;
    }
    setCellConnFlag(x, y, z, flag = 0) {
        const index = this.getCellIndex(x, y, z);
        if (index < 0) { return; }
        this.cellConnections[index] |= flag;
    }
    clearCellConnFlag(x, y, z, flag = 0) {
        const index = this.getCellIndex(x, y, z);
        if (index < 0) { return; }
        this.cellConnections[index] &= ~flag;
    }


    initialize(width = this.width, height = this.height, depth = this.depth, position = this.position, cellSize = this.cellSize) {
        this.#width = width; this.#height = height; this.#depth = depth;
        if (typeof cellSize === 'number' && !isNaN(cellSize)) {
            this.#cellSize = { x: cellSize, y: cellSize, z: cellSize }
        }
        else if (typeof cellSize === 'object' && cellSize !== null) {
            if ('x' in cellSize && 'y' in cellSize && 'y' in cellSize) {
                this.#cellSize = cellSize;
            }
            else { console.log('NavigationMap cellSize needs to be an object with an x, y, and z properties.') }
        }
        else { console.log('NavigationMap cellSize needs to be a number or a vector3 like object.') }
        if (typeof position === 'number' && !isNaN(position)) {
            this.#position = { x: position, y: position, z: position }
        }
        else if (typeof position === 'object' && position !== null) {
            if ('x' in position && 'y' in position && 'y' in position) {
                this.#position = position;
            }
            else { console.log('NavigationMap position needs to be an object with an x, y, and z properties.') }
        }
        else { console.log('NavigationMap position needs to be a number or a vector3 like object.') }

        this.#cellConnections = new Int32Array(width * height * depth)
    }

    constructor(width = 0, height = 0, depth = 0, position = 0, cellSize = 1.0) {
        this.initialize(width, height, depth, position, cellSize)
    }
}