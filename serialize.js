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
function serializeMesh({numBoundaryVertices, numSolidEdges, vertices, edges, opposites}) {
    const uintSizeEdges = vertices.length < (1 << 16)? 2 : 4;
    const uintSizeOpposites = edges.length < (1 << 16)? 2 : 4;
    let sizeHeader = 4 + 4 + 4 + 4;
    let sizeVertices = vertices.length * 2 * 4;
    let sizeEdges = edges.length * uintSizeEdges;
    let size_opposites = opposites.length * uintSizeOpposites;
    let arraybuffer = new ArrayBuffer(sizeHeader + sizeVertices + sizeEdges + size_opposites);
    
    let dv = new DataView(arraybuffer);

    // header
    dv.setUint32(0, vertices.length);
    dv.setUint32(4, numBoundaryVertices);
    dv.setUint32(8, edges.length);
    dv.setUint32(12, numSolidEdges);

    // vertices
    let p = 16;
    for (let i = 0; i < vertices.length; i++) {
        dv.setFloat32(p, vertices[i][0]); p += 4;
        dv.setFloat32(p, vertices[i][1]); p += 4;
    }

    // edges, opposites
    new (uintSizeEdges == 2? Int16Array : Int32Array)(arraybuffer, p, edges.length).set(edges);
    p += edges.length * uintSizeEdges;
    new (uintSizeOpposites == 2? Int16Array : Int32Array)(arraybuffer, p, edges.length).set(opposites);
    p += edges.length * uintSizeOpposites;
    
    // check
    if (p != arraybuffer.byteLength) { throw("miscalculated buffer length"); }
    return arraybuffer;
}


module.exports = serializeMesh;
