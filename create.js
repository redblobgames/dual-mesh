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


function check_mesh_connectivity({vertices, edges, opposites}) {
    // 1. make sure each edge's opposite is back to itself
    // 2. make sure vertex-circulating starting from each edge works
    let ghost_vertex = vertices.length - 1, out = [];
    for (let e0 = 0; e0 < edges.length; e0++) {
        if (opposites[opposites[e0]] !== e0) {
            console.log(`FAIL opposites[opposites[${e0}]] !== ${e0}`);
        }
        let e = e0, count = 0;
        out.length = 0;
        do {
            count++; out.push(e);
            e = e_next_e(opposites[e]);
            if (count > 100 && edges[e0] !== ghost_vertex) {
                console.log(`FAIL to circulate around vertex with start edge=${e0} from vertex ${edges[e0]} to ${edges[e_next_e(e0)]}, out=${out}`);
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
function add_boundary_vertices(spacing, size) {
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
         i++, e = unpaired[new_edges[e_next_e(e)]]) {

        // Construct a ghost edge for e
        let ghost_edge = num_solid_edges + 3 * i;
        new_opposites[e] = ghost_edge;
        new_opposites[ghost_edge] = e;
        new_edges[ghost_edge] = new_edges[e_next_e(e)];
        
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


function create_mesh(spacing) {
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

    return graph;
}


module.exports = create_mesh;
