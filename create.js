// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

/*
 * Generate a random triangle mesh for the area 0 <= x <= 1000, 0 <= y <= 1000
 *
 * This program runs on the command line (node)
 *
 */

let fs = require('fs');
let Poisson = require('poisson-disk-sampling');
let Delaunator = require('delaunator');

function e_to_next_e(e) { return (e % 3 == 2) ? e-2 : e+1; }

/* Write graph data to a file, in this format:
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
function write_graph(name, graph) {
    // NOTE: file could be smaller sometimes if I separately chose format for 'edges'
    // (which contains numbers < graph.vertices.length) and 'opposites' (which contains
    // numbers < graph.edges.length). This would primarily affect the DECAKILOPOINTS
    // data set by saving 20%. But that's the file I use most so maybe it's worth
    // switching. The other way to make the files smaller is to use zlib compression
    // and then use pako.js to decompress. I'd be able to save 1.5MB in DECAKILOPOINTS
    // and pako_deflate.min.js is only 27kB.
    const uint_size = graph.edges.length < (1 << 16)? 2 : 4;
    let arraybuffer = new ArrayBuffer(4 + 4 + 4 + 4
                                      + graph.vertices.length * 2 * 4
                                      + graph.edges.length * 2 * uint_size);
    let dv = new DataView(arraybuffer);
    dv.setUint32(0, graph.vertices.length);
    dv.setUint32(4, graph.num_boundary_vertices);
    dv.setUint32(8, graph.edges.length);
    dv.setUint32(12, graph.num_solid_edges);
    let p = 16;
    for (let i = 0; i < graph.vertices.length; i++) {
        dv.setFloat32(p, graph.vertices[i][0]); p += 4;
        dv.setFloat32(p, graph.vertices[i][1]); p += 4;
    }
    for (let i = 0; i < graph.edges.length; i++) {
        if (uint_size == 2) {
            dv.setUint16(p, graph.edges[i]); p += uint_size;
            dv.setUint16(p, graph.opposites[i]); p += uint_size;
        } else {
            dv.setUint32(p, graph.edges[i]); p += uint_size;
            dv.setUint32(p, graph.opposites[i]); p += uint_size;
        }
    }
    if (p != arraybuffer.byteLength) {
        console.log("  ERROR: miscalculated buffer length");
    } else {
        console.log(`  Writing ${name}.graphdata:  ${graph.vertices.length} vertices,  ${graph.edges.length/3} triangles,  ${graph.edges.length} edges (${uint_size} bytes/edge),  ${p} bytes`);
        fs.writeFileSync(name + ".graphdata", Buffer.from(arraybuffer));
    }
}

    
function check_point_quality({vertices, edges, opposites}) {
    // TODO: check for collinear vertices. Around each red point P if
    // there's a point Q and R both connected to it, and the angle P→Q and
    // the angle P→R are 180° apart, then there's collinearity. This would
    // indicate an issue with poisson disc point selection.
}


function check_triangle_quality({vertices, edges, opposites}) {
    // check for skinny triangles
    const bad_angle_limit = 30;
    let summary = new Array(bad_angle_limit).fill(0);
    for (let e = 0; e < edges.length; e++) {
        let v0 = edges[e],
            v1 = edges[e_to_next_e(e)],
            v2 = edges[e_to_next_e(e_to_next_e(e))];
        let p0 = vertices[v0],
            p1 = vertices[v1],
            p2 = vertices[v2];
        let d0 = [p0[0]-p1[0], p0[1]-p1[1]];
        let d2 = [p2[0]-p1[0], p2[1]-p1[1]];
        let dot_product = d0[0] * d2[0] + d0[1] + d2[1];
        let angle_degrees = 180 / Math.PI * Math.acos(dot_product);
        if (angle_degrees < bad_angle_limit) {
            summary[angle_degrees|0]++;
        }
    }
    // NOTE: a much faster test would be the ratio of the inradius to
    // the circumradius, but as I'm generating these offline, I'm not
    // worried about speed right now
    
    // TODO: consider adding circumcenters of skinny triangles to the point set
    console.log('  bad angles:', summary.join(" "));
}


function check_mesh_connectivity({vertices, edges, opposites}) {
    // 1. make sure each edge's opposite is back to itself
    // 2. make sure vertex-circulating starting from each edge works
    let ghost_vertex = vertices.length - 1, out = [];
    for (let e0 = 0; e0 < edges.length; e0++) {
        if (opposites[opposites[e0]] !== e0) {
            console.log(`FAIL opposites[opposites[${e0}] !== ${e0}`);
        }
        let e = e0, count = 0;
        out.length = 0;
        do {
            count++; out.push(e);
            e = e_to_next_e(opposites[e]);
            if (count > 100 && edges[e0] !== ghost_vertex) {
                console.log(`FAIL to circulate around vertex with start edge=${e0} from vertex ${edges[e0]} to ${edges[e_to_next_e(e0)]}, out=${out}`);
                break;
            }
        } while (e !== e0);
    }
}


function add_boundary_vertices(spacing, size) {
    let N = Math.ceil(size/spacing);
    if (N % 2 == 1) { N++; } // needs to be even so that the stagger ends at 0
    let vertices = [];
    for (let i = 0; i <= N; i++) {
        let w = size * i / N;
        let stagger = spacing * (i % 2);
        vertices.push([stagger, w], [size-stagger, w]);
        if (1 < i && i < N-1) {
            // Corners get duplicated, skip them
            vertices.push([w, stagger], [w, size-stagger]);
        }
    }
    return vertices;
}


function add_ghost_structure({vertices, edges, opposites}) {
    const num_solid_edges = edges.length;
    const ghost_vertex = vertices.length;
    
    let num_unpaired_edges = 0, first_unpaired_edge = -1;
    let unpaired = []; // seed to edge
    for (let e = 0; e < num_solid_edges; e++) {
        if (opposites[e] === -1) {
            num_unpaired_edges++;
            unpaired[edges[e]] = e;
            first_unpaired_edge = e;
        }
    }

    let new_vertices = vertices.concat([[500, 500]]);
    let new_edges = new Int32Array(num_solid_edges + 3 * num_unpaired_edges);
    new_edges.set(edges);
    let new_opposites = new Int32Array(num_solid_edges + 3 * num_unpaired_edges);
    new_opposites.set(opposites);

    for (let i = 0, e = first_unpaired_edge;
         i < num_unpaired_edges;
         i++, e = unpaired[new_edges[e_to_next_e(e)]]) {

        // Construct a ghost edge for e
        let ghost_edge = num_solid_edges + 3 * i;
        new_opposites[e] = ghost_edge;
        new_opposites[ghost_edge] = e;
        new_edges[ghost_edge] = new_edges[e_to_next_e(e)];
        
        // Construct the rest of the ghost triangle
        new_edges[ghost_edge + 1] = new_edges[e];
        new_edges[ghost_edge + 2] = ghost_vertex;
        let k = num_solid_edges + (3 * i + 4) % (3 * num_unpaired_edges);
        new_opposites[ghost_edge + 2] = k;
        new_opposites[k] = ghost_edge + 2;
    }

    return {
        num_solid_edges,
        vertices: new_vertices,
        edges: new_edges,
        opposites: new_opposites
    };
}


function generate(name, spacing) {
    console.time(name);
    let generator = new Poisson([1000, 1000], spacing);
    let boundary_vertices = add_boundary_vertices(spacing, 1000);
    boundary_vertices.forEach((p) => generator.addPoint(p));
    let vertices = generator.fill();

    let delaunator = new Delaunator(vertices);
    let graph = {
        vertices,
        edges: delaunator.triangles,
        opposites: delaunator.halfedges
    };

    check_point_quality(graph);
    check_triangle_quality(graph);
    
    graph = add_ghost_structure(graph);
    graph.num_boundary_vertices = boundary_vertices.length;
    check_mesh_connectivity(graph);
    
    console.timeEnd(name);
    write_graph(name, graph);
    // if (name == 'DECAPOINTS') {
    //     console.log(`vertices=${graph.vertices.length}, boundary=${graph.num_boundary_vertices}, edges=${graph.edges.length}, solid=${graph.num_solid_edges}`);
    //     console.log('edges=',JSON.stringify(graph.edges));
    //     console.log('opposites=',JSON.stringify(graph.opposites));
    // }
}

generate('DECAPOINTS', Math.pow(10, 2.0));
generate('HECTOPOINTS', Math.pow(10, 1.5));
generate('KILOPOINTS', Math.pow(10, 1.0));
generate('DECAKILOPOINTS', Math.pow(10, 0.5));

// These two are big and I'm not using them right now:
// generate('HECTOKILOPOINTS', Math.pow(10, 0.0));
// generate('MEGAPOINTS', Math.pow(10, -0.5));
