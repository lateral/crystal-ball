// Version 1.0.1

const BASE_PT = [0.0, 0.0, 1.0]; // base point of the hyperboloid

/* Calculate the Euclidean dot product of two points.
 * Pre: pt0.length == pt1.length
 */
function dot(pt0, pt1) {
  var sum = 0;
  for (var i=0; i < pt0.length; i++) {
    sum = sum + pt0[i] * pt1[i];
  }
  return sum;
}

/* Calculate the Euclidean norm
 * */
function norm(pt) {
  var dp = dot(pt, pt);
  return Math.sqrt(dp);
}

/* Calculate the Euclidean distance.
 * Pre: pt0.length == pt1.length
 */
function euclidean_distance(pt0, pt1) {
  return norm(sum(pt0, scale(-1, pt1)));
}

/* Calculate the Minkowski dot product.
 * Pre: pt0.length == pt1.length
 */
function minkowski_dot(pt0, pt1) {
  var sum = 0;
  var n = pt0.length;
  for (var i=0; i < n - 1; i++) {
    sum = sum + pt0[i] * pt1[i];
  }
  sum -= pt0[n-1] * pt1[n-1];
  return sum;
}

/* Calculate the distance between two points on the hyperboloid.
 */
function hyperboloid_distance(pt0, pt1) {
  var mdp = minkowski_dot(pt0, pt1);
  if (mdp > -1) {
    // due finite precision, can be slightly less than -1, in which case
    // arccosh can't be calculated.
    mdp = -1;
  }
  return Math.acosh(-1 * mdp);
}

/* Scale the provided vector, returning a new one.
 */
function scale(scalar, vec) {
  var res = [];
  for (var i=0; i < vec.length; i++) {
    res.push(scalar * vec[i]);
  }
  return res;
}

/* Sum the two vectors, returning a new one.
 * Pre: vec0.length == vec1.length
 */
function sum(vec0, vec1) {
  var res = [];
  for (var i=0; i < vec0.length; i++) {
    res.push(vec0[i] + vec1[i]);
  }
  return res;
}

/* Given a point `pt` on the Poincaré disc (not the origin), return its
 * inversion through the boundary of disc.
 */
function invert_thru_boundary(pt) {
  return scale(1. / dot(pt, pt), pt);
}

/* Given two points on the Poincaré disc not both lying on a ray from the
 * origin, return the centre of the circle that passes through both and
 * meets the disc boundary at right angles.
 * This circle gives the geodesic line segment.
 */
function centre_of_arc_through(pt0, pt1) {
  var mat = [pt0, pt1];
  var target = scale(0.5, [1 + dot(pt0, pt0), 1 + dot(pt1, pt1)]);
  var centre = apply_matrix(invert_matrix(mat), target);
  return centre;
}

/* Return the determinant of the provided 2x2 matrix.
 * (matrices are arrays of arrays).
 */
function determinant(mat) {
  return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
}

/* Return the inverse of the provided 2x2 matrix.
 * Pre: determinant(mat) != 0.
 */
function invert_matrix(mat) {
  var det = determinant(mat);
  return [
    scale(1./ det, [mat[1][1], -1 * mat[0][1]]),
    scale(1./ det, [-1 * mat[1][0], mat[0][0]]),
  ];
}

/* Return the result of applying the provided 2x2 matrix to the provided
 * 2-vector, from the left (so vectors are thought of as columns).
 */
function apply_matrix(mat, vector) {
  var result = [];
  for (var i=0; i < mat.length; i++) {
    result.push(dot(mat[i], vector));
  }
  return result;
}

/* Given a point `base` on the hyperboloid and a tangent `tangent` in its
 * tangent space, return its exponential (as a point on the hyperboloid).
 * Pre: hyperboloid_tangent_norm(tangent) > 0.
 */
function exponential(base, tangent) {
  var norm = hyperboloid_tangent_norm(tangent);
  var a = Math.cosh(norm);
  var b = Math.sinh(norm) / norm;
  return sum(scale(a, base), scale(b, tangent));
}

/* Return the norm of a tangent to the hyperboloid.
 */
function hyperboloid_tangent_norm(vec) {
  var mdp = minkowski_dot(vec, vec);
  return Math.sqrt(mdp);
}

/* Given two points `base` and `other` on the hyperboloid, return the logarithm
 * of `other` in the tangent space of `base`.
 */
function logarithm(base, other) {
  // base and other are points on the hyperboloid
  var mdp = minkowski_dot(base, other);
  var dist = hyperboloid_distance(base, other);
  var proj = sum(other, scale(mdp, base));
  var norm = hyperboloid_tangent_norm(proj);
  return scale(dist / norm, proj);
}

/* Given a point `base` on the hyperboloid and two vectors `direction` and
 * `tangent` in its tangent space, return the geodesic parallel transport of
 * `tangent` along the geodesic parallel to `direction` to a distance of
 * hyperboloid_tangent_norm(direction).
 */
function geodesic_parallel_transport(base, direction, tangent) {
  var norm_of_direction = hyperboloid_tangent_norm(direction);
  var unit_direction = scale(1.0 / norm_of_direction, direction);
  var parallel_component = minkowski_dot(tangent, unit_direction);
  var unit_direction_transported = sum(
      scale(Math.sinh(norm_of_direction), base),
      scale(Math.cosh(norm_of_direction), unit_direction)
  );
  return sum(
      sum(
        scale(parallel_component, unit_direction_transported),
        tangent
      ),
      scale(-1 * parallel_component, unit_direction)
  );
}

/* Map a 3-vector from the hyperboloid to the corresponding 2-vector on the
 * Poincaré disc.
 */
function hyperboloid_to_disc(pt) {
  return [pt[0] / (pt[2] + 1), pt[1] / (pt[2] + 1)];
}

/* Map a 2-vector from the Poincaré disc to the corresponding 3-vector on the
 * hyperboloid.
 */
function disc_to_hyperboloid(pt) {
  var norm_sqd = dot(pt, pt);
  var factor = 2.0 / (1 - norm_sqd);
  var hyper_pt = [factor * pt[0], factor * pt[1], (1 + norm_sqd) / (1 - norm_sqd)];
  return hyper_pt;
}

/* Given a point on the Poincaré disc and a tangent at that point, return the
 * corresponding tangent vector to the hyperboloid (at the corresponding point)
 */
function disc_tangent_to_hyperboloid(disc_pt, disc_tangent) {
  var hyper_pt = disc_to_hyperboloid(disc_pt);
  var dp = dot(disc_pt, disc_tangent);
  var factor = hyper_pt[2] + 1;
  var vec = [hyper_pt[0] * dp + disc_tangent[0],
             hyper_pt[1] * dp + disc_tangent[1],
             factor * dp];
  return scale(factor, vec);
}
