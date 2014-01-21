

var FLUID = {};

//===================================
// OBSTACLES
//===================================

FLUID.Obstacle = function (mesh) {
    this.mesh = mesh;
};

//===================================
// TERRAIN OBSTACLES
//===================================

FLUID.TerrainObstacle = function (mesh) {
    this.intersectionHeights = [];
    FLUID.Obstacle.call(this, mesh);
};
FLUID.TerrainObstacle.prototype = Object.create(FLUID.Obstacle.prototype);
FLUID.TerrainObstacle.prototype.constructor = FLUID.TerrainObstacle;

//===================================
// HIGHT FIELD WATER
//===================================

FLUID.HeightFieldWater = function (options) {

    this.mesh           = options.mesh;                                 // water surface
    this.size           = options.size;                                 // water size
    this.halfSize       = this.size / 2.0;
    this.res            = options.res;                                  // mesh resolution
    this.dampingFactor  = options.dampingFactor;                        // damping factor
    this.__meanHeight   = options.meanHeight || 0.0;                    // mean height

    this.geometry           = this.mesh.geometry;
    this.numVertices        = this.res * this.res;
    this.segmentSize        = this.size / this.res;
    this.segmentSizeSquared = this.segmentSize * this.segmentSize;

    this.obstacles          = {};

    this.sourceField        = [];
    this.disturbField       = [];
    this.obstacleField      = [];
    this.verticalVelField   = [];

    this.obstaclesActive    = true;

    this.__worldMatInv  = new THREE.Matrix4();
    this.__localPos     = new THREE.Vector3();

    this.init();
};

FLUID.HeightFieldWater.prototype.init = function () {
    for (var i = 0; i < this.numVertices; i++) {
        this.sourceField[i] = 0;
        this.disturbField[i] = 0;
        this.obstacleField[i] = 1;
        this.verticalVelField[i] = 0;
    }
};


FLUID.HeightFieldWater.prototype.update = function (dt) {

    //update obstacle field
    if (this.obstaclesActive) {
        var obstacleIds = Object.keys(this.obstacles);
        var obstacle;
        var i, len = obstacleIds.length;
        for (i = 0; i < len; i++) {
            obstacle = this.obstacles[obstacleIds[i]];
        }
    }

    this.sim(dt);
    this.__clearFields();
};

FLUID.HeightFieldWater.prototype.sim = function (dt) {
    throw new Error('Abstract method not implemented');
};

/**
 * Sets the mean height
 * @param {number} meanHeight Mean height to set to
 */
FLUID.HeightFieldWater.prototype.setMeanHeight = function (meanHeight) {

    this.__meanHeight = meanHeight;

    var vertexPos = this.geometry.vertices;
    var resMinusOne = this.res - 1;

    //set edge vertices to mean height
    var i, j, idx;
    j = 0;
    for (i = 0; i < this.res; i++) {
        idx = i * this.res + j;
        // this.field1[idx] = this.__meanHeight;
        // this.field2[idx] = this.__meanHeight;
        vertexPos[idx].y = this.__meanHeight;
    }
    j = resMinusOne;
    for (i = 0; i < this.res; i++) {
        idx = i * this.res + j;
        // this.field1[idx] = this.__meanHeight;
        // this.field2[idx] = this.__meanHeight;
        vertexPos[idx].y = this.__meanHeight;
    }
    i = 0;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        // this.field1[idx] = this.__meanHeight;
        // this.field2[idx] = this.__meanHeight;
        vertexPos[idx].y = this.__meanHeight;
    }
    i = resMinusOne;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        // this.field1[idx] = this.__meanHeight;
        // this.field2[idx] = this.__meanHeight;
        vertexPos[idx].y = this.__meanHeight;
    }
};

//Calculates the vertex id of the mesh that is nearest position
FLUID.HeightFieldWater.prototype.__calcVertexId = function (x, z) {
    var row = Math.floor((z + this.halfSize) / this.size * this.res);
    var col = Math.floor((x + this.halfSize) / this.size * this.res);
    return (row * this.res) + col;
};

/**
 * Disturbs the water simulation
 * @param  {THREE.Vector3} position World-space position to disturb at
 * @param  {number} amount Amount to disturb
 */
FLUID.HeightFieldWater.prototype.disturb = function (position, amount) {

    //convert back to local space first
    this.__worldMatInv.getInverse(this.mesh.matrixWorld);
    this.__localPos.copy(position).applyMatrix4(this.__worldMatInv);

    //calculate idx
    var idx = this.__calcVertexId(this.__localPos.x, this.__localPos.z);
    this.disturbById(idx, amount);
};

/**
 * Disturbs vertex id of the water mesh
 * @param  {number} id Vertex ID of the water mesh
 * @param  {number} amount Amount to disturb
 */
FLUID.HeightFieldWater.prototype.disturbById = function (id, amount) {
    this.disturbField[id] = amount;
};

/**
 * Disturbs the neighbours at this position
 * @param  {THREE.Vector3} position World-space position to disturb at
 * @param  {number} amount Amount to disturb
 */
FLUID.HeightFieldWater.prototype.disturbNeighbours = function (position, amount) {

    //convert back to local space first
    this.__worldMatInv.getInverse(this.mesh.matrixWorld);
    this.__localPos.copy(position).applyMatrix4(this.__worldMatInv);

    //calculate idx
    var idx = this.__calcVertexId(this.__localPos.x, this.__localPos.z);

    this.disturbNeighboursById(idx, amount);
};

/**
 * Disturbs neighbours of a vertex
 * @param  {number} id Neighbours of this vertex ID will be disturbed
 * @param  {number} amount Amount to disturb
 */
FLUID.HeightFieldWater.prototype.disturbNeighboursById = function (id, amount) {

    var vertices = this.geometry.vertices;

    //neighbour (x+1,z)
    var neighbourId = id + this.res;
    if (vertices[neighbourId]) {
        this.disturbById(neighbourId, amount);
    }

    //neighbour (x-1,z)
    neighbourId = id - this.res;
    if (vertices[neighbourId]) {
        this.disturbById(neighbourId, amount);
    }

    //neighbour (x,z+1)
    neighbourId = id + 1;
    if (vertices[neighbourId]) {
        this.disturbById(neighbourId, amount);
    }

    //neighbour (x,z-1)
    neighbourId = id - 1;
    if (vertices[neighbourId]) {
        this.disturbById(neighbourId, amount);
    }
};

/**
 * Sources water into the water simulation
 * @param  {THREE.Vector3} position World-space position to source at
 * @param  {number} amount Amount of water to source
 * @param  {number} radius Radius of water to source
 */
FLUID.HeightFieldWater.prototype.source = function (position, amount, radius) {

    //convert back to local space first
    this.__worldMatInv.getInverse(this.mesh.matrixWorld);
    this.__localPos.copy(position).applyMatrix4(this.__worldMatInv);

    //calculate idx
    var idx;
    var dist;
    var x, z;
    for (x = -radius; x <= radius; x += this.segmentSize) {
        for (z = -radius; z <= radius; z += this.segmentSize) {
            dist = Math.sqrt(x * x + z * z);
            if (dist < radius) { //within the circle
                //get vertex id for this (x, z) point
                idx = this.__calcVertexId(this.__localPos.x + x, this.__localPos.z + z);
                this.sourceById(idx, amount);
            }
        }
    }
};

/**
 * Source to a vertex
 * @param  {number} id Vertex ID to source at
 * @param  {number} amount Amount of water to source
 */
FLUID.HeightFieldWater.prototype.sourceById = function (id, amount) {
    this.sourceField[id] = amount;
};

/**
 * Floods the water simulation by the given volume
 * @param  {number} volume Volume to flood the system with
 */
FLUID.HeightFieldWater.prototype.flood = function (volume) {
    var i, j, idx;
    for (i = 0; i < this.res; i++) {
        for (j = 0; j < this.res; j++) {
            idx = i * this.res + j;
            //add to disturb field because this is masked by obstacles
            this.disturbField[idx] += volume / (this.res * this.res);
            //TODO: add masked out volume back to unmasked volume, if we really want to be accurate...
        }
    }
};

/**
 * Adds obstacle to the system
 * @param {FLUID.Obstacle} obstacle FLUID.Obstacle to add
 * @param {string} name String ID of this obstacle
 */
FLUID.HeightFieldWater.prototype.addObstacle = function (obstacle, name) {
    // FLUID.DepthMapObstacleManager.addObstacle(mesh);
    if (!(obstacle instanceof FLUID.Obstacle)) {
        throw new Error('obstacle must be of type FLUID.Obstacle');
    }
    if (typeof name !== 'string') {
        throw new Error('name must be of type string');
    }
    if (Object.keys(this.obstacles).indexOf(name) !== -1) {
        throw new Error('obstacle name already exists: ' + name);
    }
    this.obstacles[name] = obstacle;
};

/**
 * Sets obstacles state to active/inactive
 * @param {boolean} isActive Whether the obstacles are active
 */
FLUID.HeightFieldWater.prototype.setObstaclesActive = function (isActive) {
    this.obstaclesActive = isActive;
};

/**
 * Resets the water simulation
 */
FLUID.HeightFieldWater.prototype.reset = function () {

    //set mesh back to 0
    var i;
    var vertexPos = this.geometry.vertices;
    for (i = 0; i < this.numVertices; i++) {
        vertexPos[i].y = this.__meanHeight;
    }

    //clear fields
    this.__clearFields();
};

FLUID.HeightFieldWater.prototype.__clearFields = function () {
    var i;
    for (i = 0; i < this.numVertices; i++) {
        this.sourceField[i] = 0;
        this.disturbField[i] = 0;
        this.obstacleField[i] = 1;
    }
};

FLUID.HeightFieldWater.prototype.__updateMesh = function () {
    this.geometry.verticesNeedUpdate = true;
    this.geometry.computeFaceNormals();  //must call this first before computeVertexNormals()
    this.geometry.computeVertexNormals();
    this.geometry.normalsNeedUpdate = true;
};

// 
/**
 * Height field water that is able to generate a full 3D velocity field
 * @constructor
 * @extends {FLUID.HeightFieldWater}
 */
FLUID.HeightFieldWaterWithVel = function (options) {

    this.vel = [];
    this.velColors = [];
    if (typeof options.scene === 'undefined') {
        throw new Error('scene not specified');
    }
    this.scene = options.scene;

    FLUID.HeightFieldWater.call(this, options);

    this.minVisVel = options.minVisVel || 0;  //for remapping of visualizing colors
    this.maxVisVel = options.maxVisVel || 0.25;  //for remapping of visualizing colors
    this.minVisVelLength = options.minVisVelLength || 0.02;  //for clamping of line length
    this.maxVisVelLength = options.maxVisVelLength || 1.0;  //for clamping of line length

    this.lineStartColor = options.lineStartColor || new THREE.Color(0x0066cc);
    this.lineEndColor = options.lineEndColor || new THREE.Color(0x99ffff);
    this.waterColor = options.waterColor || new THREE.Color(0x0066cc);
    this.foamColor = options.foamColor || new THREE.Color(0x99ffff);

    this.__faceIndices = ['a', 'b', 'c', 'd'];
    this.__origMeshMaterialSettings = {
        emissive: this.mesh.material.emissive.clone(),
        vertexColors: this.mesh.material.vertexColors
    };

    this.__visVelColors = false;
    this.__visVelLines = false;
};
//inherit
FLUID.HeightFieldWaterWithVel.prototype = Object.create(FLUID.HeightFieldWater.prototype);
FLUID.HeightFieldWaterWithVel.prototype.constructor = FLUID.HeightFieldWaterWithVel;
//override
FLUID.HeightFieldWaterWithVel.prototype.init = function () {

    //init arrays
    var i, len;
    for (i = 0, len = this.mesh.geometry.vertices.length; i < len; i++) {
        this.vel[i] = new THREE.Vector3();
        this.velColors[i] = new THREE.Color();
    }

    //create vel lines mesh
    var velLinesGeom = new THREE.Geometry();
    for (i = 0, len = 2 * this.mesh.geometry.vertices.length; i < len; i++) {
        velLinesGeom.vertices.push(new THREE.Vector3());
        if (i % 2 === 0) {
            velLinesGeom.colors.push(new THREE.Color(0xffffff));
        } else {
            velLinesGeom.colors.push(new THREE.Color(0xff0000));
        }
    }
    var velLinesMaterial = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors});
    this.velLinesMesh = new THREE.Line(velLinesGeom, velLinesMaterial, THREE.LinePieces);
    this.scene.add(this.velLinesMesh);

    FLUID.HeightFieldWater.prototype.init.call(this);
};
FLUID.HeightFieldWaterWithVel.prototype.update = function () {

    FLUID.HeightFieldWater.prototype.update.call(this);
    if (this.__visVelColors) {
        this.updateVelColors();
    }
    if (this.__visVelLines) {
        this.updateVelLines();
    }
};

//methods
/**
 * Visualize velocity colors
 * @param  {boolean} shouldVisualize Whether to visualize the colors
 */
FLUID.HeightFieldWaterWithVel.prototype.visualizeVelColors = function (shouldVisualize) {
    this.__visVelColors = shouldVisualize;
    if (shouldVisualize) {
        this.mesh.material.emissive.set('#ffffff');
        this.mesh.material.vertexColors = THREE.VertexColors;
    } else {
        this.mesh.material.emissive.set(this.__origMeshMaterialSettings.emissive);
        this.mesh.material.vertexColors = this.__origMeshMaterialSettings.vertexColors;
    }
    this.mesh.geometry.buffersNeedUpdate = true;
    this.mesh.material.needsUpdate = true;
};
/**
 * Visualize velocity vector lines
 * @param  {boolean} shouldVisualize Whether to visualize the lines
 */
FLUID.HeightFieldWaterWithVel.prototype.visualizeVelLines = function (shouldVisualize) {
    this.__visVelLines = shouldVisualize;
    this.velLinesMesh.visible = shouldVisualize;
};
FLUID.HeightFieldWaterWithVel.prototype.updateVelColors = function () {

    var i, len, f, j, n, vertexIndex, velMag;
    for (i = 0, len = this.geometry.faces.length; i < len; i++) {
        f  = this.geometry.faces[i];
        n = (f instanceof THREE.Face3) ? 3 : 4;
        for (j = 0; j < n; j++) {

            vertexIndex = f[this.__faceIndices[j]];

            //normalize vel magnitude and clamp
            velMag = this.vel[vertexIndex].length() / (this.maxVisVel - this.minVisVel) + this.minVisVel;
            velMag = THREE.Math.clamp(velMag, 0, 1);

            //linear interpolate between the base and water color using velMag
            f.vertexColors[j] = this.velColors[vertexIndex].set(this.waterColor).lerp(this.foamColor, velMag);
        }
    }
    this.geometry.colorsNeedUpdate = true;
};
FLUID.HeightFieldWaterWithVel.prototype.updateVelLines = function () {

    //TODO: transform into another space

    var vertexPos = this.velLinesMesh.geometry.vertices;

    var start = new THREE.Vector3();
    var offset = new THREE.Vector3();

    var i, len, offsetLen;
    // var mat = this.mesh.matrixWorld;
    for (i = 0, len = this.mesh.geometry.vertices.length; i < len; i++) {

        start.copy(this.mesh.geometry.vertices[i]); //.clone().applyMatrix4(mat);

        offset.copy(this.vel[i]);
        // offset.transformDirection(mat);
        // offset.multiplyScalar(25);

        //clamp velocity visualize vector
        offsetLen = offset.length();
        if (offsetLen > this.maxVisVelLength) {
            offset.setLength(this.maxVisVelLength);
        } else if (offsetLen < this.minVisVelLength) {
            offset.setLength(0);
        }

        //update line vertex positions
        vertexPos[2 * i].copy(start);
        vertexPos[2 * i + 1].copy(start).add(offset);
    }

    this.velLinesMesh.geometry.verticesNeedUpdate = true;
};

/**
 * Height field water based on the hydrostatic pipe model
 * @constructor
 * @extends {FLUID.HeightFieldWaterWithVel}
 */
FLUID.PipeModelWater = function (options) {

    //per-grid variables
    this.baseHeights = [];  //height of the base terrain layer
    this.heights = [];  //just the water height, not including the terrain
    this.extPressures = [];
    this.fluxR = [];
    this.fluxB = [];
    this.fluxL = [];
    this.fluxT = [];

    this.minWaterHeight = -0.05;  //have to be slightly below zero to prevent z-fighting flickering
    this.dHeights = [];

    //TODO: this should really be in the superclass
    this.terrainMesh = typeof options.terrainMesh === 'undefined' ? null : options.terrainMesh;

    FLUID.HeightFieldWaterWithVel.call(this, options);

    //some constants
    this.gravity = 9.81;
    this.density = 1;
    this.atmosPressure = 0;  //assume one constant atmos pressure throughout
    this.pipeLength = this.segmentSize;
    this.pipeCrossSectionArea = this.pipeLength * this.pipeLength;  //square cross-section area

    //sources and sinks
    this.flowChangers = [];
};
//inherit
FLUID.PipeModelWater.prototype = Object.create(FLUID.HeightFieldWaterWithVel.prototype);
FLUID.PipeModelWater.prototype.constructor = FLUID.PipeModelWater;
//override
FLUID.PipeModelWater.prototype.init = function () {

    var i, len;
    for (i = 0, len = this.numVertices; i < len; i++) {
        this.baseHeights[i] = 0;
        this.heights[i] = 0.1;
        this.extPressures[i] = 0;
        this.fluxR[i] = 0;
        this.fluxB[i] = 0;
        this.fluxL[i] = 0;
        this.fluxT[i] = 0;

        this.dHeights[i] = 0;
    }

    FLUID.HeightFieldWaterWithVel.prototype.init.call(this);
};
FLUID.PipeModelWater.prototype.reset = function () {

    var i, len;
    for (i = 0, len = this.numVertices; i < len; i++) {
        this.extPressures[i] = 0;
    }

    FLUID.HeightFieldWaterWithVel.prototype.reset.call(this);
};
/**
 * Updates the simulation
 * @param  {number} dt Elapsed time
 */
FLUID.PipeModelWater.prototype.update = function (dt) {

    //TODO: update only the changed base heights during sculpting
    //update baseHeights using terrainMesh data
    if (this.terrainMesh) {
        var vertexPos = this.terrainMesh.geometry.vertices;
        var i, len;
        for (i = 0, len = this.numVertices; i < len; i++) {
            this.baseHeights[i] = vertexPos[i].y;
        }
    }

    FLUID.HeightFieldWaterWithVel.prototype.update.call(this, dt);
};
FLUID.PipeModelWater.prototype.sim = function (dt) {

    var i, j, idx;
    var vertexPos = this.geometry.vertices;
    var resMinusOne = this.res - 1;

    //fix dt
    var substeps = 5;  //TODO: maybe this should be dynamically set based on CFL
    dt = 1.0 / 60.0 / substeps;

    //add sources and obstacles first
    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {
            idx = i * this.res + j;

            //first of all, do not disturb things within obstacles,
            //so mask the source field with obstacle field
            this.disturbField[idx] *= this.obstacleField[idx];
            //then add source field to heights to disturb it
            this.heights[idx] += this.disturbField[idx];

            //next we can just add sources and sinks without masking
            this.heights[idx] += this.sourceField[idx];
        }
    }

    var x;
    for (x = 0; x < substeps; x++) {

        //find flux first
        var thisHeight, dHeight;
        var heightToFluxFactor = dt * this.pipeCrossSectionArea * this.gravity / this.pipeLength;
        for (i = 1; i < resMinusOne; i++) {
            for (j = 1; j < resMinusOne; j++) {

                idx = i * this.res + j;

                //if water height is below min, it cannot have outwards flux at all
                if (this.heights[idx] <= this.minWaterHeight) {
                    this.fluxL[idx] = 0;
                    this.fluxR[idx] = 0;
                    this.fluxT[idx] = 0;
                    this.fluxB[idx] = 0;
                    continue;
                }

                thisHeight = this.baseHeights[idx] + this.heights[idx];

                //find out flux in +X direction
                dHeight = thisHeight - (this.baseHeights[idx + 1] + this.heights[idx + 1]);
                this.fluxR[idx] *= this.dampingFactor;
                this.fluxR[idx] += dHeight * heightToFluxFactor;
                if (this.fluxR[idx] < 0) {
                    this.fluxR[idx] = 0;
                }

                //find out flux in -X direction
                dHeight = thisHeight - (this.baseHeights[idx - 1] + this.heights[idx - 1]);
                this.fluxL[idx] *= this.dampingFactor;
                this.fluxL[idx] += dHeight * heightToFluxFactor;
                if (this.fluxL[idx] < 0) {
                    this.fluxL[idx] = 0;
                }

                //find out flux in +Z direction
                dHeight = thisHeight - (this.baseHeights[idx + this.res] + this.heights[idx + this.res]);
                this.fluxB[idx] *= this.dampingFactor;
                this.fluxB[idx] += dHeight * heightToFluxFactor;
                if (this.fluxB[idx] < 0) {
                    this.fluxB[idx] = 0;
                }

                //find out flux in -Z direction
                dHeight = thisHeight - (this.baseHeights[idx - this.res] + this.heights[idx - this.res]);
                this.fluxT[idx] *= this.dampingFactor;
                this.fluxT[idx] += dHeight * heightToFluxFactor;
                if (this.fluxT[idx] < 0) {
                    this.fluxT[idx] = 0;
                }
            }
        }
        //set flux to boundaries to zero
        //LEFT
        j = 0;
        for (i = 1; i < this.res; i++) {
            idx = i * this.res + j;
            this.fluxL[idx + 1] = 0;
        }
        //RIGHT
        j = this.res - 1;
        for (i = 1; i < this.res; i++) {
            idx = i * this.res + j;
            this.fluxR[idx - 1] = 0;
        }
        //TOP
        i = 0;
        for (j = 1; j < this.res; j++) {
            idx = i * this.res + j;
            this.fluxT[idx + this.res] = 0;
        }
        //BOTTOM
        i = this.res - 1;
        for (j = 1; j < this.res; j++) {
            idx = i * this.res + j;
            this.fluxB[idx - this.res] = 0;
        }

        //stop flow velocity if pipe flows to an obstacle
        if (this.obstaclesActive) {
            var obstacleIds = Object.keys(this.obstacles);
            var obstacle;
            var len = obstacleIds.length;
            for (i = 0; i < len; i++) {
                obstacle = this.obstacles[obstacleIds[i]];
            }
        }

        //scale down outflow if it is more than available volume in the column
        var currVol, outVol, scaleAmt;
        for (i = 1; i < resMinusOne; i++) {
            for (j = 1; j < resMinusOne; j++) {

                idx = i * this.res + j;

                currVol = (this.heights[idx] - this.minWaterHeight) * this.segmentSizeSquared;
                outVol = dt * (this.fluxR[idx] + this.fluxL[idx] + this.fluxB[idx] + this.fluxT[idx]);
                if (outVol > currVol) {
                    scaleAmt = currVol / outVol;
                    if (isFinite(scaleAmt)) {
                        this.fluxL[idx] *= scaleAmt;
                        this.fluxR[idx] *= scaleAmt;
                        this.fluxB[idx] *= scaleAmt;
                        this.fluxT[idx] *= scaleAmt;
                    }
                }
            }
        }

        //find new heights and velocity
        var fluxIn, fluxOut, dV, avgWaterHeight;
        for (i = 1; i < resMinusOne; i++) {
            for (j = 1; j < resMinusOne; j++) {

                idx = i * this.res + j;

                fluxOut = this.fluxR[idx] + this.fluxL[idx] + this.fluxB[idx] + this.fluxT[idx];
                fluxIn = this.fluxR[idx - 1] + this.fluxL[idx + 1] + this.fluxB[idx - this.res] + this.fluxT[idx + this.res];
                dV = (fluxIn - fluxOut) * dt;

                this.dHeights[idx] = dV / (this.segmentSize * this.segmentSize);
                avgWaterHeight = this.heights[idx];
                this.heights[idx] += this.dHeights[idx];
                if (this.heights[idx] < this.minWaterHeight) {  //this will still happen, in very small amounts
                    this.heights[idx] = this.minWaterHeight;
                }
                avgWaterHeight = 0.5 * (avgWaterHeight + this.heights[idx]);

                //update velocities
                //horizontal velocity comes from amount of water passing through per unit time
                if (avgWaterHeight === 0) {  //prevent division by 0
                    this.vel[idx].x = 0;
                    this.vel[idx].z = 0;
                } else {
                    this.vel[idx].x = 0.5 * (this.fluxR[idx - 1] - this.fluxL[idx] + this.fluxR[idx] - this.fluxL[idx + 1]) / (this.segmentSize * avgWaterHeight);
                    this.vel[idx].z = 0.5 * (this.fluxB[idx - this.res] - this.fluxT[idx] + this.fluxB[idx] - this.fluxT[idx + this.res]) / (this.segmentSize * avgWaterHeight);
                }
                //vertical velocity to come from change in height
                this.vel[idx].y = this.dHeights[idx];
            }
        }
    }

    //update vertex heights
    for (i = 1; i < resMinusOne; i++) {
        for (j = 1; j < resMinusOne; j++) {
            idx = i * this.res + j;
            vertexPos[idx].y = this.baseHeights[idx] + this.heights[idx];
        }
    }
    this.__matchEdges();

    //update mesh
    this.__updateMesh();
};
FLUID.PipeModelWater.prototype.__matchEdges = function () {

    var i, j, idx;
    var vertexPos = this.geometry.vertices;
    var resMinusOne = this.res - 1;

    //match the sides
    //LEFT
    j = 0;
    for (i = 1; i < resMinusOne; i++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx + 1].y;
    }
    //RIGHT
    j = this.res - 1;
    for (i = 1; i < resMinusOne; i++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx - 1].y;
    }
    //TOP
    i = 0;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx + this.res].y;
    }
    //BOTTOM
    i = this.res - 1;
    for (j = 1; j < resMinusOne; j++) {
        idx = i * this.res + j;
        vertexPos[idx].y = vertexPos[idx - this.res].y;
    }

    //match corners
    idx = 0;
    vertexPos[idx].y = 0.5 * (vertexPos[idx + 1].y + vertexPos[idx + this.res].y);
    idx = this.res - 1;
    vertexPos[idx].y = 0.5 * (vertexPos[idx - 1].y + vertexPos[idx + this.res].y);
    idx = this.res * (this.res - 1);
    vertexPos[idx].y = 0.5 * (vertexPos[idx + 1].y + vertexPos[idx - this.res].y);
    idx = this.res * this.res - 1;
    vertexPos[idx].y = 0.5 * (vertexPos[idx - 1].y + vertexPos[idx - this.res].y);
};