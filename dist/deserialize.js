"use strict";

/*
 * From https://github.com/redblobgames/dual-mesh
 * Copyright 2017 Red Blob Games <redblobgames@gmail.com>
 * License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
 */

/**
 * Deserialize binary graph data; see serialize.js for format
 */
function deserializeMesh(arraybuffer) {
    var dv = new DataView(arraybuffer);

    // header
    var numRegions = dv.getUint32(0);
    var numBoundaryRegions = dv.getUint32(4);
    var numSides = dv.getUint32(8);
    var numSolidSides = dv.getUint32(12);

    // regions
    var p = 16;
    var _r_vertex = [];
    for (var i = 0; i < numRegions; i++) {
        _r_vertex.push([dv.getFloat32(p), dv.getFloat32(p + 4)]);
        p += 8;
    }

    // sides
    var uintSizeSides = numRegions < 1 << 16 ? 2 : 4;
    var uintSizeOpposites = numSides < 1 << 16 ? 2 : 4;

    var _s_start_r = new (uintSizeSides == 2 ? Int16Array : Int32Array)(arraybuffer, p, numSides);
    p += numSides * uintSizeSides;
    var _s_opposite_s = new (uintSizeOpposites == 2 ? Int16Array : Int32Array)(arraybuffer, p, numSides);
    p += numSides * uintSizeOpposites;

    // check
    if (p != arraybuffer.byteLength) {
        throw "miscalculated buffer length";
    }
    return { numBoundaryRegions: numBoundaryRegions, numSolidSides: numSolidSides, _r_vertex: _r_vertex, _s_start_r: _s_start_r, _s_opposite_s: _s_opposite_s };
}

module.exports = deserializeMesh;