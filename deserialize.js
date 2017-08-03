// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

/**
 * Deserialize binary graph data; see serialize.js for format
 */
function deserialize_mesh(arraybuffer) {
    let dv = new DataView(arraybuffer);

    // header
    let num_vertices = dv.getUint32(0);
    let num_boundary_vertices = dv.getUint32(4);
    let num_edges = dv.getUint32(8);
    let num_solid_edges = dv.getUint32(12);

    // vertices
    let p = 16;
    let vertices = [];
    for (let i = 0; i < num_vertices; i++) {
        vertices.push([dv.getFloat32(p), dv.getFloat32(p+4)]);
        p += 8;
    }

    // edges, opposites
    const uint_size = (num_edges >= (1 << 16))? 4 : 2;
    let edges = new (uint_size == 2? Int16Array : Int32Array)(arraybuffer, p, num_edges);
    p += num_edges * uint_size;
    let opposites = new (uint_size == 2? Int16Array : Int32Array)(arraybuffer, p, num_edges);
    p += num_edges * uint_size;

    // check
    if (p != arraybuffer.byteLength) { throw "miscalculated buffer length"; }
    return {num_boundary_vertices, num_solid_edges, vertices, edges, opposites};
}

module.exports = deserialize_mesh;
