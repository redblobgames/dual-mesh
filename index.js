// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

'use strict';

/**
 * Represent a triangle mesh with:
 *   - Edges (e)
 *   - Vertices (v)
 *   - Triangles (t)
 *
 * Each element has an id:
 *   - 0 <= e < num_edges
 *   - 0 <= v < num_vertices
 *   - 0 <= t < num_triangles
 *
 * Naming convention: x_name_y takes x (e, v, t) as input and produces
 * y (e, v, t) as output. If the output isn't a mesh index (e, v, t)
 * then the _y suffix is omitted.
 * 
 * The mesh has no boundaries; it wraps around the "back" using a
 * "ghost" vertex. Some vertices are marked as the boundary; these are
 * connected to the ghost vertex. Ghost triangles and ghost edges
 * connect these boundary vertices to the ghost vertex. Elements that
 * aren't "ghost" are called "solid".
 */
class TriangleMesh {
    static e_to_t(e)      { return (e/3) | 0; }
    static e_prev_e(e) { return (e % 3 == 0) ? e+2 : e-1; }
    static e_next_e(e) { return (e % 3 == 2) ? e-2 : e+1; }

    /** 
     * constructor takes partial mesh information and fills in the rest; the
     * partial information is generated in create.js or in deserialize.js
     */
    constructor ({num_boundary_vertices, num_solid_edges, vertices, edges, opposites}) {
        Object.assign(this, {num_boundary_vertices, num_solid_edges, vertices, edges, opposites});

        this.num_edges = this.edges.length;
        this.num_vertices = this.vertices.length;
        this.num_solid_vertices = this.num_vertices - 1;
        this.num_triangles = this.num_edges / 3;
        this.num_solid_triangles = this.num_solid_edges / 3;
        
        // Construct an index for finding all edges connected to a vertex
        this.starts = new Int32Array(this.num_vertices);
        for (let e = 0; e < this.edges.length; e++) {
            this.starts[this.edges[e]] = this.starts[this.edges[e]] || e;
        }

        // Construct triangle coordinates
        this.centers = new Array(this.num_triangles);
        for (let e = 0; e < this.edges.length; e += 3) {
            let a = this.vertices[this.edges[e]],
                b = this.vertices[this.edges[e+1]],
                c = this.vertices[this.edges[e+2]];
            if (this.e_ghost(e)) {
                // ghost triangle center is just outside the unpaired edge
                let dx = b[0]-a[0], dy = b[1]-a[1];
                this.centers[e/3] = [a[0] + 0.5*(dx+dy), a[1] + 0.5*(dy-dx)];
            } else {
                // solid triangle center is at the centroid
                this.centers[e/3] = [(a[0] + b[0] + c[0])/3,
                                     (a[1] + b[1] + c[1])/3];
            }
        }
    }

    e_begin_v(e)  { return this.edges[e]; }
    e_end_v(e)    { return this.edges[TriangleMesh.e_next_e(e)]; }

    t_circulate_e(e_out, t) { e_out.length = 3; for (let i = 0; i < 3; i++) { e_out[i] = 3*t + i; } return e_out; }
    t_circulate_v(v_out, t) { v_out.length = 3; for (let i = 0; i < 3; i++) { v_out[i] = this.edges[3*t+i]; } return v_out; }
    t_circulate_t(t_out, t) { t_out.length = 3; for (let i = 0; i < 3; i++) { t_out[i] = TriangleMesh.e_to_t(this.opposites[3*t+i]); } return t_out; }
    
    v_circulate_e(e_out, v) {
        const e0 = this.starts[v];
        let e = e0;
        e_out.length = 0;
        do {
            e_out.push(e);
            e = TriangleMesh.e_next_e(this.opposites[e]);
        } while (e != e0);
        return e_out;
    }

    v_circulate_v(v_out, v) {
        const e0 = this.starts[v];
        let e = e0;
        v_out.length = 0;
        do {
            v_out.push(this.e_end_v(e));
            e = TriangleMesh.e_next_e(this.opposites[e]);
        } while (e != e0);
        return v_out;
    }
    
    v_circulate_t(t_out, v) {
        const e0 = this.starts[v];
        let e = e0;
        t_out.length = 0;
        do {
            t_out.push(TriangleMesh.e_to_t(e));
            e = TriangleMesh.e_next_e(this.opposites[e]);
        } while (e != e0);
        return t_out;
    }

    ghost_v()     { return this.num_vertices - 1; }
    e_ghost(e)    { return e >= this.num_solid_edges; }
    v_ghost(v)    { return v == this.num_vertices - 1; }
    t_ghost(t)    { return this.e_ghost(3 * t); }
    e_boundary(e) { return this.e_ghost(e) && (e % 3 == 0); }
    v_boundary(v) { return v < this.num_boundary_vertices; }
}

module.exports = TriangleMesh;

