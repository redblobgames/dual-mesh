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
    let mesh_in = create_mesh(100.0);
    let mesh_out = new TriangleMesh(serialize_mesh(mesh_in));
    test.equal(mesh_in.num_boundary_vertices, mesh_out.num_boundary_vertices);
    test.equal(mesh_in.num_solid_edges, mesh_out.num_solid_edges);
    test.deepEqual(mesh_in.edges, mesh_out.edges);
    test.deepEqual(mesh_in.opposites, mesh_out.opposites);
    // Floats don't survive the round trip because I write them as float32 instead of doubles
    test.deepEqual(mesh_in.vertices.map((p) => p.map(Math.round)),
                   mesh_out.vertices.map((p) => p.map(Math.round)));
    test.end();
});

