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
 * edges: UInt{16,32}Array[num_edges] -- UInt16 if num_vertices < (1<<16)
 * opposites: UInt{16,32}Array[num_edges] -- UInt32 if num_edges < (1<<16)
 */
function serialize_mesh({num_boundary_vertices, num_solid_edges, vertices, edges, opposites}) {
    const uint_size_edges = vertices.length < (1 << 16)? 2 : 4;
    const uint_size_opposites = edges.length < (1 << 16)? 2 : 4;
    let size_header = 4 + 4 + 4 + 4;
    let size_vertices = vertices.length * 2 * 4;
    let size_edges = edges.length * uint_size_edges;
    let size_opposites = opposites.length * uint_size_opposites;
    let arraybuffer = new ArrayBuffer(size_header + size_vertices + size_edges + size_opposites);
    
    let dv = new DataView(arraybuffer);

    // header
    dv.setUint32(0, vertices.length);
    dv.setUint32(4, num_boundary_vertices);
    dv.setUint32(8, edges.length);
    dv.setUint32(12, num_solid_edges);

    // vertices
    let p = 16;
    for (let i = 0; i < vertices.length; i++) {
        dv.setFloat32(p, vertices[i][0]); p += 4;
        dv.setFloat32(p, vertices[i][1]); p += 4;
    }

    // edges, opposites
    new (uint_size_edges == 2? Int16Array : Int32Array)(arraybuffer, p, edges.length).set(edges);
    p += edges.length * uint_size_edges;
    new (uint_size_opposites == 2? Int16Array : Int32Array)(arraybuffer, p, edges.length).set(opposites);
    p += edges.length * uint_size_opposites;
    
    // check
    if (p != arraybuffer.byteLength) { throw("miscalculated buffer length"); }
    return arraybuffer;
}


module.exports = serialize_mesh;
