import { Vector3 } from 'three';

//NOTE: Maybe should allow remapping of vector or do not depend on threejs vector
//if using a generic vector type, then all results would need to be converted to
//the desire vector class. may keep it for threejs and modify it for other projects

//return a new vector. ulitity functions should try to be pure
export function get_abs_distance(start, end) {
    return new Vector3(
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y),
        Math.abs(end.z - start.z)
    )
}

export function get_step_direction(start, end) {
    return new Vector3(
        start.x < end.x ? 1 : -1,
        start.y < end.y ? 1 : -1,
        start.z < end.z ? 1 : -1
    )
}

export function line_supercover(start, end) {
    const start_floored = start.clone().floor();
    const end_floored = end.clone().floor();
    //d 
    const abs_distance = get_abs_distance(end_floored, start_floored)
    //s
    const step_direction = get_step_direction(start_floored, end_floored);

    let point = start_floored.clone();

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
export function get_cell_coords(position,cell_size) {
    let cell_position = new Vector3(
        position.x / cell_size.x,
        position.y / cell_size.y,
        position.z / cell_size.z
    );
    cell_position.round();
    return cell_position;
}
//returns the position of the cell. May need to offset it by the origns to get the desired position
export function get_cell_position(cell_coords,cell_size) {
    let world_position = new Vector3(
        cell_coords.x * cell_size.x,
        cell_coords.y * cell_size.y,
        cell_coords.z * cell_size.z
    );
    return world_position;
}


export default { line_supercover, get_step_direction, get_abs_distance, get_cell_coords, get_cell_position }