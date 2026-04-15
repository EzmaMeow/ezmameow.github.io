import { NavigationGrid3D } from './navigation_grid_3d.js'
//this class is for providing shared nav data in an area
//could be static, but may have other sources and the sources pass to the object
//(note, such objects would need to have nav updated if their related nav source change
//but nav should be tied to the world (or main persitatnt level/scene) so that should not be common)
//NOTE: perhaps nav should be added to the world object if possible, just need to know if nav will ever need to know about world
//though having both split would work, but require more handling if there ever more than one world or nav handler
//could also treat navigation as half static with most functions as static and a defualt instance for assigning grids and meshes
//so one can reuse the pathing logic while overriding the nav data

//TODO: may be easier to depend on nav grid and chunk the grid here
//then just need the owner of the world to overide the nav mesh function
//also could chunk mesh here as well, but would need to understand how most nav
//mesh work to abstract it correctly or assume they follow the same chunking
export class Navigation {
    static defaultInstance = new Navigation()
    //grid be better off centered. should make sure the level center else would need to offset all coord to properly set/fetch the correct cell
    //position = { x: 0.0, y: 0.0, z: 0.0 }
    //if depending on nav grid and focing chunking as the defualt, then the way the level handles navigtion will need to change
    //in otherwords it may need to modify this directly and depend on it instead of just the grid.
    //also means this need to provide simmilar adding and modifing of cells as nav grid so it can create and remove grids as needed
    //though level may need to remove chunk if it handles dynamic world changes
    cellSize = { x: 32, y: 32, z: 32 } //the grid cell size
    gridSize = { x: 16, y: 16, z: 16 } //size of a chunk and the max size of the grid
    //may use a function. just need to get an array of overlapping grids base on x,y,z  and maybe an optional filter
    //nav mesh will also need a function, but since mesh may exist in a cell and shared, the owner of the mesh or grid
    //should override the function to fetch from its containers
    //NOTE may need to expect one grid per point. so still need an array, but the array is for paths that cross grids
    grids = new Map();
    //note, this may be a map of map of meshes since there no stucture of the cell mesh
    //so it may be a map or a large grid size mesh
    meshes = new Map();

    static getGridCoords(
        x = 0.0, y = 0.0, z = 0.0,
        targetVector = { x: 0, y: 0, z: 0 },
        navigation = this.defaultInstance
    ) {
        targetVector.x = Math.floor(x / (navigation.cellSize.x * navigation.gridSize.x))
        targetVector.y = Math.floor(y / (navigation.cellSize.y * navigation.gridSize.y))
        targetVector.z = Math.floor(z / (navigation.cellSize.z * navigation.gridSize.z))
        return targetVector
    }
    static getGridPosition(
        x = 0.0, y = 0.0, z = 0.0,
        targetVector = { x: 0, y: 0, z: 0 },
        navigation = this.defaultInstance
    ){
        targetVector.x = x * navigation.cellSize.x * navigation.gridSize.x;
        targetVector.y = y * navigation.cellSize.y * navigation.gridSize.y;
        targetVector.z = z * navigation.cellSize.z * navigation.gridSize.z;
        return targetVector
    }
    //get a nav grid. of createNew is true, it will init a new grid if results would have 
    //return undefined
    static getGrid(
        x = 0.0, y = 0.0, z = 0.0,
        createNew = false, navigation = this.defaultInstance
    ) {
        const gridCoords = Navigation.getGridCoords(x, y, z, { x: 0, y: 0, z: 0 }, navigation)
        const gridKey = `x:${gridCoords.x},y:${gridCoords.y},z:${gridCoords.z}`
        if (!navigation.grids.has(gridKey) && createNew) {
            const newGrid = new NavigationGrid3D(navigation.gridSize.x, navigation.gridSize.y, navigation.gridSize.z, this.getGridPosition(gridCoords.x,gridCoords.y,gridCoords.z,{},navigation), navigation.cellSize)
            navigation.grids.set(gridKey,newGrid);
        }
        return navigation.grids.get(gridKey);
    }
    static removeGrid(
        x = 0.0, y = 0.0, z = 0.0,
        navigation = this.defaultInstance
    ) {
        const gridCoords = Navigation.getGridCoords(x, y, z, { x: 0, y: 0, z: 0 }, navigation)
        const gridKey = `x:${gridCoords.x},y:${gridCoords.y},z:${gridCoords.z}`
        navigation.grids.delete(gridKey);
    }
    static clearGrids(navigation = this.defaultInstance) {
        navigation.grids.clear();
    }
    //TODO: either depend on navigation_grid_3d or have the grid provide function to get 
    //directions from the grid. maybe parce the data to an object.
    //it be easier to depend on nav grid due to the possible cost of converting the data into
    //an readble object instead of using the consts
    static findPath(
        startX = 0.0, startY = 0.0, startZ = 0.0,
        endX = 0.0, endY = 0.0, endZ = 0.0,
        onEnd = (path) => { }, options = {}, navigation = this.defaultInstance
    ) {
        //the final path if vaild will be added here. may have functions
        //that return it if vaild and just loop untill founded
        //also may need to use animation frame or some other delayed caculation
        //NOTE: this is a bit vague and will most likly check grid and mesh ideally
        //grid first and then check each point on the mesh(if exists) to fine tune it
        //treating undefined and null as fully navigatable unless options state otherwise
        const points = new Set();
        //NOTE: start and end would be world. would need to convert to coords when it need to acess the cell
        //this can be done by x%gridSize.x but also need to adjust for cellsize so may just need to multiply gridsize and cellsize
        const point = { x: startX, y: startY, z: startZ }
        let end_reached = false;
        let loop_count = 0;
        while (!end_reached){
            if (loop_count >= 10000){
                console.log('loop limit reach in find path')
                break
            }
            loop_count += 1
            const grid = this.getGrid(point.x,point.y,point.z,false,navigation)
            if (grid){
                //need to make the logic, but structure not quite right
                //up a few dozen direction can be checked and then another afterwards.
                //may be able to reserver it to ~3 but would need to backtrack
                //also need to focus on getting closer and try to ignore all cells too far away
                //NOTE: also need a static colider map somewhere (probably in the grid or as it own chucked object)
                //this would be used for dynamic blocks that be too difficult to update the grid without blocking
                //most can be cell base and can be manage with physic checks, but these are like doors and bridges
                //that may have an open and close state. it be better to check their state if they affect connected cells
                //instead of changing and caching the old state of the cell (which would break if two door block the same exit)
                //NOTE TODO: move meshes and coliders to nav grid since they are being chunked already and will be much smaller
                //array or map is debatable. coliders probably be better as a map but nav can be either an array or a mesh
            }
        }
        //instead of looping all grids, we should start the pathing logic and then loop the grids untill a vaild point is found
        //since it be easier to check if in bounds per point instead of trying to map it...unless it is chunked but that requiring
        //logic verifing that the grids are correctly chunked and not overlapping
        onEnd(points)
    }

}