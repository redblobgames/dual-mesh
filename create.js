// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

/*
 * Generate a random triangle mesh for the area 0 <= x <= 1000, 0 <= y <= 1000
 *
 * This program runs on the command line (node)
 *
 */

'use strict';

let Poisson = require('poisson-disk-sampling'); // MIT licensed
let Delaunator = require('delaunator');        // ISC licensed

function e_next_e(e) { return (e % 3 == 2) ? e-2 : e+1; }


function checkPointInequality({vertices, edges, opposites}) {
    // TODO: check for collinear vertices. Around each red point P if
    // there's a point Q and R both connected to it, and the angle P→Q and
    // the angle P→R are 180° apart, then there's collinearity. This would
    // indicate an issue with poisson disc point selection.
}


function checkTriangleInequality({vertices, edges, opposites}) {
    // check for skinny triangles
    const bad_angle_limit = 30;
    let summary = new Array(bad_angle_limit).fill(0);
    let count = 0;
    for (let e = 0; e < edges.length; e++) {
        let v0 = edges[e],
            v1 = edges[e_next_e(e)],
            v2 = edges[e_next_e(e_next_e(e))];
        let p0 = vertices[v0],
            p1 = vertices[v1],
            p2 = vertices[v2];
        let d0 = [p0[0]-p1[0], p0[1]-p1[1]];
        let d2 = [p2[0]-p1[0], p2[1]-p1[1]];
        let dot_product = d0[0] * d2[0] + d0[1] + d2[1];
        let angle_degrees = 180 / Math.PI * Math.acos(dot_product);
        if (angle_degrees < bad_angle_limit) {
            summary[angle_degrees|0]++;
            count++;
        }
    }
    // NOTE: a much faster test would be the ratio of the inradius to
    // the circumradius, but as I'm generating these offline, I'm not
    // worried about speed right now
    
    // TODO: consider adding circumcenters of skinny triangles to the point set
    if (count > 0) {
        console.log('  bad angles:', summary.join(" "));
    }
}


function checkMeshConnectivity({vertices, edges, opposites}) {
    // 1. make sure each edge's opposite is back to itself
    // 2. make sure vertex-circulating starting from each edge works
    let ghost_v = vertices.length - 1, out_e = [];
    for (let e0 = 0; e0 < edges.length; e0++) {
        if (opposites[opposites[e0]] !== e0) {
            console.log(`FAIL opposites[opposites[${e0}]] !== ${e0}`);
        }
        let e = e0, count = 0;
        out_e.length = 0;
        do {
            count++; out_e.push(e);
            e = e_next_e(opposites[e]);
            if (count > 100 && edges[e0] !== ghost_v) {
                console.log(`FAIL to circulate around vertex with start edge=${e0} from vertex ${edges[e0]} to ${edges[e_next_e(e0)]}, out_e=${out_e}`);
                break;
            }
        } while (e !== e0);
    }
}


/*
 * Add vertices evenly along the boundary of the mesh;
 * use a slight curve so that the Delaunay triangulation
 * doesn't make long thing triangles along the boundary.
 * These points also prevent the Poisson disc generator
 * from making uneven points near the boundary.
 */
function addBoundaryVertices(spacing, size) {
    let N = Math.ceil(size/spacing);
    let vertices = [];
    for (let i = 0; i <= N; i++) {
        let t = (i + 0.5) / (N + 1);
        let w = size * t;
        let offset = Math.pow(t - 0.5, 2);
        vertices.push([offset, w], [size-offset, w]);
        vertices.push([w, offset], [w, size-offset]);
    }
    return vertices;
}


function addGhostStructure({vertices, edges, opposites}) {
    const numSolidEdges = edges.length;
    const ghost_v = vertices.length;
    
    let numUnpairedEdges = 0, firstUnpairedEdge = -1;
    let unpaired = []; // seed to edge
    for (let e = 0; e < numSolidEdges; e++) {
        if (opposites[e] === -1) {
            numUnpairedEdges++;
            unpaired[edges[e]] = e;
            firstUnpairedEdge = e;
        }
    }

    let newVertices = vertices.concat([[500, 500]]);
    let newEdges = new Int32Array(numSolidEdges + 3 * numUnpairedEdges);
    newEdges.set(edges);
    let newOpposites = new Int32Array(numSolidEdges + 3 * numUnpairedEdges);
    newOpposites.set(opposites);

    for (let i = 0, e = firstUnpairedEdge;
         i < numUnpairedEdges;
         i++, e = unpaired[newEdges[e_next_e(e)]]) {

        // Construct a ghost edge for e
        let ghost_e = numSolidEdges + 3 * i;
        newOpposites[e] = ghost_e;
        newOpposites[ghost_e] = e;
        newEdges[ghost_e] = newEdges[e_next_e(e)];
        
        // Construct the rest of the ghost triangle
        newEdges[ghost_e + 1] = newEdges[e];
        newEdges[ghost_e + 2] = ghost_v;
        let k = numSolidEdges + (3 * i + 4) % (3 * numUnpairedEdges);
        newOpposites[ghost_e + 2] = k;
        newOpposites[k] = ghost_e + 2;
    }

    return {
        numSolidEdges,
        vertices: newVertices,
        edges: newEdges,
        opposites: newOpposites
    };
}


function createMesh(spacing, random=Math.random) {
    let generator = new Poisson([1000, 1000], spacing, undefined, undefined, random);
    let boundaryVertices = addBoundaryVertices(spacing, 1000);
    boundaryVertices.forEach((p) => generator.addPoint(p));
    let vertices = generator.fill();

    let delaunator = new Delaunator(vertices);
    let graph = {
        vertices,
        edges: delaunator.triangles,
        opposites: delaunator.halfedges
    };

    checkPointInequality(graph);
    checkTriangleInequality(graph);
    
    graph = addGhostStructure(graph);
    graph.numBoundaryVertices = boundaryVertices.length;
    checkMeshConnectivity(graph);

    return graph;
}


module.exports = createMesh;
