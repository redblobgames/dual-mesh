/*
 * From https://github.com/redblobgames/dual-mesh
 * Copyright 2017 Red Blob Games <redblobgames@gmail.com>
 * License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
 */

/**
 * Serialize graph data {_r_vertex, _triangles, numBoundaryRegions, numSolidSides, _halfedges}
 * to a binary (arraybuffer), in this format:
 *
 * numRegions: int32
 * numBoundaryRegions: int32 -- s < numBoundaryRegions are on the boundary
 * numSides: int32
 * numSolidSides: int32 -- s >= numSolidSides are ghost
 * _r_vertex: Float32Array[2*numRegions] -- the x,y positions
 * _triangles: UInt{16,32}Array[numSides] -- UInt16 if numRegions < (1<<16)
 * _halfedges: UInt{16,32}Array[numSides] -- UInt32 if numSides < (1<<16)
 */
function serializeMesh({numBoundaryRegions, numSolidSides, _r_vertex, _triangles, _halfedges}) {
    const uintSizeSides = _r_vertex.length < (1 << 16)? 2 : 4;
    const uintSizeOpposites = _triangles.length < (1 << 16)? 2 : 4;
    let sizeHeader = 4 + 4 + 4 + 4;
    let sizeRegions = _r_vertex.length * 2 * 4;
    let sizeSides = _triangles.length * uintSizeSides;
    let sizeOpposites = _halfedges.length * uintSizeOpposites;
    let arraybuffer = new ArrayBuffer(sizeHeader + sizeRegions + sizeSides + sizeOpposites);
    
    let dv = new DataView(arraybuffer);

    // header
    dv.setUint32(0, _r_vertex.length);
    dv.setUint32(4, numBoundaryRegions);
    dv.setUint32(8, _triangles.length);
    dv.setUint32(12, numSolidSides);

    // region
    let p = 16;
    for (let i = 0; i < _r_vertex.length; i++) {
        dv.setFloat32(p, _r_vertex[i][0]); p += 4;
        dv.setFloat32(p, _r_vertex[i][1]); p += 4;
    }

    // sides
    new (uintSizeSides == 2? Int16Array : Int32Array)(arraybuffer, p, _triangles.length).set(_triangles);
    p += _triangles.length * uintSizeSides;
    new (uintSizeOpposites == 2? Int16Array : Int32Array)(arraybuffer, p, _triangles.length).set(_halfedges);
    p += _triangles.length * uintSizeOpposites;
    
    // check
    if (p != arraybuffer.byteLength) { throw("miscalculated buffer length"); }
    return arraybuffer;
}


module.exports = serializeMesh;
