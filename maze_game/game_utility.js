import { Vector3 } from 'three';

//NOTE: Maybe should allow remapping of vector or do not depend on threejs vector
//if using a generic vector type, then all results would need to be converted to
//the desire vector class. may keep it for threejs and modify it for other projects

//some system (like camera) are a bit picky about type. forcing it to match the type can solve issues.
export function convert_to_same_type(to, from) {
    switch (typeof to) {
        case "number": return Number(from);
        case "boolean": return from === "true" || from === true;
        case "string": return String(from);
        case "object": return JSON.parse(from);
        default: return from;
    }
}

//may move these. not sure where they belong. kind of a level thing
//also a bit of a pain to adjust the amounts. the other channels would reprents the details and metadata(if need)
//NOTE: may not use this. may only reserve two flags (floor/ceil) then split the remainer into ids with enough spacing
//to cover rotation, material type, ect. only some would use it. say a block that look the same on all sides will only reserve
//1 id per material while stairs may reserve 4 and something that can rotate all the way would need 6 per material
//material can cover floor and ceil style, but may need to reserver some ids for them. maybe 4 each or like below and 
//8 to 4. these ids are to ref preloaded resources that text file may modify per level. also such approch could help manager memeory
//at the cost of limit in variation in the level.
export function decode_cell_id(R) {
    // FLAG REGION (0–7)
    //NOTE: could mergr the tw0
    if (R < 8) {
        return {
            type: "flag",
            area:  (R & 1) ? 1 : 0,
            floor: (R & 2) ? 1 : 0,
            ceil:  (R & 4) ? 1 : 0
        };
    }

    // TILE REGION (8–255)
    const value = R - 8;

    const area_id  = value % 16; //0–15 // none, wall, trap, safe up, unsafe up, safe volume, unsafe volume, ...reserver wall shapes
    const floor_id = Math.floor(value / 16) % 8; // 0–7 // maybe none, floor, safe down, unsafe down ,safe liquid, unsafe liquid, misc 
    const ceil_id  = Math.floor(value / 128); // 0–3 //provably none, full, hole, and misc. mostly for visual

    return {
        type: "tile",
        area:  area_id,
        floor: floor_id,
        ceil:  ceil_id
    };
}

export function encode_cell_id(wall, floor, ceil) {
    if (wall === 0 && floor === 0 && ceil === 0) {
        return 0;
    }

    if (wall <= 1 && floor <= 1 && ceil <= 1) {
        return (wall ? 1 : 0) |
               (floor ? 2 : 0) |
               (ceil ? 4 : 0);
    }

    return 8 + wall + (floor * 16) + (ceil * 128);
}




//return a new vector. ulitity functions should try to be pure
export function get_abs_distance(start, end, target = new Vector3()) {
    return target.set(
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y),
        Math.abs(end.z - start.z)
    )
}

export function get_step_direction(start, end, target = new Vector3()) {
    return target.set(
        start.x < end.x ? 1 : -1,
        start.y < end.y ? 1 : -1,
        start.z < end.z ? 1 : -1
    )
}

//may need to use arrays if vectors have a cost
//also could try yeild, but not use to using such things
export function line_supercover(start, end) {
    const start_floored = start.clone().floor();
    const end_floored = end.clone().floor();
    //d 
    const abs_distance = get_abs_distance(end_floored, start_floored)
    //s
    const step_direction = get_step_direction(start_floored, end_floored);

    const point = start_floored.clone();

    const cells = [point.clone()];
    //a
    const double_distance = abs_distance.clone().multiplyScalar(2);

    if (abs_distance.x >= abs_distance.y && abs_distance.x >= abs_distance.z) {
        let yd = double_distance.y - abs_distance.x;
        let zd = double_distance.z - abs_distance.x;
        while (point.x !== end_floored.x) {
            if (yd >= 0) { point.y += step_direction.y; yd -= double_distance.x; }
            if (zd >= 0) { point.z += step_direction.z; zd -= double_distance.x; }
            point.x += step_direction.x;
            yd += double_distance.y;
            zd += double_distance.z;
            cells.push(point.clone());
        }
    }
    else if (abs_distance.y >= abs_distance.x && abs_distance.y >= abs_distance.z) {
        let xd = double_distance.x - abs_distance.y;
        let zd = double_distance.z - abs_distance.y;
        while (point.y !== end_floored.y) {
            if (xd >= 0) { point.x += step_direction.x; xd -= double_distance.y; }
            if (zd >= 0) { point.z += step_direction.z; zd -= double_distance.y; }
            point.y += step_direction.y;
            xd += double_distance.x;
            zd += double_distance.z;
            cells.push(point.clone());
        }
    }
    else {
        let xd = double_distance.x - abs_distance.z;
        let yd = double_distance.y - abs_distance.z;
        while (point.z !== end_floored.z) {
            if (xd >= 0) { point.x += step_direction.x; xd -= double_distance.z; }
            if (yd >= 0) { point.y += step_direction.y; yd -= double_distance.z; }
            point.z += step_direction.z;
            xd += double_distance.x;
            yd += double_distance.y;
            cells.push(point.clone());
        }
    }
    return cells;
}

//returns the grid coords of the cell.
export function get_cell_coords(position, cell_size, target = new Vector3()) {
    return target.set(
        position.x / cell_size.x,
        position.y / cell_size.y,
        position.z / cell_size.z
    ).round();
}
//returns the position of the cell. May need to offset it by the origns to get the desired position
export function get_cell_position(cell_coords, cell_size, target = new Vector3()) {
    return target.set(
        cell_coords.x * cell_size.x,
        cell_coords.y * cell_size.y,
        cell_coords.z * cell_size.z
    );
}

export function is_vector_valid(vector) {
    if (vector) {
        if (Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z)) {
            return true;
        }
    }
    return false;
}


export default { line_supercover, get_step_direction, get_abs_distance, get_cell_coords, get_cell_position, is_vector_valid, convert_to_same_type }