/*
 * From https://github.com/redblobgames/dual-mesh
 * Copyright 2017 Red Blob Games <redblobgames@gmail.com>
 * License: Apache v2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>
 */

'use strict';

/**
 * Represent a triangle-polygon dual mesh with:
 *   - Regions (r)
 *   - Sides (s)
 *   - Triangles (t)
 *
 * Each element has an id:
 *   - 0 <= r < numRegions
 *   - 0 <= s < numSides
 *   - 0 <= t < numTriangles
 *
 * Naming convention: x_name_y takes x (r, s, t) as input and produces
 * y (r, s, t) as output. If the output isn't a mesh index (r, s, t)
 * then the _y suffix is omitted.
 *
 * A side is directed. If two triangles t0, t1 are adjacent, there will
 * be two sides representing the boundary, one for t0 and one for t1. These
 * can be accessed with s_inner_t and s_outer_t.
 *
 * A side also represents the boundary between two regions. If two regions
 * r0, r1 are adjacent, there will be two sides representing the boundary,
 * s_begin_r and s_end_r.
 *
 * Each side will have a pair, accessed with s_opposite_s.
 *
 * The mesh has no boundaries; it wraps around the "back" using a
 * "ghost" region. Some regions are marked as the boundary; these are
 * connected to the ghost region. Ghost triangles and ghost sides
 * connect these boundary regions to the ghost region. Elements that
 * aren't "ghost" are called "solid".
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TriangleMesh = function () {
    _createClass(TriangleMesh, null, [{
        key: 's_to_t',
        value: function s_to_t(s) {
            return s / 3 | 0;
        }
    }, {
        key: 's_prev_s',
        value: function s_prev_s(s) {
            return s % 3 == 0 ? s + 2 : s - 1;
        }
    }, {
        key: 's_next_s',
        value: function s_next_s(s) {
            return s % 3 == 2 ? s - 2 : s + 1;
        }

        /**
         * constructor takes partial mesh information and fills in the rest; the
         * partial information is generated in create.js or in deserialize.js
         */

    }]);

    function TriangleMesh(_ref) {
        var numBoundaryRegions = _ref.numBoundaryRegions,
            numSolidSides = _ref.numSolidSides,
            _r_vertex = _ref._r_vertex,
            _s_start_r = _ref._s_start_r,
            _s_opposite_s = _ref._s_opposite_s;

        _classCallCheck(this, TriangleMesh);

        Object.assign(this, { numBoundaryRegions: numBoundaryRegions, numSolidSides: numSolidSides,
            _r_vertex: _r_vertex, _s_start_r: _s_start_r, _s_opposite_s: _s_opposite_s });

        this.numSides = _s_start_r.length;
        this.numRegions = _r_vertex.length;
        this.numSolidRegions = this.numRegions - 1;
        this.numTriangles = this.numSides / 3;
        this.numSolidTriangles = this.numSolidSides / 3;

        // Construct an index for finding sides connected to a region
        this._r_any_s = new Int32Array(this.numRegions);
        for (var s = 0; s < _s_start_r.length; s++) {
            this._r_any_s[_s_start_r[s]] = this._r_any_s[_s_start_r[s]] || s;
        }

        // Construct triangle coordinates
        this._t_vertex = new Array(this.numTriangles);
        for (var _s = 0; _s < _s_start_r.length; _s += 3) {
            var a = _r_vertex[_s_start_r[_s]],
                b = _r_vertex[_s_start_r[_s + 1]],
                c = _r_vertex[_s_start_r[_s + 2]];
            if (this.s_ghost(_s)) {
                // ghost triangle center is just outside the unpaired side
                var dx = b[0] - a[0],
                    dy = b[1] - a[1];
                this._t_vertex[_s / 3] = [a[0] + 0.5 * (dx + dy), a[1] + 0.5 * (dy - dx)];
            } else {
                // solid triangle center is at the centroid
                this._t_vertex[_s / 3] = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
            }
        }
    }

    _createClass(TriangleMesh, [{
        key: 'r_x',
        value: function r_x(r) {
            return this._r_vertex[r][0];
        }
    }, {
        key: 'r_y',
        value: function r_y(r) {
            return this._r_vertex[r][1];
        }
    }, {
        key: 't_x',
        value: function t_x(r) {
            return this._t_vertex[r][0];
        }
    }, {
        key: 't_y',
        value: function t_y(r) {
            return this._t_vertex[r][1];
        }
    }, {
        key: 'r_pos',
        value: function r_pos(out, r) {
            out.length = 2;out[0] = this.r_x(r);out[1] = this.r_y(r);return out;
        }
    }, {
        key: 't_pos',
        value: function t_pos(out, t) {
            out.length = 2;out[0] = this.t_x(t);out[1] = this.t_y(t);return out;
        }
    }, {
        key: 's_begin_r',
        value: function s_begin_r(s) {
            return this._s_start_r[s];
        }
    }, {
        key: 's_end_r',
        value: function s_end_r(s) {
            return this._s_start_r[TriangleMesh.s_next_s(s)];
        }
    }, {
        key: 's_inner_t',
        value: function s_inner_t(s) {
            return TriangleMesh.s_to_t(s);
        }
    }, {
        key: 's_outer_t',
        value: function s_outer_t(s) {
            return TriangleMesh.s_to_t(this._s_opposite_s[s]);
        }
    }, {
        key: 's_next_s',
        value: function s_next_s(s) {
            return TriangleMesh.s_next_s(s);
        }
    }, {
        key: 's_prev_s',
        value: function s_prev_s(s) {
            return TriangleMesh.s_prev_s(s);
        }
    }, {
        key: 's_opposite_s',
        value: function s_opposite_s(s) {
            return this._s_opposite_s[s];
        }
    }, {
        key: 't_circulate_s',
        value: function t_circulate_s(out_s, t) {
            out_s.length = 3;for (var i = 0; i < 3; i++) {
                out_s[i] = 3 * t + i;
            }return out_s;
        }
    }, {
        key: 't_circulate_r',
        value: function t_circulate_r(out_r, t) {
            out_r.length = 3;for (var i = 0; i < 3; i++) {
                out_r[i] = this._s_start_r[3 * t + i];
            }return out_r;
        }
    }, {
        key: 't_circulate_t',
        value: function t_circulate_t(out_t, t) {
            out_t.length = 3;for (var i = 0; i < 3; i++) {
                out_t[i] = this.s_outer_t(3 * t + i);
            }return out_t;
        }
    }, {
        key: 'r_circulate_s',
        value: function r_circulate_s(out_s, r) {
            var s0 = this._r_any_s[r];
            var s = s0;
            out_s.length = 0;
            do {
                out_s.push(s);
                s = TriangleMesh.s_next_s(this._s_opposite_s[s]);
            } while (s != s0);
            return out_s;
        }
    }, {
        key: 'r_circulate_r',
        value: function r_circulate_r(out_r, r) {
            var s0 = this._r_any_s[r];
            var s = s0;
            out_r.length = 0;
            do {
                out_r.push(this.s_end_r(s));
                s = TriangleMesh.s_next_s(this._s_opposite_s[s]);
            } while (s != s0);
            return out_r;
        }
    }, {
        key: 'r_circulate_t',
        value: function r_circulate_t(out_t, r) {
            var s0 = this._r_any_s[r];
            var s = s0;
            out_t.length = 0;
            do {
                out_t.push(TriangleMesh.s_to_t(s));
                s = TriangleMesh.s_next_s(this._s_opposite_s[s]);
            } while (s != s0);
            return out_t;
        }
    }, {
        key: 'ghost_r',
        value: function ghost_r() {
            return this.numRegions - 1;
        }
    }, {
        key: 's_ghost',
        value: function s_ghost(s) {
            return s >= this.numSolidSides;
        }
    }, {
        key: 'r_ghost',
        value: function r_ghost(r) {
            return r == this.numRegions - 1;
        }
    }, {
        key: 't_ghost',
        value: function t_ghost(t) {
            return this.s_ghost(3 * t);
        }
    }, {
        key: 's_boundary',
        value: function s_boundary(s) {
            return this.s_ghost(s) && s % 3 == 0;
        }
    }, {
        key: 'r_boundary',
        value: function r_boundary(r) {
            return r < this.numBoundaryRegions;
        }
    }]);

    return TriangleMesh;
}();

module.exports = TriangleMesh;