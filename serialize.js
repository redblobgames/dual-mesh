// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

/**
 * Serialize graph data {vertices, edges, num_boundary_vertices, num_solid_edges, opposites}
 * to a binary (arraybuffer), in this format:
 *
 * num_vertices: int32
 * num_boundary_vertices: int32 -- s < num_boundary_vertices are on the boundary
 * num_edges: int32
 * num_solid_edges: int32 -- e >= num_solid_edges are ghost
 * vertices: Float32Array[2*num_vertices] -- the x,y positions
 * halfedges: UIntArray[2*num_edges] -- 'edges' and 'opposites'
 *
 * UintArray = Uint16Array if num_edges < (1<<16) or Uint32Array otherwise
 */
function serialize_mesh({num_boundary_vertices, num_solid_edges, vertices, edges, opposites}) {
    // NOTE: file could be smaller sometimes if I separately chose format for 'edges'
    // (which contains numbers < graph.vertices.length) and 'opposites' (which contains
    // numbers < graph.edges.length). This would primarily affect the DECAKILOPOINTS
    // data set by saving 20%. But that's the file I use most so maybe it's worth
    // switching. The other way to make the files smaller is to use zlib compression
    // and then use pako.js to decompress. I'd be able to save 1.5MB in DECAKILOPOINTS
    // and pako_deflate.min.js is only 27kB.
    const uint_size = edges.length < (1 << 16)? 2 : 4;
    let arraybuffer = new ArrayBuffer(4 + 4 + 4 + 4
                                      + vertices.length * 2 * 4
                                      + edges.length * 2 * uint_size);
    let dv = new DataView(arraybuffer);
    dv.setUint32(0, vertices.length);
    dv.setUint32(4, num_boundary_vertices);
    dv.setUint32(8, edges.length);
    dv.setUint32(12, num_solid_edges);
    let p = 16;
    for (let i = 0; i < vertices.length; i++) {
        dv.setFloat32(p, vertices[i][0]); p += 4;
        dv.setFloat32(p, vertices[i][1]); p += 4;
    }
    for (let i = 0; i < edges.length; i++) {
        if (uint_size == 2) {
            dv.setUint16(p, edges[i]); p += uint_size;
            dv.setUint16(p, opposites[i]); p += uint_size;
        } else {
            dv.setUint32(p, edges[i]); p += uint_size;
            dv.setUint32(p, opposites[i]); p += uint_size;
        }
    }
    if (p != arraybuffer.byteLength) {
        throw("miscalculated buffer length");
    }
    return arraybuffer;
}


module.exports = serialize_mesh;
