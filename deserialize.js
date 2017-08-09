// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

/**
 * Deserialize binary graph data; see serialize.js for format
 */
function deserializeMesh(arraybuffer) {
    let dv = new DataView(arraybuffer);

    // header
    let numVertices = dv.getUint32(0);
    let numBoundaryVertices = dv.getUint32(4);
    let numEdges = dv.getUint32(8);
    let numSolidEdges = dv.getUint32(12);

    // vertices
    let p = 16;
    let vertices = [];
    for (let i = 0; i < numVertices; i++) {
        vertices.push([dv.getFloat32(p), dv.getFloat32(p+4)]);
        p += 8;
    }

    // edges, opposites
    const uintSizeEdges = numVertices < (1 << 16)? 2 : 4;
    const uintSizeOpposites = numEdges < (1 << 16)? 2 : 4;
    
    let edges = new (uintSizeEdges == 2? Int16Array : Int32Array)(arraybuffer, p, numEdges);
    p += numEdges * uintSizeEdges;
    let opposites = new (uintSizeOpposites == 2? Int16Array : Int32Array)(arraybuffer, p, numEdges);
    p += numEdges * uintSizeOpposites;

    // check
    if (p != arraybuffer.byteLength) { throw "miscalculated buffer length"; }
    return {numBoundaryVertices, numSolidEdges, vertices, edges, opposites};
}

module.exports = deserializeMesh;
