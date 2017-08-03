// From http://www.redblobgames.com/maps/triangle-mesh/
// Copyright 2017 Red Blob Games <redblobgames@gmail.com>
// License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>

let fs = require('fs');
let tape = require('tape');
let TriangleMesh = require('./');
let create_mesh = require('./create');
let serialize_mesh = require('./serialize');
let deserialize_mesh = require('./deserialize');

tape("encoding and decoding", function(test) {
    // Mesh spacing 5.0 lets me test the case of num_vertices < (1<<16)
    // and num_edges > (1<<16), which makes the two arrays different sizes
    let mesh_in = create_mesh(5.0);
    let mesh_out = new TriangleMesh(serialize_mesh(mesh_in));
    test.equal(mesh_in.num_boundary_vertices, mesh_out.num_boundary_vertices);
    test.equal(mesh_in.num_solid_edges, mesh_out.num_solid_edges);
    test.deepEqual(mesh_in.edges, mesh_out.edges);
    test.deepEqual(mesh_in.opposites, mesh_out.opposites);
    // Floats don't survive the round trip because I write them as float32 instead of doubles;
    // I'm testing just a subset of them to reduce noise from tape
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
            test.ok(Math.abs(mesh_in.vertices[i][j] - mesh_out.vertices[i][j]) < 0.01);
        }
    }
    test.end();
});

