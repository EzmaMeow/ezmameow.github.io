import { Mat4 } from "/lib/square_matrix_math.js"

export function buildRenderInfo(viewMatrix, projectionMatrix, viewportMatrix, renderInfo) {
    if (!renderInfo) { renderInfo = {}; }
    renderInfo.projectionMatrix = projectionMatrix || Mat4.identity();
    renderInfo.viewMatrix = viewMatrix || Mat4.identity();
    renderInfo.viewportMatrix = viewportMatrix || Mat4.identity();

    return renderInfo
}

export function getScreenMatrix(transform, renderInfo) {
    if (!renderInfo) { renderInfo = {}; }
    if (!renderInfo.modelViewMatrix) { renderInfo.modelViewMatrix = Mat4.identity() }
    if (!renderInfo.clipMatrix) { renderInfo.clipMatrix = Mat4.identity() }
    if (!renderInfo.screenMatrix) { renderInfo.screenMatrix = Mat4.identity() }
    Mat4.multiply(transform || Mat4.identity(), renderInfo.viewMatrix || Mat4.identity(), renderInfo.modelViewMatrix)
    Mat4.multiply(renderInfo.projectionMatrix || Mat4.identity(), renderInfo.modelViewMatrix, renderInfo.clipMatrix)
    Mat4.multiply(renderInfo.viewportMatrix || Mat4.identity(), renderInfo.clipMatrix, renderInfo.screenMatrix)
    return renderInfo.screenMatrix;
}