/*
 * From https://github.com/redblobgames/dual-mesh
 * Copyright 2017 Red Blob Games <redblobgames@gmail.com>
 * License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
 */

/**
 * Serialize graph data {_r_vertex, _s_start_r, numBoundaryRegions, numSolidSides, _s_opposite_s}
 * to a binary (arraybuffer), in this format:
 *
 * numRegions: int32
 * numBoundaryRegions: int32 -- s < numBoundaryRegions are on the boundary
 * numSides: int32
 * numSolidSides: int32 -- s >= numSolidSides are ghost
 * _r_vertex: Float32Array[2*numRegions] -- the x,y positions
 * _s_start_r: UInt{16,32}Array[numSides] -- UInt16 if numRegions < (1<<16)
 * _s_opposite_s: UInt{16,32}Array[numSides] -- UInt32 if numSides < (1<<16)
 */
function serializeMesh({numBoundaryRegions, numSolidSides, _r_vertex, _s_start_r, _s_opposite_s}) {
    const uintSizeSides = _r_vertex.length < (1 << 16)? 2 : 4;
    const uintSizeOpposites = _s_start_r.length < (1 << 16)? 2 : 4;
    let sizeHeader = 4 + 4 + 4 + 4;
    let sizeRegions = _r_vertex.length * 2 * 4;
    let sizeSides = _s_start_r.length * uintSizeSides;
    let sizeOpposites = _s_opposite_s.length * uintSizeOpposites;
    let arraybuffer = new ArrayBuffer(sizeHeader + sizeRegions + sizeSides + sizeOpposites);
    
    let dv = new DataView(arraybuffer);

    // header
    dv.setUint32(0, _r_vertex.length);
    dv.setUint32(4, numBoundaryRegions);
    dv.setUint32(8, _s_start_r.length);
    dv.setUint32(12, numSolidSides);

    // region
    let p = 16;
    for (let i = 0; i < _r_vertex.length; i++) {
        dv.setFloat32(p, _r_vertex[i][0]); p += 4;
        dv.setFloat32(p, _r_vertex[i][1]); p += 4;
    }

    // sides
    new (uintSizeSides == 2? Int16Array : Int32Array)(arraybuffer, p, _s_start_r.length).set(_s_start_r);
    p += _s_start_r.length * uintSizeSides;
    new (uintSizeOpposites == 2? Int16Array : Int32Array)(arraybuffer, p, _s_start_r.length).set(_s_opposite_s);
    p += _s_start_r.length * uintSizeOpposites;
    
    // check
    if (p != arraybuffer.byteLength) { throw("miscalculated buffer length"); }
    return arraybuffer;
}


module.exports = serializeMesh;
