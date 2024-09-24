"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // index.js
  var require_dual_mesh = __commonJS({
    "index.js"(exports, module) {
      "use strict";
      var TriangleMesh = class _TriangleMesh {
        static s_to_t(s) {
          return s / 3 | 0;
        }
        static s_prev_s(s) {
          return s % 3 === 0 ? s + 2 : s - 1;
        }
        static s_next_s(s) {
          return s % 3 === 2 ? s - 2 : s + 1;
        }
        /**
         * Constructor takes partial mesh information and fills in the rest; the
         * partial information is generated in create.js or in fromDelaunator.
         */
        constructor({ numBoundaryRegions, numSolidSides, _r_vertex, _triangles, _halfedges }) {
          Object.assign(this, {
            numBoundaryRegions,
            numSolidSides,
            _r_vertex,
            _triangles,
            _halfedges
          });
          this._t_vertex = [];
          this._update();
        }
        /**
         * Update internal data structures from Delaunator 
         */
        update(points, delaunator) {
          this._r_vertex = points;
          this._triangles = delaunator.triangles;
          this._halfedges = delaunator.halfedges;
          this._update();
        }
        /**
         * Update internal data structures to match the input mesh.
         *
         * Use if you have updated the triangles/halfedges with Delaunator
         * and want the dual mesh to match the updated data. Note that
         * this DOES not update boundary regions or ghost elements.
         */
        _update() {
          let { _triangles, _halfedges, _r_vertex, _t_vertex } = this;
          this.numSides = _triangles.length;
          this.numRegions = _r_vertex.length;
          this.numSolidRegions = this.numRegions - 1;
          this.numTriangles = this.numSides / 3;
          this.numSolidTriangles = this.numSolidSides / 3;
          if (this._t_vertex.length < this.numTriangles) {
            const numOldTriangles = _t_vertex.length;
            const numNewTriangles = this.numTriangles - numOldTriangles;
            _t_vertex = _t_vertex.concat(new Array(numNewTriangles));
            for (let t = numOldTriangles; t < this.numTriangles; t++) {
              _t_vertex[t] = [0, 0];
            }
            this._t_vertex = _t_vertex;
          }
          this._r_in_s = new Int32Array(this.numRegions);
          for (let s = 0; s < _triangles.length; s++) {
            let endpoint = _triangles[_TriangleMesh.s_next_s(s)];
            if (this._r_in_s[endpoint] === 0 || _halfedges[s] === -1) {
              this._r_in_s[endpoint] = s;
            }
          }
          for (let s = 0; s < _triangles.length; s += 3) {
            let t = s / 3, a = _r_vertex[_triangles[s]], b = _r_vertex[_triangles[s + 1]], c = _r_vertex[_triangles[s + 2]];
            if (this.s_ghost(s)) {
              let dx = b[0] - a[0], dy = b[1] - a[1];
              let scale = 10 / Math.sqrt(dx * dx + dy * dy);
              _t_vertex[t][0] = 0.5 * (a[0] + b[0]) + dy * scale;
              _t_vertex[t][1] = 0.5 * (a[1] + b[1]) - dx * scale;
            } else {
              _t_vertex[t][0] = (a[0] + b[0] + c[0]) / 3;
              _t_vertex[t][1] = (a[1] + b[1] + c[1]) / 3;
            }
          }
        }
        /**
         * Construct a DualMesh from a Delaunator object, without any
         * additional boundary regions.
         */
        static fromDelaunator(points, delaunator) {
          return new _TriangleMesh({
            numBoundaryRegions: 0,
            numSolidSides: delaunator.triangles.length,
            _r_vertex: points,
            _triangles: delaunator.triangles,
            _halfedges: delaunator.halfedges
          });
        }
        r_x(r) {
          return this._r_vertex[r][0];
        }
        r_y(r) {
          return this._r_vertex[r][1];
        }
        t_x(r) {
          return this._t_vertex[r][0];
        }
        t_y(r) {
          return this._t_vertex[r][1];
        }
        r_pos(out, r) {
          out.length = 2;
          out[0] = this.r_x(r);
          out[1] = this.r_y(r);
          return out;
        }
        t_pos(out, t) {
          out.length = 2;
          out[0] = this.t_x(t);
          out[1] = this.t_y(t);
          return out;
        }
        s_begin_r(s) {
          return this._triangles[s];
        }
        s_end_r(s) {
          return this._triangles[_TriangleMesh.s_next_s(s)];
        }
        s_inner_t(s) {
          return _TriangleMesh.s_to_t(s);
        }
        s_outer_t(s) {
          return _TriangleMesh.s_to_t(this._halfedges[s]);
        }
        s_next_s(s) {
          return _TriangleMesh.s_next_s(s);
        }
        s_prev_s(s) {
          return _TriangleMesh.s_prev_s(s);
        }
        s_opposite_s(s) {
          return this._halfedges[s];
        }
        t_circulate_s(out_s, t) {
          out_s.length = 3;
          for (let i = 0; i < 3; i++) {
            out_s[i] = 3 * t + i;
          }
          return out_s;
        }
        t_circulate_r(out_r, t) {
          out_r.length = 3;
          for (let i = 0; i < 3; i++) {
            out_r[i] = this._triangles[3 * t + i];
          }
          return out_r;
        }
        t_circulate_t(out_t, t) {
          out_t.length = 3;
          for (let i = 0; i < 3; i++) {
            out_t[i] = this.s_outer_t(3 * t + i);
          }
          return out_t;
        }
        r_circulate_s(out_s, r) {
          const s0 = this._r_in_s[r];
          let incoming = s0;
          out_s.length = 0;
          do {
            out_s.push(this._halfedges[incoming]);
            let outgoing = _TriangleMesh.s_next_s(incoming);
            incoming = this._halfedges[outgoing];
          } while (incoming !== -1 && incoming !== s0);
          return out_s;
        }
        r_circulate_r(out_r, r) {
          const s0 = this._r_in_s[r];
          let incoming = s0;
          out_r.length = 0;
          do {
            out_r.push(this.s_begin_r(incoming));
            let outgoing = _TriangleMesh.s_next_s(incoming);
            incoming = this._halfedges[outgoing];
          } while (incoming !== -1 && incoming !== s0);
          return out_r;
        }
        r_circulate_t(out_t, r) {
          const s0 = this._r_in_s[r];
          let incoming = s0;
          out_t.length = 0;
          do {
            out_t.push(_TriangleMesh.s_to_t(incoming));
            let outgoing = _TriangleMesh.s_next_s(incoming);
            incoming = this._halfedges[outgoing];
          } while (incoming !== -1 && incoming !== s0);
          return out_t;
        }
        ghost_r() {
          return this.numRegions - 1;
        }
        s_ghost(s) {
          return s >= this.numSolidSides;
        }
        r_ghost(r) {
          return r === this.numRegions - 1;
        }
        t_ghost(t) {
          return this.s_ghost(3 * t);
        }
        s_boundary(s) {
          return this.s_ghost(s) && s % 3 === 0;
        }
        r_boundary(r) {
          return r < this.numBoundaryRegions;
        }
      };
      module.exports = TriangleMesh;
    }
  });

  // node_modules/delaunator/delaunator.js
  var require_delaunator = __commonJS({
    "node_modules/delaunator/delaunator.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = global || self, global.Delaunator = factory());
      })(exports, function() {
        "use strict";
        var EPSILON = Math.pow(2, -52);
        var EDGE_STACK = new Uint32Array(512);
        var Delaunator = function Delaunator2(coords) {
          var n = coords.length >> 1;
          if (n > 0 && typeof coords[0] !== "number") {
            throw new Error("Expected coords to contain numbers.");
          }
          this.coords = coords;
          var maxTriangles = Math.max(2 * n - 5, 0);
          this._triangles = new Uint32Array(maxTriangles * 3);
          this._halfedges = new Int32Array(maxTriangles * 3);
          this._hashSize = Math.ceil(Math.sqrt(n));
          this._hullPrev = new Uint32Array(n);
          this._hullNext = new Uint32Array(n);
          this._hullTri = new Uint32Array(n);
          this._hullHash = new Int32Array(this._hashSize).fill(-1);
          this._ids = new Uint32Array(n);
          this._dists = new Float64Array(n);
          this.update();
        };
        Delaunator.from = function from(points, getX, getY) {
          if (getX === void 0) getX = defaultGetX;
          if (getY === void 0) getY = defaultGetY;
          var n = points.length;
          var coords = new Float64Array(n * 2);
          for (var i = 0; i < n; i++) {
            var p = points[i];
            coords[2 * i] = getX(p);
            coords[2 * i + 1] = getY(p);
          }
          return new Delaunator(coords);
        };
        Delaunator.prototype.update = function update() {
          var ref = this;
          var coords = ref.coords;
          var hullPrev = ref._hullPrev;
          var hullNext = ref._hullNext;
          var hullTri = ref._hullTri;
          var hullHash = ref._hullHash;
          var n = coords.length >> 1;
          var minX = Infinity;
          var minY = Infinity;
          var maxX = -Infinity;
          var maxY = -Infinity;
          for (var i = 0; i < n; i++) {
            var x = coords[2 * i];
            var y = coords[2 * i + 1];
            if (x < minX) {
              minX = x;
            }
            if (y < minY) {
              minY = y;
            }
            if (x > maxX) {
              maxX = x;
            }
            if (y > maxY) {
              maxY = y;
            }
            this._ids[i] = i;
          }
          var cx = (minX + maxX) / 2;
          var cy = (minY + maxY) / 2;
          var minDist = Infinity;
          var i0, i1, i2;
          for (var i$1 = 0; i$1 < n; i$1++) {
            var d = dist(cx, cy, coords[2 * i$1], coords[2 * i$1 + 1]);
            if (d < minDist) {
              i0 = i$1;
              minDist = d;
            }
          }
          var i0x = coords[2 * i0];
          var i0y = coords[2 * i0 + 1];
          minDist = Infinity;
          for (var i$2 = 0; i$2 < n; i$2++) {
            if (i$2 === i0) {
              continue;
            }
            var d$1 = dist(i0x, i0y, coords[2 * i$2], coords[2 * i$2 + 1]);
            if (d$1 < minDist && d$1 > 0) {
              i1 = i$2;
              minDist = d$1;
            }
          }
          var i1x = coords[2 * i1];
          var i1y = coords[2 * i1 + 1];
          var minRadius = Infinity;
          for (var i$3 = 0; i$3 < n; i$3++) {
            if (i$3 === i0 || i$3 === i1) {
              continue;
            }
            var r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i$3], coords[2 * i$3 + 1]);
            if (r < minRadius) {
              i2 = i$3;
              minRadius = r;
            }
          }
          var i2x = coords[2 * i2];
          var i2y = coords[2 * i2 + 1];
          if (minRadius === Infinity) {
            for (var i$4 = 0; i$4 < n; i$4++) {
              this._dists[i$4] = coords[2 * i$4] - coords[0] || coords[2 * i$4 + 1] - coords[1];
            }
            quicksort(this._ids, this._dists, 0, n - 1);
            var hull = new Uint32Array(n);
            var j = 0;
            for (var i$5 = 0, d0 = -Infinity; i$5 < n; i$5++) {
              var id = this._ids[i$5];
              if (this._dists[id] > d0) {
                hull[j++] = id;
                d0 = this._dists[id];
              }
            }
            this.hull = hull.subarray(0, j);
            this.triangles = new Uint32Array(0);
            this.halfedges = new Uint32Array(0);
            return;
          }
          if (orient(i0x, i0y, i1x, i1y, i2x, i2y)) {
            var i$6 = i1;
            var x$1 = i1x;
            var y$1 = i1y;
            i1 = i2;
            i1x = i2x;
            i1y = i2y;
            i2 = i$6;
            i2x = x$1;
            i2y = y$1;
          }
          var center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
          this._cx = center.x;
          this._cy = center.y;
          for (var i$7 = 0; i$7 < n; i$7++) {
            this._dists[i$7] = dist(coords[2 * i$7], coords[2 * i$7 + 1], center.x, center.y);
          }
          quicksort(this._ids, this._dists, 0, n - 1);
          this._hullStart = i0;
          var hullSize = 3;
          hullNext[i0] = hullPrev[i2] = i1;
          hullNext[i1] = hullPrev[i0] = i2;
          hullNext[i2] = hullPrev[i1] = i0;
          hullTri[i0] = 0;
          hullTri[i1] = 1;
          hullTri[i2] = 2;
          hullHash.fill(-1);
          hullHash[this._hashKey(i0x, i0y)] = i0;
          hullHash[this._hashKey(i1x, i1y)] = i1;
          hullHash[this._hashKey(i2x, i2y)] = i2;
          this.trianglesLen = 0;
          this._addTriangle(i0, i1, i2, -1, -1, -1);
          for (var k = 0, xp = void 0, yp = void 0; k < this._ids.length; k++) {
            var i$8 = this._ids[k];
            var x$2 = coords[2 * i$8];
            var y$2 = coords[2 * i$8 + 1];
            if (k > 0 && Math.abs(x$2 - xp) <= EPSILON && Math.abs(y$2 - yp) <= EPSILON) {
              continue;
            }
            xp = x$2;
            yp = y$2;
            if (i$8 === i0 || i$8 === i1 || i$8 === i2) {
              continue;
            }
            var start = 0;
            for (var j$1 = 0, key = this._hashKey(x$2, y$2); j$1 < this._hashSize; j$1++) {
              start = hullHash[(key + j$1) % this._hashSize];
              if (start !== -1 && start !== hullNext[start]) {
                break;
              }
            }
            start = hullPrev[start];
            var e = start, q = void 0;
            while (q = hullNext[e], !orient(x$2, y$2, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1])) {
              e = q;
              if (e === start) {
                e = -1;
                break;
              }
            }
            if (e === -1) {
              continue;
            }
            var t = this._addTriangle(e, i$8, hullNext[e], -1, -1, hullTri[e]);
            hullTri[i$8] = this._legalize(t + 2);
            hullTri[e] = t;
            hullSize++;
            var n$1 = hullNext[e];
            while (q = hullNext[n$1], orient(x$2, y$2, coords[2 * n$1], coords[2 * n$1 + 1], coords[2 * q], coords[2 * q + 1])) {
              t = this._addTriangle(n$1, i$8, q, hullTri[i$8], -1, hullTri[n$1]);
              hullTri[i$8] = this._legalize(t + 2);
              hullNext[n$1] = n$1;
              hullSize--;
              n$1 = q;
            }
            if (e === start) {
              while (q = hullPrev[e], orient(x$2, y$2, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1])) {
                t = this._addTriangle(q, i$8, e, -1, hullTri[e], hullTri[q]);
                this._legalize(t + 2);
                hullTri[q] = t;
                hullNext[e] = e;
                hullSize--;
                e = q;
              }
            }
            this._hullStart = hullPrev[i$8] = e;
            hullNext[e] = hullPrev[n$1] = i$8;
            hullNext[i$8] = n$1;
            hullHash[this._hashKey(x$2, y$2)] = i$8;
            hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
          }
          this.hull = new Uint32Array(hullSize);
          for (var i$9 = 0, e$1 = this._hullStart; i$9 < hullSize; i$9++) {
            this.hull[i$9] = e$1;
            e$1 = hullNext[e$1];
          }
          this.triangles = this._triangles.subarray(0, this.trianglesLen);
          this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
        };
        Delaunator.prototype._hashKey = function _hashKey(x, y) {
          return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
        };
        Delaunator.prototype._legalize = function _legalize(a) {
          var ref = this;
          var triangles = ref._triangles;
          var halfedges = ref._halfedges;
          var coords = ref.coords;
          var i = 0;
          var ar = 0;
          while (true) {
            var b = halfedges[a];
            var a0 = a - a % 3;
            ar = a0 + (a + 2) % 3;
            if (b === -1) {
              if (i === 0) {
                break;
              }
              a = EDGE_STACK[--i];
              continue;
            }
            var b0 = b - b % 3;
            var al = a0 + (a + 1) % 3;
            var bl = b0 + (b + 2) % 3;
            var p0 = triangles[ar];
            var pr = triangles[a];
            var pl = triangles[al];
            var p1 = triangles[bl];
            var illegal = inCircle(
              coords[2 * p0],
              coords[2 * p0 + 1],
              coords[2 * pr],
              coords[2 * pr + 1],
              coords[2 * pl],
              coords[2 * pl + 1],
              coords[2 * p1],
              coords[2 * p1 + 1]
            );
            if (illegal) {
              triangles[a] = p1;
              triangles[b] = p0;
              var hbl = halfedges[bl];
              if (hbl === -1) {
                var e = this._hullStart;
                do {
                  if (this._hullTri[e] === bl) {
                    this._hullTri[e] = a;
                    break;
                  }
                  e = this._hullPrev[e];
                } while (e !== this._hullStart);
              }
              this._link(a, hbl);
              this._link(b, halfedges[ar]);
              this._link(ar, bl);
              var br = b0 + (b + 1) % 3;
              if (i < EDGE_STACK.length) {
                EDGE_STACK[i++] = br;
              }
            } else {
              if (i === 0) {
                break;
              }
              a = EDGE_STACK[--i];
            }
          }
          return ar;
        };
        Delaunator.prototype._link = function _link(a, b) {
          this._halfedges[a] = b;
          if (b !== -1) {
            this._halfedges[b] = a;
          }
        };
        Delaunator.prototype._addTriangle = function _addTriangle(i0, i1, i2, a, b, c) {
          var t = this.trianglesLen;
          this._triangles[t] = i0;
          this._triangles[t + 1] = i1;
          this._triangles[t + 2] = i2;
          this._link(t, a);
          this._link(t + 1, b);
          this._link(t + 2, c);
          this.trianglesLen += 3;
          return t;
        };
        function pseudoAngle(dx, dy) {
          var p = dx / (Math.abs(dx) + Math.abs(dy));
          return (dy > 0 ? 3 - p : 1 + p) / 4;
        }
        function dist(ax, ay, bx, by) {
          var dx = ax - bx;
          var dy = ay - by;
          return dx * dx + dy * dy;
        }
        function orientIfSure(px, py, rx, ry, qx, qy) {
          var l = (ry - py) * (qx - px);
          var r = (rx - px) * (qy - py);
          return Math.abs(l - r) >= 33306690738754716e-32 * Math.abs(l + r) ? l - r : 0;
        }
        function orient(rx, ry, qx, qy, px, py) {
          var sign = orientIfSure(px, py, rx, ry, qx, qy) || orientIfSure(rx, ry, qx, qy, px, py) || orientIfSure(qx, qy, px, py, rx, ry);
          return sign < 0;
        }
        function inCircle(ax, ay, bx, by, cx, cy, px, py) {
          var dx = ax - px;
          var dy = ay - py;
          var ex = bx - px;
          var ey = by - py;
          var fx = cx - px;
          var fy = cy - py;
          var ap = dx * dx + dy * dy;
          var bp = ex * ex + ey * ey;
          var cp = fx * fx + fy * fy;
          return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
        }
        function circumradius(ax, ay, bx, by, cx, cy) {
          var dx = bx - ax;
          var dy = by - ay;
          var ex = cx - ax;
          var ey = cy - ay;
          var bl = dx * dx + dy * dy;
          var cl = ex * ex + ey * ey;
          var d = 0.5 / (dx * ey - dy * ex);
          var x = (ey * bl - dy * cl) * d;
          var y = (dx * cl - ex * bl) * d;
          return x * x + y * y;
        }
        function circumcenter(ax, ay, bx, by, cx, cy) {
          var dx = bx - ax;
          var dy = by - ay;
          var ex = cx - ax;
          var ey = cy - ay;
          var bl = dx * dx + dy * dy;
          var cl = ex * ex + ey * ey;
          var d = 0.5 / (dx * ey - dy * ex);
          var x = ax + (ey * bl - dy * cl) * d;
          var y = ay + (dx * cl - ex * bl) * d;
          return { x, y };
        }
        function quicksort(ids, dists, left, right) {
          if (right - left <= 20) {
            for (var i = left + 1; i <= right; i++) {
              var temp = ids[i];
              var tempDist = dists[temp];
              var j = i - 1;
              while (j >= left && dists[ids[j]] > tempDist) {
                ids[j + 1] = ids[j--];
              }
              ids[j + 1] = temp;
            }
          } else {
            var median = left + right >> 1;
            var i$1 = left + 1;
            var j$1 = right;
            swap(ids, median, i$1);
            if (dists[ids[left]] > dists[ids[right]]) {
              swap(ids, left, right);
            }
            if (dists[ids[i$1]] > dists[ids[right]]) {
              swap(ids, i$1, right);
            }
            if (dists[ids[left]] > dists[ids[i$1]]) {
              swap(ids, left, i$1);
            }
            var temp$1 = ids[i$1];
            var tempDist$1 = dists[temp$1];
            while (true) {
              do {
                i$1++;
              } while (dists[ids[i$1]] < tempDist$1);
              do {
                j$1--;
              } while (dists[ids[j$1]] > tempDist$1);
              if (j$1 < i$1) {
                break;
              }
              swap(ids, i$1, j$1);
            }
            ids[left + 1] = ids[j$1];
            ids[j$1] = temp$1;
            if (right - i$1 + 1 >= j$1 - left) {
              quicksort(ids, dists, i$1, right);
              quicksort(ids, dists, left, j$1 - 1);
            } else {
              quicksort(ids, dists, left, j$1 - 1);
              quicksort(ids, dists, i$1, right);
            }
          }
        }
        function swap(arr, i, j) {
          var tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        function defaultGetX(p) {
          return p[0];
        }
        function defaultGetY(p) {
          return p[1];
        }
        return Delaunator;
      });
    }
  });

  // create.js
  var require_create = __commonJS({
    "create.js"(exports, module) {
      "use strict";
      var Delaunator = require_delaunator();
      var TriangleMesh = require_dual_mesh();
      function s_next_s(s) {
        return s % 3 == 2 ? s - 2 : s + 1;
      }
      function checkPointInequality({ _r_vertex, _triangles, _halfedges }) {
      }
      function checkTriangleInequality({ _r_vertex, _triangles, _halfedges }) {
        const badAngleLimit = 30;
        let summary = new Array(badAngleLimit).fill(0);
        let count = 0;
        for (let s = 0; s < _triangles.length; s++) {
          let r0 = _triangles[s], r1 = _triangles[s_next_s(s)], r2 = _triangles[s_next_s(s_next_s(s))];
          let p0 = _r_vertex[r0], p1 = _r_vertex[r1], p2 = _r_vertex[r2];
          let d0 = [p0[0] - p1[0], p0[1] - p1[1]];
          let d2 = [p2[0] - p1[0], p2[1] - p1[1]];
          let dotProduct = d0[0] * d2[0] + d0[1] + d2[1];
          let angleDegrees = 180 / Math.PI * Math.acos(dotProduct);
          if (angleDegrees < badAngleLimit) {
            summary[angleDegrees | 0]++;
            count++;
          }
        }
        if (count > 0) {
          console.log("  bad angles:", summary.join(" "));
        }
      }
      function checkMeshConnectivity({ _r_vertex, _triangles, _halfedges }) {
        let ghost_r = _r_vertex.length - 1, out_s = [];
        for (let s0 = 0; s0 < _triangles.length; s0++) {
          if (_halfedges[_halfedges[s0]] !== s0) {
            console.log(`FAIL _halfedges[_halfedges[${s0}]] !== ${s0}`);
          }
          let s = s0, count = 0;
          out_s.length = 0;
          do {
            count++;
            out_s.push(s);
            s = s_next_s(_halfedges[s]);
            if (count > 100 && _triangles[s0] !== ghost_r) {
              console.log(`FAIL to circulate around region with start side=${s0} from region ${_triangles[s0]} to ${_triangles[s_next_s(s0)]}, out_s=${out_s}`);
              break;
            }
          } while (s !== s0);
        }
      }
      function addBoundaryPoints(spacing, size) {
        let N = Math.ceil(size / spacing);
        let points = [];
        for (let i = 0; i <= N; i++) {
          let t = (i + 0.5) / (N + 1);
          let w = size * t;
          let offset = Math.pow(t - 0.5, 2);
          points.push([offset, w], [size - offset, w]);
          points.push([w, offset], [w, size - offset]);
        }
        return points;
      }
      function addGhostStructure({ _r_vertex, _triangles, _halfedges }) {
        const numSolidSides = _triangles.length;
        const ghost_r = _r_vertex.length;
        let numUnpairedSides = 0, firstUnpairedEdge = -1;
        let r_unpaired_s = [];
        for (let s = 0; s < numSolidSides; s++) {
          if (_halfedges[s] === -1) {
            numUnpairedSides++;
            r_unpaired_s[_triangles[s]] = s;
            firstUnpairedEdge = s;
          }
        }
        let r_newvertex = _r_vertex.concat([[500, 500]]);
        let s_newstart_r = new Int32Array(numSolidSides + 3 * numUnpairedSides);
        s_newstart_r.set(_triangles);
        let s_newopposite_s = new Int32Array(numSolidSides + 3 * numUnpairedSides);
        s_newopposite_s.set(_halfedges);
        for (let i = 0, s = firstUnpairedEdge; i < numUnpairedSides; i++, s = r_unpaired_s[s_newstart_r[s_next_s(s)]]) {
          let ghost_s = numSolidSides + 3 * i;
          s_newopposite_s[s] = ghost_s;
          s_newopposite_s[ghost_s] = s;
          s_newstart_r[ghost_s] = s_newstart_r[s_next_s(s)];
          s_newstart_r[ghost_s + 1] = s_newstart_r[s];
          s_newstart_r[ghost_s + 2] = ghost_r;
          let k = numSolidSides + (3 * i + 4) % (3 * numUnpairedSides);
          s_newopposite_s[ghost_s + 2] = k;
          s_newopposite_s[k] = ghost_s + 2;
        }
        return {
          numSolidSides,
          _r_vertex: r_newvertex,
          _triangles: s_newstart_r,
          _halfedges: s_newopposite_s
        };
      }
      var MeshBuilder2 = class {
        /** If boundarySpacing > 0 there will be a boundary added around the 1000x1000 area */
        constructor({ boundarySpacing = 0 } = {}) {
          let boundaryPoints = boundarySpacing > 0 ? addBoundaryPoints(boundarySpacing, 1e3) : [];
          this.points = boundaryPoints;
          this.numBoundaryRegions = boundaryPoints.length;
        }
        /** Points should be [x, y] */
        addPoints(newPoints) {
          for (let p of newPoints) {
            this.points.push(p);
          }
          return this;
        }
        /** Points will be [x, y] */
        getNonBoundaryPoints() {
          return this.points.slice(this.numBoundaryRegions);
        }
        /** (used for more advanced mixing of different mesh types) */
        clearNonBoundaryPoints() {
          this.points.splice(this.numBoundaryRegions, this.points.length);
          return this;
        }
        /** Pass in the constructor from the poisson-disk-sampling module */
        addPoisson(Poisson2, spacing, random = Math.random) {
          let generator = new Poisson2({
            shape: [1e3, 1e3],
            minDistance: spacing
          }, random);
          this.points.forEach((p) => generator.addPoint(p));
          this.points = generator.fill();
          return this;
        }
        /** Build and return a TriangleMesh */
        create(runChecks = false) {
          let delaunator = Delaunator.from(this.points);
          let graph = {
            _r_vertex: this.points,
            _triangles: delaunator.triangles,
            _halfedges: delaunator.halfedges
          };
          if (runChecks) {
            checkPointInequality(graph);
            checkTriangleInequality(graph);
          }
          graph = addGhostStructure(graph);
          graph.numBoundaryRegions = this.numBoundaryRegions;
          if (runChecks) {
            checkMeshConnectivity(graph);
          }
          return new TriangleMesh(graph);
        }
      };
      module.exports = MeshBuilder2;
    }
  });

  // node_modules/poisson-disk-sampling/src/tiny-ndarray.js
  var require_tiny_ndarray = __commonJS({
    "node_modules/poisson-disk-sampling/src/tiny-ndarray.js"(exports, module) {
      "use strict";
      function tinyNDArrayOfInteger(gridShape) {
        var dimensions = gridShape.length, totalLength = 1, stride = new Array(dimensions), dimension;
        for (dimension = dimensions; dimension > 0; dimension--) {
          stride[dimension - 1] = totalLength;
          totalLength = totalLength * gridShape[dimension - 1];
        }
        return {
          stride,
          data: new Uint32Array(totalLength)
        };
      }
      function tinyNDArrayOfArray(gridShape) {
        var dimensions = gridShape.length, totalLength = 1, stride = new Array(dimensions), data = [], dimension, index;
        for (dimension = dimensions; dimension > 0; dimension--) {
          stride[dimension - 1] = totalLength;
          totalLength = totalLength * gridShape[dimension - 1];
        }
        for (index = 0; index < totalLength; index++) {
          data.push([]);
        }
        return {
          stride,
          data
        };
      }
      module.exports = {
        integer: tinyNDArrayOfInteger,
        array: tinyNDArrayOfArray
      };
    }
  });

  // node_modules/poisson-disk-sampling/src/sphere-random.js
  var require_sphere_random = __commonJS({
    "node_modules/poisson-disk-sampling/src/sphere-random.js"(exports, module) {
      "use strict";
      module.exports = sampleSphere;
      function sampleSphere(d, rng) {
        var v = new Array(d), d2 = Math.floor(d / 2) << 1, r2 = 0, rr, r, theta, h, i;
        for (i = 0; i < d2; i += 2) {
          rr = -2 * Math.log(rng());
          r = Math.sqrt(rr);
          theta = 2 * Math.PI * rng();
          r2 += rr;
          v[i] = r * Math.cos(theta);
          v[i + 1] = r * Math.sin(theta);
        }
        if (d % 2) {
          var x = Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
          v[d - 1] = x;
          r2 += Math.pow(x, 2);
        }
        h = 1 / Math.sqrt(r2);
        for (i = 0; i < d; ++i) {
          v[i] *= h;
        }
        return v;
      }
    }
  });

  // node_modules/moore/index.js
  var require_moore = __commonJS({
    "node_modules/moore/index.js"(exports, module) {
      module.exports = function moore(range, dimensions) {
        range = range || 1;
        dimensions = dimensions || 2;
        var size = range * 2 + 1;
        var length = Math.pow(size, dimensions) - 1;
        var neighbors = new Array(length);
        for (var i = 0; i < length; i++) {
          var neighbor = neighbors[i] = new Array(dimensions);
          var index = i < length / 2 ? i : i + 1;
          for (var dimension = 1; dimension <= dimensions; dimension++) {
            var value = index % Math.pow(size, dimension);
            neighbor[dimension - 1] = value / Math.pow(size, dimension - 1) - range;
            index -= value;
          }
        }
        return neighbors;
      };
    }
  });

  // node_modules/poisson-disk-sampling/src/neighbourhood.js
  var require_neighbourhood = __commonJS({
    "node_modules/poisson-disk-sampling/src/neighbourhood.js"(exports, module) {
      "use strict";
      var moore = require_moore();
      function getNeighbourhood(dimensionNumber) {
        var neighbourhood = moore(2, dimensionNumber), origin = [], dimension;
        neighbourhood = neighbourhood.filter(function(n) {
          var dist = 0;
          for (var d = 0; d < dimensionNumber; d++) {
            dist += Math.pow(Math.max(0, Math.abs(n[d]) - 1), 2);
          }
          return dist < dimensionNumber;
        });
        for (dimension = 0; dimension < dimensionNumber; dimension++) {
          origin.push(0);
        }
        neighbourhood.push(origin);
        neighbourhood.sort(function(n1, n2) {
          var squareDist1 = 0, squareDist2 = 0, dimension2;
          for (dimension2 = 0; dimension2 < dimensionNumber; dimension2++) {
            squareDist1 += Math.pow(n1[dimension2], 2);
            squareDist2 += Math.pow(n2[dimension2], 2);
          }
          if (squareDist1 < squareDist2) {
            return -1;
          } else if (squareDist1 > squareDist2) {
            return 1;
          } else {
            return 0;
          }
        });
        return neighbourhood;
      }
      var neighbourhoodCache = {};
      function getNeighbourhoodMemoized(dimensionNumber) {
        if (!neighbourhoodCache[dimensionNumber]) {
          neighbourhoodCache[dimensionNumber] = getNeighbourhood(dimensionNumber);
        }
        return neighbourhoodCache[dimensionNumber];
      }
      module.exports = getNeighbourhoodMemoized;
    }
  });

  // node_modules/poisson-disk-sampling/src/implementations/fixed-density.js
  var require_fixed_density = __commonJS({
    "node_modules/poisson-disk-sampling/src/implementations/fixed-density.js"(exports, module) {
      "use strict";
      var tinyNDArray = require_tiny_ndarray().integer;
      var sphereRandom = require_sphere_random();
      var getNeighbourhood = require_neighbourhood();
      function squaredEuclideanDistance(point1, point2) {
        var result = 0, i = 0;
        for (; i < point1.length; i++) {
          result += Math.pow(point1[i] - point2[i], 2);
        }
        return result;
      }
      var epsilon = 2e-14;
      function FixedDensityPDS(options, rng) {
        if (typeof options.distanceFunction === "function") {
          throw new Error("PoissonDiskSampling: Tried to instantiate the fixed density implementation with a distanceFunction");
        }
        this.shape = options.shape;
        this.minDistance = options.minDistance;
        this.maxDistance = options.maxDistance || options.minDistance * 2;
        this.maxTries = Math.ceil(Math.max(1, options.tries || 30));
        this.rng = rng || Math.random;
        this.dimension = this.shape.length;
        this.squaredMinDistance = this.minDistance * this.minDistance;
        this.minDistancePlusEpsilon = this.minDistance + epsilon;
        this.deltaDistance = Math.max(0, this.maxDistance - this.minDistancePlusEpsilon);
        this.cellSize = this.minDistance / Math.sqrt(this.dimension);
        this.neighbourhood = getNeighbourhood(this.dimension);
        this.currentPoint = null;
        this.processList = [];
        this.samplePoints = [];
        this.gridShape = [];
        for (var i = 0; i < this.dimension; i++) {
          this.gridShape.push(Math.ceil(this.shape[i] / this.cellSize));
        }
        this.grid = tinyNDArray(this.gridShape);
      }
      FixedDensityPDS.prototype.shape = null;
      FixedDensityPDS.prototype.dimension = null;
      FixedDensityPDS.prototype.minDistance = null;
      FixedDensityPDS.prototype.maxDistance = null;
      FixedDensityPDS.prototype.minDistancePlusEpsilon = null;
      FixedDensityPDS.prototype.squaredMinDistance = null;
      FixedDensityPDS.prototype.deltaDistance = null;
      FixedDensityPDS.prototype.cellSize = null;
      FixedDensityPDS.prototype.maxTries = null;
      FixedDensityPDS.prototype.rng = null;
      FixedDensityPDS.prototype.neighbourhood = null;
      FixedDensityPDS.prototype.currentPoint = null;
      FixedDensityPDS.prototype.processList = null;
      FixedDensityPDS.prototype.samplePoints = null;
      FixedDensityPDS.prototype.gridShape = null;
      FixedDensityPDS.prototype.grid = null;
      FixedDensityPDS.prototype.addRandomPoint = function() {
        var point = new Array(this.dimension);
        for (var i = 0; i < this.dimension; i++) {
          point[i] = this.rng() * this.shape[i];
        }
        return this.directAddPoint(point);
      };
      FixedDensityPDS.prototype.addPoint = function(point) {
        var dimension, valid = true;
        if (point.length === this.dimension) {
          for (dimension = 0; dimension < this.dimension && valid; dimension++) {
            valid = point[dimension] >= 0 && point[dimension] <= this.shape[dimension];
          }
        } else {
          valid = false;
        }
        return valid ? this.directAddPoint(point) : null;
      };
      FixedDensityPDS.prototype.directAddPoint = function(point) {
        var internalArrayIndex = 0, stride = this.grid.stride, dimension;
        this.processList.push(point);
        this.samplePoints.push(point);
        for (dimension = 0; dimension < this.dimension; dimension++) {
          internalArrayIndex += (point[dimension] / this.cellSize | 0) * stride[dimension];
        }
        this.grid.data[internalArrayIndex] = this.samplePoints.length;
        return point;
      };
      FixedDensityPDS.prototype.inNeighbourhood = function(point) {
        var dimensionNumber = this.dimension, stride = this.grid.stride, neighbourIndex, internalArrayIndex, dimension, currentDimensionValue, existingPoint;
        for (neighbourIndex = 0; neighbourIndex < this.neighbourhood.length; neighbourIndex++) {
          internalArrayIndex = 0;
          for (dimension = 0; dimension < dimensionNumber; dimension++) {
            currentDimensionValue = (point[dimension] / this.cellSize | 0) + this.neighbourhood[neighbourIndex][dimension];
            if (currentDimensionValue < 0 || currentDimensionValue >= this.gridShape[dimension]) {
              internalArrayIndex = -1;
              break;
            }
            internalArrayIndex += currentDimensionValue * stride[dimension];
          }
          if (internalArrayIndex !== -1 && this.grid.data[internalArrayIndex] !== 0) {
            existingPoint = this.samplePoints[this.grid.data[internalArrayIndex] - 1];
            if (squaredEuclideanDistance(point, existingPoint) < this.squaredMinDistance) {
              return true;
            }
          }
        }
        return false;
      };
      FixedDensityPDS.prototype.next = function() {
        var tries, angle, distance, currentPoint, newPoint, inShape, i;
        while (this.processList.length > 0) {
          if (this.currentPoint === null) {
            this.currentPoint = this.processList.shift();
          }
          currentPoint = this.currentPoint;
          for (tries = 0; tries < this.maxTries; tries++) {
            inShape = true;
            distance = this.minDistancePlusEpsilon + this.deltaDistance * this.rng();
            if (this.dimension === 2) {
              angle = this.rng() * Math.PI * 2;
              newPoint = [
                Math.cos(angle),
                Math.sin(angle)
              ];
            } else {
              newPoint = sphereRandom(this.dimension, this.rng);
            }
            for (i = 0; inShape && i < this.dimension; i++) {
              newPoint[i] = currentPoint[i] + newPoint[i] * distance;
              inShape = newPoint[i] >= 0 && newPoint[i] < this.shape[i];
            }
            if (inShape && !this.inNeighbourhood(newPoint)) {
              return this.directAddPoint(newPoint);
            }
          }
          if (tries === this.maxTries) {
            this.currentPoint = null;
          }
        }
        return null;
      };
      FixedDensityPDS.prototype.fill = function() {
        if (this.samplePoints.length === 0) {
          this.addRandomPoint();
        }
        while (this.next()) {
        }
        return this.samplePoints;
      };
      FixedDensityPDS.prototype.getAllPoints = function() {
        return this.samplePoints;
      };
      FixedDensityPDS.prototype.getAllPointsWithDistance = function() {
        throw new Error("PoissonDiskSampling: getAllPointsWithDistance() is not available in fixed-density implementation");
      };
      FixedDensityPDS.prototype.reset = function() {
        var gridData = this.grid.data, i = 0;
        for (i = 0; i < gridData.length; i++) {
          gridData[i] = 0;
        }
        this.samplePoints = [];
        this.currentPoint = null;
        this.processList.length = 0;
      };
      module.exports = FixedDensityPDS;
    }
  });

  // node_modules/poisson-disk-sampling/src/implementations/variable-density.js
  var require_variable_density = __commonJS({
    "node_modules/poisson-disk-sampling/src/implementations/variable-density.js"(exports, module) {
      "use strict";
      var tinyNDArray = require_tiny_ndarray().array;
      var sphereRandom = require_sphere_random();
      var getNeighbourhood = require_neighbourhood();
      function euclideanDistance(point1, point2) {
        var result = 0, i = 0;
        for (; i < point1.length; i++) {
          result += Math.pow(point1[i] - point2[i], 2);
        }
        return Math.sqrt(result);
      }
      var epsilon = 2e-14;
      function VariableDensityPDS(options, rng) {
        if (typeof options.distanceFunction !== "function") {
          throw new Error("PoissonDiskSampling: Tried to instantiate the variable density implementation without a distanceFunction");
        }
        this.shape = options.shape;
        this.minDistance = options.minDistance;
        this.maxDistance = options.maxDistance || options.minDistance * 2;
        this.maxTries = Math.ceil(Math.max(1, options.tries || 30));
        this.distanceFunction = options.distanceFunction;
        this.bias = Math.max(0, Math.min(1, options.bias || 0));
        this.rng = rng || Math.random;
        this.dimension = this.shape.length;
        this.minDistancePlusEpsilon = this.minDistance + epsilon;
        this.deltaDistance = Math.max(0, this.maxDistance - this.minDistancePlusEpsilon);
        this.cellSize = this.maxDistance / Math.sqrt(this.dimension);
        this.neighbourhood = getNeighbourhood(this.dimension);
        this.currentPoint = null;
        this.currentDistance = 0;
        this.processList = [];
        this.samplePoints = [];
        this.sampleDistance = [];
        this.gridShape = [];
        for (var i = 0; i < this.dimension; i++) {
          this.gridShape.push(Math.ceil(this.shape[i] / this.cellSize));
        }
        this.grid = tinyNDArray(this.gridShape);
      }
      VariableDensityPDS.prototype.shape = null;
      VariableDensityPDS.prototype.dimension = null;
      VariableDensityPDS.prototype.minDistance = null;
      VariableDensityPDS.prototype.maxDistance = null;
      VariableDensityPDS.prototype.minDistancePlusEpsilon = null;
      VariableDensityPDS.prototype.deltaDistance = null;
      VariableDensityPDS.prototype.cellSize = null;
      VariableDensityPDS.prototype.maxTries = null;
      VariableDensityPDS.prototype.distanceFunction = null;
      VariableDensityPDS.prototype.bias = null;
      VariableDensityPDS.prototype.rng = null;
      VariableDensityPDS.prototype.neighbourhood = null;
      VariableDensityPDS.prototype.currentPoint = null;
      VariableDensityPDS.prototype.currentDistance = null;
      VariableDensityPDS.prototype.processList = null;
      VariableDensityPDS.prototype.samplePoints = null;
      VariableDensityPDS.prototype.sampleDistance = null;
      VariableDensityPDS.prototype.gridShape = null;
      VariableDensityPDS.prototype.grid = null;
      VariableDensityPDS.prototype.addRandomPoint = function() {
        var point = new Array(this.dimension);
        for (var i = 0; i < this.dimension; i++) {
          point[i] = this.rng() * this.shape[i];
        }
        return this.directAddPoint(point);
      };
      VariableDensityPDS.prototype.addPoint = function(point) {
        var dimension, valid = true;
        if (point.length === this.dimension) {
          for (dimension = 0; dimension < this.dimension && valid; dimension++) {
            valid = point[dimension] >= 0 && point[dimension] <= this.shape[dimension];
          }
        } else {
          valid = false;
        }
        return valid ? this.directAddPoint(point) : null;
      };
      VariableDensityPDS.prototype.directAddPoint = function(point) {
        var internalArrayIndex = 0, stride = this.grid.stride, pointIndex = this.samplePoints.length, dimension;
        this.processList.push(pointIndex);
        this.samplePoints.push(point);
        this.sampleDistance.push(this.distanceFunction(point));
        for (dimension = 0; dimension < this.dimension; dimension++) {
          internalArrayIndex += (point[dimension] / this.cellSize | 0) * stride[dimension];
        }
        this.grid.data[internalArrayIndex].push(pointIndex);
        return point;
      };
      VariableDensityPDS.prototype.inNeighbourhood = function(point) {
        var dimensionNumber = this.dimension, stride = this.grid.stride, neighbourIndex, internalArrayIndex, dimension, currentDimensionValue, existingPoint, existingPointDistance;
        var pointDistance = this.distanceFunction(point);
        for (neighbourIndex = 0; neighbourIndex < this.neighbourhood.length; neighbourIndex++) {
          internalArrayIndex = 0;
          for (dimension = 0; dimension < dimensionNumber; dimension++) {
            currentDimensionValue = (point[dimension] / this.cellSize | 0) + this.neighbourhood[neighbourIndex][dimension];
            if (currentDimensionValue < 0 || currentDimensionValue >= this.gridShape[dimension]) {
              internalArrayIndex = -1;
              break;
            }
            internalArrayIndex += currentDimensionValue * stride[dimension];
          }
          if (internalArrayIndex !== -1 && this.grid.data[internalArrayIndex].length > 0) {
            for (var i = 0; i < this.grid.data[internalArrayIndex].length; i++) {
              existingPoint = this.samplePoints[this.grid.data[internalArrayIndex][i]];
              existingPointDistance = this.sampleDistance[this.grid.data[internalArrayIndex][i]];
              var minDistance = Math.min(existingPointDistance, pointDistance);
              var maxDistance = Math.max(existingPointDistance, pointDistance);
              var dist = minDistance + (maxDistance - minDistance) * this.bias;
              if (euclideanDistance(point, existingPoint) < this.minDistance + this.deltaDistance * dist) {
                return true;
              }
            }
          }
        }
        return false;
      };
      VariableDensityPDS.prototype.next = function() {
        var tries, angle, distance, currentPoint, currentDistance, newPoint, inShape, i;
        while (this.processList.length > 0) {
          if (this.currentPoint === null) {
            var sampleIndex = this.processList.shift();
            this.currentPoint = this.samplePoints[sampleIndex];
            this.currentDistance = this.sampleDistance[sampleIndex];
          }
          currentPoint = this.currentPoint;
          currentDistance = this.currentDistance;
          for (tries = 0; tries < this.maxTries; tries++) {
            inShape = true;
            distance = this.minDistancePlusEpsilon + this.deltaDistance * (currentDistance + (1 - currentDistance) * this.bias);
            if (this.dimension === 2) {
              angle = this.rng() * Math.PI * 2;
              newPoint = [
                Math.cos(angle),
                Math.sin(angle)
              ];
            } else {
              newPoint = sphereRandom(this.dimension, this.rng);
            }
            for (i = 0; inShape && i < this.dimension; i++) {
              newPoint[i] = currentPoint[i] + newPoint[i] * distance;
              inShape = newPoint[i] >= 0 && newPoint[i] < this.shape[i];
            }
            if (inShape && !this.inNeighbourhood(newPoint)) {
              return this.directAddPoint(newPoint);
            }
          }
          if (tries === this.maxTries) {
            this.currentPoint = null;
          }
        }
        return null;
      };
      VariableDensityPDS.prototype.fill = function() {
        if (this.samplePoints.length === 0) {
          this.addRandomPoint();
        }
        while (this.next()) {
        }
        return this.samplePoints;
      };
      VariableDensityPDS.prototype.getAllPoints = function() {
        return this.samplePoints;
      };
      VariableDensityPDS.prototype.getAllPointsWithDistance = function() {
        var result = new Array(this.samplePoints.length), i = 0, dimension = 0, point;
        for (i = 0; i < this.samplePoints.length; i++) {
          point = new Array(this.dimension + 1);
          for (dimension = 0; dimension < this.dimension; dimension++) {
            point[dimension] = this.samplePoints[i][dimension];
          }
          point[this.dimension] = this.sampleDistance[i];
          result[i] = point;
        }
        return result;
      };
      VariableDensityPDS.prototype.reset = function() {
        var gridData = this.grid.data, i = 0;
        for (i = 0; i < gridData.length; i++) {
          gridData[i] = [];
        }
        this.samplePoints = [];
        this.currentPoint = null;
        this.processList.length = 0;
      };
      module.exports = VariableDensityPDS;
    }
  });

  // node_modules/poisson-disk-sampling/src/poisson-disk-sampling.js
  var require_poisson_disk_sampling = __commonJS({
    "node_modules/poisson-disk-sampling/src/poisson-disk-sampling.js"(exports, module) {
      "use strict";
      var FixedDensityPDS = require_fixed_density();
      var VariableDensityPDS = require_variable_density();
      function PoissonDiskSampling(options, rng) {
        this.shape = options.shape;
        if (typeof options.distanceFunction === "function") {
          this.implementation = new VariableDensityPDS(options, rng);
        } else {
          this.implementation = new FixedDensityPDS(options, rng);
        }
      }
      PoissonDiskSampling.prototype.implementation = null;
      PoissonDiskSampling.prototype.addRandomPoint = function() {
        return this.implementation.addRandomPoint();
      };
      PoissonDiskSampling.prototype.addPoint = function(point) {
        return this.implementation.addPoint(point);
      };
      PoissonDiskSampling.prototype.next = function() {
        return this.implementation.next();
      };
      PoissonDiskSampling.prototype.fill = function() {
        return this.implementation.fill();
      };
      PoissonDiskSampling.prototype.getAllPoints = function() {
        return this.implementation.getAllPoints();
      };
      PoissonDiskSampling.prototype.getAllPointsWithDistance = function() {
        return this.implementation.getAllPointsWithDistance();
      };
      PoissonDiskSampling.prototype.reset = function() {
        this.implementation.reset();
      };
      module.exports = PoissonDiskSampling;
    }
  });

  // docs/diagrams.js
  var DualMesh = require_dual_mesh();
  var MeshBuilder = require_create();
  var Poisson = require_poisson_disk_sampling();
  var seeds1 = [
    [250, 30],
    [100, 260],
    [400, 260],
    [550, 30]
  ];
  var seeds2 = [
    [320, 170],
    [220, 270],
    [400, 270],
    [530, 50],
    [100, 80],
    [300, 30],
    [50, 220],
    [550, 240]
  ];
  var G0 = new MeshBuilder({ boundarySpacing: 75 }).addPoisson(Poisson, 50).create();
  var G1 = new MeshBuilder().addPoints(seeds1).create();
  var G2 = new MeshBuilder().addPoints(seeds2).create();
  function interpolate(p, q, t) {
    return [p[0] * (1 - t) + q[0] * t, p[1] * (1 - t) + q[1] * t];
  }
  function extrapolate_from_center(p, center) {
    let dx = p[0] - center[0], dy = p[1] - center[1];
    return [center[0] + dx * 5, center[1] + dy * 5];
  }
  Vue.component("a-label", {
    props: ["at", "dx", "dy"],
    template: '<text :transform="`translate(${at})`" :dx="dx || 0" :dy="dy || 0"><slot/></text>'
  });
  Vue.component("a-side-black-edges", {
    props: ["graph", "alpha"],
    template: `
    <g>
      <path v-for="(_,s) in graph.numSides" :key="s"
         :class="'b-side' + (graph.s_ghost(s)? ' ghost' : '')"
         :d="b_side(s)"/>
    </g>
`,
    methods: {
      b_side: function(s) {
        const alpha = this.alpha || 0;
        let begin = this.graph.r_pos([], this.graph.s_begin_r(s));
        let end = this.graph.r_pos([], this.graph.s_end_r(s));
        if (this.graph.r_ghost(this.graph.s_begin_r(s))) {
          begin = extrapolate_from_center(end, [300, 150]);
        } else if (this.graph.r_ghost(this.graph.s_end_r(s))) {
          end = extrapolate_from_center(begin, [300, 150]);
        }
        let center = this.graph.t_pos([], this.graph.s_inner_t(s));
        begin = interpolate(begin, center, alpha);
        end = interpolate(end, center, alpha);
        return `M ${begin} L ${end}`;
      }
    }
  });
  Vue.component("a-side-white-edges", {
    props: ["graph", "alpha"],
    template: `
    <g>
      <path v-for="(_,s) in graph.numSides" :key="s"
        :class="'w-side' + ((graph.t_ghost(graph.s_outer_t(s)) || graph.s_ghost(s))? ' ghost' : '')"
        :d="w_side(s)"/>
    </g>
`,
    methods: {
      w_side: function(s) {
        const alpha = this.alpha || 0;
        let begin = this.graph.t_pos([], this.graph.s_inner_t(s));
        let end = this.graph.t_pos([], this.graph.s_outer_t(s));
        let center = this.graph.r_pos([], this.graph.s_begin_r(s));
        begin = interpolate(begin, center, alpha);
        end = interpolate(end, center, alpha);
        return `M ${begin} L ${end}`;
      }
    }
  });
  Vue.component("a-side-labels", {
    props: ["graph"],
    template: `
    <g>
      <a-label v-for="(_,s) in graph.numSolidSides" :key="s"
        class="s" 
        dy="7"
        :at="interpolate(graph.r_pos([], graph.s_begin_r(s)), 
                         graph.t_pos([], graph.s_inner_t(s)),
                         0.4)">
      s{{s}}
      </a-label>
    </g>
`,
    methods: { interpolate }
  });
  Vue.component("a-region-points", {
    props: ["graph", "hover", "radius"],
    template: `
    <g>
      <circle v-for="(_,r) in graph.numSolidRegions" :key="r"
        class="r"
        :r="radius || 10"
        @mouseover="hover('r'+r)" 
        @touchstart.passive="hover('r'+r)"
        :transform="\`translate(\${graph.r_pos([], r)})\`"/>
    </g>
`
  });
  Vue.component("a-region-labels", {
    props: ["graph"],
    template: `
    <g>
      <a-label v-for="(_,r) in graph.numSolidRegions" :key="r"
        class="r" 
        :dy="graph.r_y(r) > 150? 25 : -15" :at="graph.r_pos([], r)">
        r{{r}}
      </a-label>
    </g>
`
  });
  Vue.component("a-triangle-points", {
    props: ["graph", "hover", "radius"],
    template: `
      <g>
        <circle v-for="(_,t) in graph.numTriangles" :key="t"
          :class="'t' + (graph.t_ghost(t)? ' ghost':'')" 
          :r="radius || 7"
          @mouseover="hover('t'+t)" 
          @touchstart.passive="hover('t'+t)"
          :transform="\`translate(\${graph.t_pos([], t)})\`"/>
      </g>
`
  });
  Vue.component("a-triangle-labels", {
    props: ["graph"],
    template: `
      <g>
        <a-label v-for="(_,t) in graph.numSolidTriangles" :key="t"
          class="t" 
          dy="25" 
          :at="graph.t_pos([], t)">
          t{{t}}
        </a-label>
      </g>
`
  });
  function makeDiagram(selector, graph) {
    new Vue({
      el: selector,
      data: {
        graph: Object.freeze(graph),
        highlight: ""
      },
      computed: {
        highlightId: function() {
          return parseInt(this.highlight.slice(1));
        }
      },
      methods: {
        hover: function(label) {
          this.highlight = label;
        },
        format_array: function(label, array) {
          return array.map((x) => x === null || x < 0 ? "(null)" : label + x).join(" ");
        }
      }
    });
  }
  for (let diagram of document.querySelectorAll("div.diagram-g0")) {
    makeDiagram(diagram, G0);
  }
  for (let diagram of document.querySelectorAll("div.diagram-g1")) {
    makeDiagram(diagram, G1);
  }
  for (let diagram of document.querySelectorAll("div.diagram-g2")) {
    makeDiagram(diagram, G2);
  }
})();
