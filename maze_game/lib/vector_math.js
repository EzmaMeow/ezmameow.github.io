//the role of this libary is to provide additional function to caculate changes in vectors (and similar objects)
//without making new instances

//NOTE: Will return min object represention of the vector type so targets
//should use a vaild vector/quaternion for proper formation.
//this lib dose not handle array like vectors or vectors that dose not follow
//x,y,z,w format. such vectors need a wrapper to work with this

export function normalizeVector(vector){
    const len = Math.hypot(vector.x, vector.y, vector.z);
    if (len > 0) {
        vector.x /= len;
        vector.y /= len;
        vector.z /= len;
    }
    return vector
}

export function setQuaternionFromAxisAngle(quaternion, x = 0.0, y = 0.0, z = 0.0, angle = 0.0) {
    const axisScale = Math.sin(angle * 0.5);
    const len = Math.hypot(x, y, z);
    if (len > 0) {
        x /= len;
        y /= len;
        z /= len;
    }
    quaternion.x = x * axisScale;
    quaternion.y = y * axisScale;
    quaternion.z = z * axisScale;
    quaternion.w = Math.cos(angle * 0.5);
    return quaternion;
}

export function multiplyQuaternion(quaternion, x = 0.0, y = 0.0, z = 0.0, w = 0.0, target_quaternion = {}) {
    target_quaternion.x = quaternion.x * w + quaternion.w * x + quaternion.y * z - quaternion.z * y
    target_quaternion.y = quaternion.y * w + quaternion.w * y + quaternion.z * x - quaternion.x * z
    target_quaternion.z = quaternion.z * w + quaternion.w * z + quaternion.x * y - quaternion.y * x
    target_quaternion.w = quaternion.w * w - quaternion.x * x - quaternion.y * y - quaternion.z * z
    return target_quaternion
}

//This will rotate the quaternion without creating a dedicated object.
export function rotateQuaternion(quaternion, x = 0.0, y = 0.0, z = 0.0, angle = 0.0) {
    const axisScale = Math.sin(angle * 0.5);
    //normalize the vector
    const len = Math.hypot(x, y, z);
    if (len > 0) {
        x /= len;
        y /= len;
        z /= len;
    }
    //rotate by multiply a new quaternion made from an axis and angle
    return multiplyQuaternion(
        quaternion,
        x * axisScale, y * axisScale, z * axisScale, Math.cos(angle * 0.5),
        quaternion
    )
}
//Get the quaternion facing in the provided axis
//while using forward as the default facing
export function getDirectionFromQuaternion(
    quaternion,
    target_vector = {},
    x = 0.0, y = 0.0, z = -1.0,
) {
    //multipy by the forward direction
    const qx = quaternion.w * x + quaternion.y * z - quaternion.z * y;
    const qy = quaternion.w * y + quaternion.z * x - quaternion.x * z;
    const qz = quaternion.w * z + quaternion.x * y - quaternion.y * x;
    const qw = -quaternion.x * x - quaternion.y * y - quaternion.z * z;
    //multipy the result by quaternion conjugate
    target_vector.x = qx * quaternion.w + qw * -quaternion.x + qy * -quaternion.z - qz * -quaternion.y;
    target_vector.y = qy * quaternion.w + qw * -quaternion.y + qz * -quaternion.x - qx * -quaternion.z;
    target_vector.z = qz * quaternion.w + qw * -quaternion.z + qx * -quaternion.y - qy * -quaternion.x;
    normalizeVector(target_vector)
}

