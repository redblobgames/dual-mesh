// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

/**
 * Deserialize binary graph data; see serialize.js for format
 */
function deserialize_mesh(arraybuffer) {
    let dv = new DataView(arraybuffer);
    let num_vertices = dv.getUint32(0);
    let num_boundary_vertices = dv.getUint32(4);
    let num_edges = dv.getUint32(8);
    let num_solid_edges = dv.getUint32(12);
    const uint_size = (num_edges >= (1 << 16))? 4 : 2;
    let p = 16;
    let vertices = [];
    for (let i = 0; i < num_vertices; i++) {
        vertices.push([dv.getFloat32(p), dv.getFloat32(p+4)]);
        p += 8;
    }
    let edges = new Int32Array(num_edges);
    let opposites = new Int32Array(num_edges);
    for (let i = 0; i < num_edges; i++) {
        if (uint_size == 2) {
            edges[i] = dv.getUint16(p); p += uint_size;
            opposites[i] = dv.getUint16(p); p += uint_size;
        } else {
            edges[i] = dv.getUint32(p); p += uint_size;
            opposites[i] = dv.getUint32(p); p += uint_size;
        }
    }
    if (p != arraybuffer.byteLength) {
        throw "miscalculated buffer length";
    }

    return {num_boundary_vertices, num_solid_edges, vertices, edges, opposites};
}

module.exports = deserialize_mesh;
